"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <EmojiIcon name="CircleCheckIcon" className="size-4" />
        ),
        info: (
          <EmojiIcon name="InfoIcon" className="size-4" />
        ),
        warning: (
          <EmojiIcon name="TriangleAlertIcon" className="size-4" />
        ),
        error: (
          <EmojiIcon name="OctagonXIcon" className="size-4" />
        ),
        loading: (
          <EmojiIcon name="Loader2Icon" className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
