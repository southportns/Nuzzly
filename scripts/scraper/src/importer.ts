import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { ProductSchema } from "./schemas/product"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function importToSupabase(jsonPath: string) {
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"))
  const products = data.map((p: any) => ProductSchema.parse(p))
  
  const { data: inserted, error } = await supabase
    .from("products")
    .insert(products.map((p) => ({
      name: p.name,
      brand: p.brand,
      price_range: String(p.price),
      protein_percent: p.proteinPercent,
      fat_percent: p.fatPercent,
      fiber_percent: p.fiberPercent,
      ingredient_list: p.ingredientList,
      life_stage: p.lifeStage,
      grain_free: p.grainFree,
      country_of_origin: p.countryOfOrigin,
      metadata: { sourceUrl: p.sourceUrl, sourcePlatform: p.sourcePlatform },
    })))
    .select()

  if (error) throw error
  return inserted
}
