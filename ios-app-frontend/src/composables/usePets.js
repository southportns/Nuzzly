import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'

const pets = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchPets() {
  loading.value = true
  const uid = await getUid()
  if (!uid) {
    pets.value = []
    loading.value = false
    return
  }

  const { data, error } = await supabase
    .from('pets')
    .select('id, name, species, breed, age_years, age_months, gender, weight_kg, neutered, stomach_health, photo_url, avatar_url, is_active')
    .eq('profile_id', uid)
    .eq('is_active', true)
    .order('created_at')

  if (error) {
    console.warn('[usePets] fetch error:', error.message)
    pets.value = []
  } else {
    pets.value = data || []
  }
  loading.value = false
}

async function createPet(pet) {
  const uid = await getUid()
  if (!uid) throw new Error('未登录')

  const { data, error } = await supabase
    .from('pets')
    .insert({ ...pet, profile_id: uid })
    .select()
    .single()
  if (error) throw error
  pets.value = [...pets.value, data]
  return data
}

async function updatePet(id, updates) {
  const { data, error } = await supabase.from('pets').update(updates).eq('id', id).select().single()
  if (error) throw error
  pets.value = pets.value.map(p => p.id === id ? data : p)
  return data
}

export function usePets() {
  return { pets, loading, fetchPets, createPet, updatePet }
}
