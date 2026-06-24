"use client"

import { useEffect, useRef } from "react"
import { trackIntentEvent } from "@/lib/tracking/intent-tracker"

export function ProductViewTracker({ productId, userId }: { productId: string; userId: string }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    trackIntentEvent({
      userId,
      eventType: "product_view",
      productId,
    })
  }, [userId, productId])

  return null
}
