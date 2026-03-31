import { getRecentArtifacts, getUnresolvedAlerts, countOldPendingItems } from '@/lib/db/queries';
import { loadProfile } from '@/lib/fit-model/profile';
import RunNowButton from './run-now-button';
import FeedbackButtons from './feedback-buttons';

const QUEUE_DEPTH_ALERT_THRESHOLD = 10;
const QUEUE_DEPTH_ALERT_HOURS = 24;

export default async function DashboardPage() {
  const [artifacts, alerts, oldPendingCount] = await Promise.all([
    getRecentArtifacts(50),
    getUnresolvedAlerts(),
    countOldPendingItems(QUEUE_DEPTH_ALERT_HOURS * 60 * 60 * 1000),
  ]);

  let profile;
  let profileIncomplete = false;
  try {
    profile = loadProfile();
    profileIncomplete = !profile.profile_complete;
  } catch {
    profileIncomplete = true;
  }

  const queueAlert = oldPendingCount > QUEUE_DEPTH_ALERT_THRESHOLD;
  const scraperAlerts = alerts.filter((a) => a.eventType === 'scraper_alert');
  const llmAlerts = alerts.filter((a) => a.eventType === 'llm_consecutive_failures');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Signal Engine</h1>
        <RunNowButton />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Alerts */}
        {profileIncomplete && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            Profile incomplete — open <code className="font-mono">config/bellese-profile.yaml</code> and fill in{' '}
            <code className="font-mono">exclusion_keywords</code> and <code className="font-mono">proof_points</code>.
          </div>
        )}
        {queueAlert && (
          <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            Queue depth alert: {oldPendingCount} items have been waiting over {QUEUE_DEPTH_ALERT_HOURS}h. Click{' '}
            <strong>Run Now</strong> to process.
          </div>
        )}
        {scraperAlerts.length > 0 && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Scraper alert: {scraperAlerts.length} issue(s) detected. Check Vercel logs for details.
          </div>
        )}
        {llmAlerts.length > 0 && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            LLM failures: {llmAlerts.length} consecutive failure event(s). Check AI Gateway status.
          </div>
        )}

        {/* Artifact list */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Recent Artifacts ({artifacts.length})
          </h2>

          {artifacts.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No artifacts yet. Cron runs at 9 AM + 9 PM UTC, or click Run Now.
            </p>
          ) : (
            <div className="space-y-3">
              {artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium leading-snug">{artifact.bluf}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                          artifact.recommendation === 'pursue'
                            ? 'border-green-500/40 bg-green-500/10 text-green-400'
                            : artifact.recommendation === 'review'
                            ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                            : artifact.recommendation === 'track'
                            ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {artifact.recommendation}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">{artifact.score}/100</span>
                    </div>
                  </div>

                  {artifact.solutionHypothesis && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{artifact.solutionHypothesis}</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-600">
                        {artifact.artifactType === 'triage_card' ? 'SAM opportunity' : 'OIG/GAO report'}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {artifact.confidence} confidence
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(artifact.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <FeedbackButtons artifactId={artifact.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
