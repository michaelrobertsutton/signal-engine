import { getCursor, setCursor, upsertOpportunity } from '@/lib/db/queries';
import { logEvent } from '@/lib/db/queries';

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

  const postedFromStr = postedFrom.toISOString().slice(0, 10); // YYYY-MM-DD
  const postedToStr = new Date().toISOString().slice(0, 10);

  const params = new URLSearchParams({
    api_key: apiKey,
    postedFrom: postedFromStr,
    postedTo: postedToStr,
    limit: '10',
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
  const items = data.opportunitiesData ?? [];

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
