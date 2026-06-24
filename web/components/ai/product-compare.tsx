"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, GitCompareArrows, Plus, X } from "lucide-react"

export function ProductCompare() {
  const [products, setProducts] = useState<string[]>(["", ""])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState("")

  function addProduct() {
    if (products.length < 4) {
      setProducts([...products, ""])
    }
  }

  function removeProduct(index: number) {
    if (products.length > 2) {
      setProducts(products.filter((_, i) => i !== index))
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
          message: `请对比以下猫粮产品，从适口性、软便率、复购率、价格、成分优劣、适合品种等维度进行详细对比分析：\n\n${validProducts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "对比失败")
      setResult(data.reply ?? "对比分析完成")
    } catch (err) {
      setError(err instanceof Error ? err.message : "对比失败")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompareArrows className="size-4 text-[#FF7A59]" />
            产品对比
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#6B6B6B]">
            输入 2-4 款猫粮产品名称，AI 将从多个维度进行详细对比分析。
          </p>

          <div className="space-y-3">
            {products.map((product, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A59]/10 text-xs font-semibold text-[#FF7A59]">
                  {i + 1}
                </span>
                <Input
                  value={product}
                  onChange={(e) => updateProduct(i, e.target.value)}
                  placeholder={`产品名称，例如：渴望六种鱼全猫粮`}
                  className="flex-1"
                />
                {products.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(i)}
                    className="shrink-0 text-[#6B6B6B] hover:text-[#E85D4A]"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {products.length < 4 && (
            <button
              type="button"
              onClick={addProduct}
              className="flex items-center gap-1 text-sm text-[#FF7A59] hover:text-[#E86A4A]"
            >
              <Plus className="size-3.5" /> 添加产品
            </button>
          )}

          <Button
            onClick={handleCompare}
            disabled={loading || products.filter((p) => p.trim()).length < 2}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            开始对比
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#E85D4A]/20 bg-[#E85D4A]/5 p-4">
          <p className="text-sm text-[#E85D4A]">{error}</p>
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none text-[#111111]">
              <div className="whitespace-pre-wrap text-sm leading-[1.8]">{result}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-[#111111]">对比维度</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#6B6B6B]">
            <p>• 适口性评分</p>
            <p>• 软便反馈率</p>
            <p>• 复购率</p>
            <p>• 成分优劣</p>
            <p>• 价格区间</p>
            <p>• 适合品种</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
