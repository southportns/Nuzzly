"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { deleteDietLog } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"

interface DietLog {
id: string
food_name: string
food_type: string | null
product_id: string | null
logged_date: string
notes: string | null
products?: { name: string; brand: string } | null
}

export function DietLogList({ initialLogs }: { initialLogs: DietLog[] }) {
const t = useTranslations("Pet")
const locale = useLocale()
const dateLocale = locale === "zh" ? "zh-CN" : "en-US"
const [logs, setLogs] = useState(initialLogs)
const [deletingId, setDeletingId] = useState<string | null>(null)
const router = useRouter()
const { user } = useAuth()

const foodTypeLabels = useMemo<Record<string, string>>(() => ({
staple: t("stapleLabel"),
supplement: t("supplementLabel"),
dry_food: t("dryFoodLabel"),
wet_food: t("wetFoodLabel"),
snack: t("snackLabel"),
homemade: t("homemadeLabel"),
other: t("otherLabel"),
}), [t])

const foodTypeStyles: Record<string, string> = {
staple: "bg-[#FFF1EB] text-[#E85D4A] border-[#FFD9CC]",
supplement: "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]",
}

async function handleDelete(id: string) {
if (!user) { openLoginModal(); return }
if (!confirm(t("deleteDietConfirm"))) return

setDeletingId(id)
const { error } = await deleteDietLog(id, user.id)
setDeletingId(null)

if (error) {
toast.error(error.message)
return
}

setLogs((prev) => prev.filter((log) => log.id !== id))
toast.success(t("deleteDietSuccess"))
router.refresh()
}

if (logs.length === 0) {
return <p className="text-sm text-[#6B6B6B]">{t("noDietRecord")}</p>
}

return (<div className="space-y-2">
{logs.map((log) => (<div key={log.id} className="flex items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.06)] p-3">
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<span className="text-sm font-medium text-[#111111]">{log.food_name}</span>
{log.products?.brand && (<Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.products.brand}</Badge>)}
</div>
<div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#6B6B6B]">
<span
className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium",
foodTypeStyles[log.food_type ?? ""] ??
"bg-[#F2F1EE] text-[#6B6B6B] border-[rgba(0,0,0,0.06)]",)}
>
{foodTypeLabels[log.food_type ?? ""] ?? log.food_type}
</span>
{log.notes?.split(" | ").map((part, i) => (<span key={i} className="truncate">{part}</span>))}
</div>
</div>
<div className="flex items-center gap-2 shrink-0">
<span className="text-xs text-[#6B6B6B]">
{new Date(log.logged_date).toLocaleDateString(dateLocale)}
</span>
<Button
variant="ghost"
size="icon"
className="size-7 text-[#D2D1CF] hover:text-[#E85D4A] hover:bg-[#E85D4A]/10"
onClick={() => handleDelete(log.id)}
disabled={deletingId === log.id}
>
<FluentEmoji src={FLUENT_EMOJI.trash} alt="wastebasket" size={14} />
</Button>
</div>
</div>))}
</div>)
}
