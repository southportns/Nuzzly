"use client"

import { useState } from "react"
import { Pill, Clock, CheckCircle, StopCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface MedicationRecord {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  started_on: string | null
  ended_on: string | null
  is_ongoing: boolean
  notes: string | null
}

interface Props {
  records: MedicationRecord[]
  showStopButton?: boolean
}

const frequencyLabels: Record<string, string> = {
  once_daily: "每日一次",
  twice_daily: "每日两次",
  three_times_daily: "每日三次",
  weekly: "每周一次",
  as_needed: "按需服用",
}

export function MedicationRecordsList({ records, showStopButton = false }: Props) {
  const [stoppingId, setStoppingId] = useState<string | null>(null)

  async function handleStop(medicationId: string) {
    setStoppingId(medicationId)

    try {
      const response = await fetch("/api/medications/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medication_id: medicationId }),
      })

      if (!response.ok) throw new Error("停止用药失败")

      toast.success("已停止用药")
      window.location.reload()
    } catch (error) {
      toast.error("操作失败，请重试")
    } finally {
      setStoppingId(null)
    }
  }

  function calculateDuration(record: MedicationRecord) {
    const start = new Date(record.started_on || record.id)
    const end = record.ended_on ? new Date(record.ended_on) : new Date()
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-2">
      {records.map((record) => {
        const isStopping = stoppingId === record.id
        const duration = calculateDuration(record)

        return (
          <div
            key={record.id}
            className={`flex items-center justify-between rounded-[12px] p-3 ${
              record.is_ongoing ? "bg-[#FF7A59]/5" : "bg-[#F7F6F3]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-full ${
                record.is_ongoing ? "bg-[#FF7A59]/10" : "bg-[#6B6B6B]/10"
              }`}>
                <Pill className={`size-5 ${record.is_ongoing ? "text-[#FF7A59]" : "text-[#6B6B6B]"}`} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#111111]">{record.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[#6B6B6B]">
                  {record.dosage && <span>{record.dosage}</span>}
                  {record.frequency && <span>· {frequencyLabels[record.frequency] || record.frequency}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[12px] text-[#6B6B6B]">
                  {duration}天
                </p>
                {record.is_ongoing ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#ff9500]">
                    <Clock className="size-2.5" />
                    进行中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#34c759]">
                    <CheckCircle className="size-2.5" />
                    已完成
                  </span>
                )}
              </div>
              {showStopButton && record.is_ongoing && (
                <button
                  onClick={() => handleStop(record.id)}
                  disabled={isStopping}
                  className="rounded-full p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10"
                >
                  {isStopping ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <StopCircle className="size-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
