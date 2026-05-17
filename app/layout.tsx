import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
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
    <html
      lang="en"
      className="h-full scroll-smooth antialiased"
    >
      <body className="min-h-full bg-background text-foreground">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
