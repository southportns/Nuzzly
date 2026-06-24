"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, FileText, Image as ImageIcon, Loader2, Upload, X, Calendar, Stethoscope, Pill, Paperclip, Cat, Dog, PawPrint, ShoppingBag, TreePine, House, Heart, AlertCircle, MapPin, Home, Activity } from "lucide-react"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { BreedCombobox } from "@/components/pets/breed-combobox"
import { AvatarCropper } from "@/components/pets/avatar-cropper"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { getProvinces, getCities, getDistricts } from "@/lib/china-regions"
import { useMemo } from "react"

// ── Static option lists ──
const speciesOptions: SelectOption[] = [
  { value: "cat", label: "猫咪", icon: <Cat className="size-4 text-[#FF7A59]" /> },
  { value: "dog", label: "狗狗", icon: <Dog className="size-4 text-[#FF7A59]" /> },
  { value: "other", label: "其他", icon: <PawPrint className="size-4 text-[#FF7A59]" /> },
]

const genderOptions: SelectOption[] = [
  { value: "male", label: "公" },
  { value: "female", label: "母" },
  { value: "unknown", label: "未知" },
]

const neuteredOptions: SelectOption[] = [
  { value: "true", label: "已绝育" },
  { value: "false", label: "未绝育" },
]

const stomachOptions: SelectOption[] = [
  { value: "normal", label: "正常", description: "不易出现肠胃不适" },
  { value: "sensitive", label: "敏感", description: "偶尔出现软便、呕吐" },
  { value: "very_sensitive", label: "极易敏感", description: "频繁肠胃问题" },
]

const sourceOptions: SelectOption[] = [
  { value: "purchased", label: "购买", icon: <ShoppingBag className="size-4 text-[#6B6B6B]" />, description: "从正规渠道购买" },
  { value: "wild_rescued", label: "野生救助", icon: <TreePine className="size-4 text-[#6B6B6B]" />, description: "救助的野生个体" },
  { value: "home_raised", label: "家猫自育", icon: <House className="size-4 text-[#6B6B6B]" />, description: "自家繁育出生" },
  { value: "stray_adopted", label: "流浪收留", icon: <Heart className="size-4 text-[#6B6B6B]" />, description: "收养的流浪动物" },
  { value: "other", label: "其他", icon: <AlertCircle className="size-4 text-[#6B6B6B]" /> },
]

const diseaseStatusOptions: SelectOption[] = [
  { value: "active", label: "治疗中" },
  { value: "recovered", label: "已康复" },
  { value: "chronic", label: "慢性病" },
  { value: "unknown", label: "未知" },
]

