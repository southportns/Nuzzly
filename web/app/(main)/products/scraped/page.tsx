import { readFileSync } from "fs"
import { join } from "path"

interface ScrapedProduct {
  name: string
  brand: string
  price: number
  weight: string
  images?: string[]
  ingredientList?: string[]
  proteinPercent?: number
  fatPercent?: number
  fiberPercent?: number
  ashPercent?: number
  sourceUrl: string
  sourcePlatform: string
}

function getScrapedProducts(): ScrapedProduct[] {
  try {
    const filePath = join(process.cwd(), "../scripts/scraper/output/products.json")
    const data = readFileSync(filePath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Failed to load scraped products:", error)
    return []
  }
}

export const metadata = {
  title: "爬取产品数据 — Nuzzly毛球镇",
}

export default function ScrapedProductsPage() {
  const products = getScrapedProducts()

  return (
    <div className="bg-[#F7F6F3] min-h-screen">
      <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold leading-[1.1] text-[#111111] md:text-[40px]">
            爬取产品数据
          </h1>
          <p className="mt-3 text-[17px] text-[#6B6B6B]">
            从波奇网爬取的猫咪食品数据（共 {products.length} 个产品）
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[17px] text-[#6B6B6B]">暂无爬取数据</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: ScrapedProduct }) {
  const mainImage = product.images?.[0] || null

  return (
    <div className="rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-white overflow-hidden transition-all hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
      {/* Product image */}
      <div className="aspect-[4/3] bg-[#F0EFED] relative overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[48px]">
            🐱
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Brand & Name */}
        <p className="text-[13px] text-[#FF7A59] font-medium">{product.brand}</p>
        <p className="mt-1 text-[16px] font-semibold leading-[1.3] text-[#111111] line-clamp-2">
          {product.name}
        </p>

        {/* Price & Weight */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[20px] font-bold text-[#FF7A59]">
            ¥{product.price}
          </span>
          <span className="text-[13px] text-[#6B6B6B] bg-[#F0EFED] px-2 py-1 rounded-full">
            {product.weight}
          </span>
        </div>

        {/* Nutrition */}
        {(product.proteinPercent || product.fatPercent) && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {product.proteinPercent && (
              <span className="text-[12px] bg-[#E8F5E9] text-[#2E7D32] px-2 py-1 rounded-full">
                蛋白质 {product.proteinPercent}%
              </span>
            )}
            {product.fatPercent && (
              <span className="text-[12px] bg-[#FFF3E0] text-[#E65100] px-2 py-1 rounded-full">
                脂肪 {product.fatPercent}%
              </span>
            )}
            {product.fiberPercent && (
              <span className="text-[12px] bg-[#E3F2FD] text-[#1565C0] px-2 py-1 rounded-full">
                纤维 {product.fiberPercent}%
              </span>
            )}
          </div>
        )}

        {/* Ingredients preview */}
        {product.ingredientList && product.ingredientList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
            <p className="text-[12px] text-[#6B6B6B] mb-1">主要配料</p>
            <p className="text-[13px] text-[#111111] line-clamp-2">
              {product.ingredientList.slice(0, 4).join("、")}
              {product.ingredientList.length > 4 && "..."}
            </p>
          </div>
        )}

        {/* Source link */}
        <a
          href={product.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-[13px] text-[#FF7A59] hover:underline"
        >
          查看原页面 →
        </a>
      </div>
    </div>
  )
}
