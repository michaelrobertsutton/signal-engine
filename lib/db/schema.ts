import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const itemStatusEnum = pgEnum('item_status', [
  'fetched',
  'analyzing',
  'analyzed',
  'failed',
  'skipped',
]);

export const sourceEnum = pgEnum('source', ['sam_gov', 'oig', 'gao']);

export const contentTypeEnum = pgEnum('content_type', ['html', 'pdf']);

export const artifactTypeEnum = pgEnum('artifact_type', [
  'triage_card',
  'one_pager',
]);

export const recommendationEnum = pgEnum('recommendation', [
  'pursue',
  'review',
  'track',
  'skip',
]);

export const confidenceEnum = pgEnum('confidence', ['high', 'medium', 'low']);

export const feedbackRatingEnum = pgEnum('feedback_rating', ['up', 'down']);

// ─── SAM.gov opportunities ────────────────────────────────────────────────────

export const opportunities = pgTable('opportunities', {
  id: uuid('id').defaultRandom().primaryKey(),
  noticeId: text('notice_id').notNull().unique(),
  title: text('title').notNull(),
  agency: text('agency'),
  postedDate: timestamp('posted_date', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  naicsCode: text('naics_code'),
  setAside: text('set_aside'),
  description: text('description'),
  valueMin: integer('value_min'), // USD
  valueMax: integer('value_max'), // USD
  url: text('url').notNull(),
  status: itemStatusEnum('status').notNull().default('fetched'),
  skipReason: text('skip_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── OIG / GAO reports ────────────────────────────────────────────────────────

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: sourceEnum('source').notNull(),
  reportUrl: text('report_url').notNull().unique(),
  title: text('title').notNull(),
  publishedDate: timestamp('published_date', { withTimezone: true }),
  content: text('content'), // null if extraction failed
  contentType: contentTypeEnum('content_type'),
  status: itemStatusEnum('status').notNull().default('fetched'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Artifacts (triage cards + one-pagers) ────────────────────────────────────

export const artifacts = pgTable('artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceType: text('source_type').notNull(), // 'opportunity' | 'report'
  sourceId: uuid('source_id').notNull(),
  artifactType: artifactTypeEnum('artifact_type').notNull(),
  bluf: text('bluf').notNull(), // bottom line up front, 1-2 sentences
  score: integer('score').notNull(), // 0-100
  recommendation: recommendationEnum('recommendation').notNull(),
  confidence: confidenceEnum('confidence').notNull(),
  solutionHypothesis: text('solution_hypothesis'),
  layer1Result: jsonb('layer1_result'), // hard-gate scoring details
  layer2Result: jsonb('layer2_result'), // capability scoring details
  llmOutput: jsonb('llm_output'), // raw validated LLM response
  profileVersion: text('profile_version'), // bellese-profile.yaml version at analysis time
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── User feedback on artifacts ───────────────────────────────────────────────

export const artifactFeedback = pgTable(
  'artifact_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'cascade' }),
    rating: feedbackRatingEnum('rating').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('artifact_feedback_unique').on(t.artifactId, t.rating)],
);

// ─── Cursor pagination state ──────────────────────────────────────────────────

export const sourceCursors = pgTable('source_cursors', {
  source: sourceEnum('source').primaryKey(),
  lastSeenDate: timestamp('last_seen_date', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Processing alerts / events ───────────────────────────────────────────────

export const processingLog = pgTable('processing_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(), // 'scraper_alert' | 'llm_failure' | 'queue_depth_alert'
  source: text('source'), // which scraper/source triggered the event
  details: jsonb('details'),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
