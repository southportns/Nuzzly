import { createClient as createServerClient } from "@/lib/supabase/server"

export interface PetFamilyMember {
  id: string
  pet_id: string
  profile_id: string
  role: "owner" | "member"
  nickname: string | null
  age: number | null
  gender: "male" | "female" | "other" | null
  personality_tags: string[] | null
  avatar_url: string | null
  resident_id: string
  joined_at: string
}

export async function queryPetFamilies(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("pet_families")
    .select("*")
    .eq("pet_id", petId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true })
  return { data: data as PetFamilyMember[] | null, error }
}
