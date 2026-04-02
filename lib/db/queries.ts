import { eq, and, lt, count, desc } from 'drizzle-orm';
import { db } from './client';
import {
  opportunities,
  reports,
  artifacts,
  artifactFeedback,
  sourceCursors,
  processingLog,
} from './schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Opportunity = InferSelectModel<typeof opportunities>;
export type Report = InferSelectModel<typeof reports>;
export type Artifact = InferSelectModel<typeof artifacts>;

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function upsertOpportunity(
  data: InferInsertModel<typeof opportunities>,
): Promise<Opportunity> {
  const [row] = await db
    .insert(opportunities)
    .values(data)
    .onConflictDoUpdate({
      target: opportunities.noticeId,
      set: {
        title: data.title,
        agency: data.agency,
        dueDate: data.dueDate,
        description: data.description,
        valueMin: data.valueMin,
        valueMax: data.valueMax,
        updatedAt: new Date(),
        // Only requeue if meaningful fields changed — caller sets status='fetched'
        status: data.status,
      },
    })
    .returning();
  return row;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function upsertReport(
  data: InferInsertModel<typeof reports>,
): Promise<Report> {
  const [row] = await db
    .insert(reports)
    .values(data)
    .onConflictDoUpdate({
      target: reports.reportUrl,
      set: {
        title: data.title,
        publishedDate: data.publishedDate,
        updatedAt: new Date(),
        // Do not re-fetch content or change status on duplicate URL
      },
    })
    .returning();
  return row;
}

// ─── Pending items for analyze-pending ───────────────────────────────────────

export async function getPendingOpportunities(limit: number) {
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.status, 'fetched'))
    .limit(limit)
    .orderBy(opportunities.createdAt);
}

export async function getPendingReports(limit: number) {
  return db
    .select()
    .from(reports)
    .where(eq(reports.status, 'fetched'))
    .limit(limit)
    .orderBy(reports.createdAt);
}

export async function countOldPendingItems(olderThanMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const [oppCount] = await db
    .select({ count: count() })
    .from(opportunities)
    .where(and(eq(opportunities.status, 'fetched'), lt(opportunities.createdAt, cutoff)));
  const [repCount] = await db
    .select({ count: count() })
    .from(reports)
    .where(and(eq(reports.status, 'fetched'), lt(reports.createdAt, cutoff)));
  return Number(oppCount.count) + Number(repCount.count);
}

// ─── Status updates ───────────────────────────────────────────────────────────

export async function markOpportunityStatus(
  id: string,
  status: 'analyzing' | 'analyzed' | 'failed' | 'skipped',
  skipReason?: string,
) {
  await db
    .update(opportunities)
    .set({ status, skipReason, updatedAt: new Date() })
    .where(eq(opportunities.id, id));
}

export async function markReportStatus(
  id: string,
  status: 'analyzing' | 'analyzed' | 'failed',
) {
  await db
    .update(reports)
    .set({ status, updatedAt: new Date() })
    .where(eq(reports.id, id));
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

export async function insertArtifact(
  data: InferInsertModel<typeof artifacts>,
): Promise<Artifact> {
  const [row] = await db.insert(artifacts).values(data).returning();
  return row;
}

export async function getRecentArtifacts(limit = 50) {
  return db
    .select()
    .from(artifacts)
    .orderBy(desc(artifacts.createdAt))
    .limit(limit);
}

export async function getRecentTriageCards(limit = 50) {
  return db
    .select({
      id: artifacts.id,
      bluf: artifacts.bluf,
      score: artifacts.score,
      recommendation: artifacts.recommendation,
      confidence: artifacts.confidence,
      solutionHypothesis: artifacts.solutionHypothesis,
      createdAt: artifacts.createdAt,
      title: opportunities.title,
      agency: opportunities.agency,
      dueDate: opportunities.dueDate,
      naicsCode: opportunities.naicsCode,
      url: opportunities.url,
    })
    .from(artifacts)
    .innerJoin(opportunities, eq(artifacts.sourceId, opportunities.id))
    .where(eq(artifacts.artifactType, 'triage_card'))
    .orderBy(desc(artifacts.createdAt))
    .limit(limit);
}

export async function getRecentOnePagers(limit = 50) {
  return db
    .select({
      id: artifacts.id,
      bluf: artifacts.bluf,
      score: artifacts.score,
      recommendation: artifacts.recommendation,
      confidence: artifacts.confidence,
      solutionHypothesis: artifacts.solutionHypothesis,
      createdAt: artifacts.createdAt,
      title: reports.title,
      source: reports.source,
      reportUrl: reports.reportUrl,
      publishedDate: reports.publishedDate,
    })
    .from(artifacts)
    .innerJoin(reports, eq(artifacts.sourceId, reports.id))
    .where(eq(artifacts.artifactType, 'one_pager'))
    .orderBy(desc(artifacts.createdAt))
    .limit(limit);
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function upsertFeedback(artifactId: string, rating: 'up' | 'down') {
  // Delete any existing vote first so changing up↔down always works
  await db.delete(artifactFeedback).where(eq(artifactFeedback.artifactId, artifactId));
  await db.insert(artifactFeedback).values({ artifactId, rating });
}

export async function clearFeedback(artifactId: string) {
  await db.delete(artifactFeedback).where(eq(artifactFeedback.artifactId, artifactId));
}

// ─── Source cursors ───────────────────────────────────────────────────────────

export async function getCursor(
  source: 'sam_gov' | 'oig' | 'gao',
): Promise<Date | null> {
  const [row] = await db
    .select()
    .from(sourceCursors)
    .where(eq(sourceCursors.source, source));
  return row?.lastSeenDate ?? null;
}

export async function setCursor(
  source: 'sam_gov' | 'oig' | 'gao',
  lastSeenDate: Date,
) {
  await db
    .insert(sourceCursors)
    .values({ source, lastSeenDate })
    .onConflictDoUpdate({
      target: sourceCursors.source,
      set: { lastSeenDate, updatedAt: new Date() },
    });
}

// ─── Processing log ───────────────────────────────────────────────────────────

export async function logEvent(
  eventType: string,
  details: Record<string, unknown>,
  source?: string,
) {
  await db.insert(processingLog).values({ eventType, details, source });
}

export async function getUnresolvedAlerts() {
  return db
    .select()
    .from(processingLog)
    .where(eq(processingLog.resolved, false))
    .orderBy(desc(processingLog.createdAt));
}

export async function resolveAlertsByType(eventType: string) {
  await db
    .update(processingLog)
    .set({ resolved: true })
    .where(and(eq(processingLog.eventType, eventType), eq(processingLog.resolved, false)));
}

export async function getRecentLog(limit = 50) {
  return db
    .select()
    .from(processingLog)
    .orderBy(desc(processingLog.createdAt))
    .limit(limit);
}
