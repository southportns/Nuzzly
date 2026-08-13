"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { fetchBreedOptions } from "@/lib/supabase/queries/breed-queries"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { UserProfileCard } from "./user-profile-card"
import { HotTopics } from "./hot-topics"
import { UserPopupDialog } from "./user-popup-dialog"
import { useTranslations } from "next-intl"

const CreatePostDialog = dynamic(() => import("./create-post-dialog"), { ssr: false })
const ReportDialog = dynamic(() => import("./report-dialog"), { ssr: false })

// ── Lightbox component ──
function ImageLightbox({
images,
index,
onClose,
onNavigate,
}: {
images: string[]
index: number
onClose: () => void
onNavigate: (i: number) => void
}) {
useEffect(() => {
const handler = (e: KeyboardEvent) => {
if (e.key === "Escape") onClose()
if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1)
if (e.key === "ArrowRight" && index < images.length - 1) onNavigate(index + 1)
}
window.addEventListener("keydown", handler)
document.body.style.overflow = "hidden"
return () => {
window.removeEventListener("keydown", handler)
document.body.style.overflow = ""
}
}, [index, images.length, onClose, onNavigate])

return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
{/* Close button */}
<button
className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
onClick={(e) => { e.stopPropagation(); onClose() }}
>
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18">
<path d="M4,14.75c-.192,0-.384-.073-.53-.22-.293-.293-.293-.768,0-1.061L13.47,3.47c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061L4.53,14.53c-.146,.146-.338,.22-.53,.22Z" fill="currentColor"/>
<path d="M14,14.75c-.192,0-.384-.073-.53-.22L3.47,4.53c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0L14.53,13.47c.293,.293,.293,.768,0,1.061-.146,.146-.338,.22-.53,.22Z" fill="currentColor"/>
</svg>
</button>

{/* Navigation arrows */}
{images.length > 1 && index > 0 && (<button
className="absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
</button>)}
{images.length > 1 && index < images.length - 1 && (<button
className="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</button>)}

{/* Image */}
<div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={images[index]} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
</div>

{/* Counter */}
{images.length > 1 && (<div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white">
{index + 1} / {images.length}
</div>)}
</div>)
}

// ── Pet tag for post author's pets ──
interface PostPet {
id: string
name: string
species: string
avatar_url: string | null
photo_url: string | null
}

function PetTag({ pet }: { pet: PostPet }) {
const avatar = pet.avatar_url || pet.photo_url
return (<Link
href={`/dashboard/pets/${pet.id}`}
className="group flex items-center gap-1 rounded-full border border-[#E8E0D8] bg-[#FAF7F4] py-0.5 pl-0.5 pr-2.5 transition-all hover:border-[#8B5E46]/30 hover:bg-[#F5EDE5]"
>
{avatar? (<div className="relative size-5 overflow-hidden rounded-full">
<Image src={avatar} alt={pet.name} fill className="object-cover" sizes="20px" />
</div>): (<FluentEmoji
src={pet.species === "cat"? FLUENT_EMOJI.catFace: pet.species === "dog"? FLUENT_EMOJI.dogFace: FLUENT_EMOJI.pawPrints}
alt={pet.species}
size={16}
/>)}
<span className="text-[11px] font-medium text-[#7A6352] group-hover:text-[#8B5E46]">{pet.name}</span>
</Link>)
}

interface PublicProfile {
display_name: string | null
avatar_url: string | null
username: string | null
}

interface CommunityPost {
id: string
profile_id: string
content: string
images: string[] | null
pet_type: string | null
breed: string | null
likes_count: number | null
comments_count: number | null
favorites_count: number | null
review_status: string
created_at: string
public_profiles: PublicProfile | null
}

// Cache of author pets: profile_id -> PostPet[]
type PetCache = Record<string, PostPet[]>

interface Comment {
id: string
content: string
created_at: string
profile_id: string
public_profiles: PublicProfile | null
}

const PAGE_SIZE = 20

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi)$/i

function isVideoUrl(url: string): boolean {
return VIDEO_EXTENSIONS.test(url)
}

const TYPE_OPTIONS = [
{ value: "", labelKey: "all", emoji: "🐾" },
{ value: "cat", labelKey: "cat", emoji: "🐱" },
{ value: "dog", labelKey: "dog", emoji: "🐶" },
]

