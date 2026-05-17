import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-white/12 bg-white/8 px-4 text-sm text-white outline-none backdrop-blur-xl placeholder:text-zinc-500 focus:border-violet-300/70 focus:ring-2 focus:ring-violet-500/20",
        className,
      )}
      {...props}
    />
  );
}
