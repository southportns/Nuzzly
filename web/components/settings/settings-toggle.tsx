"use client"

interface SettingsToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SettingsToggle({ label, checked, onChange }: SettingsToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]">
      <span className="text-[15px] text-[#111111]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#FF7A59]" : "bg-[#D2D1CF]"
        }`}
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  )
}
