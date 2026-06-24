"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { searchSymptoms, querySymptoms } from "@/lib/supabase/query"
import type { SymptomOntology } from "@/lib/supabase/types"

interface SymptomPickerProps {
  value?: string
  onSelect: (symptom: SymptomOntology | null) => void
  category?: string
  placeholder?: string
  disabled?: boolean
}

const categoryLabels: Record<string, string> = {
  消化: "消化系统",
  皮肤: "皮肤问题",
  行为: "行为问题",
  泌尿: "泌尿系统",
  体重: "体重问题",
  呼吸: "呼吸系统",
  眼部: "眼部问题",
}

export function SymptomPicker({
  value,
  onSelect,
  category,
  placeholder = "选择症状...",
  disabled = false,
}: SymptomPickerProps) {
  const [open, setOpen] = useState(false)
  const [symptoms, setSymptoms] = useState<SymptomOntology[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Load initial symptoms
  useEffect(() => {
    async function loadSymptoms() {
      setLoading(true)
      const { data } = await querySymptoms(category)
      setSymptoms(data || [])
      setLoading(false)
    }
    loadSymptoms()
  }, [category])

  // Search symptoms
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 1) {
      const { data } = await querySymptoms()
      setSymptoms(data || [])
      return
    }
    const { data } = await searchSymptoms(query)
    setSymptoms(data || [])
  }, [])

  const selectedSymptom = symptoms.find((s) => s.canonical_name === value)

  // Group symptoms by category
  const groupedSymptoms: Record<string, SymptomOntology[]> = {}
  symptoms.forEach((symptom) => {
    const cat = symptom.category || "其他"
    if (!groupedSymptoms[cat]) {
      groupedSymptoms[cat] = []
    }
    groupedSymptoms[cat].push(symptom)
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedSymptom ? (
            <div className="flex items-center gap-2">
              <span>{selectedSymptom.display_name}</span>
              <Badge variant="secondary" className="text-xs">
                {categoryLabels[selectedSymptom.category] || selectedSymptom.category}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <Command>
          <CommandInput
            placeholder="搜索症状..."
            value={searchQuery}
            onValueChange={handleSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "加载中..." : "未找到相关症状"}
            </CommandEmpty>
            {Object.entries(groupedSymptoms).map(([cat, catSymptoms]) => (
              <CommandGroup key={cat} heading={categoryLabels[cat] || cat}>
                {catSymptoms.map((symptom) => (
                  <CommandItem
                    key={symptom.id}
                    value={symptom.canonical_name}
                    onSelect={(currentValue) => {
                      const selected = symptoms.find((s) => s.canonical_name === currentValue)
                      onSelect(selected || null)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === symptom.canonical_name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{symptom.display_name}</span>
                      {symptom.aliases && Array.isArray(symptom.aliases) && (symptom.aliases as string[]).length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          别名: {(symptom.aliases as string[]).slice(0, 3).join(", ")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Multi-select version
interface SymptomMultiPickerProps {
  value?: string[]
  onSelect: (symptoms: string[]) => void
  category?: string
  placeholder?: string
  disabled?: boolean
  maxItems?: number
}

export function SymptomMultiPicker({
  value = [],
  onSelect,
  category,
  placeholder = "选择症状...",
  disabled = false,
  maxItems = 5,
}: SymptomMultiPickerProps) {
  const [open, setOpen] = useState(false)
  const [symptoms, setSymptoms] = useState<SymptomOntology[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadSymptoms() {
      setLoading(true)
      const { data } = await querySymptoms(category)
      setSymptoms(data || [])
      setLoading(false)
    }
    loadSymptoms()
  }, [category])

  const selectedSymptoms = symptoms.filter((s) => value.includes(s.canonical_name))

  const handleToggle = (symptomName: string) => {
    if (value.includes(symptomName)) {
      onSelect(value.filter((v) => v !== symptomName))
    } else if (value.length < maxItems) {
      onSelect([...value, symptomName])
    }
  }

  // Group symptoms by category
  const groupedSymptoms: Record<string, SymptomOntology[]> = {}
  symptoms.forEach((symptom) => {
    const cat = symptom.category || "其他"
    if (!groupedSymptoms[cat]) {
      groupedSymptoms[cat] = []
    }
    groupedSymptoms[cat].push(symptom)
  })

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || value.length >= maxItems}
          >
            {selectedSymptoms.length > 0
              ? `已选择 ${selectedSymptoms.length} 个症状`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0">
          <Command>
            <CommandInput placeholder="搜索症状..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "加载中..." : "未找到相关症状"}
              </CommandEmpty>
              {Object.entries(groupedSymptoms).map(([cat, catSymptoms]) => (
                <CommandGroup key={cat} heading={categoryLabels[cat] || cat}>
                  {catSymptoms.map((symptom) => (
                    <CommandItem
                      key={symptom.id}
                      value={symptom.canonical_name}
                      onSelect={() => handleToggle(symptom.canonical_name)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(symptom.canonical_name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{symptom.display_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected symptoms */}
      {selectedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSymptoms.map((symptom) => (
            <Badge
              key={symptom.id}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleToggle(symptom.canonical_name)}
            >
              {symptom.display_name} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