function formatTime(dateStr: string, t: (key: string, values?: Record<string, string | number | Date>) => string) {
const d = new Date(dateStr)
const diff = Date.now() - d.getTime()
if (diff < 60000) return t("justNow")
if (diff < 3600000) return t("minutesAgo", { n: Math.floor(diff / 60000) })
if (diff < 86400000) return t("hoursAgo", { n: Math.floor(diff / 3600000) })
if (diff < 604800000) return t("daysAgoShort", { n: Math.floor(diff / 86400000) })
return `${d.getMonth() + 1}/${d.getDate()}`
}

export function CommunityFeed() {
const { user } = useAuth()
const t = useTranslations("Community")

const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
if (!supabaseRef.current) supabaseRef.current = createClient()
const supabase = supabaseRef.current

const [posts, setPosts] = useState<CommunityPost[]>([])
const [loading, setLoading] = useState(false)
const [hasMore, setHasMore] = useState(true)
const [myLikedPostIds, setMyLikedPostIds] = useState<Set<string>>(new Set())
const [myFavoritedPostIds, setMyFavoritedPostIds] = useState<Set<string>>(new Set())

const [petType, setPetType] = useState("")
const [selectedBreed, setSelectedBreed] = useState("AllBreed")
const [showBreed, setShowBreed] = useState(false)
const [breedSearch, setBreedSearch] = useState("")
const [breedOptions, setBreedOptions] = useState<string[]>(["AllBreed"])

const [showCreatePost, setShowCreatePost] = useState(false)
const [showReport, setShowReport] = useState(false)
const [reportingPostId, setReportingPostId] = useState<string | null>(null)

// Lightbox
const [lightboxImages, setLightboxImages] = useState<string[]>([])
const [lightboxIndex, setLightboxIndex] = useState(0)

// User popup
const [popupUserId, setPopupUserId] = useState<string | null>(null)
const [popupOpen, setPopupOpen] = useState(false)

// Author pets cache
const [petCache, setPetCache] = useState<PetCache>({})

// Comment相close
const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
const [postComments, setPostComments] = useState<Record<string, Comment[]>>({})
const [commentLoading, setCommentLoading] = useState<Set<string>>(new Set())

const petTypeRef = useRef("")
const breedRef = useRef("AllBreed")

const sentinelRef = useRef<HTMLDivElement>(null)
const observerRef = useRef<IntersectionObserver | null>(null)
const hasMoreRef = useRef(hasMore)
const loadingRef = useRef(loading)
const postsRef = useRef(posts)

const filteredBreeds = breedOptions.filter(b => b === "AllBreed" || b.toLowerCase().includes(breedSearch.trim().toLowerCase()))

async function loadBreeds(species?: "cat" | "dog") {
const { data } = await fetchBreedOptions(species? { species }: undefined)
setBreedOptions(["AllBreed",...[...new Set(data.map(d => d.canonical))]])
}

const fetchPosts = useCallback(async (cursor?: string) => {
setLoading(true)
const pt = petTypeRef.current
const br = breedRef.current

let q = supabase.from("community_posts").select(`id, profile_id, content, images, pet_type, breed,
likes_count, comments_count, favorites_count,
review_status, created_at,
public_profiles!inner(display_name, avatar_url, username)`).eq("is_deleted", false).in("review_status", ["approved", "auto_approved"]).order("created_at", { ascending: false }).limit(PAGE_SIZE)

if (pt) q = q.eq("pet_type", pt)
if (br!== "AllBreed") q = q.eq("breed", br)
if (cursor) q = q.lt("created_at", cursor)

const { data, error } = await q
setLoading(false)
if (error) {
console.warn("[community.fetchPosts]", error.message)
return
}

const newPosts = (data || []) as unknown as CommunityPost[]
setPosts(prev => (cursor? [...prev,...newPosts]: newPosts))
setHasMore(newPosts.length >= PAGE_SIZE)

// Fetch pets for new post authors (batch)
const newAuthorIds = [...new Set(newPosts.map(p => p.profile_id))].filter(id =>!petCache[id])
if (newAuthorIds.length > 0) {
const { data: petsData } = await supabase.from("pets").select("id, name, species, avatar_url, photo_url, profile_id").in("profile_id", newAuthorIds).eq("is_active", true).order("created_at", { ascending: true })
if (petsData) {
const newCache: PetCache = {...petCache }
for (const authorId of newAuthorIds) {
newCache[authorId] = petsData.filter(p => p.profile_id === authorId) as unknown as PostPet[]
}
setPetCache(newCache)
}
}

if (user?.id && newPosts.length > 0) {
const { data: likes } = await supabase.from("community_likes").select("post_id").eq("profile_id", user.id).in("post_id", newPosts.map(p => p.id))
if (likes) {
setMyLikedPostIds(prev => {
const s = new Set(prev)
likes.forEach(l => s.add(l.post_id))
return s
})
}

const { data: favs } = await supabase.from("community_favorites").select("post_id").eq("profile_id", user.id).in("post_id", newPosts.map(p => p.id))
if (favs) {
setMyFavoritedPostIds(prev => {
const s = new Set(prev)
favs.forEach(f => s.add(f.post_id))
return s
})
}
}
},
[supabase, user?.id])

useEffect(() => {
hasMoreRef.current = hasMore
}, [hasMore])

useEffect(() => {
loadingRef.current = loading
}, [loading])

useEffect(() => {
postsRef.current = posts
}, [posts])

useEffect(() => {
if (observerRef.current) observerRef.current.disconnect()
if (!sentinelRef.current) return
const obs = new IntersectionObserver(async entries => {
if (entries[0].isIntersecting && hasMoreRef.current &&!loadingRef.current) {
const last = postsRef.current[postsRef.current.length - 1]
if (last) await fetchPosts(last.created_at)
}
},
{ rootMargin: "200px" })
obs.observe(sentinelRef.current)
observerRef.current = obs
return () => obs.disconnect()
}, [fetchPosts])

useEffect(() => {
loadBreeds()
fetchPosts()
}, [fetchPosts])

function changePetType(v: string) {
setPetType(v)
petTypeRef.current = v
setSelectedBreed("AllBreed")
breedRef.current = "AllBreed"
setBreedSearch("")
loadBreeds(v === "cat"? "cat": v === "dog"? "dog": undefined)
setHasMore(true)
fetchPosts()
}

function changeBreed(b: string) {
setSelectedBreed(b)
breedRef.current = b
setShowBreed(false)
setBreedSearch("")
setHasMore(true)
fetchPosts()
}

function clearBreed() {
setSelectedBreed("AllBreed")
breedRef.current = "AllBreed"
setBreedSearch("")
setHasMore(true)
fetchPosts()
}

// Like
async function handleToggleLike(post: CommunityPost) {
if (!user) {
openLoginModal()
return
}
const liked = myLikedPostIds.has(post.id)
if (liked) {
const { error } = await supabase.from("community_likes").delete().eq("post_id", post.id).eq("profile_id", user.id)
if (error) { toast.error(t("actionFailed")); return }
setMyLikedPostIds(prev => { const s = new Set(prev); s.delete(post.id); return s })
setPosts(prev => prev.map(p => (p.id === post.id? {...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) }: p)))
} else {
const { error } = await supabase.from("community_likes").insert({ post_id: post.id, profile_id: user.id })
if (error) { toast.error(t("actionFailed")); return }
setMyLikedPostIds(prev => { const s = new Set(prev); s.add(post.id); return s })
setPosts(prev => prev.map(p => (p.id === post.id? {...p, likes_count: (p.likes_count || 0) + 1 }: p)))
}
}

