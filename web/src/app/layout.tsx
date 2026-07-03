import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TabBar } from "@/components/TabBar";
import ChatBot from "@/components/chatbot/ChatBot";

export const metadata: Metadata = {
  title: { default: "SLOWEON — Quiet City Summer 2026", template: "%s | SLOWEON" },
  description:
    "절제된 미니멀 무드와 릴랙스 테일러링의 남성 컨템포러리 패션. 실측 사이즈와 모델 착용 정보로 실패 없는 구매.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <TabBar />
        <ChatBot />
      </body>
    </html>
  );
}
