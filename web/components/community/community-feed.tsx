"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { fetchBreedOptions } from "@/lib/supabase/queries/breed-queries"
import { toast } from "sonner"
import { Heart, Flag, Trash2, Plus, Search, X } from "lucide-react"
import { CreatePostDialog } from "./create-post-dialog"
import { ReportDialog } from "./report-dialog"

interface PublicProfile {
  display_name: string | null
  avatar_url: string | null
}

interface CommunityPost {
  id: string
  profile_id: string
  content: string
  images: string[] | null
  pet_type: string | null
  breed: string | null
  likes_count: number | null
  review_status: string
  created_at: string
  public_profiles: PublicProfile | null
}

const PAGE_SIZE = 20

const TYPE_OPTIONS = [
  { value: "", label: "全部" },
  { value: "cat", label: "猫猫" },
  { value: "dog", label: "狗狗" },
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

  // 稳定的 supabase client（避免每次渲染重建）
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [myLikedPostIds, setMyLikedPostIds] = useState<Set<string>>(new Set())

  const [petType, setPetType] = useState("")
  const [selectedBreed, setSelectedBreed] = useState("全部品种")
  const [showBreed, setShowBreed] = useState(false)
  const [breedSearch, setBreedSearch] = useState("")
  const [breedOptions, setBreedOptions] = useState<string[]>(["全部品种"])

  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)

  // 用 ref 保存最新筛选值，供 fetchPosts / observer 闭包读取
  const petTypeRef = useRef("")
  const breedRef = useRef("全部品种")

  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const filteredBreeds = breedOptions.filter(
    b => b === "全部品种" || b.toLowerCase().includes(breedSearch.trim().toLowerCase())
  )

  async function loadBreeds(species?: "cat" | "dog") {
    const { data } = await fetchBreedOptions(species ? { species } : undefined)
    setBreedOptions(["全部品种", ...data.map(d => d.canonical)])
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
           likes_count, review_status, created_at,
           public_profiles!inner(display_name, avatar_url)`
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

      // 当前用户对这批帖子的点赞状态
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
      }
    },
    [supabase, user?.id]
  )

  // 无限滚动
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(
      async entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const last = posts[posts.length - 1]
          if (last) await fetchPosts(last.created_at)
        }
      },
      { rootMargin: "200px" }
    )
    obs.observe(sentinelRef.current)
    observerRef.current = obs
    return () => obs.disconnect()
  }, [hasMore, loading, posts, fetchPosts])

  // 初始加载
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
      if (error) {
        toast.error("操作失败")
        return
      }
      setMyLikedPostIds(prev => {
        const s = new Set(prev)
        s.delete(post.id)
        return s
      })
      setPosts(prev =>
        prev.map(p => (p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p))
      )
    } else {
      const { error } = await supabase
        .from("community_likes")
        .insert({ post_id: post.id, profile_id: user.id })
      if (error) {
        toast.error("操作失败")
        return
      }
      setMyLikedPostIds(prev => {
        const s = new Set(prev)
        s.add(post.id)
        return s
      })
      setPosts(prev =>
        prev.map(p => (p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
      )
    }
  }

  async function handleDelete(post: CommunityPost) {
    if (!user) return
    if (!confirm("确定删除这条动态吗？")) return
    const { error } = await supabase
      .from("community_posts")
      .update({ is_deleted: true })
      .eq("id", post.id)
    if (error) {
      toast.error("删除失败")
      return
    }
    setPosts(prev => prev.filter(p => p.id !== post.id))
    toast.success("已删除")
  }

  function handleReport(post: CommunityPost) {
    setReportingPostId(post.id)
    setShowReport(true)
  }

  return (
    <div className="mx-auto max-w-[640px] px-4 pb-28 pt-6">
      {/* 筛选栏 */}
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 overflow-hidden rounded-full border border-[#EEE] bg-white shadow-sm">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t.value}
              onClick={() => changePetType(t.value)}
              className={`px-4 text-[14px] font-medium transition-colors ${
                petType === t.value ? "bg-[#8B5E46] text-white" : "text-[#6B6B6B] hover:text-[#8B5E46]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 品种搜索 */}
        <div className="relative flex-1">
          <div
            className={`flex h-10 items-center gap-2 rounded-full border bg-white px-3 shadow-sm ${
              showBreed || selectedBreed !== "全部品种" ? "border-[#8B5E46]" : "border-[#EEE]"
            }`}
          >
            <Search className="size-4 shrink-0 text-[#AAA]" />
            <input
              value={breedSearch}
              onChange={e => {
                setBreedSearch(e.target.value)
                setShowBreed(true)
              }}
              onFocus={() => setShowBreed(true)}
              placeholder={selectedBreed === "全部品种" ? "搜索品种..." : selectedBreed}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#AAA]"
            />
            {selectedBreed !== "全部品种" && (
              <button onClick={clearBreed} className="shrink-0">
                <X className="size-4 text-[#AAA]" />
              </button>
            )}
          </div>
          {showBreed && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setShowBreed(false)
                  if (selectedBreed === "全部品种") setBreedSearch("")
                }}
              />
              <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#EEE] bg-white p-2 shadow-lg">
                {filteredBreeds.length === 0 && (
                  <div className="px-4 py-3 text-[13px] text-[#AAA]">没有找到相关品种</div>
                )}
                {filteredBreeds.map(b => (
                  <button
                    key={b}
                    onClick={() => changeBreed(b)}
                    className={`w-full rounded-xl px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F5F5F5] ${
                      b === selectedBreed ? "font-semibold text-[#8B5E46]" : "text-[#1A1A1A]"
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

      {/* 帖子列表 */}
      {loading && posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="size-6 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#8B5E46]" />
          <div className="text-[14px] text-[#AAA]">加载中...</div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="text-[48px]">📝</div>
          <div className="text-[14px] text-[#AAA]">还没有帖子，快来发第一条吧！</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map(post => {
            const profile = post.public_profiles
            const name = profile?.display_name || "匿名用户"
            const avatar = profile?.avatar_url
            const liked = myLikedPostIds.has(post.id)
            const imgCount = post.images?.length || 0
            return (
              <div
                key={post.id}
                className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  {avatar ? (
                    <img src={avatar} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[16px] font-semibold text-white">
                      {name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-[#1A1A1A]">{name}</div>
                    {post.pet_type && (
                      <div className="text-[11px] text-[#AAA]">
                        {post.pet_type === "cat" ? "猫猫" : post.pet_type === "dog" ? "狗狗" : ""}
                        {post.breed ? ` · ${post.breed}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-[12px] text-[#AAA]">{formatTime(post.created_at)}</div>
                </div>

                <p className="mb-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#1A1A1A]">
                  {post.content}
                </p>

                {imgCount > 0 && (
                  <div
                    className={`mb-3 grid gap-1.5 ${
                      imgCount === 1 ? "grid-cols-1" : imgCount === 2 ? "grid-cols-2" : "grid-cols-3"
                    }`}
                  >
                    {post.images!.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        loading="lazy"
                        className={`aspect-square rounded-xl bg-[#F5F5F5] object-cover ${
                          imgCount === 1 ? "max-w-[360px]" : ""
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-5">
                  <button
                    onClick={() => handleToggleLike(post)}
                    className={`flex items-center gap-1.5 text-[13px] transition-colors ${
                      liked ? "text-[#8B5E46]" : "text-[#999] hover:text-[#8B5E46]"
                    }`}
                  >
                    <Heart className={`size-4 ${liked ? "fill-[#8B5E46]" : ""}`} />
                    <span>{post.likes_count || 0}</span>
                  </button>
                  <button
                    onClick={() => handleReport(post)}
                    className="flex items-center gap-1.5 text-[13px] text-[#999] transition-colors hover:text-[#8B5E46]"
                  >
                    <Flag className="size-4" />
                    <span>举报</span>
                  </button>
                  {user && post.profile_id === user.id && (
                    <button
                      onClick={() => handleDelete(post)}
                      className="flex items-center gap-1.5 text-[13px] text-[#999] transition-colors hover:text-[#D9534F]"
                    >
                      <Trash2 className="size-4" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div ref={sentinelRef} className="h-1" />

          {loading && posts.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[#AAA]">
              <div className="size-4 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#8B5E46]" />
              <span>加载更多...</span>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="py-4 text-center text-[12px] text-[#AAA]">没有更多了</div>
          )}
        </div>
      )}

      {/* 发帖 FAB */}
      <button
        onClick={() => (user ? setShowCreatePost(true) : toast.error("请先登录"))}
        className="fixed bottom-8 right-8 z-50 flex size-14 items-center justify-center rounded-full bg-[#8B5E46] text-white shadow-[0_4px_20px_rgba(139,94,70,0.4)] transition-transform hover:scale-105"
      >
        <Plus className="size-6" />
      </button>

      <CreatePostDialog
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        user={user}
        onPosted={() => {
          setHasMore(true)
          fetchPosts()
        }}
      />
      <ReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        postId={reportingPostId}
        user={user}
      />
    </div>
  )
}
