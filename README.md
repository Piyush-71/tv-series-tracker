# Cinecount

Cinecount is a schedule-first TV discovery and personal tracking application. It combines exact episode airtimes and live countdowns with TMDB discovery, episode progress, watch history, ratings, notes, reminders, and portable browser-local profiles.

## Product capabilities

- A schedule dashboard for trending episodes, series premieres, season premieres, soon-to-air episodes, and recently aired episodes
- Exact episode airtimes powered by Simkl's public TV calendar, with a bundled offline fallback schedule
- Shared live countdown clock and automatic local-timezone formatting
- Trending and upcoming release discovery powered by TMDB, with a built-in fallback catalog
- Search, category pages, title details, trailers, cast, streaming providers, and recommendations
- Server-backed discovery filters for type, genre, year, country, original language, provider, and availability
- Popularity, release-date, rating, and alphabetical sorting with paginated “load more” results
- Honest release displays: exact Simkl airtimes receive live countdowns, while TMDB date-only data stays labeled as a date
- User-selectable regional dates, custom local release times, and visible timezone information
- Clerk authentication for private watchlist and profile routes
- Browser-local watchlists, watched history, recently viewed titles, ratings, private notes, and preferences
- Season/episode progress and a next-episode calendar for saved series
- Browser reminders while Cinecount is open, with delivery status recorded locally
- Shareable watchlist links plus JSON import/export
- Persistent dark, light, and system themes; responsive mobile navigation; offline/error/empty states

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4
- Clerk authentication
- TMDB API
- Framer Motion and Lucide icons
- Vitest for domain/API tests
- Playwright for browser acceptance tests

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure Clerk:

   ```dotenv
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login
   ```

3. Optionally add `TMDB_API_READ_ACCESS_TOKEN`. Without it, Cinecount runs against the bundled fallback catalog.

4. Start the application:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # production server
npm run lint       # ESLint
npm test           # Vitest suite
npm run test:watch # Vitest watch mode
npm run test:e2e   # Playwright browser tests
```

Install the Playwright browser once before running E2E tests:

```bash
npx playwright install chromium
```

## Architecture

`app/` contains server-rendered routes and JSON route handlers. Schedule reads are coordinated through the `ScheduleService` interface in `lib/schedule/service.ts`; `simkl.ts` maps and caches the public calendar and falls back to a bundled schedule if the upstream feed is unavailable. Catalog reads remain coordinated by `lib/tmdb/service.ts`, while `client.ts` owns TMDB authentication, retry behavior, and Next.js revalidation. `mapper.ts` converts TMDB response shapes into the application’s `MediaTitle` domain model.

The schedule UI uses one shared external-store clock from `hooks/use-now.ts`, so a dashboard full of countdowns creates one timer rather than one interval per card.

Interactive tracking lives behind `useTracker`. The hook exposes one synchronized external store backed by the versioned `cinecount-tracker-v1` local-storage document. It also migrates the original `cinecount-watchlist` value. Pure tracker behavior is kept in `lib/tracker.ts` so it can later sit behind a database adapter without changing the UI vocabulary.

The principal routes are:

| Route | Purpose |
| --- | --- |
| `/` | Schedule dashboard with exact local airtimes and countdowns |
| `/soon` | Episodes airing in the next 24 hours |
| `/upcoming` | Upcoming series premieres |
| `/season-premieres` | Upcoming new-season premieres |
| `/aired` | Recently aired episodes |
| `/show/[id]/[slug]` | Show countdown and announced episode schedule |
| `/explore` | Paginated, filterable discovery |
| `/title/[slug]` | Metadata, release schedule, personal controls, and episodes |
| `/watchlist` | Private saved-title collection |
| `/calendar` | Upcoming episodes for saved TV titles |
| `/profile` | History, preferences, reminders, and import/export |
| `/shared?ids=…` | Read-only shared collection |
| `/api/titles` | Validated, rate-limited discovery API |
| `/api/search` | Validated, rate-limited search API |
| `/api/calendar` | Next episodes for a bounded list of title IDs |

## Data and privacy

The current iteration intentionally does not use an application database. Personal tracker data remains in the current browser and is not synchronized by Clerk. The Profile page clearly labels this behavior and provides JSON backup/restore.

Browser reminders are evaluated while a Cinecount page is open. Reliable background email or push delivery requires the planned database-backed tracker and job system.

Simkl schedule entries include exact timestamps and power the countdown experience. TMDB commonly supplies calendar dates without exact airtimes; Cinecount preserves that distinction and only runs second-level countdowns for exact timestamps or user-provided local times.

## API behavior

Public JSON endpoints validate and bound input, return structured `{ error: { code, message } }` failures, and use an in-memory per-instance rate limiter. Production deployments with multiple instances should replace this limiter with shared infrastructure. TMDB and notification failures emit structured JSON log events suitable for a log drain or monitoring service.

## Testing seams

- Release presentation and countdown calculations
- Portable tracker data and episode progress
- TMDB-to-domain mapping
- Query validation and rate limiting
- Schedule dashboard and detail navigation, mobile navigation, discovery filtering, saving, and authentication redirects in a real browser

## Planned persistence boundary

The next persistence phase should replace the browser adapter with a user-scoped database implementation for watchlists, progress, reminders, ratings, and notes. The current domain terms and import format are intended to make that migration incremental rather than a UI rewrite.
