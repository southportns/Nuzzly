"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"

const HOT_TOPICS = [
  { tag: "猫粮推荐", emoji: "🍚", count: 328 },
  { tag: "软便求助", emoji: "💩", count: 256 },
  { tag: "新手养猫", emoji: "🐱", count: 189 },
  { tag: "布偶猫", emoji: "🐾", count: 167 },
  { tag: "英短蓝猫", emoji: "🩵", count: 145 },
  { tag: "猫砂测评", emoji: "🧹", count: 132 },
  { tag: "驱虫经验", emoji: "💊", count: 98 },
  { tag: "猫咪零食", emoji: "🍖", count: 87 },
]

const ACTIVE_USERS = [
  { name: "球球麻麻", posts: 42 },
  { name: "猫粮测评师", posts: 38 },
  { name: "铲屎官日记", posts: 35 },
  { name: "布偶之家", posts: 29 },
]

export function HotTopics() {
  return (
    <div className="flex flex-col gap-4">
      {/* 热门话题 */}
      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#2D2118]">热门话题</span>
        </div>
        <div className="flex flex-col gap-1">
          {HOT_TOPICS.map((topic, i) => (
            <button
              key={topic.tag}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#FAF7F4]"
            >
              <span className={`flex size-6 items-center justify-center rounded-lg text-[11px] font-bold ${
                i < 3
                  ? "bg-gradient-to-br from-[#C75B3A] to-[#8B5E46] text-white"
                  : "bg-[#F5EDE5] text-[#8B5E46]"
              }`}>
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="text-[13px] font-medium text-[#2D2118]">{topic.tag}</span>
              </span>
              <span className="text-[11px] text-[#B5A594]">{topic.count}帖</span>
            </button>
          ))}
        </div>
      </div>

      {/* 活跃用户 */}
      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#2D2118]">活跃用户</span>
        </div>
        <div className="flex flex-col gap-2">
          {ACTIVE_USERS.map((u, i) => (
            <div
              key={u.name}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[#FAF7F4]"
            >
              <div className={`flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white ${
                i === 0
                  ? "bg-gradient-to-br from-[#D4A574] to-[#8B5E46]"
                  : i === 1
                    ? "bg-gradient-to-br from-[#C4B8AA] to-[#8B7565]"
                    : "bg-gradient-to-br from-[#E8D5C4] to-[#B5A594]"
              }`}>
                {u.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[#2D2118]">{u.name}</div>
                <div className="text-[11px] text-[#B5A594]">{u.posts} 篇动态</div>
              </div>
              <button className="rounded-full border border-[#E8E0D8] px-2.5 py-1 text-[11px] font-medium text-[#8B5E46] transition-colors hover:bg-[#8B5E46] hover:text-white">
                关注
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 社区规范 */}
      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="mb-2 text-[13px] font-bold text-[#2D2118]">社区规范</div>
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-[#8B7565]">
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[#D4A574]">•</span>
            分享真实养宠经验，友善交流
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[#D4A574]">•</span>
            禁止发布广告、虚假信息
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[#D4A574]">•</span>
            尊重每一位宠物主人
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[#D4A574]">•</span>
            如遇紧急健康问题请就医
          </li>
        </ul>
      </div>
    </div>
  )
}
