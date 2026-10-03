import type { Metadata } from "next";
import { ProfileClient } from "@/components/tracker/profile-client";
import { getAllTitles, getGenresFromCatalog } from "@/lib/tmdb/service";

export const metadata: Metadata = {
  title: "Profile & Tracking",
  description: "Manage your Cinecount history, preferences, reminders, ratings, and portable tracker data.",
};

export default async function ProfilePage() {
  const [items, genres] = await Promise.all([getAllTitles(), getGenresFromCatalog()]);
  const services = Array.from(new Set(items.map((item) => item.platform).filter((item) => item !== "TMDB"))).sort();
  return <ProfileClient items={items} genres={genres} services={services} />;
}
