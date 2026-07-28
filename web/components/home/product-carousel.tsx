"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

interface ProductData {
  id: string
  name: string
  brand: string
  palatability: string
  stoolRate: string
  repurchase: string
  avgRating: string
}

export function ProductCarousel({ products }: { products: ProductData[] }) {
  const [duplicated, setDuplicated] = useState<ProductData[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [pauseOnHover, setPauseOnHover] = useState(false)

  useEffect(() => {
    // Duplicate products once for seamless loop (2x is enough for x: 0 → -totalWidth)
    setDuplicated([...products, ...products])
  }, [products])

  const cardWidth = 280
  const gap = 20
  const totalWidth = products.length * (cardWidth + gap)

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPauseOnHover(true)}
      onMouseLeave={() => setPauseOnHover(false)}
    >
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#F7F6F3] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#F7F6F3] to-transparent" />

      <motion.div
        ref={containerRef}
        className="flex gap-5"
        animate={{
          x: [0, -totalWidth],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: products.length * 6,
            ease: "linear",
          },
        }}
        style={{ width: "max-content" }}
        {...(pauseOnHover && { animate: { x: [0, -totalWidth], transition: { ...{ repeat: Infinity, repeatType: "loop" as const, duration: products.length * 6, ease: "linear" as const } } } })}
      >
        {duplicated.map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            href={`/products/${p.id}`}
            className="group flex w-[280px] flex-shrink-0 flex-col rounded-[28px] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_48px_rgba(0,0,0,0.06)]"
          >
            {/* Product image placeholder */}
            <div className="flex aspect-square items-center justify-center rounded-[20px] bg-[#F0EFED]">
              <EmojiIcon name="PawPrint" size={48} className="opacity-60" />
            </div>

            <div className="mt-4 flex flex-col gap-0.5">
              <span className="text-[13px] text-[#6B6B6B]">{p.brand}</span>
              <span className="text-[17px] font-semibold text-[#111111] line-clamp-1">{p.name}</span>
            </div>

            {/* Star rating */}
            <div className="mt-2 flex items-center gap-1">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <EmojiIcon
                    key={i}
                    name="Star"
                    size={14}
                    className={i < Math.round(Number(p.avgRating)) ? "" : "grayscale opacity-40"}
                  />
                ))}
              </div>
              <span className="text-[12px] text-[#6B6B6B]">{p.avgRating}</span>
            </div>

            {/* Data points */}
            <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] pt-4">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] text-[#6B6B6B]">适口性</span>
                <span className="text-[15px] font-semibold text-[#111111]">{p.palatability}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] text-[#6B6B6B]">软便率</span>
                <span className="text-[15px] font-semibold text-[#111111]">{p.stoolRate}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] text-[#6B6B6B]">复购率</span>
                <span className="text-[15px] font-semibold text-[#111111]">{p.repurchase}</span>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}
