import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatReleaseDate(date: string) {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00Z`)
    : new Date(date);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(/^\d{4}-\d{2}-\d{2}$/.test(date) ? { timeZone: "UTC" } : {}),
  }).format(value);
}

export function slugToTitle(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
