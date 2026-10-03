import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TrackerRuntime } from "@/components/tracker/tracker-runtime";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cinecount.example"),
  title: {
    default: "Cinecount - Streaming Release Countdowns",
    template: "%s | Cinecount",
  },
  description:
    "Discover upcoming TV shows, movies, anime, and live events with cinematic countdowns, trailers, and watchlists.",
  openGraph: {
    title: "Cinecount",
    description: "A premium entertainment countdown and streaming discovery platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
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
              colorPrimary: "#8b5cf6",
              colorPrimaryForeground: "#ffffff",
              colorBackground: "#08080b",
              colorForeground: "#ffffff",
              colorMuted: "#18181f",
              colorMutedForeground: "#b8b8c5",
              colorNeutral: "#ffffff",
              colorInput: "#111116",
              colorInputForeground: "#ffffff",
              colorBorder: "rgba(255, 255, 255, 0.16)",
              colorRing: "#a78bfa",
              colorDanger: "#fb7185",
              colorSuccess: "#34d399",
              colorWarning: "#fbbf24",
              colorModalBackdrop: "#000000",
              borderRadius: "0.5rem",
              fontFamily:
                "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            },
            elements: {
              modalBackdrop: "backdrop-blur-md",
              modalContent:
                "border border-white/15 bg-[#08080b] shadow-[0_32px_100px_rgba(0,0,0,0.8)]",
              card: "border border-white/15 bg-[#08080b] shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-zinc-300",
              identityPreviewText: "text-zinc-200",
              identityPreviewEditButton: "text-violet-300 hover:text-violet-200",
              formFieldLabel: "text-zinc-200",
              formFieldInput:
                "border-white/20 bg-[#111116] text-white caret-violet-300 placeholder:text-zinc-500",
              formFieldInputShowPasswordButton: "text-zinc-300 hover:text-white",
              otpCodeFieldInput:
                "border-white/20 bg-[#111116] text-white caret-violet-300",
              formButtonPrimary:
                "bg-violet-500 text-white shadow-[0_0_24px_rgba(139,92,246,0.28)] hover:bg-violet-400",
              alternativeMethodsBlockButton:
                "border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10",
              footerActionText: "text-zinc-400",
              footerActionLink: "text-violet-300 hover:text-violet-200",
              footer: "bg-transparent",
            },
          }}
        >
          <TrackerRuntime />
          <Navbar />
          <main>{children}</main>
          <Footer />
        </ClerkProvider>
      </body>
    </html>
  );
}
