import { cn } from "@/lib/utils"

interface SettingsCardProps {
  children: React.ReactNode
  className?: string
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white",
        className
      )}
    >
      {children}
    </section>
  )
}
