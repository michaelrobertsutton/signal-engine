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
  const oppLimit = Math.ceil(BATCH_SIZE / 2);
  const repLimit = BATCH_SIZE - oppLimit;

  const [pendingOpps, pendingReports] = await Promise.all([
    getPendingOpportunities(oppLimit),
    getPendingReports(repLimit),
  ]);

  if (pendingOpps.length === 0 && pendingReports.length === 0) {
    return Response.json({ ok: true, processed: 0, message: 'No pending items' });
  }

  let processed = 0;
  for (const opp of pendingOpps) {
    await analyzeOpportunity(opp);
    processed++;
  }
  for (const report of pendingReports) {
    await analyzeReport(report);
    processed++;
  }

  await logEvent('manual_trigger_complete', { processed }, 'admin');

  return Response.json({ ok: true, processed });
}
