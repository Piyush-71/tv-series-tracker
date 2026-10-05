import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { ArrowLeft, Bookmark, Clapperboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Sign In" };
export default async function LoginPage() {
  const { isAuthenticated } = await auth();
  if (isAuthenticated) redirect("/");
  return (
    <section className="page-shell grid gap-10 py-10 lg:grid-cols-2 lg:gap-16 lg:py-14">
      <div className="hero-surface relative isolate hidden min-h-[650px] overflow-hidden rounded-3xl lg:flex lg:items-end">
        <Image
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=85"
          alt="A cinema ready for the next story"
          fill
          preload
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="relative p-10">
          <Clapperboard
            size={30}
            className="mb-7 text-accent"
            aria-hidden="true"
          />
          <p className="text-xs font-medium uppercase tracking-widest text-hero-muted">
            For the love of stories
          </p>
          <h2 className="mt-4 text-5xl font-semibold leading-tight tracking-[-0.05em] text-hero-text">
            There’s always
            <br />a next great watch.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-hero-muted">
            A little discovery. A little anticipation. A whole world of stories
            to get lost in.
          </p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to discovering
        </Link>
        <span className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised">
          <Bookmark size={22} aria-hidden="true" />
        </span>
        <h1 className="text-4xl font-semibold tracking-[-0.05em]">
          Good to have you here.
        </h1>
        <p className="mb-7 mt-4 text-sm leading-7 text-muted">
          Sign in or create an account to make yourself at home. Your watchlist
          stays saved on this device.
        </p>
        <SignIn
          routing="hash"
          withSignUp
          fallbackRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full",
            },
          }}
        />
      </div>
    </section>
  );
}
