"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle, Clock, Activity, ChevronRight } from "lucide-react"
import Link from "next/link"

interface DiseaseRecord {
  id: string
  name: string
  severity: string
  status: string
  diagnosed_on: string | null
  notes: string | null
}

interface Props {
  records: DiseaseRecord[]
}

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  mild: { label: "轻微", color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
  moderate: { label: "中度", color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
  severe: { label: "严重", color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
  critical: { label: "危急", color: "text-[#ff2d55]", bg: "bg-[#ff2d55]/10" },
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: "进行中", icon: <AlertTriangle className="size-3" />, color: "text-[#ff9500]" },
  resolved: { label: "已康复", icon: <CheckCircle className="size-3" />, color: "text-[#34c759]" },
  chronic: { label: "慢性病", icon: <Activity className="size-3" />, color: "text-[#585858]" },
  under_treatment: { label: "治疗中", icon: <Clock className="size-3" />, color: "text-[#007AFF]" },
}

export function DiseaseRecordsList({ records }: Props) {
  return (
    <div className="space-y-2">
      {records.map((record) => {
        const severity = severityConfig[record.severity] || severityConfig.mild
        const status = statusConfig[record.status] || statusConfig.active

        return (
          <Link
            key={record.id}
            href={`/dashboard/health/diseases/${record.id}`}
            className="flex items-center justify-between rounded-[12px] bg-[#F7F6F3] p-3 transition-all hover:bg-[#F0EFED]"
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-full ${severity.bg}`}>
                <span className={`text-sm ${severity.color}`}>🏥</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#111111]">{record.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${status.color} ${status.color.replace("text", "bg")}/10`}>
                    {status.icon}
                    {status.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${severity.color} ${severity.bg}`}>
                    {severity.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {record.diagnosed_on && (
                <span className="text-[12px] text-[#6B6B6B]">
                  {new Date(record.diagnosed_on).toLocaleDateString("zh-CN")}
                </span>
              )}
              <ChevronRight className="size-4 text-[#D2D1CF]" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
