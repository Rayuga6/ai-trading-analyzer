import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AITrade Analyzer",
    template: "%s | AITrade Analyzer",
  },
  description:
    "AI-powered trading chart analysis for crypto, Indian markets, forex and global stocks.",
  applicationName: "AITrade Analyzer",
  keywords: [
    "AI trading analyzer",
    "chart analysis",
    "trading AI",
    "crypto analysis",
    "Indian stock analysis",
    "forex analysis",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070b14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#070b14] text-white antialiased">
        <div id="app-shell" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
