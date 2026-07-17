/**
 * 统一爬虫入口
 * 用法: npx tsx scrape.ts [platform] [keyword] [limit]
 *
 * 示例:
 *   npx tsx scrape.ts taobao 猫粮 50
 *   npx tsx scrape.ts boqii 猫粮 50
 */

import { TaobaoScraper, BoqiiScraper, PetFoodProduct } from "./standard_scraper"
import { writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const args = process.argv.slice(2)
  const platform = args[0] || "taobao"
  const keyword = args[1] || "猫粮"
  const limit = parseInt(args[2]) || 50

  console.log("========================================")
  console.log("   Pet Food Scraper - Standardized")
  console.log("========================================")
  console.log(`Platform: ${platform}`)
  console.log(`Keyword: ${keyword}`)
  console.log(`Limit: ${limit}`)
  console.log("========================================\n")

  let scraper
  switch (platform) {
    case "taobao":
      scraper = new TaobaoScraper()
      break
    case "boqii":
      scraper = new BoqiiScraper()
      break
    default:
      console.error(`Unknown platform: ${platform}`)
      console.error("Supported platforms: taobao, boqii")
      process.exit(1)
  }

  try {
    await scraper.init(platform === "taobao")
    const products = await scraper.search(keyword, limit)

    console.log(`\n=== Results: ${products.length} products ===\n`)
    products.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`)
      console.log(`   Brand: ${p.brand} | Price: ¥${p.price} | Weight: ${p.weight || "N/A"}`)
      console.log(`   Price/kg: ¥${p.pricePerKg}/kg | Mfg: ${p.manufacturer || "N/A"}`)
      console.log(`   Images: ${p.images.length} | Sales: ${p.sales || "N/A"}`)
      console.log("")
    })

    // 统计
    const withIngredients = products.filter(p => p.ingredients).length
    const withImages = products.filter(p => p.images.length > 0).length
    const withMfg = products.filter(p => p.manufacturer).length
    console.log("=== Statistics ===")
    console.log(`Total products: ${products.length}`)
    console.log(`With ingredients: ${withIngredients}`)
    console.log(`With images: ${withImages}`)
    console.log(`With manufacturer: ${withMfg}`)

    await scraper.saveProducts(products)
    console.log("\nDone!")
  } finally {
    await scraper.close()
  }
}

main().catch(console.error)
