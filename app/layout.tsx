import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "深宫纪 — AI互动宫廷小说",
  description: "用AI续写你的宫斗人生，看你能活几集。景隆朝后宫生存博弈，每一个选择都关乎生死。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "深宫纪",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0C0A08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-palace" suppressHydrationWarning>{children}</body>
    </html>
  );
}
