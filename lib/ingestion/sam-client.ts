import { getCursor, setCursor, upsertOpportunity } from '@/lib/db/queries';
import { logEvent } from '@/lib/db/queries';
import { loadProfile, getNaicsWhitelist } from '@/lib/fit-model/profile';

const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';
const LOOKBACK_DAYS = 30;

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

  // SAM.gov API v2 ignores naicsCode/keyword query params — fetch a larger batch
  // and filter client-side against the profile whitelist before saving to DB.
  const params = new URLSearchParams({
    api_key: apiKey,
    postedFrom: postedFromStr,
    postedTo: postedToStr,
    limit: '50',
    offset: '0',
    ptype: 'o,k,r', // solicitation types
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
    await logEvent(
      'sam_api_error',
      { status: response.status, body },
      'sam_gov',
    );
    throw new Error(`SAM API ${response.status}: ${body}`);
  }

  const data: SamApiResponse = await response.json();
  // Client-side NAICS filter: only save opportunities matching the profile whitelist
  const allItems = data.opportunitiesData ?? [];
  const items = naicsCodes.length > 0
    ? allItems.filter((item) => item.naicsCode && naicsCodes.includes(item.naicsCode))
    : allItems;

  let count = 0;
  for (const item of items) {
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

  // Advance cursor to today so next run only fetches new items
  await setCursor('sam_gov', new Date());

  return count;
}
