"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, PawPrint, Cat, Dog } from "lucide-react"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { BreedCombobox } from "@/components/pets/breed-combobox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const speciesOptions: SelectOption[] = [
  { value: "cat", label: "猫咪", icon: <Cat className="size-4 text-[#FF7A59]" /> },
  { value: "dog", label: "狗狗", icon: <Dog className="size-4 text-[#FF7A59]" /> },
  { value: "other", label: "其他", icon: <PawPrint className="size-4 text-[#FF7A59]" /> },
]

function inputClass() {
  return "h-11 rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:ring-[3px] focus-visible:ring-[#FF7A59]/12 focus-visible:outline-none"
}

export interface QuickPetFormPayload {
  name: string
  species: string
  breed: string | null
  age_years: number | null
  age_months: number | null
}

interface QuickPetFormProps {
  onSubmit: (payload: QuickPetFormPayload) => Promise<{ ok: boolean; error?: string }>
  onSkip?: () => void
}

export function QuickPetForm({ onSubmit, onSkip }: QuickPetFormProps) {
  const [name, setName] = useState("")
  const [species, setSpecies] = useState("cat")
  const [breed, setBreed] = useState("")
  const [ageYears, setAgeYears] = useState("")
  const [ageMonths, setAgeMonths] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("请填写宠物名字")
      return
    }
    const years = ageYears ? Number(ageYears) : null
    const months = ageMonths ? Number(ageMonths) : null
    if (years !== null && (years < 0 || years > 30)) {
      toast.error("年龄（岁）需在 0-30 之间")
      return
    }
    if (months !== null && (months < 0 || months > 11)) {
      toast.error("年龄（月）需在 0-11 之间")
      return
    }
    setSubmitting(true)
    const result = await onSubmit({
      name: name.trim(),
      species,
      breed: breed.trim() || null,
      age_years: years,
      age_months: months,
    })
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "创建失败")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[480px] space-y-6">
      <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] text-[#FF7A59]">
            <PawPrint className="size-4" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#111111]">快速建档</h2>
            <p className="mt-1 text-[12.5px] text-[#6B6B6B]">只需 3 个信息即可开始获得推荐</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[#444444]">
              名字 <span className="text-[#FF7A59]">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你家主子的名字"
              className={inputClass()}
              maxLength={32}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[#444444]">
              品种 <span className="text-[#FF7A59]">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <SelectDropdown
                value={species}
                onChange={setSpecies}
                options={speciesOptions}
              />
              <BreedCombobox
                value={breed}
                onChange={setBreed}
                species={species as "cat" | "dog" | "other" | null}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-[#444444]">
              年龄 <span className="text-[#FF7A59]">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value)}
                  placeholder="0"
                  className={cn(inputClass(), "pr-8")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#9A9A95]">岁</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={11}
                  value={ageMonths}
                  onChange={(e) => setAgeMonths(e.target.value)}
                  placeholder="0"
                  className={cn(inputClass(), "pr-8")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#9A9A95]">月</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 rounded-full bg-[#FF7A59] text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(255,122,89,0.3)] hover:bg-[#E86A4A]"
        >
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          创建档案，获取推荐
        </Button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[13px] text-[#6B6B6B] hover:text-[#111111]"
          >
            稍后完善
          </button>
        )}
      </div>
    </form>
  )
}
