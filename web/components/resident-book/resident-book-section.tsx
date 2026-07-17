"use client";

import Link from "next/link";
import { BookOpen, PawPrint, Plus } from "lucide-react";
import ResidentBook from "./resident-book";
import type { ResidentBookData } from "./types";

interface ResidentBookSectionProps {
  book: ResidentBookData;
  hasPets: boolean;
}

export default function ResidentBookSection({ book, hasPets }: ResidentBookSectionProps) {
  // 没有宠物时显示引导卡片，而非整个隐藏
  if (!hasPets) {
    return (
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white">
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
            <PawPrint className="size-7 text-[#FF7A59]" />
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-[#111111]">还没有宠物档案</h3>
          <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-[#6B6B6B]">
            添加你的第一只宠物，为 Ta 开启一本专属的毛球镇户口簿
          </p>
          <Link
            href="/dashboard/pets/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="size-4" />
            添加宠物
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white">
      <div className="px-5 pt-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-[#FF7A59]" />
            <span className="text-[15px] font-semibold text-[#111111]">毛球镇户口簿</span>
          </div>
        </header>
      </div>

      <div className="px-5 pb-5 pt-3">
        <ResidentBook data={book} />
      </div>
    </section>
  );
}
