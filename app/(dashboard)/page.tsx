import { getRecentTriageCards, getRecentOnePagers, getUnresolvedAlerts, countOldPendingItems } from '@/lib/db/queries';
import { loadProfile } from '@/lib/fit-model/profile';
import RunNowButton from './run-now-button';
import FeedbackButtons from './feedback-buttons';
import DismissAlertButton from './dismiss-alert-button';

export const dynamic = 'force-dynamic';

const QUEUE_DEPTH_ALERT_THRESHOLD = 10;
const QUEUE_DEPTH_ALERT_HOURS = 24;

const BADGE = {
  pursue: 'border-green-500/40 bg-green-500/10 text-green-400',
  review: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  track: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  skip: 'border-zinc-700 bg-zinc-800 text-zinc-400',
};

function RecommendationBadge({ value }: { value: string }) {
  const cls = BADGE[value as keyof typeof BADGE] ?? BADGE.skip;
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${cls}`}>
      {value}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className="text-xs text-zinc-500 font-mono">{score}/100</span>
  );
}

export default async function DashboardPage() {
  const [triageCards, onePagers, alerts, oldPendingCount] = await Promise.all([
    getRecentTriageCards(50),
    getRecentOnePagers(50),
    getUnresolvedAlerts(),
    countOldPendingItems(QUEUE_DEPTH_ALERT_HOURS * 60 * 60 * 1000),
  ]);

  let profileIncomplete = false;
  try {
    const profile = loadProfile();
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Alerts */}
        {profileIncomplete && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            Profile incomplete — open <code className="font-mono">config/bellese-profile.yaml</code> and fill in{' '}
            <code className="font-mono">exclusion_keywords</code> and <code className="font-mono">proof_points</code>.
          </div>
        )}
        {queueAlert && (
          <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            Queue depth alert: {oldPendingCount} items waiting over {QUEUE_DEPTH_ALERT_HOURS}h. Click <strong>Run Now</strong>.
          </div>
        )}
        {scraperAlerts.length > 0 && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <span>Scraper alert: {scraperAlerts.length} issue(s) detected. Check Vercel logs.</span>
            <DismissAlertButton eventType="scraper_alert" />
          </div>
        )}
        {llmAlerts.length > 0 && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <span>LLM failures: {llmAlerts.length} consecutive failure event(s). Check AI Gateway status.</span>
            <DismissAlertButton eventType="llm_consecutive_failures" />
          </div>
        )}

        {/* Module B — Opportunity Triage */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Opportunities
            </h2>
            <span className="text-xs text-zinc-500">SAM.gov · Module B</span>
            <span className="ml-auto text-xs text-zinc-600">{triageCards.length} cards</span>
          </div>

          {triageCards.length === 0 ? (
            <p className="text-sm text-zinc-500">No triage cards yet. Cron runs at 9 AM UTC, or click Run Now.</p>
          ) : (
            <div className="space-y-3">
              {triageCards.map((card) => (
                <div key={card.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 space-y-2">
                  {card.title && (
                    <p className="text-sm text-zinc-200 font-semibold">{card.title}</p>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium leading-snug">{card.bluf}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <RecommendationBadge value={card.recommendation} />
                      <ScorePill score={card.score} />
                    </div>
                  </div>

                  {card.solutionHypothesis && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{card.solutionHypothesis}</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-4 flex-wrap">
                      {card.agency && (
                        <span className="text-xs text-zinc-600 truncate max-w-[240px]">{card.agency}</span>
                      )}
                      {card.naicsCode && (
                        <span className="text-xs text-zinc-600 font-mono">NAICS {card.naicsCode}</span>
                      )}
                      {card.dueDate && (
                        <span className="text-xs text-zinc-500">
                          Due {new Date(card.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-zinc-600">{card.confidence} confidence</span>
                      {card.url && (
                        <a
                          href={card.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                        >
                          SAM.gov ↗
                        </a>
                      )}
                    </div>
                    <FeedbackButtons artifactId={card.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-zinc-800" />

        {/* Module A — Report-to-Idea Engine */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Innovation Signals
            </h2>
            <span className="text-xs text-zinc-500">OIG · GAO · Module A</span>
            <span className="ml-auto text-xs text-zinc-600">{onePagers.length} signals</span>
          </div>

          {onePagers.length === 0 ? (
            <p className="text-sm text-zinc-500">No innovation signals yet. Cron runs at 10 AM / 10 PM UTC, or click Run Now.</p>
          ) : (
            <div className="space-y-3">
              {onePagers.map((pager) => (
                <div key={pager.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 space-y-2">
                  {pager.title && (
                    <p className="text-sm text-zinc-200 font-semibold">{pager.title}</p>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium leading-snug">{pager.bluf}</p>
                  </div>

                  {pager.solutionHypothesis && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{pager.solutionHypothesis}</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                        pager.source === 'oig'
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                      }`}>
                        {pager.source?.toUpperCase()}
                      </span>
                      {pager.publishedDate && (
                        <span className="text-xs text-zinc-600">
                          Published {new Date(pager.publishedDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-zinc-600">{pager.confidence} confidence</span>
                      {pager.reportUrl && (
                        <a
                          href={pager.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                    <FeedbackButtons artifactId={pager.id} />
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
