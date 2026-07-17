import { createClient } from '../server'
import type { Database } from '@/lib/database.types'

type DiseaseRecord = Database['public']['Tables']['pet_disease_records']['Row']

export async function getDiseaseRecords(petId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_disease_records')
    .select('*')
    .eq('pet_id', petId)
    .order('diagnosed_on', { ascending: false })

  if (error) throw error
  return data
}

export async function getDiseaseRecordById(recordId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_disease_records')
    .select('*')
    .eq('id', recordId)
    .single()

  if (error) throw error
  return data
}

export async function createDiseaseRecord(record: Omit<DiseaseRecord, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_disease_records')
    .insert(record)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDiseaseRecord(recordId: string, updates: Partial<DiseaseRecord>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_disease_records')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDiseaseRecord(recordId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pet_disease_records')
    .delete()
    .eq('id', recordId)

  if (error) throw error
}

export async function getActiveDiseases(petId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_disease_records')
    .select('*')
    .eq('pet_id', petId)
    .in('status', ['active', 'under_treatment'])
    .order('diagnosed_on', { ascending: false })

  if (error) throw error
  return data
}

export async function getChronicDiseases(petId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_disease_records')
    .select('*')
    .eq('pet_id', petId)
    .eq('status', 'chronic')
    .order('diagnosed_on', { ascending: false })

  if (error) throw error
  return data
}
