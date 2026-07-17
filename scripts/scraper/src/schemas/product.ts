import { z } from "zod"

export const ProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  manufacturer: z.string().optional(),
  catFoodType: z.string().optional(),
  price: z.number().positive(),
  weight: z.string(),
  images: z.array(z.string()).optional(),
  proteinPercent: z.number().min(0).max(100).optional(),
  fatPercent: z.number().min(0).max(100).optional(),
  fiberPercent: z.number().min(0).max(100).optional(),
  ashPercent: z.number().min(0).max(100).optional(),
  moisturePercent: z.number().min(0).max(100).optional(),
  carbohydrateEst: z.number().min(0).max(100).optional(),
  ingredientList: z.array(z.string()).optional(),
  lifeStage: z.enum(["kitten", "adult", "senior"]).optional(),
  applicableSpecies: z.array(z.enum(["cats", "dogs"])).optional(),
  grainFree: z.boolean().optional(),
  countryOfOrigin: z.string().optional(),
  salesRank: z.number().optional(),
  sourceUrl: z.string().url(),
  sourcePlatform: z.string(),
})

export type Product = z.infer<typeof ProductSchema>
