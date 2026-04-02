import {
  getPendingOpportunities,
  getPendingReports,
  logEvent,
} from '@/lib/db/queries';
import { analyzeOpportunity, analyzeReport } from '@/lib/analysis/scorer';

export const maxDuration = 300;

const BATCH_SIZE = 10;

export async function POST() {
  // Auth handled by proxy.ts session check — no additional guard needed here

  try {
    // Step 1: scan all sources so there's something to analyze.
    // Dynamic imports prevent pdfjs-dist module-load failures from crashing
    // the route before the handler even runs.
    const scanResults: Record<string, number | string> = {};
    try {
      const { fetchSamOpportunities } = await import('@/lib/ingestion/sam-client');
      scanResults.sam = await fetchSamOpportunities();
    } catch (e) { scanResults.sam = `error: ${e}`; }

    try {
      const { scrapeOigReports } = await import('@/lib/ingestion/oig-scraper');
      scanResults.oig = await scrapeOigReports();
    } catch (e) { scanResults.oig = `error: ${e}`; }

    try {
      const { scrapeGaoReports } = await import('@/lib/ingestion/gao-scraper');
      scanResults.gao = await scrapeGaoReports();
    } catch (e) { scanResults.gao = `error: ${e}`; }

    // Step 2: analyze whatever is now pending (up to BATCH_SIZE)
    const oppLimit = Math.ceil(BATCH_SIZE / 2);
    const repLimit = BATCH_SIZE - oppLimit;

    const [pendingOpps, pendingReports] = await Promise.all([
      getPendingOpportunities(oppLimit),
      getPendingReports(repLimit),
    ]);

    let processed = 0;
    for (const opp of pendingOpps) {
      try { await analyzeOpportunity(opp); processed++; } catch { /* logged inside */ }
    }
    for (const report of pendingReports) {
      try { await analyzeReport(report); processed++; } catch { /* logged inside */ }
    }

    await logEvent('manual_trigger_complete', { scan: scanResults, processed }, 'admin').catch(() => {});

    const samCount = typeof scanResults.sam === 'number' ? scanResults.sam : 0;
    const message = samCount === 0 && processed === 0
      ? 'No new items found'
      : `Fetched ${samCount} SAM opps · analyzed ${processed} items`;

    return Response.json({ ok: true, processed, scan: scanResults, message });
  } catch (err) {
    const error = String(err);
    await logEvent('trigger_analysis_error', { error }, 'admin').catch(() => {});
    return Response.json({ ok: false, error }, { status: 500 });
  }
}
