import type { Metadata, Viewport } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";

const base = process.env.NODE_ENV === "production" ? "/work-assistant" : "";

// 英文與數字用 EB Garamond（建置時打包）。
// 中文用思源宋體（明體），檔案太大，next/font 下載不動，改由 Google Fonts 依用到的字分片載入。
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
});
const serifTCHref = "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600&display=swap";

// 依台北時間的星期設定當天的封面色，在畫面出現前就套用，避免閃一下；
// 瀏覽器頂部與 PWA 外框的顏色（theme-color）也跟著換。色碼與 globals.css 的 [data-day] 一致。
const DAY_COLORS = ["#596279", "#526478", "#566655", "#685e77", "#765b60", "#4c666b", "#616265"];
const dayScript = `(function(){try{var c=${JSON.stringify(DAY_COLORS)};var d=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Taipei"})).getDay();document.documentElement.dataset.day=String(d);var set=function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c[d]);};set();document.addEventListener("DOMContentLoaded",set);}catch(e){}})();`;

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
    statusBarStyle: "black-translucent",
    title: "個人助理",
  },
};

export const viewport: Viewport = {
  themeColor: "#566655",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className={`${garamond.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: dayScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={serifTCHref} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
