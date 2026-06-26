# Pet Food Scraper Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/pet-food-scraper.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Playwright-based web scraper to collect 100-500 pet food products from Chinese pet vertical platforms (波奇网, E宠商城) with basic info, nutrition, ingredients, and applicability data.

**Architecture:** Modular scraper with platform-specific adapters, shared parsing logic, and data validation pipeline. Output as JSON for direct Supabase import.

**Tech Stack:** TypeScript, Playwright, Cheerio (HTML parsing), Zod (validation)

## Global Constraints

- TypeScript strict mode
- No external dependencies beyond Playwright, Cheerio, Zod
- Respect robots.txt and rate limits (1-2 requests/second)
- Output must match Supabase `products` table schema

---

### Task 1: Project Setup

**Covers:** None (scaffolding)

**Files:**
- Create: `scripts/scraper/package.json`
- Create: `scripts/scraper/tsconfig.json`
- Create: `scripts/scraper/src/index.ts`

**Interfaces:** None

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pet-food-scraper",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "scrape": "tsx src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "cheerio": "^1.0.0-rc.12",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create basic index.ts**

```typescript
console.log("Pet Food Scraper - Ready")
```

- [ ] **Step 4: Install dependencies**

```bash
cd scripts/scraper && npm install
```

- [ ] **Step 5: Commit**

```bash
git add scripts/scraper/
git commit -m "feat: scaffold pet food scraper project"
```

---

### Task 2: Product Schema Definition

**Covers:** S1 (data fields)

**Files:**
- Create: `scripts/scraper/src/schemas/product.ts`
- Create: `scripts/scraper/src/schemas/__tests__/product.test.ts`

**Interfaces:** None

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest"
import { ProductSchema } from "../product"

