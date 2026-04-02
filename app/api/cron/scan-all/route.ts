import { fetchSamOpportunities } from '@/lib/ingestion/sam-client';
import { scrapeOigReports } from '@/lib/ingestion/oig-scraper';
import { scrapeGaoReports } from '@/lib/ingestion/gao-scraper';
import { logEvent } from '@/lib/db/queries';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results: Record<string, number | string> = {};

  try {
    results.sam = await fetchSamOpportunities();
  } catch (err) {
    results.sam = `error: ${String(err)}`;
  }

  try {
    results.oig = await scrapeOigReports();
  } catch (err) {
    results.oig = `error: ${String(err)}`;
  }

  try {
    results.gao = await scrapeGaoReports();
  } catch (err) {
    results.gao = `error: ${String(err)}`;
  }

  await logEvent('scan_all_complete', results, 'cron').catch(() => {});

  return Response.json({ ok: true, results });
}
