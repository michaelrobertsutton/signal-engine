import {
  getPendingOpportunities,
  getPendingReports,
  countOldPendingItems,
  logEvent,
} from '@/lib/db/queries';
import { analyzeOpportunity, analyzeReport } from '@/lib/analysis/scorer';

export const maxDuration = 300;

const BATCH_SIZE = 10;
const QUEUE_DEPTH_ALERT_HOURS = 24;
const QUEUE_DEPTH_ALERT_THRESHOLD = 10;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Queue depth alert: warn if too many items are sitting unanalyzed
  const oldCount = await countOldPendingItems(QUEUE_DEPTH_ALERT_HOURS * 60 * 60 * 1000);
  if (oldCount > QUEUE_DEPTH_ALERT_THRESHOLD) {
    await logEvent(
      'queue_depth_alert',
      { count: oldCount, thresholdHours: QUEUE_DEPTH_ALERT_HOURS },
      'analyze_pending',
    );
  }

  // Split batch evenly between opportunities and reports
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

  await logEvent('analyze_pending_complete', { processed }, 'cron');

  return Response.json({ ok: true, processed });
}