describe("ProductSchema", () => {
  it("validates a complete product", () => {
    const product = {
      name: "皇家猫粮成猫粮",
      brand: "皇家",
      price: 299,
      weight: "2kg",
      proteinPercent: 32.5,
      fatPercent: 18.2,
      fiberPercent: 4.5,
      ashPercent: 7.8,
      moisturePercent: 8.0,
      carbohydrateEst: 29.0,
      ingredientList: ["鸡肉", "鱼粉", "玉米"],
      lifeStage: "adult",
      applicableSpecies: ["cats"],
      grainFree: false,
      countryOfOrigin: "中国",
      sourceUrl: "https://example.com/product/123",
      sourcePlatform: "boqii",
    }
    expect(ProductSchema.parse(product)).toEqual(product)
  })

  it("rejects product without required fields", () => {
    expect(() => ProductSchema.parse({ name: "test" })).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd scripts/scraper && npm test
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
import { z } from "zod"

export const ProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  price: z.number().positive(),
  weight: z.string(),
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
  sourceUrl: z.string().url(),
  sourcePlatform: z.string(),
})

export type Product = z.infer<typeof ProductSchema>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd scripts/scraper && npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/scraper/src/schemas/
git commit -m "feat: add product schema with validation"
```

---

### Task 3: Base Scraper Class

**Covers:** None (infrastructure)

**Files:**
- Create: `scripts/scraper/src/scraper/base.ts`
- Create: `scripts/scraper/src/scraper/__tests__/base.test.ts`

**Interfaces:**
- Produces: `BaseScraper` class with `scrape()`, `parseProduct()`, `close()` methods

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest"
import { BaseScraper } from "../base"

describe("BaseScraper", () => {
  it("has required methods", () => {
    const scraper = new BaseScraper("test")
    expect(typeof scraper.scrape).toBe("function")
    expect(typeof scraper.parseProduct).toBe("function")
    expect(typeof scraper.close).toBe("function")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd scripts/scraper && npm test
```

Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
import { chromium, Browser, Page } from "playwright"
import { Product } from "../schemas/product"

export abstract class BaseScraper {
  protected browser: Browser | null = null
  protected page: Page | null = null
  protected platform: string
  protected delayMs = 1000

  constructor(platform: string) {
    this.platform = platform
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: true })
    this.page = await this.browser.newPage()
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  protected async delay(): Promise<void> {
    await new Promise((r) => setTimeout(r, this.delayMs))
  }

  abstract scrape(urls: string[]): Promise<Product[]>
  abstract parseProduct(html: string, url: string): Promise<Product | null>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd scripts/scraper && npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/scraper/src/scraper/
git commit -m "feat: add base scraper class"
```

---

### Task 4: Boqii Scraper

**Covers:** S2 (platform adapter)

**Files:**
- Create: `scripts/scraper/src/scraper/boqii.ts`
- Create: `scripts/scraper/src/scraper/__tests__/boqii.test.ts`

**Interfaces:**
- Consumes: `BaseScraper` class
- Produces: `BoqiiScraper` class

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest"
import { BoqiiScraper } from "../boqii"

describe("BoqiiScraper", () => {
  it("can be instantiated", () => {
    const scraper = new BoqiiScraper()
    expect(scraper).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd scripts/scraper && npm test
```

Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
import { BaseScraper } from "./base"
import { Product } from "../schemas/product"
import * as cheerio from "cheerio"

export class BoqiiScraper extends BaseScraper {
  constructor() {
    super("boqii")
  }

  async scrape(urls: string[]): Promise<Product[]> {
    if (!this.page) await this.init()
    const products: Product[] = []

    for (const url of urls) {
      try {
        await this.page!.goto(url, { waitUntil: "domcontentloaded" })
        const html = await this.page!.content()
        const product = await this.parseProduct(html, url)
        if (product) products.push(product)
        await this.delay()
      } catch (e) {
        console.error(`Failed to scrape ${url}:`, e)
      }
    }

    return products
  }

  async parseProduct(html: string, url: string): Promise<Product | null> {
    const $ = cheerio.load(html)

    const name = $(".product-name").text().trim()
    const brand = $(".brand-name").text().trim()
    const priceText = $(".price").text().trim()
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ""))

    if (!name || !brand || isNaN(price)) return null

    return {
      name,
      brand,
      price,
      weight: $(".weight").text().trim() || "未知",
      sourceUrl: url,
      sourcePlatform: this.platform,
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd scripts/scraper && npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/scraper/src/scraper/boqii.ts
git commit -m "feat: add Boqii scraper implementation"
```

---

### Task 5: Data Exporter

**Covers:** S3 (export format)

**Files:**
- Create: `scripts/scraper/src/exporter.ts`
- Create: `scripts/scraper/src/__tests__/exporter.test.ts`

**Interfaces:**
- Consumes: `Product[]` from scrapers
- Produces: JSON file for Supabase import

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest"
import { exportToJSON } from "../exporter"
import { Product } from "../schemas/product"

describe("exportToJSON", () => {
  it("exports products to JSON string", () => {
    const products: Product[] = [
      {
        name: "Test",
        brand: "Brand",
        price: 100,
        weight: "1kg",
        sourceUrl: "https://example.com",
        sourcePlatform: "test",
      },
    ]
    const result = exportToJSON(products)
    expect(JSON.parse(result)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd scripts/scraper && npm test
```

Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
import { Product } from "./schemas/product"

export function exportToJSON(products: Product[]): string {
  return JSON.stringify(products, null, 2)
}

export function exportToCSV(products: Product[]): string {
  const headers = ["name", "brand", "price", "weight", "sourceUrl", "sourcePlatform"]
  const rows = products.map((p) =>
    headers.map((h) => JSON.stringify((p as any)[h] ?? "")).join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd scripts/scraper && npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/scraper/src/exporter.ts
git commit -m "feat: add data exporter for JSON/CSV"
```

---

### Task 6: CLI Entry Point

**Covers:** None (integration)

**Files:**
- Modify: `scripts/scraper/src/index.ts`

**Interfaces:**
- Consumes: `BoqiiScraper`, `exportToJSON`

- [ ] **Step 1: Implement CLI**

```typescript
import { BoqiiScraper } from "./scraper/boqii"
import { exportToJSON } from "./exporter"
import { writeFileSync } from "fs"

const BOQII_URLS = [
  "https://www.boqii.com/product/123",
  // Add more URLs here
]

async function main() {
  console.log("Starting Pet Food Scraper...")
  
  const scraper = new BoqiiScraper()
  try {
    const products = await scraper.scrape(BOQII_URLS)
    console.log(`Scraped ${products.length} products`)
    
    const json = exportToJSON(products)
    writeFileSync("output/products.json", json)
    console.log("Saved to output/products.json")
  } finally {
    await scraper.close()
  }
}

main().catch(console.error)
```

- [ ] **Step 2: Test run**

```bash
cd scripts/scraper && npm run scrape
```

Expected: Output file created

- [ ] **Step 3: Commit**

```bash
git add scripts/scraper/src/index.ts
git commit -m "feat: add CLI entry point"
```

---

### Task 7: Supabase Import Script

**Covers:** S4 (database integration)

**Files:**
- Create: `scripts/scraper/src/importer.ts`

**Interfaces:**
- Consumes: JSON file from exporter
- Produces: Supabase rows

- [ ] **Step 1: Create importer**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/scraper/src/importer.ts
git commit -m "feat: add Supabase importer"
```

---

## Execution Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Project Setup | None |
| 2 | Product Schema | Task 1 |
| 3 | Base Scraper | Task 1 |
| 4 | Boqii Scraper | Tasks 2, 3 |
| 5 | Data Exporter | Task 2 |
| 6 | CLI Entry | Tasks 4, 5 |
| 7 | Supabase Import | Task 5 |
