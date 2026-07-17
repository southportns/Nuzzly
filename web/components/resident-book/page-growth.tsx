"use client";

import type { ComponentType } from "react";
import { Home, Droplets, ShieldCheck, Cake, Star, Heart, PawPrint } from "lucide-react";
import type { ResidentGrowthItem } from "./types";
import CssFrame from "./css-frame";

interface PageGrowthProps {
  growth: ResidentGrowthItem[];
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

// 图标配色（使用封面页暖橙配色）
const palette: Array<{ icon: IconType; color: string; bg: string }> = [
  { icon: Home, color: "text-[#f59662]", bg: "bg-[#feeede]" },
  { icon: Droplets, color: "text-[#ffb84d]", bg: "bg-[#fff5eb]" },
  { icon: ShieldCheck, color: "text-[#d4a574]", bg: "bg-[#feeede]" },
  { icon: Cake, color: "text-[#f59662]", bg: "bg-[#fff5eb]" },
  { icon: Star, color: "text-[#ffb84d]", bg: "bg-[#feeede]" },
  { icon: Heart, color: "text-[#d4a574]", bg: "bg-[#fff5eb]" },
];

export default function PageGrowth({ growth }: PageGrowthProps) {
  return (
    <CssFrame>
      <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ background: "#FFF7ED" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#feeede" }}>
          <Star className="w-5 h-5 text-[#f59662] fill-[#f59662]/40" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "#8B5E46" }}>成长记录</h2>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-5 pb-10">
        {growth.length > 0 ? (
          <div className="relative">
            {/* 竖向时间线 */}
            <div
              className="absolute left-[19px] top-0 bottom-0 w-[2px]"
              style={{ background: "linear-gradient(180deg, #f59662, #feeede)" }}
            />

            {/* 时间线项目 */}
            <div className="space-y-6">
              {growth.map((item, i) => {
                const p = palette[i % palette.length];
                return (
                  <TimelineItem
                    key={i}
                    item={item}
                    icon={p.icon}
                    color={p.color}
                    bg={p.bg}
                    isLast={i === growth.length - 1}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <PawPrint className="mx-auto mb-3 w-10 h-10 text-[#e0e0e0]" />
            <p className="text-sm" style={{ color: "#8B5E46" }}>还没有成长记录，去记录 Ta 的第一次吧～</p>
          </div>
        )}
      </div>
      </div>
    </CssFrame>
  );
}

function TimelineItem({
  item,
  icon: Icon,
  color,
  bg,
  isLast,
}: {
  item: ResidentGrowthItem;
  icon: IconType;
  color: string;
  bg: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex items-start gap-4 pl-0">
      {/* 左侧图标节点 */}
      <div
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center z-10 ${bg}`}
        style={{ boxShadow: "0 2px 8px rgba(245,150,98,0.15)" }}
      >
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={2.5} />
      </div>

      {/* 右侧内容卡片 */}
      <div
        className="flex-1 p-4 rounded-2xl"
        style={{
          background: "#fff",
          border: "1px solid #feeede",
          boxShadow: "0 2px 8px rgba(245,150,98,0.08)",
        }}
      >
        {/* 日期标签 */}
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 inline-block"
          style={{ color: "#8B5E46", background: "#feeede" }}
        >
          {item.date}
        </span>

        {/* 标题 */}
        <h3 className="text-base font-bold mb-1.5" style={{ color: "#8B5E46" }}>
          {item.title}
        </h3>

        {/* 描述 */}
        <p className="text-sm leading-relaxed font-medium" style={{ color: "#8B5E46", opacity: 0.8 }}>
          {item.desc}
        </p>
      </div>
    </div>
  );
}
