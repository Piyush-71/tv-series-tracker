import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { TrackerRuntime } from "@/components/tracker/tracker-runtime";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  manifest: "/manifest.webmanifest",
  title: {
    default: "Cinecount - Streaming Release Countdowns",
    template: "%s | Cinecount",
  },
  description:
    "Discover upcoming TV shows, movies, anime, and live events with cinematic countdowns, trailers, and watchlists.",
  openGraph: {
    title: "Cinecount",
    description:
      "A premium entertainment countdown and streaming discovery platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geist.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Script id="cinecount-theme" strategy="beforeInteractive">
          {`try{const raw=localStorage.getItem('cinecount-tracker-v1');const saved=raw?JSON.parse(raw).preferences?.theme:'system';const light=saved==='light'||(saved!=='dark'&&matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('light',light);document.documentElement.dataset.theme=saved||'system'}catch{}`}
        </Script>
        <ClerkProvider
          signInUrl="/login"
          signUpUrl="/login"
          afterSignOutUrl="/"
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#d5f56a",
              colorPrimaryForeground: "#182008",
              colorBackground: "var(--surface)",
              colorForeground: "var(--foreground)",
              colorMuted: "var(--surface-raised)",
              colorMutedForeground: "var(--muted)",
              colorNeutral: "var(--foreground)",
              colorInput: "var(--background)",
              colorInputForeground: "var(--foreground)",
              colorBorder: "var(--border)",
              colorRing: "#d5f56a",
              colorDanger: "var(--danger)",
              colorSuccess: "#34d399",
              colorWarning: "#fbbf24",
              colorModalBackdrop: "#000000",
              borderRadius: "0.75rem",
              fontFamily:
                "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
            },
            elements: {
              card: "border border-border bg-surface shadow-none",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted",
              identityPreviewText: "text-foreground",
              identityPreviewEditButton: "text-foreground",
              formFieldLabel: "text-foreground",
              formFieldInput:
                "border-border bg-background text-foreground placeholder:text-muted",
              formFieldInputShowPasswordButton:
                "text-muted hover:text-foreground",
              otpCodeFieldInput: "border-border bg-background text-foreground",
              formButtonPrimary:
                "bg-accent text-on-accent hover:bg-accent/85 shadow-none",
              alternativeMethodsBlockButton:
                "border-border bg-surface text-foreground hover:bg-surface-raised",
              footerActionText: "text-muted",
              footerActionLink: "text-foreground underline",
              footer: "bg-surface",
            },
          }}
        >
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-50 -translate-y-24 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent focus:translate-y-0"
          >
            Skip to content
          </a>
          <TrackerRuntime />
          <Navbar />
          <main id="main-content" tabIndex={-1} className="min-h-[70dvh]">
            {children}
          </main>
          <Footer />
        </ClerkProvider>
      </body>
    </html>
  );
}
