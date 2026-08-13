"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"

interface UserPet {
id: string
name: string
species: string
avatar_url: string | null
photo_url: string | null
}

interface UserProfile {
id: string
username: string | null
display_name: string | null
avatar_url: string | null
bio: string | null
trust_score: number | null
user_number: number | null
}

interface UserPopupDialogProps {
userId: string | null
open: boolean
onOpenChange: (open: boolean) => void
}

export function UserPopupDialog({ userId, open, onOpenChange }: UserPopupDialogProps) {
const { user: currentUser } = useAuth()
const tCommon = useTranslations("Common")
const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
if (!supabaseRef.current) supabaseRef.current = createClient()
const supabase = supabaseRef.current

const [profile, setProfile] = useState<UserProfile | null>(null)
const [pets, setPets] = useState<UserPet[]>([])
const [followerCount, setFollowerCount] = useState(0)
const [followingCount, setFollowingCount] = useState(0)
const [postCount, setPostCount] = useState(0)
const [isFollowing, setIsFollowing] = useState(false)
const [loading, setLoading] = useState(false)
const [followLoading, setFollowLoading] = useState(false)

const isSelf = currentUser?.id === userId

useEffect(() => {
if (!userId ||!open) return
let cancelled = false
async function load() {
setLoading(true)
setProfile(null)
setPets([])

const [profileRes, petsRes, followerRes, followingRes, postRes] = await Promise.all([
supabase.from("public_profiles").select("id, username, display_name, avatar_url, bio, trust_score, user_number").eq("id", userId!).single(),
supabase.from("pets").select("id, name, species, avatar_url, photo_url").eq("profile_id", userId!).eq("is_active", true).order("created_at", { ascending: true }),
supabase.from("community_follows").select("*", { count: "exact", head: true }).eq("following_id", userId!),
supabase.from("community_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!),
supabase.from("community_posts").select("*", { count: "exact", head: true }).eq("profile_id", userId!).eq("is_deleted", false).in("review_status", ["approved", "auto_approved"]),
])

if (cancelled) return

if (profileRes.data) setProfile(profileRes.data as UserProfile)
if (petsRes.data) setPets(petsRes.data as UserPet[])
setFollowerCount(followerRes.count || 0)
setFollowingCount(followingRes.count || 0)
setPostCount(postRes.count || 0)
setLoading(false)

// Check if current user follows this user
if (currentUser?.id && currentUser.id!== userId) {
const { data: followData } = await supabase.from("community_follows").select("id").eq("follower_id", currentUser.id).eq("following_id", userId!).single()
if (!cancelled) setIsFollowing(!!followData)
}
}
load()
return () => { cancelled = true }
}, [userId, open, supabase, currentUser?.id])

async function handleToggleFollow() {
if (!currentUser) { openLoginModal(); return }
if (!userId) return
setFollowLoading(true)

if (isFollowing) {
const { error } = await supabase.from("community_follows").delete().eq("follower_id", currentUser.id).eq("following_id", userId)
if (error) { toast.error(tCommon("actionFailed")); setFollowLoading(false); return }
setIsFollowing(false)
setFollowerCount(prev => Math.max(0, prev - 1))
toast.success(tCommon("cancelFollowSuccess"))
} else {
const { error } = await supabase.from("community_follows").insert({ follower_id: currentUser.id, following_id: userId })
if (error) { toast.error(tCommon("actionFailed")); setFollowLoading(false); return }
setIsFollowing(true)
setFollowerCount(prev => prev + 1)
toast.success(tCommon("followSuccess"))
}
setFollowLoading(false)
}

if (!open) return null

const name = profile?.username || profile?.display_name || "Anonymous"
const avatar = profile?.avatar_url

return (<>
{/* returndrop */}
<div
className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
onClick={() => onOpenChange(false)}
/>
{/* Dialog */}
<div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2">
<div className="overflow-hidden rounded-2xl border border-[#E8E0D8] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
{loading? (<div className="flex items-center justify-center py-16">
<div className="size-8 animate-spin rounded-full border-[3px] border-[#E8E0D8] border-t-[#8B5E46]" />
</div>): profile? (<>
{/* Header with avatar */}
<div className="relative bg-gradient-to-br from-[#F5E6D3] via-[#E8D5C4] to-[#D4C0A8] px-6 pb-4 pt-6">
<button
onClick={() => onOpenChange(false)}
className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-white/60 text-[#6B6B6B] transition-colors hover:bg-white/90 hover:text-[#111111]"
>
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 18 18">
<path d="M4,14.75c-.192,0-.384-.073-.53-.22-.293-.293-.293-.768,0-1.061L13.47,3.47c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061L4.53,14.53c-.146,.146-.338,.22-.53,.22Z" fill="currentColor"/>
<path d="M14,14.75c-.192,0-.384-.073-.53-.22L3.47,4.53c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0L14.53,13.47c.293,.293,.293,.768,0,1.061-.146,.146-.338,.22-.53,.22Z" fill="currentColor"/>
</svg>
</button>
<div className="flex flex-col items-center">
{avatar? (<div className="relative size-20 rounded-full ring-4 ring-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
<Image src={avatar} alt="" fill className="rounded-full object-cover" sizes="80px" />
</div>): (<div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[28px] font-bold text-white ring-4 ring-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
{name[0]}
</div>)}
<div className="mt-2.5 text-[16px] font-bold text-[#2D2118]">{name}</div>
{profile.bio && (<p className="mt-1 max-w-[300px] text-center text-[12px] leading-relaxed text-[#7A6352]">{profile.bio}</p>)}
<div className="mt-1 text-[11px] text-[#B5A594]">ID: nuzzmily{String(profile.user_number || 0).padStart(3, "0")}</div>
</div>
</div>

{/* Stats */}
<div className="flex items-center justify-around border-b border-[#F0EBE5] px-6 py-3">
<div className="text-center">
<div className="text-[18px] font-bold text-[#2D2118]">{postCount}</div>
<div className="text-[11px] text-[#B5A594]">Posts</div>
</div>
<div className="h-8 w-px bg-[#F0EBE5]" />
<div className="text-center">
<div className="text-[18px] font-bold text-[#2D2118]">{followerCount}</div>
<div className="text-[11px] text-[#B5A594]">Followers</div>
</div>
<div className="h-8 w-px bg-[#F0EBE5]" />
<div className="text-center">
<div className="text-[18px] font-bold text-[#2D2118]">{followingCount}</div>
<div className="text-[11px] text-[#B5A594]">Follow</div>
</div>
<div className="h-8 w-px bg-[#F0EBE5]" />
<div className="text-center">
<div className="text-[18px] font-bold text-[#8B5E46]">{profile.trust_score || 0}</div>
<div className="text-[11px] text-[#B5A594]">Trust Score</div>
</div>
</div>

{/* Pets */}
{pets.length > 0 && (<div className="border-b border-[#F0EBE5] px-6 py-3">
<div className="mb-2 text-[11px] font-medium text-[#B5A594]">Their Fur Babies</div>
<div className="flex flex-wrap gap-2">
{pets.map(pet => {
const petAvatar = pet.avatar_url || pet.photo_url
return (<Link
key={pet.id}
href={`/dashboard/pets/${pet.id}`}
onClick={() => onOpenChange(false)}
className="group flex items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-[#FAF7F4] py-1 pl-1 pr-3 transition-all hover:border-[#8B5E46]/30 hover:bg-[#F5EDE5]"
>
{petAvatar? (<div className="relative size-6 overflow-hidden rounded-full">
<Image src={petAvatar} alt={pet.name} fill className="object-cover" sizes="24px" />
</div>): (<FluentEmoji
src={pet.species === "cat"? FLUENT_EMOJI.catFace: pet.species === "dog"? FLUENT_EMOJI.dogFace: FLUENT_EMOJI.pawPrints}
alt={pet.species}
size={20}
/>)}
<span className="text-[12px] font-medium text-[#4A3728] group-hover:text-[#8B5E46]">{pet.name}</span>
</Link>)
})}
</div>
</div>)}

{/* Action buttons */}
<div className="px-6 py-4">
{isSelf? (<Link
href="/dashboard/settings/account"
onClick={() => onOpenChange(false)}
className="flex w-full items-center justify-center rounded-xl bg-[#F5F0EB] py-2.5 text-[13px] font-medium text-[#8B5E46] transition-colors hover:bg-[#EDE6DF]"
>
Edit Profile
</Link>): (<button
onClick={handleToggleFollow}
disabled={followLoading}
className={`flex w-full items-center justify-center rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-60 ${
isFollowing? "bg-[#F5F0EB] text-[#8B5E46] hover:bg-[#EDE6DF]": "bg-gradient-to-r from-[#FF7A59] to-[#FF9A7A] text-white shadow-[0_2px_8px_rgba(255,122,89,0.25)] hover:shadow-[0_4px_16px_rgba(255,122,89,0.35)]"
}`}
>
{followLoading? "...": isFollowing? "alreadyFollow": "+ Follow"}
</button>)}
</div>
</>): (<div className="flex flex-col items-center gap-3 py-12">
<div className="text-[14px] text-[#B5A594]">failed to load user info</div>
</div>)}
</div>
</div>
</>)
}
