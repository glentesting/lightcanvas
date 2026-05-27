import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import ErrorBoundary from "@/components/ErrorBoundary";
import CookieBanner from "@/components/dialogs/CookieBanner";
import "./globals.css";

// Fonts are bundled locally via @fontsource-variable/* packages to avoid a
// build-time network dependency on Google Fonts. All three are variable fonts;
// the latin subset is sufficient for the app's locales today.
const interTight = localFont({
  src: "../../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2",
  variable: "--font-inter-tight",
  display: "swap",
  weight: "100 900",
});

const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: "100 900",
});

const fraunces = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LightCanvas",
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
        className={`${interTight.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
      >
        <head />
        <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--ink)" }}>
          <a href="#main-content" className="skip-to-content">Skip to content</a>
          <ErrorBoundary>
            {children}
            <CookieBanner />
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
