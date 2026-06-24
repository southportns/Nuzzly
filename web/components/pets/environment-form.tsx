"use client"

import { useMemo, useState, useTransition } from "react"
import { upsertEnvironmentProfile } from "@/lib/supabase/actions/pet-form-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin, Home, Activity } from "lucide-react"
import type { EnvironmentProfile, ClimateType, ActivityLevel } from "@/lib/supabase/types"
import { getProvinces, getCities, getDistricts } from "@/lib/china-regions"
import { toast } from "sonner"

interface EnvironmentFormProps {
  petId: string
  profileId: string
  initialData?: EnvironmentProfile | null
  onSuccess?: () => void
}

const climateOptions: SelectOption[] = [
  { value: "tropical", label: "热带" },
  { value: "subtropical", label: "亚热带" },
  { value: "temperate", label: "温带" },
  { value: "continental", label: "大陆性" },
  { value: "arid", label: "干旱" },
  { value: "cold", label: "寒冷" },
]

const indoorOutdoorOptions: SelectOption[] = [
  { value: "indoor", label: "纯室内" },
  { value: "outdoor", label: "纯室外" },
  { value: "both", label: "室内外都有" },
]

const activityOptions: SelectOption[] = [
  { value: "very_low", label: "极低" },
  { value: "low", label: "低" },
  { value: "medium", label: "中等" },
  { value: "high", label: "高" },
  { value: "very_high", label: "极高" },
]

export function EnvironmentForm({ petId, profileId, initialData, onSuccess }: EnvironmentFormProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    province: initialData?.region || "",
    city: initialData?.city || "",
    district: initialData?.district || "",
    climate_type: initialData?.climate_type || "",
    multi_pet_household: initialData?.multi_pet_household || false,
    pet_count: initialData?.pet_count || 1,
    has_children: initialData?.has_children || false,
    indoor_outdoor: initialData?.indoor_outdoor || "indoor",
    activity_level: initialData?.activity_level || "medium",
  })
  const provinces = useMemo(() => getProvinces(), [])
  const [cityOptions, setCityOptions] = useState<string[]>(
    () => (initialData?.region && initialData?.city ? getCities(initialData.region) : []),
  )
  const [districtOptions, setDistrictOptions] = useState<string[]>(
    () => (initialData?.region && initialData?.city ? getDistricts(initialData.region, initialData.city) : []),
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      // P1: route through Write Gateway
      const { error } = await upsertEnvironmentProfile({
        pet_id: petId,
        profile_id: profileId,
        region: form.province || null,
        city: form.city || null,
        district: form.district || null,
        climate_type: (form.climate_type as ClimateType) || null,
        multi_pet_household: form.multi_pet_household,
        pet_count: form.pet_count,
        has_children: form.has_children,
        indoor_outdoor: form.indoor_outdoor as "indoor" | "outdoor" | "both",
        activity_level: form.activity_level as ActivityLevel,
      }, profileId)

      if (!error) {
        toast.success("环境档案已保存")
        onSuccess?.()
      } else {
        toast.error(`保存失败：${error.message}`)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          环境档案
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 省市区三级联动 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                省份
              </Label>
              <SelectDropdown
                value={form.province}
                onChange={(value) => {
                  setForm({ ...form, province: value, city: "", district: "" })
                  setCityOptions(getCities(value))
                  setDistrictOptions([])
                }}
                options={provinces.map((p) => ({ value: p, label: p }))}
                placeholder="选择省份"
              />
            </div>
            <div className="space-y-2">
              <Label>城市</Label>
              <SelectDropdown
                value={form.city}
                disabled={!form.province}
                onChange={(value) => {
                  setForm({ ...form, city: value, district: "" })
                  setDistrictOptions(getDistricts(form.province, value))
                }}
                options={cityOptions.map((c) => ({ value: c, label: c }))}
                placeholder={form.province ? "选择城市" : "请先选省份"}
              />
            </div>
            <div className="space-y-2">
              <Label>区县</Label>
              <SelectDropdown
                value={form.district}
                disabled={!form.city}
                onChange={(value) => setForm({ ...form, district: value })}
                options={districtOptions.map((d) => ({ value: d, label: d }))}
                placeholder={form.city ? "选择区县" : "请先选城市"}
              />
            </div>
          </div>

          {/* 气候类型 */}
          <div className="space-y-2">
            <Label>气候类型</Label>
            <SelectDropdown
              value={form.climate_type}
              onChange={(value) => setForm({ ...form, climate_type: value })}
              options={climateOptions}
              placeholder="选择气候类型"
            />
          </div>

          {/* 家庭环境 */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium">家庭环境</Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="multi-pet" className="text-sm font-normal">多宠家庭</Label>
              <Switch
                id="multi-pet"
                checked={form.multi_pet_household}
                onCheckedChange={(checked) => setForm({ ...form, multi_pet_household: checked })}
              />
            </div>

            {form.multi_pet_household && (
              <div className="space-y-2">
                <Label htmlFor="pet-count" className="text-sm font-normal">宠物数量</Label>
                <Input
                  id="pet-count"
                  type="number"
                  min={2}
                  value={form.pet_count}
                  onChange={(e) => setForm({ ...form, pet_count: parseInt(e.target.value) || 2 })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="has-children" className="text-sm font-normal">家中有小孩</Label>
              <Switch
                id="has-children"
                checked={form.has_children}
                onCheckedChange={(checked) => setForm({ ...form, has_children: checked })}
              />
            </div>
          </div>

          {/* 生活环境 */}
          <div className="space-y-2">
            <Label>室内外</Label>
            <SelectDropdown
              value={form.indoor_outdoor}
              onChange={(value) => setForm({ ...form, indoor_outdoor: value })}
              options={indoorOutdoorOptions}
            />
          </div>

          {/* 活跃度 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              活跃度
            </Label>
            <SelectDropdown
              value={form.activity_level}
              onChange={(value) => setForm({ ...form, activity_level: value as ActivityLevel })}
              options={activityOptions}
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存环境档案"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
