import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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
  title: "Nuzzly Town — Pet Care Trust Infrastructure",
  description: "Building transparent, trustworthy pet care infrastructure through long-term real-world feedback and community-tracked data.",
  icons: {
    icon: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nuzzly Town",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preload" as="video" href="/nuzzly-town.mp4" type="video/mp4" />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
