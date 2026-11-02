import type { Metadata, Viewport } from "next";
import "./globals.css";

const base = process.env.NODE_ENV === "production" ? "/work-assistant" : "";

export const metadata: Metadata = {
  title: "個人助理",
  description: "宇群的個人工作助理：先全局思考，再看待辦",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: `${base}/icon-192.png`,
    apple: `${base}/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "個人助理",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
