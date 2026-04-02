import {
  getPendingOpportunities,
  getPendingReports,
  logEvent,
} from '@/lib/db/queries';
import { analyzeOpportunity, analyzeReport } from '@/lib/analysis/scorer';
import { fetchSamOpportunities } from '@/lib/ingestion/sam-client';
import { scrapeOigReports } from '@/lib/ingestion/oig-scraper';
import { scrapeGaoReports } from '@/lib/ingestion/gao-scraper';

export const maxDuration = 300;

const BATCH_SIZE = 10;

export async function POST() {
  // Auth handled by proxy.ts session check — no additional guard needed here

  // Step 1: scan all sources so there's something to analyze
  const scanResults: Record<string, number | string> = {};
  try { scanResults.sam = await fetchSamOpportunities(); } catch (e) { scanResults.sam = `error: ${e}`; }
  try { scanResults.oig = await scrapeOigReports(); } catch (e) { scanResults.oig = `error: ${e}`; }
  try { scanResults.gao = await scrapeGaoReports(); } catch (e) { scanResults.gao = `error: ${e}`; }

  // Step 2: analyze whatever is now pending (up to BATCH_SIZE)
  const oppLimit = Math.ceil(BATCH_SIZE / 2);
  const repLimit = BATCH_SIZE - oppLimit;

  const [pendingOpps, pendingReports] = await Promise.all([
    getPendingOpportunities(oppLimit),
    getPendingReports(repLimit),
  ]);

  let processed = 0;
  for (const opp of pendingOpps) {
    await analyzeOpportunity(opp);
    processed++;
  }
  for (const report of pendingReports) {
    await analyzeReport(report);
    processed++;
  }

  await logEvent('manual_trigger_complete', { scan: scanResults, processed }, 'admin');

  const samCount = typeof scanResults.sam === 'number' ? scanResults.sam : 0;
  const message = samCount === 0 && processed === 0
    ? 'No new items found'
    : `Fetched ${samCount} SAM opps · analyzed ${processed} items`;

  return Response.json({ ok: true, processed, scan: scanResults, message });
}
