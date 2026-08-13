"use client"

import { useTranslations } from "next-intl"

// TODO: this Data目 for 硬编码,not来shouldfrom Data库获取
const HOT_TOPICS = [
{ tag: "Cat FoodRecommended", count: 328 },
{ tag: "Soft Stool", count: 256 },
{ tag: "new ", count: 189 },
{ tag: "Ragdoll", count: 167 },
{ tag: "British Shorthair", count: 145 },
{ tag: "", count: 132 },
{ tag: "Deworming", count: 98 },
{ tag: "CatTreats", count: 87 },
]

const ACTIVE_USERS = [
{ name: "Pomi", posts: 42 },
{ name: "Cat Food", posts: 38 },
{ name: "Pet Parent", posts: 35 },
{ name: "Ragdoll", posts: 29 },
]

export function HotTopics() {
const t = useTranslations("Community")

return (<div className="flex flex-col gap-4">
<div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
<div className="mb-3 flex items-center gap-2">
<span className="text-[14px] font-bold text-[#2D2118]">{t("hotTopics")}</span>
</div>
<div className="flex flex-col gap-1">
{HOT_TOPICS.map((topic, i) => (<button key={topic.tag} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#FAF7F4]">
<span className={`flex size-6 items-center justify-center rounded-lg text-[11px] font-bold ${i < 3? "bg-gradient-to-br from-[#C75B3A] to-[#8B5E46] text-white": "bg-[#F5EDE5] text-[#8B5E46]"}`}>
{i + 1}
</span>
<span className="flex-1 text-[13px] font-medium text-[#2D2118]">{topic.tag}</span>
<span className="text-[11px] text-[#B5A594]">{topic.count}</span>
</button>))}
</div>
</div>

<div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
<div className="mb-3 flex items-center gap-2">
<span className="text-[16px]">🏆</span>
<span className="text-[14px] font-bold text-[#2D2118]">{t("activeUsers")}</span>
</div>
<div className="flex flex-col gap-2">
{ACTIVE_USERS.map((u, i) => (<div key={u.name} className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[#FAF7F4]">
<div className={`flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white ${i === 0? "bg-gradient-to-br from-[#D4A574] to-[#8B5E46]": i === 1? "bg-gradient-to-br from-[#C4B8AA] to-[#8B7565]": "bg-gradient-to-br from-[#E8D5C4] to-[#B5A594]"}`}>
{u.name[0]}
</div>
<div className="min-w-0 flex-1">
<div className="truncate text-[13px] font-medium text-[#2D2118]">{u.name}</div>
<div className="text-[11px] text-[#B5A594]">{u.posts} {t("activityCount")}</div>
</div>
<button className="rounded-full border border-[#E8E0D8] px-2.5 py-1 text-[11px] font-medium text-[#8B5E46] transition-colors hover:bg-[#8B5E46] hover:text-white">{t("follow")}</button>
</div>))}
</div>
</div>

<div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
<div className="mb-2 text-[13px] font-bold text-[#2D2118]">{t("communityGuidelines")}</div>
<ul className="space-y-1.5 text-[12px] leading-relaxed text-[#8B7565]">
<li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>{t("guideline1")}</li>
<li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>{t("guideline2")}</li>
<li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>{t("guideline3")}</li>
<li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>{t("guideline4")}</li>
</ul>
</div>
</div>)
}
