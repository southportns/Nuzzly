import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/query"

export const metadata = {
  title: "账号设置 — PetRWD",
}

export default async function SettingsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          账号设置
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">管理你的账号信息与偏好</p>
      </div>

      <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
        <CardHeader>
          <CardTitle className="text-[15px]">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">邮箱</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">用户ID</p>
            <p className="font-mono text-xs">{user.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
