"use client";

import type { ComponentType } from "react";
import { Heart, Syringe, Weight, FileText, ChevronRight } from "lucide-react";
import type { ResidentHealth, ResidentMedicationItem } from "./types";
import CssFrame from "./css-frame";

interface PageHealthProps {
  health: ResidentHealth;
}

type IconType = ComponentType<{ className?: string }>;

export default function PageHealth({ health }: PageHealthProps) {
  const trendUp = !!health.weightTrend && health.weightTrend.startsWith("+");

  return (
    <CssFrame>
      <div className="w-full h-full px-[6%] py-[5%] flex flex-col bg-white relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
          <Heart className="text-rose-400 w-5 h-5 fill-rose-100" />
        </div>
        <h2 className="text-2xl font-bold text-[#111111]">健康档案</h2>
      </div>

      <div className="flex-1 flex gap-8 overflow-y-auto custom-scrollbar pb-6 pr-1 min-h-0">
        {/* Left Column */}
        <div className="w-1/2 flex flex-col gap-4">
          {/* Vitals */}
          <div className="shrink-0">
            <VitalCard
              title="体重"
              value={health.weightKg != null ? String(health.weightKg) : "-"}
              unit="kg"
              trend={health.weightTrend ?? "暂无记录"}
              icon={Weight}
              trendUp={trendUp}
            />
          </div>

          {/* Allergy Notes */}
          {health.allergyNote && (
            <div
              className="bg-white p-5 rounded-2xl shadow-sm flex items-start gap-3 flex-1"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0 mt-1">
                <FileText className="w-4 h-4 text-[#FF7A59]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111] mb-1">过敏与注意事项</h3>
                <p className="text-xs font-medium text-[#6B6B6B] leading-relaxed">{health.allergyNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Medications */}
        <div className="w-1/2 flex flex-col">
          <div
            className="bg-white p-5 rounded-2xl shadow-sm flex-1 flex flex-col"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                <Syringe className="w-4 h-4 text-[#FF7A59]" />
                用药记录
              </h3>
              <ChevronRight className="w-5 h-5 text-[#6B6B6B]" />
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {health.medications.length > 0 ? (
                health.medications.map((m, i) => <MedicationItem key={i} item={m} />)
              ) : (
                <p className="text-xs text-[#6B6B6B] text-center py-8">暂无用药记录</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </CssFrame>
  );
}

function VitalCard({
  title,
  value,
  unit,
  trend,
  icon: Icon,
  trendUp,
}: {
  title: string;
  value: string;
  unit: string;
  trend: string;
  icon: IconType;
  trendUp: boolean;
}) {
  return (
    <div
      className="bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between h-32 w-full"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-[#6B6B6B]">{title}</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-sky-50 text-sky-500">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-[#111111]">
          {value}
          <span className="text-sm font-medium text-[#6B6B6B] ml-1">{unit}</span>
        </p>
        <p className={`text-xs font-bold mt-1 ${trendUp ? "text-[#FF7A59]" : "text-[#A8C5A0]"}`}>{trend}</p>
      </div>
    </div>
  );
}

function MedicationItem({ item }: { item: ResidentMedicationItem }) {
  return (
    <div
      className="flex items-center justify-between py-2 last:border-0"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div>
        <p className="text-sm font-bold text-[#111111]">{item.name}</p>
        <p className="text-xs font-medium text-[#6B6B6B] mt-0.5">{item.date}</p>
      </div>
      <span
        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          item.alert ? "bg-rose-50 text-rose-500" : "bg-[#F0FDF4] text-[#22C55E]"
        }`}
      >
        {item.status}
      </span>
    </div>
  );
}
