import { cache } from "react";
import { connection } from "next/server";
import { createScheduleService } from "@/lib/schedule/service";
import { simklScheduleSource } from "@/lib/schedule/simkl";
import type { ScheduleView } from "@/types/schedule";

const schedule = createScheduleService(simklScheduleSource);

export const getScheduleDashboard = cache(async (limit = 8) => {
  const dashboard = await schedule.getDashboard(new Date(), limit);
  // An outage must not become a successful prerendered page that defeats retry.
  if (dashboard.unavailable) await connection();
  return dashboard;
});
export const getScheduleView = cache((view: ScheduleView, limit = 60) =>
  schedule.getView(view, new Date(), limit),
);
export const getFollowableSchedule = cache((limit = 1_000) =>
  schedule.getFollowable(new Date(), limit),
);
export const getShowSchedule = cache((showId: string) =>
  schedule.getShow(showId, new Date()),
);

// Raw Simkl IDs; missing IDs are omitted, while source outages reject.
export const getScheduledShowsByIds = cache((showIds: string[]) =>
  schedule.getShows(showIds, new Date()),
);