// Bookmark
async function handleToggleFavorite(post: CommunityPost) {
if (!user) {
openLoginModal()
return
}
const favorited = myFavoritedPostIds.has(post.id)
if (favorited) {
const { error } = await supabase.from("community_favorites").delete().eq("post_id", post.id).eq("profile_id", user.id)
if (error) { toast.error(t("actionFailed")); return }
setMyFavoritedPostIds(prev => { const s = new Set(prev); s.delete(post.id); return s })
setPosts(prev => prev.map(p => (p.id === post.id? {...p, favorites_count: Math.max(0, (p.favorites_count || 0) - 1) }: p)))
} else {
const { error } = await supabase.from("community_favorites").insert({ post_id: post.id, profile_id: user.id })
if (error) { toast.error(t("actionFailed")); return }
setMyFavoritedPostIds(prev => { const s = new Set(prev); s.add(post.id); return s })
setPosts(prev => prev.map(p => (p.id === post.id? {...p, favorites_count: (p.favorites_count || 0) + 1 }: p)))
}
}

// Share
function handleShare(post: CommunityPost) {
const text = post.content.slice(0, 100)
if (navigator.share) {
navigator.share({ title: t("shareTitle"), text, url: window.location.href })
} else {
navigator.clipboard.writeText(`${text}\n${window.location.href}`)
toast.success(t("copiedToClipboard"))
}
}

