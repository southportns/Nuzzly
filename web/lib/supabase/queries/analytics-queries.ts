// =============================================
// Analytics Layer Query Functions
// =============================================

import { createClient as createServerClient } from "@/lib/supabase/server"

// ── Health Metrics ──

export async function queryHealthMetrics(petId: string, days = 30) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("pet_id", petId)
    .gte("date", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order("date", { ascending: true })
  return { data, error }
}

export async function queryLatestHealthMetrics(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("pet_id", petId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()
  return { data, error }
}

// ── Daily Summary ──

export async function queryDailySummary(petId: string, date?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from("daily_summary")
    .select("*")
    .eq("pet_id", petId)

  if (date) {
    query = query.eq("date", date)
  } else {
    query = query.order("date", { ascending: false }).limit(1)
  }

  const { data, error } = await query.maybeSingle()
  return { data, error }
}

export async function queryDailySummaries(petId: string, days = 30) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("daily_summary")
    .select("*")
    .eq("pet_id", petId)
    .gte("date", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order("date", { ascending: false })
  return { data, error }
}

// ── Analytics Jobs ──

export async function queryAnalyticsJobs(petId?: string, limit = 10) {
  const supabase = await createServerClient()
  let query = supabase
    .from("analytics_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (petId) {
    query = query.eq("pet_id", petId)
  }

  const { data, error } = await query
  return { data, error }
}

// ── Trend Analysis ──

export async function queryHealthTrends(petId: string, days = 30) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .rpc('get_health_trends', {
      p_pet_id: petId,
      p_days: days
    })
    .single()
  return { data, error }
}

// ── Run Analytics Job ──

export async function runAnalyticsJob(petId?: string, date?: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .rpc('run_analytics_job', {
      p_pet_id: petId || undefined,
      p_date: date || new Date().toISOString().split('T')[0]
    })
    .single()
  return { data, error }
}
