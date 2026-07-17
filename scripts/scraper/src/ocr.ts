import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import { fileURLToPath } from "url"

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PADDLE_OCR_SCRIPT = path.join(__dirname, "..", "paddle_ocr.py")

export async function extractTextFromImage(imageUrl: string): Promise<string> {
  const result = await extractDetailedInfo(imageUrl)
  return result.full_text || ""
}

export async function extractDetailedInfo(imageUrl: string): Promise<{
  texts: Array<{ text: string; confidence: number }>
  full_text: string
  ingredients: string[]
  nutrition: Record<string, number>
}> {
  try {
    const { stdout } = await execFileAsync("python", [PADDLE_OCR_SCRIPT, imageUrl], {
      timeout: 30000,
    })
    const data = JSON.parse(stdout.trim())

    if (data.error) {
      console.error(`[PaddleOCR] Error:`, data.error)
      return { texts: [], full_text: "", ingredients: [], nutrition: {} }
    }

    const texts = data.texts || []
    const fullText = data.full_text || ""
    const ingredients = extractIngredients(fullText)
    const nutrition = extractNutrition(fullText)

    return { texts, full_text: fullText, ingredients, nutrition }
  } catch (error: any) {
    console.error(`[PaddleOCR] Failed:`, error.message)
    return { texts: [], full_text: "", ingredients: [], nutrition: {} }
  }
}

function extractIngredients(text: string): string[] {
  const match = text.match(/原料组成\s*\n?(.*?)(?=添加剂组成|产品成分|$)/s)
  if (match) {
    const raw = match[1].replace(/\n/g, "")
    return raw
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
  }
  return []
}

function extractNutrition(text: string): Record<string, number> {
  const result: Record<string, number> = {}

  const proteinMatch = text.match(/粗蛋白质?\s*[≥>]\s*(\d+\.?\d*)\s*%/)
  if (proteinMatch) result.protein = parseFloat(proteinMatch[1])

  const fatMatch = text.match(/粗脂肪?\s*[≥>]\s*(\d+\.?\d*)\s*%/)
  if (fatMatch) result.fat = parseFloat(fatMatch[1])

  const fiberMatch = text.match(/粗纤维\s*[≤<]\s*(\d+\.?\d*)\s*%/)
  if (fiberMatch) result.fiber = parseFloat(fiberMatch[1])

  const ashMatch = text.match(/粗灰分\s*[≤<]\s*(\d+\.?\d*)\s*%/)
  if (ashMatch) result.ash = parseFloat(ashMatch[1])

  const moistureMatch = text.match(/水分\s*[≤<]\s*(\d+\.?\d*)\s*%/)
  if (moistureMatch) result.moisture = parseFloat(moistureMatch[1])

  return result
}

export function extractIngredientsFromText(text: string): string[] {
  const patterns = [
    /配料[：:]\s*([^\n]+)/i,
    /成分[：:]\s*([^\n]+)/i,
    /原料[：:]\s*([^\n]+)/i,
    /Ingredients[：:]\s*([^\n]+)/i,
    /主要原料[：:]\s*([^\n]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1]
        .split(/[,，、；;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }

  return []
}

export function extractNutritionFromText(text: string): {
  protein?: number
  fat?: number
  fiber?: number
  ash?: number
  moisture?: number
} {
  const proteinMatch = text.match(/蛋白质[：:]\s*(\d+\.?\d*)\s*%/)
  const fatMatch = text.match(/脂肪[：:]\s*(\d+\.?\d*)\s*%/)
  const fiberMatch = text.match(/粗纤维[：:]\s*(\d+\.?\d*)\s*%/)
  const ashMatch = text.match(/粗灰分[：:]\s*(\d+\.?\d*)\s*%/)
  const moistureMatch = text.match(/水分[：:]\s*(\d+\.?\d*)\s*%/)

  return {
    protein: proteinMatch ? parseFloat(proteinMatch[1]) : undefined,
    fat: fatMatch ? parseFloat(fatMatch[1]) : undefined,
    fiber: fiberMatch ? parseFloat(fiberMatch[1]) : undefined,
    ash: ashMatch ? parseFloat(ashMatch[1]) : undefined,
    moisture: moistureMatch ? parseFloat(moistureMatch[1]) : undefined,
  }
}