// CommentExpand/收
async function toggleComments(postId: string) {
setExpandedComments(prev => {
const s = new Set(prev)
if (s.has(postId)) {
s.delete(postId)
} else {
s.add(postId)
if (!postComments[postId]) loadComments(postId)
}
return s
})
}

async function loadComments(postId: string) {
setCommentLoading(prev => new Set(prev).add(postId))
const { data } = await supabase.from("community_comments").select("id, content, created_at, profile_id, public_profiles!inner(display_name, avatar_url, username)").eq("post_id", postId).eq("is_deleted", false).in("review_status", ["approved", "auto_approved"]).order("created_at", { ascending: true }).limit(20)
setPostComments(prev => ({...prev, [postId]: (data || []) as unknown as Comment[] }))
setCommentLoading(prev => { const s = new Set(prev); s.delete(postId); return s })
}

async function submitComment(postId: string) {
if (!user) { openLoginModal(); return }
const text = (commentInputs[postId] || "").trim()
if (!text) return

// 1. 文本Review(获取 audit_token + client_ip)
const auditRes = await fetch("/api/community/audit", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ content: text }),
})
const auditData = await auditRes.json().catch(() => ({}))
if (!auditRes.ok || auditData.passed === false) {
toast.error(auditData.reason || auditData.error || t("commentAuditFailed"))
return
}
const auditToken = auditData.audit_token
const clientIp = auditData.client_ip
if (!auditToken) {
toast.error(t("retryPlease"))
return
}

// 2. 通past RPC PublishComment(after 端强制校验 audit_token)
const { error } = await supabase.rpc("create_community_comment", {
p_post_id: postId,
p_content: text,
p_audit_token: auditToken,
p_ip_address: clientIp,
} as never)
if (error) {
toast.error(error.message || t("commentFailed"))
return
}

setCommentInputs(prev => ({...prev, [postId]: "" }))
toast.success(t("commentSuccess"))
loadComments(postId)
setPosts(prev => prev.map(p => (p.id === postId? {...p, comments_count: (p.comments_count || 0) + 1 }: p)))
}

async function handleDelete(post: CommunityPost) {
if (!user) return
if (!confirm(t("deleteConfirm"))) return
const { error } = await supabase.from("community_posts").update({ is_deleted: true }).eq("id", post.id)
if (error) { toast.error(t("deleteFailed")); return }
setPosts(prev => prev.filter(p => p.id!== post.id))
toast.success(t("deleted"))
}

function handleReport(post: CommunityPost) {
setReportingPostId(post.id)
setShowReport(true)
}

function openLightbox(images: string[], index: number) {
setLightboxImages(images)
setLightboxIndex(index)
}

function openUserPopup(userId: string) {
setPopupUserId(userId)
setPopupOpen(true)
}

