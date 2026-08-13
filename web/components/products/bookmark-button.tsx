"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useTransition } from "react"
import { createBookmarkAction, deleteBookmarkAction } from "@/app/(main)/products/[productId]/actions"
import { cn } from "@/lib/utils"
import { openLoginModal } from "@/hooks/use-login-modal"
import { toast } from "sonner"
import { trackIntentEvent } from "@/lib/tracking/intent-tracker"
import { useTranslations } from "next-intl"

export function BookmarkButton({ productId, userId, initialBookmarked }: { productId: string; userId?: string; initialBookmarked: boolean }) {
  const t = useTranslations("Common")
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      if (!userId) {
        openLoginModal()
        return
      }
      if (bookmarked) {
        const { error } = await deleteBookmarkAction(userId, productId, userId)
        if (error) { toast.error(error.message); return }
        setBookmarked(false)
        toast.success(t("cancelBookmark"))
        await trackIntentEvent({ userId, eventType: "product_unbookmark", productId })
      } else {
        const { error } = await createBookmarkAction(userId, productId, userId)
        if (error) { toast.error(error.message); return }
        setBookmarked(true)
        toast.success(t("bookmarked"))
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
      <EmojiIcon name="Heart"
        className={cn("size-4 transition-all", bookmarked && "fill-[#FF7A59]")}
      />
      {bookmarked ? t("bookmarked") : t("bookmark")}
    </button>
  )
}