const diseaseSeverityOptions: SelectOption[] = [
  { value: "mild", label: "轻微" },
  { value: "moderate", label: "中度" },
  { value: "severe", label: "严重" },
  { value: "unknown", label: "未知" },
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

// ── Section sub-components ──
function Section({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] text-[#FF7A59]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold leading-tight text-[#111111]">{title}</h2>
          {description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#6B6B6B]">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-[12.5px] font-medium text-[#444444]">
          {label}
          {required && <span className="ml-0.5 text-[#FF7A59]">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-[#9A9A95]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function inputClass() {
  return "h-11 rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:ring-[3px] focus-visible:ring-[#FF7A59]/12 focus-visible:outline-none"
}

function textareaClass() {
  return "min-h-[80px] rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-2.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:ring-[3px] focus-visible:ring-[#FF7A59]/12 focus-visible:outline-none"
}

// ── Disease entry (local form state) ──
interface DiseaseEntry {
  id: string  // local id (uuid-like) for React key
  name: string
  diagnosed_on: string
  status: string
  severity: string
  notes: string
}

interface MedicationEntry {
  id: string
  name: string
  dosage: string
  frequency: string
  started_on: string
  is_ongoing: boolean
  notes: string
}

interface AttachmentEntry {
  id: string
  category: string
  file_name: string
  file_path: string
  file_url: string
  file_type: string | null
  file_size: number | null
  is_new: boolean  // pending upload vs already saved
  file?: File     // pending File to upload
}

const ATTACHMENT_CATEGORIES: Array<{ value: string; label: string; icon: React.ReactNode }> = [
  { value: "medical_record", label: "就诊记录", icon: <Stethoscope className="size-3.5" /> },
  { value: "medication_proof", label: "用药记录", icon: <Pill className="size-3.5" /> },
  { value: "purchase_proof", label: "采购凭证", icon: <ShoppingBag className="size-3.5" /> },
  { value: "other", label: "其他", icon: <Paperclip className="size-3.5" /> },
]

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function isImage(type: string | null | undefined) {
  return !!type && type.startsWith("image/")
}

interface PetFormProps {
  pet?: {
    id?: string
    name?: string | null
    species?: string | null
    breed?: string | null
    age_years?: number | null
    age_months?: number | null
    age_days?: number | null
    gender?: string | null
    weight_kg?: number | null
    neutered?: boolean | null
    photo_url?: string | null
    stomach_health?: string | null
    pet_source?: string | null
    home_age_years?: number | null
    home_age_months?: number | null
    home_age_days?: number | null
    birth_date?: string | null
    home_date?: string | null
  }
  initialDiseases?: DiseaseEntry[]
  initialMedications?: MedicationEntry[]
  initialAttachments?: AttachmentEntry[]
  initialEnvironment?: {
    region?: string | null
    city?: string | null
    district?: string | null
    multi_pet_household?: boolean | null
    pet_count?: number | null
    has_children?: boolean | null
    indoor_outdoor?: string | null
    activity_level?: string | null
  }
  onSubmit: (payload: PetFormPayload) => Promise<{ ok: boolean; error?: string }>
  onAvatarChange?: (file: File | null) => void
}

export interface PetFormPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pet: Record<string, any>
  diseases: Array<Omit<DiseaseEntry, "id">>
  medications: Array<Omit<MedicationEntry, "id">>
  attachments: AttachmentEntry[]  // contains either is_new + File, or already saved
  environment: {
    region: string | null
    city: string | null
    district: string | null
    multi_pet_household: boolean
    pet_count: number
    has_children: boolean
    indoor_outdoor: string
    activity_level: string
  }
}

export function PetForm({
  pet,
  initialDiseases = [],
  initialMedications = [],
  initialAttachments = [],
  initialEnvironment,
  onSubmit,
  onAvatarChange,
}: PetFormProps) {
  const [name, setName] = useState(pet?.name ?? "")
  const [species, setSpecies] = useState(pet?.species ?? "cat")
  const [breed, setBreed] = useState(pet?.breed ?? "")
  const [birthDate, setBirthDate] = useState<string>(pet?.birth_date ?? "")
  const [homeDate, setHomeDate] = useState<string>(pet?.home_date ?? "")
  const [gender, setGender] = useState(pet?.gender ?? "unknown")
  const [neutered, setNeutered] = useState(pet?.neutered === true ? "true" : "false")
  const [weight, setWeight] = useState<string>(pet?.weight_kg != null ? String(pet.weight_kg) : "")
  const [stomach, setStomach] = useState(pet?.stomach_health ?? "normal")
  const [source, setSource] = useState(pet?.pet_source ?? "other")
  const [avatarPreview, setAvatarPreview] = useState<string>(pet?.photo_url ?? "")
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  const [diseases, setDiseases] = useState<DiseaseEntry[]>(initialDiseases)
  const [medications, setMedications] = useState<MedicationEntry[]>(initialMedications)
  const [attachments, setAttachments] = useState<AttachmentEntry[]>(initialAttachments)
  const [submitting, setSubmitting] = useState(false)

  // Environment state
  const [envProvince, setEnvProvince] = useState(initialEnvironment?.region ?? "")
  const [envCity, setEnvCity] = useState(initialEnvironment?.city ?? "")
  const [envDistrict, setEnvDistrict] = useState(initialEnvironment?.district ?? "")
  const [envMultiPet, setEnvMultiPet] = useState(initialEnvironment?.multi_pet_household ?? false)
  const [envPetCount, setEnvPetCount] = useState(initialEnvironment?.pet_count ?? 1)
  const [envHasChildren, setEnvHasChildren] = useState(initialEnvironment?.has_children ?? false)
  const [envIndoorOutdoor, setEnvIndoorOutdoor] = useState(initialEnvironment?.indoor_outdoor ?? "indoor")
  const [envActivityLevel, setEnvActivityLevel] = useState(initialEnvironment?.activity_level ?? "medium")
  const provinces = useMemo(() => getProvinces(), [])
  const [envCityOptions, setEnvCityOptions] = useState<string[]>(
    () => (initialEnvironment?.region && initialEnvironment?.city ? getCities(initialEnvironment.region) : []),
  )
  const [envDistrictOptions, setEnvDistrictOptions] = useState<string[]>(
    () => (initialEnvironment?.region && initialEnvironment?.city ? getDistricts(initialEnvironment.region, initialEnvironment.city) : []),
  )

  function addDisease() {
    setDiseases((prev) => [
      ...prev,
      { id: genId(), name: "", diagnosed_on: "", status: "active", severity: "unknown", notes: "" },
    ])
  }
  function updateDisease(localId: string, patch: Partial<DiseaseEntry>) {
    setDiseases((prev) => prev.map((d) => (d.id === localId ? { ...d, ...patch } : d)))
  }
  function removeDisease(localId: string) {
    setDiseases((prev) => prev.filter((d) => d.id !== localId))
  }

  function addMedication() {
    setMedications((prev) => [
      ...prev,
      { id: genId(), name: "", dosage: "", frequency: "", started_on: "", is_ongoing: true, notes: "" },
    ])
  }
  function updateMedication(localId: string, patch: Partial<MedicationEntry>) {
    setMedications((prev) => prev.map((m) => (m.id === localId ? { ...m, ...patch } : m)))
  }
  function removeMedication(localId: string) {
    setMedications((prev) => prev.filter((m) => m.id !== localId))
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newEntries: AttachmentEntry[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      newEntries.push({
        id: genId(),
        category: "other",
        file_name: f.name,
        file_path: "",
        file_url: "",
        file_type: f.type,
        file_size: f.size,
        is_new: true,
        file: f,
      })
    }
    setAttachments((prev) => [...prev, ...newEntries])
    e.target.value = "" // reset
  }
  function updateAttachmentCategory(localId: string, category: string) {
    setAttachments((prev) => prev.map((a) => (a.id === localId ? { ...a, category } : a)))
  }
  function removeAttachment(localId: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== localId))
  }

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("头像不超过 5MB")
      return
    }
    const url = URL.createObjectURL(file)
    setCropImageSrc(url)
    e.target.value = ""
  }

  function handleCropConfirm(croppedFile: File) {
    const url = URL.createObjectURL(croppedFile)
    setAvatarPreview(url)
    onAvatarChange?.(croppedFile)
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  function handleCropCancel() {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  function handleAvatarRemove() {
    setAvatarPreview("")
    onAvatarChange?.(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("请填写名字")
      return
    }
    setSubmitting(true)

    const result = await onSubmit({
      pet: {
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        birth_date: birthDate || null,
        home_date: homeDate || null,
        pet_source: source,
        gender,
        neutered: neutered === "true",
        weight_kg: weight ? Number(weight) : null,
        stomach_health: stomach,
      },
      diseases: diseases
        .filter((d) => d.name.trim())
        .map(({ id: _id, ...rest }) => rest),
      medications: medications
        .filter((m) => m.name.trim())
        .map(({ id: _id, ...rest }) => rest),
      attachments,
      environment: {
        region: envProvince || null,
        city: envCity || null,
        district: envDistrict || null,
        multi_pet_household: envMultiPet,
        pet_count: envPetCount,
        has_children: envHasChildren,
        indoor_outdoor: envIndoorOutdoor,
        activity_level: envActivityLevel,
      },
    })

    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "保存失败")
    }
  }

  const sections = [
    { id: "basic", label: "基本信息" },
    { id: "age-source", label: "年龄与来源" },
    { id: "body", label: "体况" },
    { id: "environment", label: "生活环境" },
    { id: "diseases", label: "疾病史" },
    { id: "medications", label: "用药记录" },
    { id: "attachments", label: "附件资料" },
  ]

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      {/* Left: Section nav (sticky) */}
      <aside className="hidden lg:block">
        <nav className="sticky top-[88px] rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block rounded-[10px] px-3 py-2 text-[13px] text-[#6B6B6B] transition-colors hover:bg-[#F7F6F3] hover:text-[#111111]"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Right: form sections */}
      <div className="space-y-6">
        {/* Name + species row */}
        <Section id="basic" title="基本信息" description="最基础的档案信息" icon={<PawPrint className="size-4" />}>
          <div className="space-y-5">
            <Field label="名字" required htmlFor="pet-name">
              <Input
                id="pet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你家主子的名字"
                className={inputClass()}
                maxLength={32}
              />
            </Field>

            {/* Avatar upload */}
            <Field label="头像">
              <div className="flex items-center gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-[rgba(0,0,0,0.06)] bg-[#F7F6F3]">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="宠物头像"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[#9A9A95]">
                      <PawPrint className="size-7" />
                    </div>
                  )}
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-full bg-[#FF7A59] text-white shadow-sm hover:bg-[#E86A4A]"
                      aria-label="移除头像"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-4 py-2 text-[13px] text-[#6B6B6B] transition-colors",
                    "hover:border-[#FF7A59]/40 hover:bg-[#FFF6F0] hover:text-[#FF7A59]"
                  )}
                >
                  <Upload className="size-3.5" />
                  {avatarPreview ? "更换头像" : "上传头像"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarPick}
                  />
                </label>
              </div>
              <p className="mt-1 text-[11px] text-[#9A9A95]">支持 JPG/PNG/WebP，不超过 5MB</p>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="种类">
                <SelectDropdown
                  value={species}
                  onChange={setSpecies}
                  options={speciesOptions}
                  placeholder="请选择种类"
                />
              </Field>
              <Field label="品种">
                <BreedCombobox
                  value={breed}
                  onChange={setBreed}
                  species={species as "cat" | "dog" | "other" | null}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="性别">
                <SelectDropdown
                  value={gender}
                  onChange={setGender}
                  options={genderOptions}
                />
              </Field>
              <Field label="绝育">
                <SelectDropdown
                  value={neutered}
                  onChange={setNeutered}
                  options={neuteredOptions}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Age + source */}
        <Section id="age-source" title="年龄与来源" description="帮助我们做更精准的生命周期判断" icon={<Calendar className="size-4" />}>
          <div className="space-y-5">
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-[#444444]">出生日期</p>
              <div className="relative">
                <Input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={cn(inputClass(), "pr-10")}
                />
              </div>
              {birthDate && (
                <p className="mt-1 text-[11px] text-[#9A9A95]">
                  约 {Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24))} 天
                </p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-[#444444]">
                到家日期 <span className="ml-1 text-[11px] font-normal text-[#9A9A95]">到家时的日期</span>
              </p>
              <div className="relative">
                <Input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={homeDate}
                  onChange={(e) => setHomeDate(e.target.value)}
                  className={cn(inputClass(), "pr-10")}
                  placeholder="请选择日期"
                />
              </div>
              {homeDate && (
                <p className="mt-1 text-[11px] text-[#9A9A95]">
                  到家约 {Math.floor((new Date(homeDate).getTime() - (birthDate ? new Date(birthDate).getTime() : 0)) / (1000 * 60 * 60 * 24))} 天大
                </p>
              )}
            </div>

            <Field label="主子来源" hint="用于健康风险参考">
              <SelectDropdown
                value={source}
                onChange={setSource}
                options={sourceOptions}
                placeholder="请选择来源"
              />
            </Field>
          </div>
        </Section>

        {/* Body */}
        <Section id="body" title="体况" description="体重与肠胃健康度" icon={<Heart className="size-4" />}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="体重" hint="kg · 精确到两位小数">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={120}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass()}
                placeholder="0.00"
              />
            </Field>
            <Field label="肠胃健康">
              <SelectDropdown
                value={stomach}
                onChange={setStomach}
                options={stomachOptions}
              />
            </Field>
          </div>
        </Section>

        {/* Environment */}
        <Section id="environment" title="生活环境" description="帮助我们了解宠物的生活环境" icon={<Home className="size-4" />}>
          <div className="space-y-5">
            {/* 省市区三级联动 */}
            <div>
              <p className="mb-2 text-[12.5px] font-medium text-[#444444]">所在地区</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="省份">
                  <SelectDropdown
                    value={envProvince}
                    onChange={(value) => {
                      setEnvProvince(value)
                      setEnvCity("")
                      setEnvDistrict("")
                      setEnvCityOptions(getCities(value))
                      setEnvDistrictOptions([])
                    }}
                    options={provinces.map((p) => ({ value: p, label: p }))}
                    placeholder="选择省份"
                  />
                </Field>
                <Field label="城市">
                  <SelectDropdown
                    value={envCity}
                    disabled={!envProvince}
                    onChange={(value) => {
                      setEnvCity(value)
                      setEnvDistrict("")
                      setEnvDistrictOptions(getDistricts(envProvince, value))
                    }}
                    options={envCityOptions.map((c) => ({ value: c, label: c }))}
                    placeholder={envProvince ? "选择城市" : "请先选省份"}
                  />
                </Field>
                <Field label="区县">
                  <SelectDropdown
                    value={envDistrict}
                    disabled={!envCity}
                    onChange={(value) => setEnvDistrict(value)}
                    options={envDistrictOptions.map((d) => ({ value: d, label: d }))}
                    placeholder={envCity ? "选择区县" : "请先选城市"}
                  />
                </Field>
              </div>
              <p className="mt-1 text-[11px] text-[#9A9A95]">气候信息将根据所在地区自动匹配</p>
            </div>

            {/* 家庭环境 */}
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.05)] bg-[#FBFAF7] p-4">
              <p className="mb-3 text-[12.5px] font-medium text-[#444444]">家庭环境</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="multi-pet" className="text-[13px] font-normal text-[#444444]">多宠家庭</Label>
                  <Switch
                    id="multi-pet"
                    checked={envMultiPet}
                    onCheckedChange={setEnvMultiPet}
                  />
                </div>

                {envMultiPet && (
                  <Field label="宠物数量">
                    <Input
                      id="pet-count"
                      type="number"
                      min={2}
                      value={envPetCount}
                      onChange={(e) => setEnvPetCount(parseInt(e.target.value) || 2)}
                      className={inputClass()}
                    />
                  </Field>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="has-children" className="text-[13px] font-normal text-[#444444]">家中有小孩</Label>
                  <Switch
                    id="has-children"
                    checked={envHasChildren}
                    onCheckedChange={setEnvHasChildren}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="室内外">
                <SelectDropdown
                  value={envIndoorOutdoor}
                  onChange={setEnvIndoorOutdoor}
                  options={indoorOutdoorOptions}
                />
              </Field>
              <Field label="活跃度">
                <SelectDropdown
                  value={envActivityLevel}
                  onChange={setEnvActivityLevel}
                  options={activityOptions}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Diseases */}
        <Section
          id="diseases"
          title="疾病史"
          description="逐条记录患过的重大疾病，可附就诊单"
          icon={<Stethoscope className="size-4" />}
        >
          {diseases.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[rgba(0,0,0,0.08)] bg-[#FBFAF7] py-8 text-center">
              <p className="text-[13px] text-[#6B6B6B]">暂无疾病记录</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDisease}
                className="mt-3 rounded-full border-[rgba(0,0,0,0.08)] bg-white"
              >
                <Plus className="mr-1 size-3.5" />添加一条
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {diseases.map((d) => (
                <div
                  key={d.id}
                  className="rounded-[14px] border border-[rgba(0,0,0,0.05)] bg-[#FBFAF7] p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <Field label="疾病名称">
                        <Input
                          value={d.name}
                          onChange={(e) => updateDisease(d.id, { name: e.target.value })}
                          placeholder="如：猫传腹、肠胃炎"
                          className={inputClass()}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-3">
                      <Field label="确诊时间">
                        <Input
                          type="date"
                          value={d.diagnosed_on}
                          onChange={(e) => updateDisease(d.id, { diagnosed_on: e.target.value })}
                          className={inputClass()}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="状态">
                        <SelectDropdown
                          value={d.status}
                          onChange={(v) => updateDisease(d.id, { status: v })}
                          options={diseaseStatusOptions}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="严重程度">
                        <SelectDropdown
                          value={d.severity}
                          onChange={(v) => updateDisease(d.id, { severity: v })}
                          options={diseaseSeverityOptions}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Field label="备注">
                      <Textarea
                        value={d.notes}
                        onChange={(e) => updateDisease(d.id, { notes: e.target.value })}
                        placeholder="如治疗方案、医嘱要点"
                        className={textareaClass()}
                        rows={2}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <AttachmentChipList
                      ownerId={d.id}
                      attachments={attachments.filter((a) => a.category === "medical_record")}
                      onUpdateCategory={(cat) => updateAttachmentCategory(d.id, cat)}
                      onRemove={(id) => removeAttachment(id)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDisease(d.id)}
                      className="ml-auto text-[#9A9A95] hover:bg-[#FFF1EB] hover:text-[#FF7A59]"
                    >
                      <Trash2 className="mr-1 size-3.5" />删除
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addDisease}
                className="w-full rounded-[12px] border-dashed border-[rgba(0,0,0,0.1)] bg-white text-[#6B6B6B] hover:border-[#FF7A59]/40 hover:text-[#FF7A59]"
              >
                <Plus className="mr-1.5 size-4" />再添加一条
              </Button>
            </div>
          )}
        </Section>

        {/* Medications */}
        <Section
          id="medications"
          title="用药记录"
          description="保健品、处方药、驱虫药都可记录"
          icon={<Pill className="size-4" />}
        >
          {medications.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[rgba(0,0,0,0.08)] bg-[#FBFAF7] py-8 text-center">
              <p className="text-[13px] text-[#6B6B6B]">暂无用药记录</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                className="mt-3 rounded-full border-[rgba(0,0,0,0.08)] bg-white"
              >
                <Plus className="mr-1 size-3.5" />添加一条
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map((m) => (
                <div
                  key={m.id}
                  className="rounded-[14px] border border-[rgba(0,0,0,0.05)] bg-[#FBFAF7] p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Field label="药品名称">
                        <Input
                          value={m.name}
                          onChange={(e) => updateMedication(m.id, { name: e.target.value })}
                          placeholder="如：拜耳内驱"
                          className={inputClass()}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="剂量">
                        <Input
                          value={m.dosage}
                          onChange={(e) => updateMedication(m.id, { dosage: e.target.value })}
                          placeholder="如：1片"
                          className={inputClass()}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="频次">
                        <Input
                          value={m.frequency}
                          onChange={(e) => updateMedication(m.id, { frequency: e.target.value })}
                          placeholder="如：每日1次"
                          className={inputClass()}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="开始时间">
                        <Input
                          type="date"
                          value={m.started_on}
                          onChange={(e) => updateMedication(m.id, { started_on: e.target.value })}
                          className={inputClass()}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="持续">
                        <button
                          type="button"
                          onClick={() => updateMedication(m.id, { is_ongoing: !m.is_ongoing })}
                          className={cn(
                            "flex h-11 w-full items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] transition-colors",
                            "hover:border-[rgba(0,0,0,0.16)]"
                          )}
                        >
                          <span>{m.is_ongoing ? "使用中" : "已停用"}</span>
                          <span
                            className={cn(
                              "relative h-5 w-9 rounded-full transition-colors",
                              m.is_ongoing ? "bg-[#FF7A59]" : "bg-[#E0DFDC]"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
                                m.is_ongoing ? "translate-x-[18px]" : "translate-x-0.5"
                              )}
                            />
                          </span>
                        </button>
                      </Field>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Field label="备注">
                      <Textarea
                        value={m.notes}
                        onChange={(e) => updateMedication(m.id, { notes: e.target.value })}
                        placeholder="如开药医院、注意事项"
                        className={textareaClass()}
                        rows={2}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <AttachmentChipList
                      ownerId={m.id}
                      attachments={attachments.filter((a) => a.category === "medication_proof")}
                      onUpdateCategory={(cat) => updateAttachmentCategory(m.id, cat)}
                      onRemove={(id) => removeAttachment(id)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(m.id)}
                      className="ml-auto text-[#9A9A95] hover:bg-[#FFF1EB] hover:text-[#FF7A59]"
                    >
                      <Trash2 className="mr-1 size-3.5" />删除
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addMedication}
                className="w-full rounded-[12px] border-dashed border-[rgba(0,0,0,0.1)] bg-white text-[#6B6B6B] hover:border-[#FF7A59]/40 hover:text-[#FF7A59]"
              >
                <Plus className="mr-1.5 size-4" />再添加一条
              </Button>
            </div>
          )}
        </Section>

        {/* Attachments */}
        <Section
          id="attachments"
          title="附件资料"
          description="采购凭证、就诊单等可在此统一管理"
          icon={<Paperclip className="size-4" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center gap-3 rounded-[12px] border border-[rgba(0,0,0,0.05)] bg-white p-3 transition-all hover:border-[rgba(0,0,0,0.1)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F7F6F3] text-[#6B6B6B]">
                    {isImage(a.file_type) ? (
                      <ImageIcon className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#111111]">{a.file_name}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[#9A9A95]">
                      {formatSize(a.file_size)}
                      {a.is_new && " · 待上传"}
                    </p>
                  </div>
                  <SelectDropdown
                    value={a.category}
                    onChange={(v: string) => updateAttachmentCategory(a.id, v)}
                    options={ATTACHMENT_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                      icon: c.icon,
                    }))}
                    triggerClassName="h-8 w-[120px] text-[12px]"
                    contentClassName="min-w-[140px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="flex size-7 items-center justify-center rounded-full text-[#9A9A95] transition-colors hover:bg-[#FFF1EB] hover:text-[#FF7A59]"
                    aria-label="删除附件"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-[rgba(0,0,0,0.12)] bg-[#FBFAF7] py-6 text-[13.5px] text-[#6B6B6B] transition-colors",
                "hover:border-[#FF7A59]/40 hover:bg-[#FFF6F0] hover:text-[#FF7A59]"
              )}
            >
              <Upload className="size-4" />
              上传图片或 PDF
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFilePick}
              />
            </label>
            <p className="text-[11.5px] text-[#9A9A95]">单文件不超过 20MB，支持 JPG/PNG/WebP/PDF</p>
          </div>
        </Section>

        {/* Sticky submit bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-white/95 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
          <span className="mr-auto text-[12.5px] text-[#6B6B6B]">
            修改后点击保存
          </span>
          <Button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-full bg-[#FF7A59] px-6 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(255,122,89,0.25)] hover:bg-[#E86A4A]"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {pet?.id ? "保存修改" : "创建档案"}
          </Button>
        </div>
      </div>

      {/* Avatar cropper modal */}
      {cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </form>
  )
}

// ── Inline attachment chip list (per disease/medication) ──
function AttachmentChipList({
  attachments,
  onRemove,
}: {
  ownerId: string
  attachments: AttachmentEntry[]
  onUpdateCategory: (cat: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attachments.length === 0 ? (
        <span className="text-[11.5px] text-[#9A9A95]">无附件</span>
      ) : (
        attachments.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-2.5 py-1 text-[11.5px] text-[#444444]"
            title={a.file_name}
          >
            {isImage(a.file_type) ? (
              <ImageIcon className="size-3 text-[#6B6B6B]" />
            ) : (
              <FileText className="size-3 text-[#6B6B6B]" />
            )}
            <span className="max-w-[120px] truncate">{a.file_name}</span>
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              className="text-[#9A9A95] hover:text-[#FF7A59]"
              aria-label="移除"
            >
              <X className="size-3" />
            </button>
          </span>
        ))
      )}
    </div>
  )
}
