import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

  console.log('=== LLM Failures ===');
  const failures = await sql`
    SELECT event_type, details, created_at
    FROM processing_log
    WHERE event_type IN ('llm_failure', 'llm_consecutive_failures')
    ORDER BY created_at DESC
    LIMIT 5
  `;
  console.log(JSON.stringify(failures, null, 2));

  console.log('\n=== Recent Cron Runs ===');
  const crons = await sql`
    SELECT event_type, details, created_at
    FROM processing_log
    WHERE event_type IN ('scan_all_complete', 'analyze_pending_complete')
    ORDER BY created_at DESC
    LIMIT 6
  `;
  console.log(JSON.stringify(crons, null, 2));
}
main();
