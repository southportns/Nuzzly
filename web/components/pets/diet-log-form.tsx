"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { createDietLog } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const foodTypeOptions: SelectOption[] = [
  { value: "dry_food", label: "干粮" },
  { value: "wet_food", label: "湿粮/罐头" },
  { value: "snack", label: "零食" },
  { value: "supplement", label: "保健品" },
  { value: "homemade", label: "自制猫饭" },
  { value: "other", label: "其他" },
]

interface ProductOption {
  id: string
  name: string
  brand: string
}

export function DietLogForm({ petId }: { petId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [foodType, setFoodType] = useState("dry_food")
  const [products, setProducts] = useState<ProductOption[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  // Load products for combobox
  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from("products")
        .select("id, name, brand")
        .eq("is_active", true)
        .order("name")
      setProducts(data || [])
    }
    loadProducts()
  }, [])

  // Auto-set food type when selecting a product
  const handleSelectProduct = useCallback((product: ProductOption | null) => {
    setSelectedProduct(product)
    if (product) {
      setFoodType("dry_food")
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) {
      toast.error("请先登录")
      return
    }
    const form = e.currentTarget
    setLoading(true)

    const formData = new FormData(form)
    const foodName = (formData.get("food_name") as string) || ""
    const amount = (formData.get("amount") as string) || ""
    const notes = (formData.get("notes") as string) || ""
    const mergedNotes = amount ? `用量:${amount}${notes ? ` | ${notes}` : ""}` : notes || null

    const { error } = await createDietLog({
      pet_id: petId,
      food_name: foodName,
      food_type: foodType,
      logged_date: new Date().toISOString().split("T")[0],
      notes: mergedNotes,
      product_id: selectedProduct?.id ?? null,
    }, user.id)

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("饮食记录已添加")
    form.reset()
    setFoodType("dry_food")
    setSelectedProduct(null)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product search combobox */}
      <div className="space-y-2">
        <Label>品牌/产品</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] font-normal text-[#111111] hover:bg-white"
            >
              {selectedProduct
                ? `${selectedProduct.brand} · ${selectedProduct.name}`
                : "搜索品牌或产品名..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="搜索品牌或产品名..." className="h-9" />
              <CommandList>
                <CommandEmpty>未找到匹配的产品</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.brand} ${product.name}`}
                      onSelect={() => {
                        handleSelectProduct(product)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProduct?.id === product.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="font-medium">{product.name}</span>
                      <span className="ml-1 text-muted-foreground">· {product.brand}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-[11px] text-[#9A9A95]">选择产品后自动填充品牌信息，也可手动输入</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="food_name">食物名称 *</Label>
          <Input
            id="food_name"
            name="food_name"
            required
            value={selectedProduct?.name ?? ""}
            onChange={(e) => {
              if (selectedProduct && e.target.value !== selectedProduct.name) {
                setSelectedProduct(null)
              }
            }}
            placeholder={selectedProduct ? "已自动填充" : "例如：渴望六种鱼"}
          />
        </div>
        <div className="space-y-2">
          <Label>食物类型</Label>
          <SelectDropdown
            value={foodType}
            onChange={setFoodType}
            options={foodTypeOptions}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">用量</Label>
          <Input id="amount" name="amount" placeholder="例如：50g" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">备注</Label>
          <Input id="notes" name="notes" placeholder="可选备注" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        添加记录
      </Button>
    </form>
  )
}
