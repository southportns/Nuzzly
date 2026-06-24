"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PawPrint, ArrowRight, Check, Sparkles, Cat, Heart, Utensils } from "lucide-react"
import Link from "next/link"

const steps = [
  {
    icon: <Cat className="size-6" />,
    title: "创建宠物档案",
    description: "记录品种、年龄、体重、肠胃状况，为精准推荐打基础",
    action: "去创建",
    href: "/dashboard/pets/new",
    color: "#FF7A59",
  },
  {
    icon: <Utensils className="size-6" />,
    title: "记录饮食",
    description: "记录每日喂食情况，系统会追踪长期效果",
    action: "去记录",
    href: "/dashboard/pets",
    color: "#ff9500",
  },
  {
    icon: <Heart className="size-6" />,
    title: "获取推荐",
    description: "基于宠物档案和社区数据，获得个性化猫粮推荐",
    action: "去查看",
    href: "/dashboard/recommendations",
    color: "#111111",
  },
]

export function OnboardingGuide() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-gradient-to-br from-[#FF7A59]/5 to-[#ff9500]/5 p-6">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="size-5 text-[#FF7A59]" />
        <h2 className="text-[18px] font-semibold text-[#111111]">欢迎！3 步开始精准推荐</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <div key={i} className="relative rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
            {/* Step number */}
            <div className="absolute -top-2.5 -left-2.5 flex size-6 items-center justify-center rounded-full bg-[#FF7A59] text-[12px] font-bold text-white">
              {i + 1}
            </div>

            <div className="mb-3 flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${step.color}15`, color: step.color }}>
              {step.icon}
            </div>

            <h3 className="text-[15px] font-semibold text-[#111111]">{step.title}</h3>
            <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{step.description}</p>

            <Button asChild className="mt-4 h-9 w-full rounded-full text-[13px]" style={{ backgroundColor: step.color }}>
              <Link href={step.href}>
                {step.action} <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
          <Check className="size-3.5 text-[#FF7A59]" />
          <span>创建档案后即可获得个性化推荐</span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[12px] text-[#6B6B6B] hover:text-[#111111]"
        >
          稍后再说
        </button>
      </div>
    </Card>
  )
}
