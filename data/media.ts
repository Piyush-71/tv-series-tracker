import type { MediaTitle, MediaType } from "@/types/media";

const cast = [
  {
    name: "Maya Chen",
    role: "Lead",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Elias Vale",
    role: "Showrunner",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Noor Imani",
    role: "Director",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  },
];

export const mediaTitles: MediaTitle[] = [
  {
    id: "1",
    slug: "echoes-of-orion",
    title: "Echoes of Orion",
    type: "tv",
    description:
      "A starship crew follows a forbidden signal through collapsing colonies and discovers a conspiracy older than human spaceflight.",
    releaseDate: "2026-06-14T19:00:00-07:00",
    genres: ["Sci-Fi", "Drama", "Mystery"],
    poster:
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 9.2,
    platform: "Apple TV+",
    cast,
    popularity: 99,
    featured: true,
  },
  {
    id: "2",
    slug: "redline-protocol",
    title: "Redline Protocol",
    type: "movie",
    description:
      "A disgraced extraction driver gets one night to move a whistleblower through a city locked down by autonomous security.",
    releaseDate: "2026-05-24T20:00:00-07:00",
    genres: ["Action", "Thriller"],
    poster:
      "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 8.7,
    platform: "Netflix",
    cast,
    popularity: 94,
  },
  {
    id: "3",
    slug: "shogun-moonrise",
    title: "Shogun Moonrise",
    type: "anime",
    description:
      "A celestial sword school trains heirs who can bend moonlight into living armor before an eclipse war begins.",
    releaseDate: "2026-07-03T00:00:00+09:00",
    genres: ["Anime", "Fantasy", "Adventure"],
    poster:
      "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 9.0,
    platform: "Crunchyroll",
    cast,
    popularity: 91,
  },
  {
    id: "4",
    slug: "midnight-atlas",
    title: "Midnight Atlas",
    type: "tv",
    description:
      "Cartographers of impossible cities race to map a dream world before its geography leaks into waking life.",
    releaseDate: "2026-06-01T21:00:00-07:00",
    genres: ["Fantasy", "Mystery"],
    poster:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 8.8,
    platform: "HBO Max",
    cast,
    popularity: 88,
  },
  {
    id: "5",
    slug: "stadium-zero",
    title: "Stadium Zero",
    type: "event",
    description:
      "A live global championship blends augmented reality arenas, elite athletes, and real-time fan-controlled obstacles.",
    releaseDate: "2026-05-31T18:30:00-07:00",
    genres: ["Live", "Sports", "Tech"],
    poster:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 8.4,
    platform: "Peacock",
    cast,
    popularity: 86,
  },
  {
    id: "6",
    slug: "afterimage",
    title: "Afterimage",
    type: "movie",
    description:
      "A forensic memory artist reconstructs the last seconds of strangers and uncovers a pattern hiding in plain sight.",
    releaseDate: "2026-08-12T20:00:00-07:00",
    genres: ["Noir", "Crime", "Sci-Fi"],
    poster:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 8.6,
    platform: "Prime Video",
    cast,
    popularity: 84,
  },
  {
    id: "7",
    slug: "neon-harbor",
    title: "Neon Harbor",
    type: "tv",
    description:
      "Dock workers, hackers, and smugglers collide in a floating city where every secret has a broadcast price.",
    releaseDate: "2026-06-20T21:00:00-07:00",
    genres: ["Cyberpunk", "Drama"],
    poster:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 8.9,
    platform: "Hulu",
    cast,
    popularity: 89,
  },
  {
    id: "8",
    slug: "kingdom-of-static",
    title: "Kingdom of Static",
    type: "anime",
    description:
      "A radio apprentice enters a kingdom made of lost transmissions to rescue a vanished generation of pilots.",
    releaseDate: "2026-05-29T00:00:00+09:00",
    genres: ["Anime", "Adventure", "Music"],
    poster:
      "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=900&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    rating: 8.5,
    platform: "Crunchyroll",
    cast,
    popularity: 82,
  },
];

export const genres = Array.from(new Set(mediaTitles.flatMap((item) => item.genres))).sort();

export function getFeaturedTitle() {
  return mediaTitles.find((title) => title.featured) ?? mediaTitles[0];
}

export function getTitleBySlug(slug: string) {
  return mediaTitles.find((title) => title.slug === slug);
}

export function getByType(type: MediaType) {
  return mediaTitles.filter((title) => title.type === type);
}

export function getByGenre(genre: string) {
  return mediaTitles.filter((title) =>
    title.genres.some((item) => item.toLowerCase() === genre.toLowerCase()),
  );
}

export function searchTitles(query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return mediaTitles;

  return mediaTitles.filter((title) =>
    [title.title, title.description, title.type, title.platform, ...title.genres]
      .join(" ")
      .toLowerCase()
      .includes(value),
  );
}
