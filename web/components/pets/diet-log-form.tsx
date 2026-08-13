"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { createDietLog } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { MultiPetSelector } from "@/components/pets/multi-pet-selector"
import { useTranslations } from "next-intl"

type FoodCategory = "staple" | "supplement"

const feedingFrequencyOptions: SelectOption[] = [
{ value: "Daily1", label: "1/day" },
{ value: "Daily2", label: "2/day" },
{ value: "Daily3", label: "3/day" },
{ value: "Weekly1-2", label: "1-2/week" },
{ value: "Weekly3-4", label: "3-4/week" },
{ value: "Irregular", label: "Irregular" },
]

const feedingDurationOptions: SelectOption[] = [
{ value: "Just started", label: "Just started" },
{ value: "1 week", label: "1 week" },
{ value: "1-2 weeks", label: "1-2 weeks" },
{ value: "2-4 weeks", label: "2-4 weeks" },
{ value: "1-3 months", label: "1-3 months" },
{ value: "3-6 months", label: "3-6 months" },
{ value: "6+ months", label: "6+ months" },
{ value: "1+ year", label: "1+ year" },
]

interface ProductOption { id: string; name: string; brand: string }

export function DietLogForm({ petId }: { petId: string }) {
const tHealth = useTranslations("Health")
const router = useRouter()
const { user } = useAuth()
const [loading, setLoading] = useState(false)
const [foodCategory, setFoodCategory] = useState<FoodCategory>("staple")
const [products, setProducts] = useState<ProductOption[]>([])
const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
const [foodName, setFoodName] = useState("")
const [feedingFrequency, setFeedingFrequency] = useState("Daily1")
const [feedingDuration, setFeedingDuration] = useState("")
const [open, setOpen] = useState(false)
const [productsLoaded, setProductsLoaded] = useState(false)
const [applyToPets, setApplyToPets] = useState<string[]>([])
const supabase = createClient()

useEffect(() => {
if (!open || productsLoaded) return
async function loadProducts() {
const { data } = await supabase.from("products").select("id, name, brand").eq("is_active", true).order("name")
setProducts(data || [])
setProductsLoaded(true)
}
loadProducts()
}, [open, productsLoaded, supabase])

const handleSelectProduct = useCallback((product: ProductOption | null) => {
setSelectedProduct(product)
if (product) setFoodName(product.name)
}, [])

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault()
if (loading) return
if (!user) { openLoginModal(); return }
const form = e.currentTarget
setLoading(true)
const formData = new FormData(form)
const dailyAmount = (formData.get("daily_amount") as string) || ""
const notes = (formData.get("notes") as string) || ""
const parts: string[] = []
if (foodCategory === "staple") { if (dailyAmount) parts.push(dailyAmount) }
else { parts.push(feedingFrequency) }
if (feedingDuration) parts.push(feedingDuration)
if (notes) parts.push(notes)
const mergedNotes = parts.length > 0 ? parts.join(" | ") : null

const { error } = await createDietLog({
pet_id: petId, food_name: foodName, food_type: foodCategory,
logged_date: new Date().toISOString().split("T")[0],
notes: mergedNotes, product_id: selectedProduct?.id ?? null,
}, user.id)

let siblingCount = 0
if (applyToPets.length > 0) {
for (const siblingPetId of applyToPets) {
const { error: sibErr } = await createDietLog({
pet_id: siblingPetId, food_name: foodName, food_type: foodCategory,
logged_date: new Date().toISOString().split("T")[0],
notes: mergedNotes, product_id: selectedProduct?.id ?? null,
}, user.id)
if (!sibErr) siblingCount++
}
}

setLoading(false)
if (error) { toast.error(error.message); return }
if (siblingCount > 0) {
toast.success(tHealth("dietRecordAddedWithPets", { count: siblingCount }))
} else {
toast.success(tHealth("dietRecordAdded"))
}
form.reset()
setFoodCategory("staple"); setSelectedProduct(null); setFoodName("")
setFeedingFrequency("Daily1"); setFeedingDuration(""); setApplyToPets([])
router.refresh()
}

