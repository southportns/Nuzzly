import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F7F6F3",
};

export const metadata: Metadata = {
  title: "Nuzzly毛球镇 — 猫咪消费信任基础设施",
  description: "基于长期真实反馈与社区追踪数据，建立透明、可信赖的猫咪消费基础设施",
  icons: {
    icon: "/favio.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nuzzly毛球镇",
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
