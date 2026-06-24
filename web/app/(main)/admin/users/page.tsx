import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAdmin, listUsers } from "@/lib/supabase/query"
import { Search } from "lucide-react"
import { UserRowActions } from "@/components/admin/user-row-actions"

export const metadata = {
  title: "用户管理 — PetRWD 管理员",
}

type SearchParams = Promise<{
  search?: string
  flagged?: string
}>

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { user, isAdmin } = await requireAdmin()
  if (!user) redirect("/login")
  if (!isAdmin) redirect("/dashboard")

  const sp = await searchParams
  const search = sp.search?.trim() ?? ""
  const flaggedOnly = sp.flagged === "1"

  const { data: users, error } = await listUsers({
    search: search || undefined,
    flagged: flaggedOnly,
    limit: 200,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111111]">用户管理</h1>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">
            共 {users?.length ?? 0} 名用户{flaggedOnly ? "（仅显示被标记）" : ""}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form className="flex flex-wrap items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-3">
        <label className="flex flex-1 items-center gap-2 rounded-full bg-[#F7F6F3] px-4 py-2.5">
          <Search className="size-4 text-[#9B9A98]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="搜索用户名 / 昵称"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9B9A98]"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#444444]">
          <input
            type="checkbox"
            name="flagged"
            value="1"
            defaultChecked={flaggedOnly}
            className="size-4 accent-[#FF7A59]"
          />
          仅显示被标记
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#111111] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#333]"
        >
          筛选
        </button>
        {(search || flaggedOnly) && (
          <Link
            href="/admin/users"
            className="rounded-full px-3 py-2 text-[13px] text-[#6B6B6B] hover:text-[#111111]"
          >
            清除
          </Link>
        )}
      </form>

      {error && (
        <div className="rounded-[14px] border border-[#ff3b30]/30 bg-[#ff3b30]/8 p-4 text-[13px] text-[#ff3b30]">
          加载失败：{error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white">
        <table className="w-full table-fixed text-left text-[13.5px]">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-[#F7F6F3] text-[12px] uppercase tracking-wider text-[#6B6B6B]">
            <tr>
              <th className="px-4 py-3 font-semibold">用户</th>
              <th className="px-4 py-3 font-semibold">信任分</th>
              <th className="px-4 py-3 font-semibold">评价数</th>
              <th className="px-4 py-3 font-semibold">状态</th>
              <th className="px-4 py-3 font-semibold">注册时间</th>
              <th className="px-4 py-3 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFED]">
            {users && users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-[#FBFAF8]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-[#F0EFED] text-[12px] font-semibold text-[#444444]">
                        {(u.display_name ?? u.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-[#111111]">
                          {u.display_name ?? u.username}
                        </p>
                        <p className="text-[11.5px] text-[#9B9A98]">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#444444]">{u.trust_score ?? 0}</td>
                  <td className="px-4 py-3 text-[#444444]">{u.review_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {u.is_admin ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#7BA7BC]/14 px-2 py-0.5 text-[11px] font-semibold text-[#4A7A91]">
                          管理员
                        </span>
                      ) : null}
                      {u.is_flagged ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[11px] font-semibold text-[#ff3b30]">
                          已标记
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#A8C5A0]/14 px-2 py-0.5 text-[11px] text-[#5C7C56]">
                          正常
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#6B6B6B]">
                    {new Date(u.created_at).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <UserRowActions
                      userId={u.id}
                      username={u.username}
                      isFlagged={!!u.is_flagged}
                      isAdmin={!!u.is_admin}
                      flagReason={u.flag_reason ?? null}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[14px] text-[#6B6B6B]">
                  没有匹配的用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
