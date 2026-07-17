import { createClient } from '../server'
import type { Database } from '@/lib/database.types'

type MedicationRecord = Database['public']['Tables']['pet_medication_records']['Row']

export async function getMedicationRecords(petId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_medication_records')
    .select('*')
    .eq('pet_id', petId)
    .order('started_on', { ascending: false })

  if (error) throw error
  return data
}

export async function getMedicationRecordById(recordId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_medication_records')
    .select('*')
    .eq('id', recordId)
    .single()

  if (error) throw error
  return data
}

export async function createMedicationRecord(record: Omit<MedicationRecord, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_medication_records')
    .insert(record)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMedicationRecord(recordId: string, updates: Partial<MedicationRecord>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_medication_records')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMedicationRecord(recordId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pet_medication_records')
    .delete()
    .eq('id', recordId)

  if (error) throw error
}

export async function getOngoingMedications(petId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_medication_records')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_ongoing', true)
    .order('started_on', { ascending: false })

  if (error) throw error
  return data
}

export async function stopMedication(recordId: string, endedOn?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pet_medication_records')
    .update({
      is_ongoing: false,
      ended_on: endedOn || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error
  return data
}
