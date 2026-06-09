import { getCursor, setCursor, upsertOpportunity } from '@/lib/db/queries';
import { logEvent } from '@/lib/db/queries';
import { loadProfile, getNaicsWhitelist } from '@/lib/fit-model/profile';

const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';
const LOOKBACK_DAYS = 30;
const PAGE_SIZE = 50;
const MAX_SCAN = 200;
const TARGET_MATCHES = 20;

interface SamOpportunity {
  noticeId: string;
  title: string;
  fullParentPathName?: string;
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

export async function fetchSamOpportunities(): Promise<number> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) throw new Error('SAM_GOV_API_KEY is not set');

  const cursor = await getCursor('sam_gov');
  const postedFrom = cursor
    ? cursor
    : new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  const postedFromStr = fmt(postedFrom);
  const postedToStr = fmt(new Date());

  const profile = loadProfile();
  const naicsCodes = getNaicsWhitelist(profile);

  // Agency filter: read from profile.primary_agency_name, fall back to env var, or no filter
  const agencyFilter = (profile.primary_agency_name ?? process.env.SAM_AGENCY_FILTER ?? '').toLowerCase();

  let offset = 0;
  let totalScanned = 0;
  let totalAgencyGated = 0;
  let count = 0;

  while (totalScanned < MAX_SCAN && count < TARGET_MATCHES) {
    const params = new URLSearchParams({
      api_key: apiKey,
      postedFrom: postedFromStr,
      postedTo: postedToStr,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      ptype: 'o,k,r',
      ...(profile.primary_agency_name && { organizationName: profile.primary_agency_name }),
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

    if (page.length === 0) break;

    // Client-side agency filter (organizationName param is silently ignored by SAM.gov v2)
    const agencyPage = agencyFilter
      ? page.filter((item) => item.fullParentPathName?.toLowerCase().includes(agencyFilter) ?? false)
      : page;

    // Client-side NAICS filter
    const matching = naicsCodes.length > 0
      ? agencyPage.filter((item) => item.naicsCode && naicsCodes.includes(item.naicsCode))
      : agencyPage;

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
    totalAgencyGated += agencyPage.length;
    offset += PAGE_SIZE;

    if (page.length < PAGE_SIZE) break;
  }

  await logEvent('sam_scan_complete', { scanned: totalScanned, agencyGated: totalAgencyGated, matched: count, offset }, 'sam_gov');
  await setCursor('sam_gov', new Date());

  return count;
}