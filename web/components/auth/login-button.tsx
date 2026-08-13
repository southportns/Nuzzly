"use client"

import Link from "next/link"

interface LoginButtonProps {
  children: React.ReactNode
  className?: string
}

/**
 * 轻量客户端按钮，点击跳转到 /login 页面。
 * 供服务端组件或不方便加 "use client" 的场景使用。
 */
export function LoginButton({ children, className }: LoginButtonProps) {
  return (
    <Link href="/login" className={className}>
      {children}
    </Link>
  )
}
