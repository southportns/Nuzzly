import Link from "next/link"

interface ProductCardProps {
  product: {
    id: string
    name: string
    brand: string
    price_min: number | null
    price_max: number | null
    applicable_species: string
    applicable_age: string
    product_categories?: { name: string; slug: string } | null
  }
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-white p-5 transition-all hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
    >
      {/* Product image placeholder */}
      <div className="flex aspect-[4/3] items-center justify-center rounded-[16px] bg-[#F0EFED] text-[32px]">
        🐱
      </div>
      <div className="mt-4">
        <p className="text-[14px] text-[#6B6B6B]">{product.brand}</p>
        <p className="mt-0.5 text-[17px] font-semibold leading-[1.24] tracking-[-0.022em] text-[#111111]">
          {product.name}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] pt-3">
        <div className="flex gap-2">
          <span className="rounded-full bg-[#F0EFED] px-2 py-0.5 text-[12px] text-[#6B6B6B]">
            {product.applicable_species === "cats" ? "猫咪" : product.applicable_species === "dogs" ? "狗狗" : "通用"}
          </span>
          {product.product_categories && (
            <span className="rounded-full bg-[#F0EFED] px-2 py-0.5 text-[12px] text-[#6B6B6B]">
              {product.product_categories.name}
            </span>
          )}
        </div>
        {product.price_min != null && (
          <span className="text-[14px] font-semibold text-[#111111]">
            ¥{Number(product.price_min)}
          </span>
        )}
      </div>
    </Link>
  )
}
