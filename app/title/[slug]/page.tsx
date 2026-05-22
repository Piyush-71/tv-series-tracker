import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailView } from "@/components/media/detail-view";
import { getSimilarTitles, getTitleBySlug } from "@/lib/tmdb/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);

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
  const title = await getTitleBySlug(slug);

  if (!title) notFound();

  const similar = await getSimilarTitles(slug);

  return <DetailView title={title} similar={similar} />;
}
