import { BoqiiScraper } from "./scraper/boqii"
import { exportToJSON } from "./exporter"
import { writeFileSync, mkdirSync } from "fs"

const BASE_URL = "https://shop.boqii.com/cat/list-576-0-0-0-0-"
const TARGET_COUNT = 50

async function main() {
  console.log("Starting Pet Food Scraper - Top 50 by Sales...")
  console.log(`Target: boqii.com cat food, sorted by sales`)
  console.log(`Limit: ${TARGET_COUNT} products`)

  const scraper = new BoqiiScraper()
  const allProducts: any[] = []
  const seenUrls = new Set<string>()

  try {
    for (let page = 1; allProducts.length < TARGET_COUNT && page <= 5; page++) {
      const url = `${BASE_URL}${page}.html`
      console.log(`\nFetching page ${page}: ${url}`)

      const pageProducts = await scraper.scrapeListPage(url, 30)

      for (const p of pageProducts) {
        if (!seenUrls.has(p.sourceUrl) && allProducts.length < TARGET_COUNT) {
          seenUrls.add(p.sourceUrl)
          allProducts.push(p)
        }
      }

      console.log(`Page ${page}: found ${pageProducts.length} products, total: ${allProducts.length}`)
    }

    console.log(`\n=== Final Results: ${allProducts.length} products ===\n`)

    allProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ¥${p.price} (${p.weight}) [${p.catFoodType || "全期猫粮"}]`)
    })

    mkdirSync("output", { recursive: true })
    const json = exportToJSON(allProducts)
    writeFileSync("output/products.json", json)
    console.log("\nSaved to output/products.json")
  } finally {
    await scraper.close()
  }
}

main().catch(console.error)
