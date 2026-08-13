import { cn } from "@/lib/utils"

interface SettingsCardProps {
  children: React.ReactNode
  className?: string
}

/**
 * Apple-style frosted glass card.
 * — backdrop-blur + translucent white + layered shadow + ring
 */
export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border border-white/60 bg-white/65 backdrop-blur-2xl",
        "shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)]",
        "ring-1 ring-black/[0.03]",
        className
      )}
    >
      {children}
    </section>
  )
}
