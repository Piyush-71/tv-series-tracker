import { cache } from "react";
import { createScheduleService } from "@/lib/schedule/service";
import { simklScheduleSource } from "@/lib/schedule/simkl";
import type { ScheduleView } from "@/types/schedule";

const schedule = createScheduleService(simklScheduleSource);

export const getScheduleDashboard = cache((limit = 8) => schedule.getDashboard(new Date(), limit));
export const getScheduleView = cache((view: ScheduleView, limit = 60) => schedule.getView(view, new Date(), limit));
export const getShowSchedule = cache((showId: string) => schedule.getShow(showId, new Date()));

