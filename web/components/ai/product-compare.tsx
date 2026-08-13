"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

export function ProductComparison() {
const [products, setProducts] = useState<string[]>(["", ""])
const [loading, setLoading] = useState(false)
const [result, setResult] = useState<string | null>(null)
const [error, setError] = useState("")
const t = useTranslations("AI")

function addProduct() {
if (products.length < 4) {
setProducts([...products, ""])
}
}

function removeProduct(index: number) {
if (products.length > 2) {
setProducts(products.filter((_, i) => i!== index))
}
}

function updateProduct(index: number, value: string) {
const updated = [...products]
updated[index] = value
setProducts(updated)
}

async function handleCompare() {
const validProducts = products.filter((p) => p.trim())
if (validProducts.length < 2) return

setLoading(true)
setError("")
setResult(null)
try {
const response = await fetch("/api/ai/chat", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
message: `pleaseCompare Cat FoodProduct,from Palatability,Soft Stool Rate,Repurchase Rate,Price,Ingredients,Breed etc.DimensionCompareAnalysis:\n\n${validProducts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
}),
})
const data = await response.json()
if (!response.ok) throw new Error(data.error?? t("compareFailed"))
setResult(data.reply?? "")
} catch (err) {
setError(err instanceof Error? err.message: t("compareFailed"))
}
setLoading(false)
}

return (<div className="space-y-6">
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2 text-base">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-[#FF7A59]">
<circle cx="3.75" cy="5.25" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<circle cx="3.75" cy="12.75" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<line x1="8.75" y1="5.25" x2="16.25" y2="5.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<line x1="8.75" y1="12.75" x2="16.25" y2="12.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</svg>
{t("productComparisonTitle")}
</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<p className="text-sm text-[#6B6B6B]">
{t("productComparisonDesc")}
</p>

<div className="space-y-3">
{products.map((product, i) => (<div key={i} className="flex items-center gap-2">
<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A59]/10 text-xs font-semibold text-[#FF7A59]">
{i + 1}
</span>
<Input
value={product}
onChange={(e) => updateProduct(i, e.target.value)}
placeholder={t("productNamePlaceholder")}
className="flex-1"
/>
{products.length > 2 && (<button
type="button"
onClick={() => removeProduct(i)}
className="shrink-0 text-[#6B6B6B] hover:text-[#E85D4A]"
>
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-4">
<g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
<path d="M4,14.75c-.192,0-.384-.073-.53-.22-.293-.293-.293-.768,0-1.061L13.47,3.47c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061L4.53,14.53c-.146,.146-.338,.22-.53,.22Z" fill="currentColor" data-color="color-2" />
<path d="M14,14.75c-.192,0-.384-.073-.53-.22L3.47,4.53c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0L14.53,13.47c.293,.293,.293,.768,0,1.061-.146,.146-.338,.22-.53,.22Z" fill="currentColor" />
</g>
</svg>
</button>)}
</div>))}
</div>

{products.length < 4 && (<button
type="button"
onClick={addProduct}
className="flex items-center gap-1 text-sm text-[#FF7A59] hover:text-[#E86A4A]"
>
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 18 18" className="text-[#FF7A59]">
<g transform="translate(18 0) scale(-1 1)">
<line x1="9" y1="3.25" x2="9" y2="14.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<line x1="3.25" y1="9" x2="14.75" y2="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</g>
</svg>{t("addProduct")}
</button>)}

<Button
onClick={handleCompare}
disabled={loading || products.filter((p) => p.trim()).length < 2}
>
{loading && <EmojiIcon name="Loader2" className="mr-2 size-4 animate-spin" />}
{t("startCompare")}
</Button>
</CardContent>
</Card>

{error && (<div className="rounded-[12px] border border-[#E85D4A]/20 bg-[#E85D4A]/5 p-4">
<p className="text-sm text-[#E85D4A]">{error}</p>
</div>)}

{result && (<Card>
<CardContent className="pt-6">
<div className="prose prose-sm max-w-none text-[#111111]">
<div className="whitespace-pre-wrap text-sm leading-[1.8]">{result}</div>
</div>
</CardContent>
</Card>)}

{/* Tips */}
<Card className="border-dashed">
<CardContent className="pt-6">
<p className="text-sm font-medium text-[#111111]">{t("compareDimensions")}</p>
<div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#6B6B6B]">
<p>• {t("dimPalatability")}</p>
<p>• {t("dimSoftStool")}</p>
<p>• {t("dimRepurchase")}</p>
<p>• {t("dimIngredients")}</p>
<p>• {t("dimPrice")}</p>
<p>• {t("dimBreed")}</p>
</div>
</CardContent>
</Card>
</div>)
}
