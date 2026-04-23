import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { FontSizeProvider } from "@/lib/font-size-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "InfoB",
  description: "관심사 기반 AI 뉴스 분석·요약 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <FontSizeProvider>{children}</FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
