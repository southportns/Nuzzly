"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

interface SelectDropdownProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  triggerClassName?: string
  contentClassName?: string
  ariaLabel?: string
}

/**
 * Custom dropdown built on Radix Popover.
 * - Does NOT cause the body scrollbar to appear (Popover positions to the trigger)
 * - Compact, premium look matching the Nuzzly毛球镇 design system
 * - Keyboard accessible (Radix handles arrow keys / enter / escape)
 */
export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "请选择",
  disabled = false,
  triggerClassName,
  contentClassName,
  ariaLabel,
}: SelectDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
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
          {selected?.icon}
          <span className={cn("truncate", !selected && "text-[#9A9A95]")}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#6B6B6B] transition-transform duration-200",
            open && "rotate-180 text-[#FF7A59]"
          )}
        />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "z-[60] min-w-[var(--radix-popover-trigger-width)] origin-[--radix-popover-content-transform-origin] overflow-hidden rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white p-1 shadow-[0_8px_28px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.04)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            contentClassName
          )}
        >
          <div role="listbox" className="max-h-[280px] overflow-y-auto py-0.5">
            {options.map((opt) => {
              const isActive = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14px] transition-colors",
                    isActive
                      ? "bg-[#FFF1EB] text-[#111111]"
                      : "text-[#111111] hover:bg-[#F7F6F3]"
                  )}
                >
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="flex-1 truncate">
                    <span className="block truncate font-medium">{opt.label}</span>
                    {opt.description && (
                      <span className="mt-0.5 block truncate text-[12px] text-[#6B6B6B]">
                        {opt.description}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <Check className="size-4 shrink-0 text-[#FF7A59]" strokeWidth={2.5} />
                  )}
                </button>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
