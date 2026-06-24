"use client"

import { useState, useTransition } from "react"
import { createBookmarkAction, deleteBookmarkAction } from "@/app/(main)/products/[productId]/actions"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { trackIntentEvent } from "@/lib/tracking/intent-tracker"

export function BookmarkButton({ productId, userId, initialBookmarked }: { productId: string; userId?: string; initialBookmarked: boolean }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      if (!userId) {
        toast.error("请先登录")
        return
      }
      // P1: route through Write Gateway
      if (bookmarked) {
        const { error } = await deleteBookmarkAction(userId, productId, userId)
        if (error) { toast.error(error.message); return }
        setBookmarked(false)
        toast.success("已取消收藏")
        await trackIntentEvent({ userId, eventType: "product_unbookmark", productId })
      } else {
        const { error } = await createBookmarkAction(userId, productId, userId)
        if (error) { toast.error(error.message); return }
        setBookmarked(true)
        toast.success("已收藏")
        await trackIntentEvent({ userId, eventType: "product_bookmark", productId })
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
        bookmarked
          ? "bg-[#FF7A59]/10 text-[#FF7A59]"
          : "bg-[#F0EFED] text-[#6B6B6B] hover:text-[#FF7A59]"
      )}
    >
      <Heart
        className={cn("size-4 transition-all", bookmarked && "fill-[#FF7A59]")}
      />
      {bookmarked ? "已收藏" : "收藏"}
    </button>
  )
}
