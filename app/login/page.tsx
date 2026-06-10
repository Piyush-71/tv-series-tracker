import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Film } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated) {
    redirect("/");
  }

  return (
    <section className="grid min-h-svh items-center px-4 py-28 sm:px-6 lg:grid-cols-2 lg:px-10">
      <div className="hidden h-full min-h-[620px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] lg:block">
        <Image
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=85"
          alt="Cinema seating"
          width={1400}
          height={1200}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-violet-500/20 text-violet-200">
            <Film />
          </div>
          <h1 className="text-3xl font-black text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in or create an account to sync notifications and watchlists.</p>
        </div>
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
