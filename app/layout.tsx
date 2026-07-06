import type { Metadata } from "next";
import "./globals.css";
import { CrispProvider } from "@/components/CrispProvider";

export const metadata: Metadata = {
  title: "纸片人 - AI 情感陪伴",
  description: "AI 虚拟恋人/女友，模拟真实恋爱体验，情感陪伴、角色扮演",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased h-dvh">
        <CrispProvider />
        {children}
      </body>
    </html>
  );
}
