import { createClient } from '../server'
import type { Database } from '@/lib/database.types'

type PetEvent = Database['public']['Tables']['pet_events']['Row']

export async function getPetEvents(petId: string, limit: number = 50) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_events')
    .select('*, products(name, brand)')
    .eq('pet_id', petId)
    .order('event_time', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getEventsByType(petId: string, eventType: string, limit: number = 20) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pet_events')
    .select('*')
    .eq('pet_id', petId)
    .eq('event_type', eventType)
    .order('event_time', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function createPetEvent(event: Omit<PetEvent, 'id' | 'created_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_events')
    .insert(event)
    .select('*, products(name, brand)')
    .single()

  if (error) throw error
  return data
}

export async function updatePetEvent(eventId: string, updates: Partial<PetEvent>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePetEvent(eventId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pet_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}

export async function getEventTimeline(petId: string, days: number = 30) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString()

  const { data, error } = await supabase
    .from('pet_events')
    .select('id, event_type, event_time, notes, severity, product_id')
    .eq('pet_id', petId)
    .gte('event_time', startDateStr)
    .order('event_time', { ascending: false })

  if (error) throw error

  // 按日期分组
  const grouped: Record<string, PetEvent[]> = {}
  for (const event of (data as PetEvent[]) || []) {
    const date = event.event_time?.split('T')[0] || 'unknown'
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(event)
  }

  return grouped
}

export async function getRecentEvents(petId: string, days: number = 7) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString()

  const { data, error } = await supabase
    .from('pet_events')
    .select('*')
    .eq('pet_id', petId)
    .gte('event_time', startDateStr)
    .order('event_time', { ascending: false })

  if (error) throw error
  return data
}
