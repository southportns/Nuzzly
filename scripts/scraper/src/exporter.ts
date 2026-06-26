import { Product } from "./schemas/product"

export function exportToJSON(products: Product[]): string {
  return JSON.stringify(products, null, 2)
}

export function exportToCSV(products: Product[]): string {
  if (products.length === 0) return ""

  const headers = [
    "name",
    "brand",
    "price",
    "weight",
    "proteinPercent",
    "fatPercent",
    "fiberPercent",
    "ashPercent",
    "moisturePercent",
    "carbohydrateEst",
    "ingredientList",
    "lifeStage",
    "applicableSpecies",
    "grainFree",
    "countryOfOrigin",
    "sourceUrl",
    "sourcePlatform",
  ]

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return ""
    if (typeof value === "boolean") return value ? "Yes" : "No"
    const str = Array.isArray(value) ? value.join("; ") : String(value)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = products.map((product) =>
    headers.map((header) => escapeCSV((product as Record<string, unknown>)[header])).join(",")
  )

  return [headers.join(","), ...rows].join("\n")
}