return (<div className="min-h-screen bg-[#F7F6F3]">
{/* */}
<div className="mx-auto w-[90%] max-w-[1700px] pb-24 pt-5">
<div className="flex gap-6">

{/* Left side - title + User */}
<aside className="hidden w-[260px] shrink-0 lg:block">
<div className="sticky top-24 flex flex-col gap-4">
{/* Communitytitle */}
<div className="rounded-2xl border border-[#E8E0D8] bg-gradient-to-br from-[#F5E6D3] via-[#E8D5C4] to-[#D4C0A8] p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
<div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[#8B5E46]/60">{t("title")}</div>
<h1 className="text-[20px] font-bold tracking-tight text-[#4A3728]">{t("townCommunity")}</h1>
<p className="mt-1 text-[12px] leading-relaxed text-[#7A6352]">{t("shareSubtitle")}</p>
</div>
{/* User */}
<UserProfileCard />
{/* PublishActivitybutton */}
<button
onClick={() => (user? setShowCreatePost(true): openLoginModal())}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7A59] to-[#FF9A7A] py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(255,122,89,0.3)] transition-all hover:shadow-[0_6px_24px_rgba(255,122,89,0.4)] hover:brightness-105 active:scale-[0.98]"
>
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-white">
<path d="M9 3.25V14.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
<path d="M3.25 9H14.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
</svg>
{t("publishActivity")}
</button>
</div>
</aside>

{/* - Feed */}
<main className="min-w-0 flex-1">
{/* Filter */}
<div className="mb-4">
<div className="rounded-2xl border border-[#E8E0D8] bg-white p-3 shadow-[0_2px_12px_rgba(139,94,70,0.08)]">
<div className="flex items-center gap-2">
<div className="flex gap-1.5">
{TYPE_OPTIONS.map(opt => (<button
key={opt.value}
onClick={() => changePetType(opt.value)}
className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
petType === opt.value? "bg-[#8B5E46] text-white shadow-[0_2px_8px_rgba(139,94,70,0.3)]": "bg-[#F5F0EB] text-[#7A6352] hover:bg-[#EDE6DF]"
}`}
>
<span className="text-[13px]">{opt.emoji}</span>
{opt.labelKey === "all" ? t("all") : opt.labelKey === "cat" ? t("cat") : t("dog")}
</button>))}
</div>
<div className="mx-1 h-5 w-px bg-[#E5DDD5]" />
<div className="relative flex-1">
<div
className={`flex h-9 items-center gap-2 rounded-full border px-3 transition-colors ${
showBreed || selectedBreed!== "AllBreed"? "border-[#8B5E46] bg-[#FDF8F4]": "border-[#E5DDD5] bg-[#FAFAF8]"
}`}
>
<EmojiIcon name="Search" className="size-3.5 shrink-0 text-[#B5A594]" />
<input
value={breedSearch}
onChange={e => { setBreedSearch(e.target.value); setShowBreed(true) }}
onFocus={() => setShowBreed(true)}
placeholder={selectedBreed === "AllBreed"? t("breedPlaceholder"): selectedBreed}
className="min-w-0 flex-1 bg-transparent text-[13px] text-[#4A3728] outline-none placeholder:text-[#B5A594]"
/>
{selectedBreed!== "AllBreed" && (<button onClick={clearBreed} className="shrink-0 rounded-full bg-[#E8E0D8] p-0.5 transition-colors hover:bg-[#D4C8BC]">
<EmojiIcon name="X" className="size-3 text-[#8B7565]" />
</button>)}
</div>
{showBreed && (<>
<div className="fixed inset-0 z-10" onClick={() => { setShowBreed(false); if (selectedBreed === "AllBreed") setBreedSearch("") }} />
<div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#E8E0D8] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] scrollbar-hidden">
{filteredBreeds.length === 0 && (<div className="px-4 py-3 text-[13px] text-[#B5A594]">{t("noBreedFound")}</div>)}
{filteredBreeds.map(b => (<button
key={b}
onClick={() => changeBreed(b)}
className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
b === selectedBreed? "bg-[#F5EDE5] font-semibold text-[#8B5E46]": "text-[#4A3728] hover:bg-[#FAF7F4]"
}`}
>
{b}
</button>))}
</div>
</>)}
</div>
</div>
</div>
</div>

