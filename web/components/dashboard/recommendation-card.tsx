"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, ExternalLink, Sparkles, ChevronDown } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface RecommendationCardProps {
  recommendation: {
    id: string
    pet_id: string | null
    product_id: string | null
    score?: number
    score_breakdown?: Record<string, number>
    reason?: string | null
    created_at: string | null
    products?: {
      id: string
      name: string
      brand: string
      image_url?: string
      price?: number
      score?: number
    } | null
  }
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [showReason, setShowReason] = useState(false)
  const product = recommendation.products

  if (!product) return null

  const score = Math.round(recommendation.score * 100)
  const scoreColor = score >= 80 ? "#34C759" : score >= 60 ? "#FF9500" : "#FF3B30"

  const handleFeedback = async (action: "accept" | "reject") => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: action,
          product_id: product.id,
          recommendation_id: recommendation.id,
        }),
      })

      if (res.ok) {
        toast.success(action === "accept" ? "已采纳推荐" : "已拒绝推荐")
      }
    } catch {
      toast.error("操作失败，请重试")
    }
  }

  return (
    <div className="group rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-4 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      {/* Product Image + Score */}
      <div className="relative mb-3 aspect-square overflow-hidden rounded-[12px] bg-[#F7F6F3]">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🐱</div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[12px] font-semibold" style={{ color: scoreColor }}>
          <Sparkles className="size-3" />
          {score}分
        </div>
      </div>

      {/* Product Info */}
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-[#111111] line-clamp-1">{product.name}</h3>
        <p className="text-[12px] text-[#6B6B6B]">{product.brand}</p>
        {product.price && (
          <p className="mt-1 text-[15px] font-semibold text-[#FF7A59]">¥{product.price}</p>
        )}
      </div>

      {/* Score Breakdown */}
      {recommendation.score_breakdown && (
        <button
          type="button"
          onClick={() => setShowReason(!showReason)}
          className="mb-3 flex w-full items-center justify-between text-[12px] text-[#6B6B6B] hover:text-[#111111]"
        >
          <span>为什么推荐？</span>
          <ChevronDown className={`size-3.5 transition-transform ${showReason ? "rotate-180" : ""}`} />
        </button>
      )}

      {showReason && recommendation.score_breakdown && (
        <div className="mb-3 space-y-1.5 rounded-[10px] bg-[#F7F6F3] p-3 text-[12px]">
          {Object.entries(recommendation.score_breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">
                {key === "health_match" && "健康匹配"}
                {key === "breed_suitability" && "品种适配"}
                {key === "community_feedback" && "社区反馈"}
                {key === "ingredient_safety" && "成分安全"}
                {key === key && key}
              </span>
              <span className="font-medium text-[#111111]">{Math.round(value * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Reason text */}
      {recommendation.reason && (
        <p className="mb-3 text-[12px] text-[#6B6B6B]">{recommendation.reason}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full text-[12px]"
          onClick={() => handleFeedback("accept")}
        >
          <ThumbsUp className="mr-1 size-3.5 text-[#34C759]" />
          采纳
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full text-[12px]"
          onClick={() => handleFeedback("reject")}
        >
          <ThumbsDown className="mr-1 size-3.5 text-[#FF3B30]" />
          不感兴趣
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          asChild
        >
          <Link href={`/products/${product.id}`}>
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
