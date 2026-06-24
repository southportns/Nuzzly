import { Header } from "@/components/layout/header"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F3]">
      <Header />
      <main className="flex-1 pt-[72px]">{children}</main>
    </div>
  )
}
