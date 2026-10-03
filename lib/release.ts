export type ReleasePrecision = "date" | "datetime";

export type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type ReleasePresentationInput = {
  releaseDate: string;
  releasePrecision?: ReleasePrecision;
  now?: Date;
  timeZone?: string;
};

export function getTimeLeft(date: string, now = new Date()): TimeLeft {
  const distance = Math.max(new Date(date).getTime() - now.getTime(), 0);

  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}

export function getReleasePresentation({
  releaseDate,
  releasePrecision = inferReleasePrecision(releaseDate),
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: ReleasePresentationInput) {
  const timeZoneLabel = new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions().timeZone;

  if (releasePrecision === "date") {
    const formattedDate = formatDateOnly(releaseDate);
    const released = releaseDate.slice(0, 10) < dateKeyInTimeZone(now, timeZone);

    return {
      kind: released ? ("released" as const) : ("date" as const),
      showCountdown: false,
      label: `${released ? "Released" : "Releases"} ${formattedDate}`,
      timeZoneLabel,
    };
  }

  const released = new Date(releaseDate).getTime() <= now.getTime();
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  })
    .format(new Date(releaseDate))
    .replace(/, (?=\d{1,2}:\d{2})/, " at ");

  return {
    kind: released ? ("released" as const) : ("countdown" as const),
    showCountdown: !released,
    label: released ? `Released ${formatted}` : formatted,
    timeZoneLabel,
  };
}

export function inferReleasePrecision(date: string): ReleasePrecision {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? "date" : "datetime";
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function dateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
