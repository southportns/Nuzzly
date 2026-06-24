// =============================================
// Breed queries (client-side)
// =============================================
// Reads the canonical breed list from `breed_aliases`. Each distinct
// (canonical, species) tuple becomes one option in the form combobox.
// Aliases (e.g. "布偶" → "布偶猫") are folded into the canonical row
// at match time, so the combobox shows the canonical name and the
// saved `pets.breed` value is always normalized.

import { createClient as createBrowserClient } from "@/lib/supabase/client"

export interface BreedOption {
  /** Canonical name (e.g. "布偶猫"). This is what we save to `pets.breed`. */
  canonical: string
  /** "cat" | "dog" | "other" */
  species: "cat" | "dog" | "other"
}

/**
 * Fetch all distinct canonical breeds, optionally filtered by species.
 * Returns rows ordered by canonical name.
 */
export async function fetchBreedOptions(opts?: { species?: BreedOption["species"] }) {
  const supabase = createBrowserClient()
  let q = supabase
    .from("breed_aliases")
    .select("canonical, species")
    .order("canonical", { ascending: true })

  if (opts?.species) {
    q = q.eq("species", opts.species)
  }

  // .then() not needed — Supabase returns the rows via array-like API
  // but duplicate canonicals across aliases need collapsing.
  const { data, error } = await q
  if (error) return { data: [] as BreedOption[], error }

  const seen = new Set<string>()
  const out: BreedOption[] = []
  for (const row of data ?? []) {
    const key = `${row.species}::${row.canonical}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ canonical: row.canonical, species: row.species as BreedOption["species"] })
  }
  return { data: out, error: null }
}
