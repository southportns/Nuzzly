import { ProductCarousel, type ProductData } from "@/components/home/product-carousel"
import { getTranslations } from "next-intl/server"

const fallbackProducts: ProductData[] = [
{ id: "1", name: "Ragdoll-Specific Cat Food", brand: "Royal Canin", palatability: "92%", stoolRate: "3.2%", repurchase: "78%", avgRating: "4.6" },
{ id: "2", name: "Six Fish Cat Food", brand: "Orijen", palatability: "88%", stoolRate: "5.1%", repurchase: "71%", avgRating: "4.4" },
{ id: "3", name: "Farm Harvest Cat Food", brand: "Acana", palatability: "85%", stoolRate: "4.8%", repurchase: "68%", avgRating: "4.3" },
{ id: "4", name: "Nine Meats Cat Food", brand: "GO! Solutions", palatability: "82%", stoolRate: "6.3%", repurchase: "62%", avgRating: "4.1" },
{ id: "5", name: "High Protein Cat Food", brand: "Instinct", palatability: "86%", stoolRate: "3.8%", repurchase: "73%", avgRating: "4.5" },
{ id: "6", name: "Black Diamond Cat Food", brand: "Nutrience", palatability: "80%", stoolRate: "4.5%", repurchase: "65%", avgRating: "4.0" },
]

export async function HotCatFoodSection({ initialProducts }: { initialProducts?: ProductData[] | null }) {
const t = await getTranslations("HotProducts")
const products = initialProducts?? fallbackProducts

return (<section className="mx-auto max-w-[1440px] px-6 pb-24 md:px-12">
<div className="flex items-baseline justify-between">
<div>
<h2 className="text-[32px] font-bold leading-tight text-[#111111] md:text-[40px]">
{t("title")}
</h2>
<p className="mt-2 text-[15px] text-[#6B6B6B]">
{t("subtitle")}
</p>
</div>
</div>

<div className="mt-8">
<ProductCarousel products={products} />
</div>
</section>)
}
