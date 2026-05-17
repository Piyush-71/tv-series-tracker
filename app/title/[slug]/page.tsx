import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailView } from "@/components/media/detail-view";
import { getTitleBySlug, mediaTitles } from "@/data/media";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return mediaTitles.map((title) => ({ slug: title.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = getTitleBySlug(slug);

  if (!title) return {};

  return {
    title: title.title,
    description: title.description,
    openGraph: {
      title: title.title,
      description: title.description,
      images: [title.backdrop],
    },
  };
}

export default async function TitlePage({ params }: Props) {
  const { slug } = await params;
  const title = getTitleBySlug(slug);

  if (!title) notFound();

  const similar = mediaTitles
    .filter((item) => item.id !== title.id)
    .filter((item) => item.type === title.type || item.genres.some((genre) => title.genres.includes(genre)))
    .slice(0, 6);

  return <DetailView title={title} similar={similar} />;
}