{/* Post */}
{loading && posts.length === 0? (<div className="flex flex-col items-center gap-3 py-16">
<div className="size-10 animate-spin rounded-full border-[3px] border-[#E8E0D8] border-t-[#8B5E46]" />
<div className="text-[13px] text-[#B5A594]">{t("loading")}</div>
</div>): posts.length === 0? (<div className="flex flex-col items-center gap-4 py-16">
<div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F5EDE5] to-[#E8D5C4]">
<span className="text-[36px]">🐾</span>
</div>
<div className="text-center">
<div className="text-[16px] font-semibold text-[#4A3728]">{t("noActivity")}</div>
<div className="mt-1 text-[13px] text-[#B5A594]">{t("beFirstToShare")}</div>
</div>
</div>): (<div className="flex flex-col gap-3">
{posts.map(post => {
const profile = post.public_profiles
const name = profile?.username || profile?.display_name || t("anonymous")
const avatar = profile?.avatar_url
const liked = myLikedPostIds.has(post.id)
const favorited = myFavoritedPostIds.has(post.id)
const imgCount = post.images?.length || 0
const commentsExpanded = expandedComments.has(post.id)
const comments = postComments[post.id] || []
const isLoadingComments = commentLoading.has(post.id)

return (<article
key={post.id}
className="group overflow-hidden rounded-2xl border border-[#E8E0D8] bg-white shadow-[0_1px_4px_rgba(139,94,70,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(139,94,70,0.1)]"
>
{/* */}
<div className="flex items-center gap-3 px-5 pt-4 pb-3">
<button
onClick={() => openUserPopup(post.profile_id)}
className="shrink-0"
>
{avatar? (<div className="relative size-10 rounded-full ring-2 ring-[#F5EDE5] transition-transform hover:scale-105">
<Image src={avatar} alt="" fill className="rounded-full object-cover" sizes="40px" />
</div>): (<div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[15px] font-bold text-white ring-2 ring-[#F5EDE5] transition-transform hover:scale-105">
{name[0]}
</div>)}
</button>
<div className="min-w-0 flex-1">
<button
onClick={() => openUserPopup(post.profile_id)}
className="truncate text-left text-[14px] font-semibold text-[#2D2118] hover:text-[#8B5E46]"
>
{name}
</button>
<div className="flex items-center gap-1.5 text-[12px] text-[#B5A594]">
<span>{formatTime(post.created_at, t)}</span>
{post.pet_type && (<>
<span className="text-[#D4C8BC]"> · </span>
<span className="inline-flex items-center gap-0.5">
{post.pet_type === "cat"? "🐱": post.pet_type === "dog"? "🐶": ""}
{post.breed || (post.pet_type === "cat" ? t("cat") : post.pet_type === "dog" ? t("dog") : "")}
</span>
</>)}
</div>
</div>
{/* PetTag */}
{(petCache[post.profile_id] || []).length > 0 && (<div className="flex shrink-0 items-center gap-1">
{(petCache[post.profile_id] || []).slice(0, 3).map(pet => (<PetTag key={pet.id} pet={pet} />))}
</div>)}
</div>

{/* */}
{post.content && (<div className="px-5 pb-3">
<p className="whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-[#3D3027]">
{post.content}
</p>
</div>)}

{/* Images/ — */}
{imgCount > 0 && (<div className="px-5 pb-3">
{imgCount === 1? (/*:LimitMax, 4:3 */
<div className="max-w-[220px] overflow-hidden rounded-xl bg-[#F5F0EB]">
<div className="relative aspect-[4/3]">
{isVideoUrl(post.images![0])? (<video
src={post.images![0]}
className="size-full object-cover"
controls
playsInline
preload="metadata"
/>): (<Image
src={post.images![0]}
alt=""
fill
className="cursor-zoom-in object-cover transition-transform hover:scale-105"
sizes="220px"
onClick={() => openLightbox([post.images![0]], 0)}
/>)}
</div>
</div>): (/* many: */
<div
className={`grid gap-1 overflow-hidden rounded-xl ${
imgCount === 2 || imgCount === 4? "max-w-[360px] grid-cols-2": "max-w-[540px] grid-cols-3"
}`}
>
{post.images!.map((img, i) => (<div key={i} className="relative aspect-square bg-[#F5F0EB]">
{isVideoUrl(img)? (<video
src={img}
className="size-full object-cover"
controls
playsInline
preload="metadata"
/>): (<Image
src={img}
alt=""
fill
className="cursor-zoom-in object-cover transition-transform hover:scale-105"
sizes="(max-width: 768px) 33vw, 180px"
onClick={() => openLightbox(post.images!.filter(u =>!isVideoUrl(u)), i)}
/>)}
</div>))}
</div>)}
</div>)}

{/* Actions */}
<div className="flex items-center gap-2 border-t border-[#F0EBE5] px-5 py-3">
<button
onClick={() => handleToggleLike(post)}
className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
liked? "bg-[#FDF2EE] text-[#C75B3A] shadow-[0_1px_4px_rgba(199,91,58,0.1)]": "bg-[#FAF7F4] text-[#8B5E46] hover:bg-[#F0EBE5]"
}`}
>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={liked? "currentColor": "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
</svg>
<span>{post.likes_count || 0}</span>
</button>

<button
onClick={() => toggleComments(post.id)}
className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
commentsExpanded? "bg-[#F0F7FF] text-[#3B82F6] shadow-[0_1px_4px_rgba(59,130,246,0.1)]": "bg-[#FAF7F4] text-[#8B5E46] hover:bg-[#F0EBE5]"
}`}
>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
</svg>
<span>{post.comments_count || 0}</span>
</button>

<button
onClick={() => handleShare(post)}
className="flex items-center gap-2 rounded-full bg-[#FAF7F4] px-4 py-2 text-[13px] font-medium text-[#8B5E46] transition-all hover:bg-[#F0EBE5]"
>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<circle cx="18" cy="5" r="3" />
<circle cx="6" cy="12" r="3" />
<circle cx="18" cy="19" r="3" />
<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
</svg>
<span>{t("share")}</span>
</button>

<button
onClick={() => handleReport(post)}
className="ml-auto flex items-center gap-2 rounded-full px-3 py-2 text-[13px] text-[#B5A594] transition-colors hover:bg-[#FAF7F4] hover:text-[#D9534F]"
>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
<line x1="4" y1="22" x2="4" y2="15" />
</svg>
</button>

{user && post.profile_id === user.id && (<button
onClick={() => handleDelete(post)}
className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] text-[#B5A594] transition-colors hover:bg-[#FEF2F2] hover:text-[#D9534F]"
>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<polyline points="3 6 5 6 21 6" />
<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
</svg>
</button>)}
</div>

{/* Comment */}
{commentsExpanded && (<div className="border-t border-[#F0EBE5] bg-[#FAFAF8] px-5 py-3">
{isLoadingComments? (<div className="py-3 text-center text-[12px] text-[#B5A594]">{t("loadingComments")}</div>): comments.length === 0? (<div className="py-3 text-center text-[12px] text-[#B5A594]">{t("noComments")}</div>): (<div className="mb-3 flex flex-col gap-2.5">
{comments.map(c => {
const cName = c.public_profiles?.username || c.public_profiles?.display_name || ""
const cAvatar = c.public_profiles?.avatar_url
return (<div key={c.id} className="flex gap-2.5">
{cAvatar? (<div className="relative size-7 shrink-0 rounded-full">
<Image src={cAvatar} alt="" fill className="rounded-full object-cover" sizes="28px" />
</div>): (<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[10px] font-bold text-white">
{cName[0]}
</div>)}
<div className="min-w-0 flex-1">
<div className="flex items-baseline gap-2">
<span className="text-[12px] font-semibold text-[#2D2118]">{cName}</span>
<span className="text-[11px] text-[#C4B8AA]">{formatTime(c.created_at, t)}</span>
</div>
<p className="mt-0.5 text-[13px] leading-relaxed text-[#3D3027]">{c.content}</p>
</div>
</div>)
})}
</div>)}

{/* Commentoutput */}
<div className="flex items-center gap-2">
<input
value={commentInputs[post.id] || ""}
onChange={e => setCommentInputs(prev => ({...prev, [post.id]: e.target.value }))}
onKeyDown={e => { if (e.key === "Enter" &&!e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
placeholder={t("commentPlaceholder")}
className="flex-1 rounded-full border border-[#E5DDD5] bg-white px-4 py-2 text-[13px] text-[#2D2118] outline-none placeholder:text-[#B5A594] focus:border-[#8B5E46]"
/>
<button
onClick={() => submitComment(post.id)}
disabled={!(commentInputs[post.id] || "").trim()}
className="flex size-8 items-center justify-center rounded-full bg-[#8B5E46] text-white transition-colors hover:bg-[#7A523D] disabled:opacity-40"
>
<EmojiIcon name="Send" className="size-3.5" />
</button>
</div>
</div>)}
</article>)
})}

<div ref={sentinelRef} className="h-1" />

{loading && posts.length > 0 && (<div className="flex items-center justify-center gap-2.5 py-5">
<div className="size-4 animate-spin rounded-full border-2 border-[#E8E0D8] border-t-[#8B5E46]" />
<span className="text-[13px] text-[#B5A594]">{t("loadMore")}</span>
</div>)}
{!hasMore && posts.length > 0 && (<div className="py-5 text-center text-[12px] text-[#C4B8AA]">{t("endOfFeed")}</div>)}
</div>)}
</main>

{/* Right side - Hot */}
<aside className="hidden w-[280px] shrink-0 xl:block">
<div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hidden">
<HotTopics />
</div>
</aside>
</div>
</div>

<CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} user={user} onPosted={() => { setHasMore(true); fetchPosts() }} />
<ReportDialog open={showReport} onOpenChange={setShowReport} postId={reportingPostId} user={user} />

{/* Image Lightbox */}
{lightboxImages.length > 0 && (<ImageLightbox
images={lightboxImages}
index={lightboxIndex}
onClose={() => setLightboxImages([])}
onNavigate={setLightboxIndex}
/>)}

{/* User Popup Dialog */}
<UserPopupDialog
userId={popupUserId}
open={popupOpen}
onOpenChange={setPopupOpen}
/>
</div>)
}
