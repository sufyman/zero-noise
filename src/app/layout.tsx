import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Zero Noise - Your Personalized AI Content Feed",
  description: "Get personalized content in your preferred format - daily podcasts, reports, videos, and more. Powered by AI to match your interests and consumption style.",
  keywords: ["AI", "personalized content", "podcast", "daily briefing", "startup news", "SEO", "content feed"],
  authors: [{ name: "Zero Noise Team" }],
  creator: "Zero Noise",
  publisher: "Zero Noise",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth dark">
      <body className={cn(
        inter.variable,
        spaceGrotesk.variable,
        "min-h-screen bg-background font-sans antialiased overflow-x-hidden"
      )}>
        <div className="relative flex min-h-screen flex-col">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
