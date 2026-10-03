import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShowScheduleView } from "@/components/schedule/show-schedule-view";
import { getShowSchedule } from "@/lib/schedule";

type Props = { params: Promise<{ id: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const show = await getShowSchedule(id);
  if (!show) return {};
  const focus = show.next ?? show.previous;
  return {
    title: `${show.title}${focus ? ` S${focus.seasonNumber}E${focus.episodeNumber} Countdown` : " Countdown"}`,
    description: focus ? `Countdown to ${show.title} Season ${focus.seasonNumber} Episode ${focus.episodeNumber}.` : `${show.title} episode schedule.`,
    openGraph: { images: [show.poster] },
  };
}

export default async function ShowSchedulePage({ params }: Props) {
  const { id, slug } = await params;
  const show = await getShowSchedule(id);
  if (!show || show.slug !== slug) notFound();
  const focus = show.next ?? show.previous;
  const jsonLd = focus ? {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    episodeNumber: focus.episodeNumber,
    partOfSeason: { "@type": "TVSeason", seasonNumber: focus.seasonNumber },
    partOfSeries: { "@type": "TVSeries", name: show.title },
    datePublished: focus.airsAt,
    image: show.poster,
  } : undefined;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} /> : null}
      <ShowScheduleView show={show} />
    </>
  );
}

