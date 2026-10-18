import * as React from "react";
import { cn } from "@/lib/utils";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};
const variants = {
  primary: "bg-accent text-on-accent hover:bg-accent/85",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-raised",
  ghost: "text-muted hover:bg-surface-raised hover:text-foreground",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};
const sizes = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-sm",
  icon: "h-11 w-11 p-0",
};
export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
