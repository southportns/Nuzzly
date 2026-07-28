"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { fetchBreedOptions } from "@/lib/supabase/queries/breed-queries"
import { toast } from "sonner"
import Image from "next/image"
import dynamic from "next/dynamic"

const CreatePostDialog = dynamic(() => import("./create-post-dialog"), { ssr: false })
const ReportDialog = dynamic(() => import("./report-dialog"), { ssr: false })

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
  { value: "", label: "全部", emoji: "🐾" },
  { value: "cat", label: "猫猫", emoji: "🐱" },
  { value: "dog", label: "狗狗", emoji: "🐶" },
]

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return "刚刚"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function CommunityFeed() {
  const { user } = useAuth()

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [myLikedPostIds, setMyLikedPostIds] = useState<Set<string>>(new Set())
  const [myFavoritedPostIds, setMyFavoritedPostIds] = useState<Set<string>>(new Set())

  const [petType, setPetType] = useState("")
  const [selectedBreed, setSelectedBreed] = useState("全部品种")
  const [showBreed, setShowBreed] = useState(false)
  const [breedSearch, setBreedSearch] = useState("")
  const [breedOptions, setBreedOptions] = useState<string[]>(["全部品种"])

  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)

  // 评论相关
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({})
  const [commentLoading, setCommentLoading] = useState<Set<string>>(new Set())

  const petTypeRef = useRef("")
  const breedRef = useRef("全部品种")

  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(loading)
  const postsRef = useRef(posts)

  const filteredBreeds = breedOptions.filter(
    b => b === "全部品种" || b.toLowerCase().includes(breedSearch.trim().toLowerCase())
  )

  async function loadBreeds(species?: "cat" | "dog") {
    const { data } = await fetchBreedOptions(species ? { species } : undefined)
    setBreedOptions(["全部品种", ...[...new Set(data.map(d => d.canonical))]])
  }

  const fetchPosts = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      const pt = petTypeRef.current
      const br = breedRef.current

      let q = supabase
        .from("community_posts")
        .select(
          `id, profile_id, content, images, pet_type, breed,
           likes_count, comments_count, favorites_count,
           review_status, created_at,
           public_profiles!inner(display_name, avatar_url, username)`
        )
        .eq("is_deleted", false)
        .in("review_status", ["approved", "auto_approved"])
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)

      if (pt) q = q.eq("pet_type", pt)
      if (br !== "全部品种") q = q.eq("breed", br)
      if (cursor) q = q.lt("created_at", cursor)

      const { data, error } = await q
      setLoading(false)
      if (error) {
        console.warn("[community.fetchPosts]", error.message)
        return
      }

      const newPosts = (data || []) as unknown as CommunityPost[]
      setPosts(prev => (cursor ? [...prev, ...newPosts] : newPosts))
      setHasMore(newPosts.length >= PAGE_SIZE)

      if (user?.id && newPosts.length > 0) {
        const { data: likes } = await supabase
          .from("community_likes")
          .select("post_id")
          .eq("profile_id", user.id)
          .in("post_id", newPosts.map(p => p.id))
        if (likes) {
          setMyLikedPostIds(prev => {
            const s = new Set(prev)
            likes.forEach(l => s.add(l.post_id))
            return s
          })
        }

        const { data: favs } = await supabase
          .from("community_favorites")
          .select("post_id")
          .eq("profile_id", user.id)
          .in("post_id", newPosts.map(p => p.id))
        if (favs) {
          setMyFavoritedPostIds(prev => {
            const s = new Set(prev)
            favs.forEach(f => s.add(f.post_id))
            return s
          })
        }
      }
    },
    [supabase, user?.id]
  )

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
    const obs = new IntersectionObserver(
      async entries => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          const last = postsRef.current[postsRef.current.length - 1]
          if (last) await fetchPosts(last.created_at)
        }
      },
      { rootMargin: "200px" }
    )
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
    setSelectedBreed("全部品种")
    breedRef.current = "全部品种"
    setBreedSearch("")
    loadBreeds(v === "cat" ? "cat" : v === "dog" ? "dog" : undefined)
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
    setSelectedBreed("全部品种")
    breedRef.current = "全部品种"
    setBreedSearch("")
    setHasMore(true)
    fetchPosts()
  }

  // 点赞
  async function handleToggleLike(post: CommunityPost) {
    if (!user) {
      toast.error("请先登录")
      return
    }
    const liked = myLikedPostIds.has(post.id)
    if (liked) {
      const { error } = await supabase
        .from("community_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("profile_id", user.id)
      if (error) { toast.error("操作失败"); return }
      setMyLikedPostIds(prev => { const s = new Set(prev); s.delete(post.id); return s })
      setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p)))
    } else {
      const { error } = await supabase
        .from("community_likes")
        .insert({ post_id: post.id, profile_id: user.id })
      if (error) { toast.error("操作失败"); return }
      setMyLikedPostIds(prev => { const s = new Set(prev); s.add(post.id); return s })
      setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p)))
    }
  }

  // 收藏
  async function handleToggleFavorite(post: CommunityPost) {
    if (!user) {
      toast.error("请先登录")
      return
    }
    const favorited = myFavoritedPostIds.has(post.id)
    if (favorited) {
      const { error } = await supabase
        .from("community_favorites")
        .delete()
        .eq("post_id", post.id)
        .eq("profile_id", user.id)
      if (error) { toast.error("操作失败"); return }
      setMyFavoritedPostIds(prev => { const s = new Set(prev); s.delete(post.id); return s })
      setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, favorites_count: Math.max(0, (p.favorites_count || 0) - 1) } : p)))
    } else {
      const { error } = await supabase
        .from("community_favorites")
        .insert({ post_id: post.id, profile_id: user.id })
      if (error) { toast.error("操作失败"); return }
      setMyFavoritedPostIds(prev => { const s = new Set(prev); s.add(post.id); return s })
      setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, favorites_count: (p.favorites_count || 0) + 1 } : p)))
    }
  }

  // 分享
  function handleShare(post: CommunityPost) {
    const text = post.content.slice(0, 100)
    if (navigator.share) {
      navigator.share({ title: "毛球镇社区", text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`)
      toast.success("链接已复制到剪贴板")
    }
  }

  // 评论展开/收起
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
    const { data } = await supabase
      .from("community_comments")
      .select("id, content, created_at, profile_id, public_profiles!inner(display_name, avatar_url, username)")
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .in("review_status", ["approved", "auto_approved"])
      .order("created_at", { ascending: true })
      .limit(20)
    setPostComments(prev => ({ ...prev, [postId]: (data || []) as unknown as Comment[] }))
    setCommentLoading(prev => { const s = new Set(prev); s.delete(postId); return s })
  }

  async function submitComment(postId: string) {
    if (!user) { toast.error("请先登录"); return }
    const text = (commentInputs[postId] || "").trim()
    if (!text) return

    // 1. 文本审核(获取 audit_token + client_ip)
    const auditRes = await fetch("/api/community/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    })
    const auditData = await auditRes.json().catch(() => ({}))
    if (!auditRes.ok || auditData.passed === false) {
      toast.error(auditData.reason || auditData.error || "评论审核未通过")
      return
    }
    const auditToken = auditData.audit_token
    const clientIp = auditData.client_ip
    if (!auditToken) {
      toast.error("审核凭证缺失，请重试")
      return
    }

    // 2. 通过 RPC 发布评论(后端强制校验 audit_token)
    const { error } = await supabase.rpc("create_community_comment", {
      p_post_id: postId,
      p_content: text,
      p_audit_token: auditToken,
      p_ip_address: clientIp,
    } as never)
    if (error) {
      toast.error(error.message || "评论失败")
      return
    }

    setCommentInputs(prev => ({ ...prev, [postId]: "" }))
    toast.success("评论成功")
    loadComments(postId)
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)))
  }

  async function handleDelete(post: CommunityPost) {
    if (!user) return
    if (!confirm("确定删除这条动态吗？")) return
    const { error } = await supabase
      .from("community_posts")
      .update({ is_deleted: true })
      .eq("id", post.id)
    if (error) { toast.error("删除失败"); return }
    setPosts(prev => prev.filter(p => p.id !== post.id))
    toast.success("已删除")
  }

  function handleReport(post: CommunityPost) {
    setReportingPostId(post.id)
    setShowReport(true)
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* 三栏布局 */}
      <div className="mx-auto w-[90%] max-w-[1700px] pb-24 pt-5">
        <div className="flex gap-6">

          {/* 左侧 - 标题 + 用户信息 */}
          <aside className="hidden w-[260px] shrink-0 lg:block">
            <div className="sticky top-24 flex flex-col gap-4">
              {/* 社区标题 */}
              <div className="rounded-2xl border border-[#E8E0D8] bg-gradient-to-br from-[#F5E6D3] via-[#E8D5C4] to-[#D4C0A8] p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[#8B5E46]/60">Community</div>
                <h1 className="text-[20px] font-bold tracking-tight text-[#4A3728]">毛球镇社区</h1>
                <p className="mt-1 text-[12px] leading-relaxed text-[#7A6352]">分享你和毛孩子的故事，发现更多养宠灵感</p>
              </div>
              {/* 用户信息卡 */}
              <UserProfileCardInline />
              {/* 发布动态按钮 */}
              <button
                onClick={() => (user ? setShowCreatePost(true) : toast.error("请先登录"))}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7A59] to-[#FF9A7A] py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(255,122,89,0.3)] transition-all hover:shadow-[0_6px_24px_rgba(255,122,89,0.4)] hover:brightness-105 active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-white">
                  <path d="M9 3.25V14.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M3.25 9H14.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                发布动态
              </button>
            </div>
          </aside>

          {/* 中间 - Feed */}
          <main className="min-w-0 flex-1">
            {/* 筛选区域 */}
            <div className="mb-4">
              <div className="rounded-2xl border border-[#E8E0D8] bg-white p-3 shadow-[0_2px_12px_rgba(139,94,70,0.08)]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {TYPE_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => changePetType(t.value)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                          petType === t.value
                            ? "bg-[#8B5E46] text-white shadow-[0_2px_8px_rgba(139,94,70,0.3)]"
                            : "bg-[#F5F0EB] text-[#7A6352] hover:bg-[#EDE6DF]"
                        }`}
                      >
                        <span className="text-[13px]">{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="mx-1 h-5 w-px bg-[#E5DDD5]" />
                  <div className="relative flex-1">
                    <div
                      className={`flex h-9 items-center gap-2 rounded-full border px-3 transition-colors ${
                        showBreed || selectedBreed !== "全部品种"
                          ? "border-[#8B5E46] bg-[#FDF8F4]"
                          : "border-[#E5DDD5] bg-[#FAFAF8]"
                      }`}
                    >
                      <EmojiIcon name="Search" className="size-3.5 shrink-0 text-[#B5A594]" />
                      <input
                        value={breedSearch}
                        onChange={e => { setBreedSearch(e.target.value); setShowBreed(true) }}
                        onFocus={() => setShowBreed(true)}
                        placeholder={selectedBreed === "全部品种" ? "品种" : selectedBreed}
                        className="min-w-0 flex-1 bg-transparent text-[13px] text-[#4A3728] outline-none placeholder:text-[#B5A594]"
                      />
                      {selectedBreed !== "全部品种" && (
                        <button onClick={clearBreed} className="shrink-0 rounded-full bg-[#E8E0D8] p-0.5 transition-colors hover:bg-[#D4C8BC]">
                          <EmojiIcon name="X" className="size-3 text-[#8B7565]" />
                        </button>
                      )}
                    </div>
                    {showBreed && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => { setShowBreed(false); if (selectedBreed === "全部品种") setBreedSearch("") }} />
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#E8E0D8] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] scrollbar-hidden">
                          {filteredBreeds.length === 0 && (
                            <div className="px-4 py-3 text-[13px] text-[#B5A594]">没有找到相关品种</div>
                          )}
                          {filteredBreeds.map(b => (
                            <button
                              key={b}
                              onClick={() => changeBreed(b)}
                              className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                                b === selectedBreed ? "bg-[#F5EDE5] font-semibold text-[#8B5E46]" : "text-[#4A3728] hover:bg-[#FAF7F4]"
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 帖子列表 */}
            {loading && posts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="size-10 animate-spin rounded-full border-[3px] border-[#E8E0D8] border-t-[#8B5E46]" />
                <div className="text-[13px] text-[#B5A594]">正在发现精彩内容...</div>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F5EDE5] to-[#E8D5C4]">
                  <span className="text-[36px]">🐾</span>
                </div>
                <div className="text-center">
                  <div className="text-[16px] font-semibold text-[#4A3728]">还没有动态</div>
                  <div className="mt-1 text-[13px] text-[#B5A594]">成为第一个分享故事的人吧</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {posts.map(post => {
                  const profile = post.public_profiles
                  const name = profile?.username || profile?.display_name || "匿名用户"
                  const avatar = profile?.avatar_url
                  const liked = myLikedPostIds.has(post.id)
                  const favorited = myFavoritedPostIds.has(post.id)
                  const imgCount = post.images?.length || 0
                  const commentsExpanded = expandedComments.has(post.id)
                  const comments = postComments[post.id] || []
                  const isLoadingComments = commentLoading.has(post.id)

                  return (
                    <article
                      key={post.id}
                      className="group overflow-hidden rounded-2xl border border-[#E8E0D8] bg-white shadow-[0_1px_4px_rgba(139,94,70,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(139,94,70,0.1)]"
                    >
                      {/* 作者行 */}
                      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                        {avatar ? (
                          <div className="relative size-10 shrink-0 rounded-full ring-2 ring-[#F5EDE5]">
                            <Image src={avatar} alt="" fill className="rounded-full object-cover" sizes="40px" />
                          </div>
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[15px] font-bold text-white ring-2 ring-[#F5EDE5]">
                            {name[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-[#2D2118]">{name}</div>
                          <div className="flex items-center gap-1.5 text-[12px] text-[#B5A594]">
                            <span>{formatTime(post.created_at)}</span>
                            {post.pet_type && (
                              <>
                                <span className="text-[#D4C8BC]">·</span>
                                <span className="inline-flex items-center gap-0.5">
                                  {post.pet_type === "cat" ? "🐱" : post.pet_type === "dog" ? "🐶" : ""}
                                  {post.breed || (post.pet_type === "cat" ? "猫猫" : "狗狗")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 内容 */}
                      {post.content && (
                        <div className="px-5 pb-3">
                          <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-[#3D3027]">
                            {post.content}
                          </p>
                        </div>
                      )}

                      {/* 图片/视频 */}
                      {imgCount > 0 && (
                        <div className="px-5 pb-3">
                          <div className={`overflow-hidden rounded-xl ${
                            imgCount === 1 ? "" : imgCount === 2 ? "grid grid-cols-2 gap-1" : imgCount === 4 ? "grid grid-cols-2 gap-1" : "grid grid-cols-3 gap-1"
                          }`}>
                            {post.images!.map((img, i) => (
                              <div
                                key={i}
                                className={`relative bg-[#F5F0EB] ${imgCount === 1 ? "aspect-[4/3] max-h-[400px] w-full" : "aspect-square w-full"}`}
                              >
                                {isVideoUrl(img) ? (
                                  <video
                                    src={img}
                                    className="size-full object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                  />
                                ) : (
                                  <Image
                                    src={img}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes={imgCount === 1 ? "(max-width: 768px) 100vw, 600px" : "(max-width: 768px) 50vw, 200px"}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 操作栏 */}
                      <div className="flex items-center gap-2 border-t border-[#F0EBE5] px-5 py-3">
                        <button
                          onClick={() => handleToggleLike(post)}
                          className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                            liked ? "bg-[#FDF2EE] text-[#C75B3A] shadow-[0_1px_4px_rgba(199,91,58,0.1)]" : "bg-[#FAF7F4] text-[#8B5E46] hover:bg-[#F0EBE5]"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>{post.likes_count || 0}</span>
                        </button>

                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                            commentsExpanded ? "bg-[#F0F7FF] text-[#3B82F6] shadow-[0_1px_4px_rgba(59,130,246,0.1)]" : "bg-[#FAF7F4] text-[#8B5E46] hover:bg-[#F0EBE5]"
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
                          <span>分享</span>
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

                        {user && post.profile_id === user.id && (
                          <button
                            onClick={() => handleDelete(post)}
                            className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] text-[#B5A594] transition-colors hover:bg-[#FEF2F2] hover:text-[#D9534F]"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* 评论区 */}
                      {commentsExpanded && (
                        <div className="border-t border-[#F0EBE5] bg-[#FAFAF8] px-5 py-3">
                          {isLoadingComments ? (
                            <div className="py-3 text-center text-[12px] text-[#B5A594]">加载评论中...</div>
                          ) : comments.length === 0 ? (
                            <div className="py-3 text-center text-[12px] text-[#B5A594]">暂无评论，来说点什么吧</div>
                          ) : (
                            <div className="mb-3 flex flex-col gap-2.5">
                              {comments.map(c => {
                                const cName = c.public_profiles?.username || c.public_profiles?.display_name || "匿名"
                                const cAvatar = c.public_profiles?.avatar_url
                                return (
                                  <div key={c.id} className="flex gap-2.5">
                                    {cAvatar ? (
                                      <div className="relative size-7 shrink-0 rounded-full">
                                        <Image src={cAvatar} alt="" fill className="rounded-full object-cover" sizes="28px" />
                                      </div>
                                    ) : (
                                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[10px] font-bold text-white">
                                        {cName[0]}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-[12px] font-semibold text-[#2D2118]">{cName}</span>
                                        <span className="text-[11px] text-[#C4B8AA]">{formatTime(c.created_at)}</span>
                                      </div>
                                      <p className="mt-0.5 text-[13px] leading-relaxed text-[#3D3027]">{c.content}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* 评论输入框 */}
                          <div className="flex items-center gap-2">
                            <input
                              value={commentInputs[post.id] || ""}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                              placeholder="写评论..."
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
                        </div>
                      )}
                    </article>
                  )
                })}

                <div ref={sentinelRef} className="h-1" />

                {loading && posts.length > 0 && (
                  <div className="flex items-center justify-center gap-2.5 py-5">
                    <div className="size-4 animate-spin rounded-full border-2 border-[#E8E0D8] border-t-[#8B5E46]" />
                    <span className="text-[13px] text-[#B5A594]">加载更多...</span>
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <div className="py-5 text-center text-[12px] text-[#C4B8AA]">— 已经到底了 —</div>
                )}
              </div>
            )}
          </main>

          {/* 右侧 - 热门话题 */}
          <aside className="hidden w-[280px] shrink-0 xl:block">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hidden">
              <HotTopicsInline />
            </div>
          </aside>
        </div>
      </div>

      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} user={user} onPosted={() => { setHasMore(true); fetchPosts() }} />
      <ReportDialog open={showReport} onOpenChange={setShowReport} postId={reportingPostId} user={user} />
    </div>
  )
}

// 内联的用户信息卡片（避免额外的客户端边界）
function UserProfileCardInline() {
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
            <div className="text-[14px] font-semibold text-[#2D2118]">登录后查看更多</div>
            <div className="mt-1 text-[12px] text-[#B5A594]">加入社区，分享你的养宠故事</div>
          </div>
          <button type="button" onClick={() => openLoginModal()} className="mt-1 rounded-full bg-[#8B5E46] px-6 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#7A523D]">立即登录</button>
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

  const trustLevel = (profile.trust_score || 0) >= 80 ? "钻石" : (profile.trust_score || 0) >= 60 ? "金牌" : (profile.trust_score || 0) >= 40 ? "银牌" : "铜牌"

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
          <div className="text-[15px] font-bold text-[#2D2118]">{profile.username || profile.display_name || "匿名用户"}</div>
          <div className="mt-0.5 text-[11px] text-[#B5A594]">ID: nuzzmily{String(profile.user_number || 0).padStart(3, "0")}</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-[#FAF7F4] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#B5A594]">信任分</span>
          <span className="text-[14px] font-bold text-[#8B5E46]">{profile.trust_score || 0}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#E8E0D8]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#8B5E46] to-[#D4A574] transition-all duration-500" style={{ width: `${Math.min(100, profile.trust_score || 0)}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-6 text-center">
        <div>
          <div className="text-[16px] font-bold text-[#2D2118]">{followerCount}</div>
          <div className="text-[11px] text-[#B5A594]">粉丝</div>
        </div>
        <div className="h-6 w-px bg-[#E8E0D8]" />
        <div>
          <div className="text-[16px] font-bold text-[#2D2118]">{followingCount}</div>
          <div className="text-[11px] text-[#B5A594]">关注</div>
        </div>
      </div>
    </div>
  )
}

// 内联的热门话题
function HotTopicsInline() {
  const HOT_TOPICS = [
    { tag: "猫粮推荐", count: 328 },
    { tag: "软便求助", count: 256 },
    { tag: "新手养猫", count: 189 },
    { tag: "布偶猫", count: 167 },
    { tag: "英短蓝猫", count: 145 },
    { tag: "猫砂测评", count: 132 },
    { tag: "驱虫经验", count: 98 },
    { tag: "猫咪零食", count: 87 },
  ]
  const ACTIVE_USERS = [
    { name: "球球麻麻", posts: 42 },
    { name: "猫粮测评师", posts: 38 },
    { name: "铲屎官日记", posts: 35 },
    { name: "布偶之家", posts: 29 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#2D2118]">热门话题</span>
        </div>
        <div className="flex flex-col gap-1">
          {HOT_TOPICS.map((topic, i) => (
            <button key={topic.tag} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#FAF7F4]">
              <span className={`flex size-6 items-center justify-center rounded-lg text-[11px] font-bold ${i < 3 ? "bg-gradient-to-br from-[#C75B3A] to-[#8B5E46] text-white" : "bg-[#F5EDE5] text-[#8B5E46]"}`}>
                {i + 1}
              </span>
              <span className="flex-1 text-[13px] font-medium text-[#2D2118]">{topic.tag}</span>
              <span className="text-[11px] text-[#B5A594]">{topic.count}帖</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[16px]">🏆</span>
          <span className="text-[14px] font-bold text-[#2D2118]">活跃用户</span>
        </div>
        <div className="flex flex-col gap-2">
          {ACTIVE_USERS.map((u, i) => (
            <div key={u.name} className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[#FAF7F4]">
              <div className={`flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white ${i === 0 ? "bg-gradient-to-br from-[#D4A574] to-[#8B5E46]" : i === 1 ? "bg-gradient-to-br from-[#C4B8AA] to-[#8B7565]" : "bg-gradient-to-br from-[#E8D5C4] to-[#B5A594]"}`}>
                {u.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[#2D2118]">{u.name}</div>
                <div className="text-[11px] text-[#B5A594]">{u.posts} 篇动态</div>
              </div>
              <button className="rounded-full border border-[#E8E0D8] px-2.5 py-1 text-[11px] font-medium text-[#8B5E46] transition-colors hover:bg-[#8B5E46] hover:text-white">关注</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(139,94,70,0.06)]">
        <div className="mb-2 text-[13px] font-bold text-[#2D2118]">社区规范</div>
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-[#8B7565]">
          <li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>分享真实养宠经验，友善交流</li>
          <li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>禁止发布广告、虚假信息</li>
          <li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>尊重每一位宠物主人</li>
          <li className="flex items-start gap-1.5"><span className="mt-0.5 text-[#D4A574]">•</span>如遇紧急健康问题请就医</li>
        </ul>
      </div>
    </div>
  )
}
