"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import * as React from "react"
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
import { useTranslations, useLocale } from "next-intl"

const SPECIES_ICON: Record<BreedOption["species"], React.ReactNode> = {
cat: <EmojiIcon name="Cat" className="size-3.5 text-[#FF7A59]" />,
dog: <EmojiIcon name="Dog" className="size-3.5 text-[#FF7A59]" />,
other: <EmojiIcon name="PawPrint" className="size-3.5 text-[#FF7A59]" />,
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
* default filter — Chinese substrings work because both sides are kept
* as-is after `.toLowerCase()`).
* - When the user picks an option, returns its canonical name so the
* saved `pets.breed` is already normalized for cohort analysis.
* - If the typed text doesn't match any canonical, offers a custom
* fallback so exotic / unlisted breeds still work.
* - Newly entered free-text aliases are *not* auto-persisted to
* `breed_aliases` here (admin curation is a separate flow).
*/
export function BreedCombobox({
value,
onChange,
species,
placeholder,
disabled = false,
triggerClassName,
ariaLabel,
}: BreedComboboxProps) {
const tPet = useTranslations("Pet")
const locale = useLocale() as string
const isEn = locale === "en"
const SPECIES_LABEL: Record<BreedOption["species"], string> = {
cat: tPet("cat"),
dog: tPet("dog"),
other: tPet("other"),
}
function breedLabel(opt: BreedOption) {
return isEn && opt.canonical_en ? opt.canonical_en : opt.canonical
}
const [open, setOpen] = React.useState(false)
const [inputValue, setInputValue] = React.useState(value?? "")
const [options, setOptions] = React.useState<BreedOption[]>([])
const [loading, setLoading] = React.useState(true)
const [loadError, setLoadError] = React.useState<string | null>(null)

// Keep the visible input in sync with the external value
// (e.g. when the form resets, or when loading a pet for editing).
React.useEffect(() => {
setInputValue(value?? "")
}, [value])

// Load the breed list once on mount. The list is small (< 300 rows
// even after the 20260608 expansion) and rarely changes, so we keep
// it in component state for the session.
React.useEffect(() => {
let cancelled = false
setLoading(true)
setLoadError(null)
fetchBreedOptions().then(({ data, error }) => {
if (cancelled) return
if (error) {
setLoadError(error.message)
toast.error(tPet("breedLoadFailed"))
} else {
setOptions(data)
}
}).catch((e: unknown) => {
if (cancelled) return
setLoadError(e instanceof Error? e.message: tPet("unknownError"))
}).finally(() => {
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
const order: BreedOption["species"][] = species? [species,...(Object.keys(buckets) as BreedOption["species"][]).filter((s) => s!== species)]: ["cat", "dog", "other"]
return order.filter((s) => buckets[s].length > 0).map((s) => ({ species: s, items: buckets[s] }))
}, [options, species])

const trimmed = inputValue.trim()
const exactCanonicalExists = options.some((o) => o.canonical.toLowerCase() === trimmed.toLowerCase() || (o.canonical_en?.toLowerCase() === trimmed.toLowerCase()))
const showCustomItem = trimmed.length > 0 &&!exactCanonicalExists

function commit(newValue: string) {
const next = newValue.trim()
onChange(next)
setInputValue(next)
setOpen(false)
}

return (<Popover open={open} onOpenChange={setOpen}>
<PopoverTrigger
disabled={disabled}
aria-label={ariaLabel}
className={cn("group flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] text-[#111111] transition-all",
"hover:border-[rgba(0,0,0,0.16)] hover:bg-[#FBFAF7]",
"data-[state=open]:border-[#FF7A59]/50 data-[state=open]:shadow-[0_0_0_3px_rgba(255,122,89,0.12)]",
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59]/30",
"disabled:cursor-not-allowed disabled:opacity-50",
triggerClassName)}
>
<span className="flex min-w-0 flex-1 items-center gap-2 truncate">
{value? (<>
<span className="truncate font-medium">{(() => {
const match = options.find((o) => o.canonical === value)
return match && isEn && match.canonical_en ? match.canonical_en : value
})()}</span>
{(() => {
const match = options.find((o) => o.canonical === value)
if (!match) return null
return (<span className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF1EB] px-1.5 py-0.5 text-[10.5px] font-medium text-[#FF7A59]">
{SPECIES_ICON[match.species]}
{SPECIES_LABEL[match.species]}
</span>)
})()}
</>): (<span className="truncate text-[#9A9A95]">{placeholder}</span>)}
</span>
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className={cn("size-4 shrink-0 text-[#6B6B6B] transition-transform duration-200", open && "rotate-180 text-[#FF7A59]")}><g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)"><path d="M9,13.5c-.192,0-.384-.073-.53-.22L2.22,7.03c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0l5.72,5.72,5.72-5.72c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061l-6.25,6.25c-.146,.146-.338,.22-.53,.22Z" fill="currentColor"></path></g></svg>
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
placeholder={placeholder?? tPet("searchBreed")}
className="h-11 text-[14px] text-[#111111] placeholder:text-[#9A9A95] [&_[cmdk-input]]:h-11"
/>

<CommandList className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
{loading? (<div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#9A9A95]">
<EmojiIcon name="Loader2" className="size-4 animate-spin" /> {tPet("loadingBreeds")}
</div>): loadError? (<div className="px-3 py-6 text-center text-[13px] text-[#9A9A95]">
{tPet("breedLoadFailed")}
</div>): (<>
{showCustomItem && (<CommandItem
value={trimmed}
onSelect={() => commit(trimmed)}
className="flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14px] text-[#111111] data-[selected=true]:bg-[#FFF1EB] data-[selected=true]:text-[#111111]"
>
<EmojiIcon name="PawPrint" className="size-4 shrink-0 text-[#9A9A95]" />
<span className="min-w-0 flex-1 truncate">
{tPet("customBreed")} “<span className="font-medium text-[#FF7A59]">{trimmed}</span>”
</span>
</CommandItem>)}

{grouped.length === 0 &&!showCustomItem && (<CommandEmpty className="py-6 text-center text-[13px] text-[#9A9A95]">
{tPet("noBreedFound")}
</CommandEmpty>)}

{grouped.map((group) => (<CommandGroup
key={group.species}
heading={SPECIES_LABEL[group.species]}
className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#9A9A95]"
>
{group.items.map((opt) => {
const isActive = value === opt.canonical || value === opt.canonical_en
return (<CommandItem
key={`${group.species}-${opt.canonical}`}
value={`${opt.canonical} ${opt.canonical_en ?? ""}`}
onSelect={() => commit(opt.canonical)}
className="flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14px] text-[#111111] data-[selected=true]:bg-[#FFF1EB] data-[selected=true]:text-[#111111]"
>
<span className="shrink-0">{SPECIES_ICON[opt.species]}</span>
<span className="flex-1 truncate font-medium">{breedLabel(opt)}</span>
{isActive && (<EmojiIcon name="Check" className="size-4 shrink-0 text-[#FF7A59]" />)}
</CommandItem>)
})}
</CommandGroup>))}
</>)}
</CommandList>
</Command>
</PopoverContent>
</Popover>)
}
