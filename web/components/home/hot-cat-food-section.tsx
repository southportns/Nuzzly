import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ProductCarousel } from "@/components/home/product-carousel"
import { queryTopCatFood } from "@/lib/supabase/query"

const fallbackProducts = [
  { id: "1", name: "皇家布偶猫专属粮", brand: "Royal Canin", palatability: "92%", stoolRate: "3.2%", repurchase: "78%", avgRating: "4.6" },
  { id: "2", name: "渴望六种鱼全猫粮", brand: "Orijen", palatability: "88%", stoolRate: "5.1%", repurchase: "71%", avgRating: "4.4" },
  { id: "3", name: "爱肯拿农场盛宴", brand: "Acana", palatability: "85%", stoolRate: "4.8%", repurchase: "68%", avgRating: "4.3" },
  { id: "4", name: "GO! 九种肉全猫粮", brand: "GO! Solutions", palatability: "82%", stoolRate: "6.3%", repurchase: "62%", avgRating: "4.1" },
  { id: "5", name: "百利高蛋白猫粮", brand: "Instinct", palatability: "86%", stoolRate: "3.8%", repurchase: "73%", avgRating: "4.5" },
  { id: "6", name: "纽翠斯黑钻猫粮", brand: "Nutrience", palatability: "80%", stoolRate: "4.5%", repurchase: "65%", avgRating: "4.0" },
]

export async function HotCatFoodSection() {
  const { data: dbProducts } = await queryTopCatFood(10)
  const products = dbProducts ?? fallbackProducts

  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-24 md:px-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[32px] font-bold leading-tight text-[#111111] md:text-[40px]">
            热门猫粮
          </h2>
          <p className="mt-2 text-[15px] text-[#6B6B6B]">
            基于社区真实反馈数据，每日更新推荐
          </p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-0.5 text-[15px] font-medium text-[#FF7A59] transition-colors hover:text-[#E86A4A]"
        >
          查看全部 <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8">
        <ProductCarousel products={products} />
      </div>
    </section>
  )
}
