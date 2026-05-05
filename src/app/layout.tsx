import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LightShow AI",
  description: "Create stunning light shows with AI-assisted sequencing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <head>
          {/* Fraunces — display font (optical sizing, not in next/font/google stable set) */}
          <link
            href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--ink)" }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
