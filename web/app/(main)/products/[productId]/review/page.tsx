import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ReviewWizard } from "@/components/reviews/review-wizard"
import { ShieldCheck } from "lucide-react"

export default async function ReviewPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single()

  if (!product) notFound()

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="text-sm text-muted-foreground">结构化真实反馈</span>
        </div>
        <h1 className="text-2xl font-bold">评价产品</h1>
        <p className="mt-1 text-muted-foreground">{product.name}</p>
      </div>

      <ReviewWizard productId={productId} productName={product.name} />
    </div>
  )
}
