import type { Metadata } from "next";
import { Film, Mail, Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
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
      <div className="mx-auto w-full max-w-md rounded-lg border border-white/10 bg-white/[0.065] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-8">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-violet-500/20 text-violet-200">
            <Film />
          </div>
          <h1 className="text-3xl font-black text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in or create an account to sync notifications and watchlists.</p>
        </div>
        <form className="space-y-4">
          <Input type="email" placeholder="Email address" aria-label="Email address" />
          <Input type="password" placeholder="Password" aria-label="Password" />
          <Button className="w-full" size="lg" type="submit">
            <Mail size={18} />
            Sign in
          </Button>
          <Button className="w-full" size="lg" variant="secondary" type="button">
            <Sparkles size={18} />
            Create account
          </Button>
        </form>
      </div>
    </section>
  );
}
