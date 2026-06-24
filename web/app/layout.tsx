import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetRWD — 猫咪消费信任基础设施",
  description: "基于长期真实反馈与社区追踪数据，建立透明、可信赖的猫咪消费基础设施",
  icons: {
    icon: "/favio.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Varela+Round&family=Quicksand:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
