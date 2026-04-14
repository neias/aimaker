import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { ToastContainer } from "@/components/toast";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIMAKER",
  description: "AI-powered development orchestration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans bg-[var(--am-bg)] text-[var(--am-text)]">
        <ThemeProvider>
          <Providers>
            <Sidebar />
            <main className="ml-60 min-h-screen bg-[var(--am-bg)] p-8">{children}</main>
            <ToastContainer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
