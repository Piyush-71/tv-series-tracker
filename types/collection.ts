import type { MediaTitle } from "@/types/media";
import type { ScheduledEpisode } from "@/types/schedule";

export type CollectionEntry = {
  id: string;
  status: "ready" | "missing" | "unavailable" | "unsupported";
  title?: MediaTitle;
  episode?: ScheduledEpisode;
};
