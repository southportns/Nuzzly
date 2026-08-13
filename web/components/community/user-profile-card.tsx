"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"

export function UserProfileCard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; trust_score: number | null; user_number: number | null; username: string | null; bio: string | null } | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    async function load() {
      const [{ data: p }, { count: fc }, { count: fgc }] = await Promise.all([
        supabase.from("public_profiles").select("display_name, avatar_url, trust_score, user_number, username, bio").eq("id", user!.id).single(),
        supabase.from("community_follows").select("*", { count: "exact", head: true }).eq("following_id", user!.id),
        supabase.from("community_follows").select("*", { count: "exact", head: true }).eq("follower_id", user!.id),
      ])
      if (p) setProfile(p)
      setFollowerCount(fc || 0)
      setFollowingCount(fgc || 0)
      setLoading(false)
    }
    load()
  }, [user?.id, supabase])

  if (!user) {
    return (
      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#F5EDE5] to-[#E8D5C4]">
            <EmojiIcon name="User" className="size-7 text-[#B5A594]" />
          </div>
          <div className="text-center">
<div className="text-[14px] font-semibold text-[#2D2118]">Sign in to see more</div>
      <div className="mt-1 text-[12px] text-[#B5A594]">Join the community and share your pet stories</div>
          </div>
          <button type="button" onClick={() => openLoginModal()} className="mt-1 rounded-full bg-[#8B5E46] px-6 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#7A523D]">NowSign In</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="size-16 animate-pulse rounded-full bg-[#F5EDE5]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[#F5EDE5]" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
      <div className="flex flex-col items-center">
        <div className="relative">
          {profile.avatar_url ? (
            <div className="relative size-16 rounded-full ring-3 ring-[#F5EDE5]">
              <Image src={profile.avatar_url} alt="" fill className="rounded-full object-cover" sizes="64px" />
            </div>
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[22px] font-bold text-white ring-3 ring-[#F5EDE5]">
              {(profile.username || profile.display_name || "U")[0]}
            </div>
          )}
        </div>
        <div className="mt-2.5 text-center">
          <div className="text-[15px] font-bold text-[#2D2118]">{profile.username || profile.display_name || "Anonymous"}</div>
          <div className="mt-0.5 text-[11px] text-[#B5A594]">ID: nuzzmily{String(profile.user_number || 0).padStart(3, "0")}</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-[#FAF7F4] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#B5A594]">Trust Score</span>
          <span className="text-[14px] font-bold text-[#8B5E46]">{profile.trust_score || 0}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#E8E0D8]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#8B5E46] to-[#D4A574] transition-all duration-500" style={{ width: `${Math.min(100, profile.trust_score || 0)}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-6 text-center">
        <div>
          <div className="text-[16px] font-bold text-[#2D2118]">{followerCount}</div>
          <div className="text-[11px] text-[#B5A594]">Followers</div>
        </div>
        <div className="h-6 w-px bg-[#E8E0D8]" />
        <div>
          <div className="text-[16px] font-bold text-[#2D2118]">{followingCount}</div>
          <div className="text-[11px] text-[#B5A594]">Follow</div>
        </div>
      </div>
    </div>
  )
}
