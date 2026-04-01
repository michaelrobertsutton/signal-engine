import { getCursor, setCursor, upsertOpportunity } from '@/lib/db/queries';
import { logEvent } from '@/lib/db/queries';
import { loadProfile, getNaicsWhitelist } from '@/lib/fit-model/profile';

const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';
const LOOKBACK_DAYS = 30;
const PAGE_SIZE = 50;
const MAX_SCAN = 200;   // CMS posts ~50-100 opps/month; 2-4 API calls max
const TARGET_MATCHES = 20; // stop early once we have enough relevant opps

interface SamOpportunity {
  noticeId: string;
  title: string;
  fullParentPathName?: string; // agency
  postedDate?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  typeOfSetAsideDescription?: string;
  description?: string;
  award?: { amount?: number };
  uiLink?: string;
}

interface SamApiResponse {
  totalRecords: number;
  opportunitiesData: SamOpportunity[];
}

// Returns the number of new/updated opportunities stored
export async function fetchSamOpportunities(): Promise<number> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) throw new Error('SAM_GOV_API_KEY is not set');

  // Cursor: use lastSeenDate if we've run before, else look back 30 days
  const cursor = await getCursor('sam_gov');
  const postedFrom = cursor
    ? cursor
    : new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // SAM.gov expects MM/dd/yyyy
  const fmt = (d: Date) =>
    `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  const postedFromStr = fmt(postedFrom);
  const postedToStr = fmt(new Date());

  // Filter by profile NAICS whitelist so we only fetch relevant IT opportunities
  const profile = loadProfile();
  const naicsCodes = getNaicsWhitelist(profile);

  // organizationName=Centers for Medicare filters server-side to CMS-only records
  // (~50-100/month), cutting API calls from ~10 to 1-2 per scan.
  // ncode is the correct v2 NAICS param but only accepts one code at a time —
  // keep client-side NAICS filtering for multi-code coverage.
  let offset = 0;
  let totalScanned = 0;
  let count = 0;

  while (totalScanned < MAX_SCAN && count < TARGET_MATCHES) {
    const params = new URLSearchParams({
      api_key: apiKey,
      postedFrom: postedFromStr,
      postedTo: postedToStr,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      ptype: 'o,k,r',
      organizationName: 'Centers for Medicare',
    });

    let response: Response;
    try {
      response = await fetch(`${SAM_API_BASE}?${params}`, {
        headers: { Accept: 'application/json' },
      });
    } catch (err) {
      await logEvent('sam_fetch_error', { error: String(err) }, 'sam_gov');
      throw err;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      await logEvent('sam_api_error', { status: response.status, body }, 'sam_gov');
      throw new Error(`SAM API ${response.status}: ${body}`);
    }

    const data: SamApiResponse = await response.json();
    const page = data.opportunitiesData ?? [];

    if (page.length === 0) break; // no more results in window

    // Client-side NAICS filter
    const matching = naicsCodes.length > 0
      ? page.filter((item) => item.naicsCode && naicsCodes.includes(item.naicsCode))
      : page;

    for (const item of matching) {
      await upsertOpportunity({
        noticeId: item.noticeId,
        title: item.title,
        agency: item.fullParentPathName,
        postedDate: item.postedDate ? new Date(item.postedDate) : undefined,
        dueDate: item.responseDeadLine ? new Date(item.responseDeadLine) : undefined,
        naicsCode: item.naicsCode,
        setAside: item.typeOfSetAsideDescription,
        description: item.description,
        valueMax: item.award?.amount,
        url: item.uiLink ?? `https://sam.gov/opp/${item.noticeId}`,
        status: 'fetched',
      });
      count++;
    }

    totalScanned += page.length;
    offset += PAGE_SIZE;

    if (page.length < PAGE_SIZE) break; // reached last page in window
  }

  await logEvent('sam_scan_complete', { scanned: totalScanned, matched: count, offset }, 'sam_gov');

  // Advance cursor to today so next run only fetches newly posted items
  await setCursor('sam_gov', new Date());

  return count;
}
