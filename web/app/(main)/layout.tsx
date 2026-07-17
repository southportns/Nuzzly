import { Header } from "@/components/layout/header"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-[#F7F6F3]">
      <Header />
      <main className="min-w-0 flex-1" style={{ paddingTop: "calc(72px + var(--safe-top))" }}>{children}</main>
    </div>
  )
}