return (<form onSubmit={handleSubmit} className="space-y-4">
<div className="space-y-2">
<Label>{tHealth("brandProduct")}</Label>
<Popover open={open} onOpenChange={setOpen}>
<PopoverTrigger asChild>
<Button variant="outline" role="combobox" aria-expanded={open}
className="w-full justify-between rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] font-normal text-[#111111] hover:bg-white">
{selectedProduct ? `${selectedProduct.brand} · ${selectedProduct.name}` : tHealth("searchBrandProduct")}
</Button>
</PopoverTrigger>
<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
<Command>
<CommandInput placeholder={tHealth("searchBrandProduct")} className="h-9" />
<CommandList>
{!productsLoaded && open && (<div className="flex items-center justify-center py-6 text-[13px] text-[#9A9A95]">{tHealth("loadingProducts")}</div>)}
{productsLoaded && <CommandEmpty>{tHealth("noProductFound")}</CommandEmpty>}
<CommandGroup>
{products.map((product) => (<CommandItem key={product.id} value={`${product.brand} ${product.name}`}
onSelect={() => { handleSelectProduct(product); setOpen(false) }}>
<FluentEmoji src={FLUENT_EMOJI.checkMark} alt="check mark" size={16}
className={cn("mr-2", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")} />
<span className="font-medium">{product.name}</span>
<span className="ml-1 text-muted-foreground"> · {product.brand}</span>
</CommandItem>))}
</CommandGroup>
</CommandList>
</Command>
</PopoverContent>
</Popover>
<p className="text-[11px] text-[#9A9A95]">{tHealth("selectProductHint")}</p>
</div>

<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label htmlFor="food_name">{tHealth("foodNameLabel")}</Label>
<Input id="food_name" name="food_name" required value={foodName}
onChange={(e) => { setFoodName(e.target.value); if (selectedProduct && e.target.value !== selectedProduct.name) setSelectedProduct(null) }}
placeholder={selectedProduct ? tHealth("foodNamePlaceholderAuto") : tHealth("foodNamePlaceholderEmpty")} />
</div>
<div className="space-y-2">
<Label>{tHealth("typeLabel")}</Label>
<div className="flex gap-1 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F2F1EE] p-1">
<button type="button" onClick={() => setFoodCategory("staple")}
className={cn("flex-1 rounded-[8px] px-3 py-2 text-[14px] font-medium transition-all",
foodCategory === "staple" ? "bg-white text-[#E85D4A] shadow-sm" : "text-[#6B6B6B] hover:text-[#111111]")}>
{tHealth("stapleFood")}
</button>
<button type="button" onClick={() => setFoodCategory("supplement")}
className={cn("flex-1 rounded-[8px] px-3 py-2 text-[14px] font-medium transition-all",
foodCategory === "supplement" ? "bg-white text-[#E85D4A] shadow-sm" : "text-[#6B6B6B] hover:text-[#111111]")}>
{tHealth("supplementFood")}
</button>
</div>
</div>
</div>

<div className="grid grid-cols-2 gap-4">
{foodCategory === "staple" ? (<div className="space-y-2">
<Label htmlFor="daily_amount">{tHealth("dailyAmount")}</Label>
<Input id="daily_amount" name="daily_amount" placeholder={tHealth("dailyAmountPlaceholder")} />
</div>) : (<div className="space-y-2">
<Label>{tHealth("feedingFrequency")}</Label>
<SelectDropdown value={feedingFrequency} onChange={setFeedingFrequency} options={feedingFrequencyOptions} />
</div>)}
<div className="space-y-2">
<Label>{tHealth("feedingDuration")}</Label>
<SelectDropdown value={feedingDuration} onChange={setFeedingDuration}
options={feedingDurationOptions} placeholder={tHealth("feedingDurationPlaceholder")} />
</div>
</div>

<div className="space-y-2">
<Label htmlFor="notes">{tHealth("notesLabel")}</Label>
<Input id="notes" name="notes" placeholder={tHealth("notesPlaceholder")} />
</div>

<MultiPetSelector currentPetId={petId} selectedPetIds={applyToPets} onChange={setApplyToPets} />

<Button type="submit" size="sm" disabled={loading}>
{loading && <FluentEmoji src={FLUENT_EMOJI.hourglass} alt="hourglass" size={16} className="mr-2 animate-spin" />}
{tHealth("addRecordBtn")}
</Button>
</form>)
}
