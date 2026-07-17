import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Nuzzly毛球镇 Logo"
              className="size-11 rounded-[10px]"
            />
            <span className="text-[18px] font-bold tracking-tight text-[#111111]">Nuzzly毛球镇</span>
          </Link>
          <h1 className="mt-4 text-[28px] font-bold leading-[1.07] tracking-[-0.005em] text-[#111111]">
            登录 Nuzzly毛球镇
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">
            使用你的账号继续
          </p>
        </div>
        <div className="mt-8 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-white p-6">
          <LoginForm />
          <p className="mt-4 text-center text-[14px] text-[#6B6B6B]">
            还没有账号？{" "}
            <Link href="/signup" className="text-[#FF7A59] hover:underline">
              免费注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
