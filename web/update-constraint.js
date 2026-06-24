require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateConstraint() {
  // Drop and recreate the constraint via direct SQL
  const sql = `
    ALTER TABLE public.pending_computation_jobs 
    DROP CONSTRAINT IF EXISTS pending_computation_jobs_job_type_check;
    
    ALTER TABLE public.pending_computation_jobs 
    ADD CONSTRAINT pending_computation_jobs_job_type_check 
    CHECK (job_type IN (
      'recompute_reputation',
      'refresh_product_metrics',
      'recalc_timeline_trust',
      'create_pet_event_from_review',
      'create_followup_schedules',
      'enqueue_reputation_job',
      'enqueue_metrics_refresh_job',
      'generate_timeline_metrics',
      'trigger_score_comparison',
      'handle_ReviewCreated',
      'handle_BanditRewardRecorded',
      'handle_PolicyActivated',
      'handle_OutcomeAttributed',
      'handle_TestAsyncEvent',
      'test_job',
      'failing_job',
      'always_failing_job',
      'handle_IntegrationTestEvent'
    ));
  `

  // Try to execute via REST API (may not work for DDL)
  // Instead, we'll use the MCP or direct connection
  console.log('SQL to execute:')
  console.log(sql)
  console.log('\nPlease run this in Supabase Dashboard SQL Editor')
}

updateConstraint()
