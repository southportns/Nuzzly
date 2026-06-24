"use client"

import * as React from "react"
import { Check, ChevronDown, Loader2, Cat, Dog, PawPrint } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { fetchBreedOptions, type BreedOption } from "@/lib/supabase/queries/breed-queries"
import { toast } from "sonner"

const SPECIES_LABEL: Record<BreedOption["species"], string> = {
  cat: "猫咪",
  dog: "狗狗",
  other: "其他",
}

const SPECIES_ICON: Record<BreedOption["species"], React.ReactNode> = {
  cat: <Cat className="size-3.5 text-[#FF7A59]" />,
  dog: <Dog className="size-3.5 text-[#FF7A59]" />,
  other: <PawPrint className="size-3.5 text-[#FF7A59]" />,
}

interface BreedComboboxProps {
  /** Currently saved value. Stored as the canonical name (or free text). */
  value: string
  /** Called with the new canonical name, or the raw free text. */
  onChange: (value: string) => void
  /** Current species — used to prefer this species' breeds in the list. */
  species?: BreedOption["species"] | null
  placeholder?: string
  disabled?: boolean
  triggerClassName?: string
  ariaLabel?: string
}

/**
 * Searchable breed combobox.
 * - Loads the canonical breed list from `breed_aliases`.
 * - Filters live as the user types (case-insensitive substring via cmdk's
 *   default filter — Chinese substrings work because both sides are kept
 *   as-is after `.toLowerCase()`).
 * - When the user picks an option, returns its canonical name so the
 *   saved `pets.breed` is already normalized for cohort analysis.
 * - If the typed text doesn't match any canonical, offers a custom
 *   fallback so exotic / unlisted breeds still work.
 * - Newly entered free-text aliases are *not* auto-persisted to
 *   `breed_aliases` here (admin curation is a separate flow).
 */
export function BreedCombobox({
  value,
  onChange,
  species,
  placeholder = "搜索或输入品种,如 布偶",
  disabled = false,
  triggerClassName,
  ariaLabel,
}: BreedComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value ?? "")
  const [options, setOptions] = React.useState<BreedOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  // Keep the visible input in sync with the external value
  // (e.g. when the form resets, or when loading a pet for editing).
  React.useEffect(() => {
    setInputValue(value ?? "")
  }, [value])

  // Load the breed list once on mount. The list is small (< 300 rows
  // even after the 20260608 expansion) and rarely changes, so we keep
  // it in component state for the session.
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetchBreedOptions()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(error.message)
          toast.error("品种库加载失败,你可以直接输入")
        } else {
          setOptions(data)
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : "未知错误")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Group options, putting the current species' group first so the
  // most relevant choices are immediately visible.
  const grouped = React.useMemo(() => {
    const buckets: Record<BreedOption["species"], BreedOption[]> = {
      cat: [],
      dog: [],
      other: [],
    }
    for (const opt of options) buckets[opt.species].push(opt)
    const order: BreedOption["species"][] = species
      ? [species, ...(Object.keys(buckets) as BreedOption["species"][]).filter((s) => s !== species)]
      : ["cat", "dog", "other"]
    return order
      .filter((s) => buckets[s].length > 0)
      .map((s) => ({ species: s, items: buckets[s] }))
  }, [options, species])

  const trimmed = inputValue.trim()
  const exactCanonicalExists = options.some(
    (o) => o.canonical.toLowerCase() === trimmed.toLowerCase()
  )
  const showCustomItem = trimmed.length > 0 && !exactCanonicalExists

  function commit(newValue: string) {
    const next = newValue.trim()
    onChange(next)
    setInputValue(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "group flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] text-[#111111] transition-all",
          "hover:border-[rgba(0,0,0,0.16)] hover:bg-[#FBFAF7]",
          "data-[state=open]:border-[#FF7A59]/50 data-[state=open]:shadow-[0_0_0_3px_rgba(255,122,89,0.12)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59]/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          {value ? (
            <>
              <span className="truncate font-medium">{value}</span>
              {(() => {
                const match = options.find((o) => o.canonical === value)
                if (!match) return null
                return (
                  <span className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF1EB] px-1.5 py-0.5 text-[10.5px] font-medium text-[#FF7A59]">
                    {SPECIES_ICON[match.species]}
                    {SPECIES_LABEL[match.species]}
                  </span>
                )
              })()}
            </>
          ) : (
            <span className="truncate text-[#9A9A95]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#6B6B6B] transition-transform duration-200",
            open && "rotate-180 text-[#FF7A59]"
          )}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="z-[60] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white p-0 shadow-[0_8px_28px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.04)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
      >
        <Command shouldFilter loop className="flex h-full w-full flex-col">
          <CommandInput
            autoFocus
            value={inputValue}
            onValueChange={setInputValue}
            placeholder="搜索品种,如 布偶、英短、ragdoll…"
            className="h-11 text-[14px] text-[#111111] placeholder:text-[#9A9A95] [&_[cmdk-input]]:h-11"
          />

          <CommandList className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#9A9A95]">
                <Loader2 className="size-4 animate-spin" /> 正在加载品种库…
              </div>
            ) : loadError ? (
              <div className="px-3 py-6 text-center text-[13px] text-[#9A9A95]">
                品种库加载失败,请直接输入
              </div>
            ) : (
              <>
                {showCustomItem && (
                  <CommandItem
                    value={trimmed}
                    onSelect={() => commit(trimmed)}
                    className="flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14px] text-[#111111] data-[selected=true]:bg-[#FFF1EB] data-[selected=true]:text-[#111111]"
                  >
                    <PawPrint className="size-4 shrink-0 text-[#9A9A95]" />
                    <span className="min-w-0 flex-1 truncate">
                      使用自定义品种 “<span className="font-medium text-[#FF7A59]">{trimmed}</span>”
                    </span>
                  </CommandItem>
                )}

                {grouped.length === 0 && !showCustomItem && (
                  <CommandEmpty className="py-6 text-center text-[13px] text-[#9A9A95]">
                    未找到品种,你可以在搜索框里直接输入
                  </CommandEmpty>
                )}

                {grouped.map((group) => (
                  <CommandGroup
                    key={group.species}
                    heading={SPECIES_LABEL[group.species]}
                    className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#9A9A95]"
                  >
                    {group.items.map((opt) => {
                      const isActive = value === opt.canonical
                      return (
                        <CommandItem
                          key={`${group.species}-${opt.canonical}`}
                          value={opt.canonical}
                          onSelect={() => commit(opt.canonical)}
                          className="flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14px] text-[#111111] data-[selected=true]:bg-[#FFF1EB] data-[selected=true]:text-[#111111]"
                        >
                          <span className="shrink-0">{SPECIES_ICON[opt.species]}</span>
                          <span className="flex-1 truncate font-medium">{opt.canonical}</span>
                          {isActive && (
                            <Check className="size-4 shrink-0 text-[#FF7A59]" strokeWidth={2.5} />
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
