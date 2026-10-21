# Cinecount

Cinecount is a schedule-first TV discovery and personal tracking application. It combines exact episode airtimes and live countdowns with TMDB discovery, episode progress, watch history, ratings, notes, reminders, and portable browser-local profiles.

## Product capabilities

- A schedule dashboard for trending episodes, series premieres, season premieres, soon-to-air episodes, and recently aired episodes
- Exact episode airtimes powered by Simkl's public TV calendar, with an explicit unavailable state during source outages
- Shared live countdown clock and browser-local timezone selection for schedule airtimes and countdown labels (defaults to the device timezone)
- Trending and upcoming release discovery powered by TMDB, with a built-in fallback catalog
- Search, category pages, title details, trailers, cast, streaming providers, and recommendations
- Server-backed discovery filters for type, genre, year, country, original language, provider, and availability
- Popularity, release-date, rating, and alphabetical sorting with paginated “load more” results
- Honest release displays: exact Simkl airtimes receive live countdowns, while TMDB date-only data stays labeled as a date
- User-selectable regional dates, custom local release times, and visible timezone information
- Clerk authentication for private watchlist and profile routes
- Account-isolated browser-local watchlists, watched history, recently viewed titles, ratings, private notes, and preferences
- Season/episode progress and a next-episode calendar for saved series
- Background Web Push reminders for signed-in users, with browser-local reminders as a fallback
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

`app/` contains server-rendered routes and JSON route handlers. Schedule reads are coordinated through the `ScheduleService` interface in `lib/schedule/service.ts`; `simkl.ts` maps and compresses the full public calendar for caching. Source failures produce an unavailable/retry state rather than invented episodes. Catalog reads remain coordinated by `lib/tmdb/service.ts`, while `client.ts` owns TMDB authentication, retry behavior, and Next.js revalidation. `mapper.ts` converts TMDB response shapes into the application’s `MediaTitle` domain model. Unknown release dates remain empty and render TBA; temporary metadata failures reach the retry boundary instead of becoming missing-title pages.

The schedule UI uses one shared external-store clock from `hooks/use-now.ts`, so a dashboard full of countdowns creates one timer rather than one interval per card.

Interactive tracking lives behind `useTracker` and an auth-scoped `TrackerProvider`. Storage uses `cinecount-tracker-v1:guest` or `cinecount-tracker-v1:user:<encoded Clerk ID>`. Auth loading blocks writes and account changes retire the previous store. Original unscoped tracker and watchlist documents stay guest-only. The sign-in page offers a guest backup; importing that backup into a selected account is explicit. Pure validation and reminder behavior live in `lib/tracker.ts` and `lib/tracker-reminders.ts`.

Saved collections resolve each stored identity through `lib/collection.ts` and bounded `/api/collection` batches, independently of discovery selections. Failed or missing lookups remain visible and retryable. The calendar also processes every saved TV/Simkl identity in batches and prefers exact schedule data when available. Configure `NEXT_PUBLIC_APP_URL` with the canonical HTTPS origin to emit sitemap URLs; unknown production origins and unsupported modification timestamps are omitted.

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
| `/api/collection` | Resolve saved TV, movie, and Simkl identities without discovery-catalog cutoffs |

## Data and privacy

Personal tracker data remains in the current browser and is not synchronized by Clerk. The Profile page provides JSON backup/restore. Opting into background notifications stores the current browser's push subscription, Clerk user ID, and reminder titles, dates, and delivery state in Postgres. Other tracker data (notes, ratings, watch history, and watchlists) stays browser-local.

Background reminders are synchronized while the app is open and delivered by the scheduler after it closes. Disabling notifications, resetting local tracker data, or signing out revokes this browser's subscription; expired endpoints are removed on delivery failure and inactive devices expire after 90 days. If offline, the browser unsubscribes immediately and retries server deletion on reconnect/reload. Unsynced edits cannot change server delivery until the connection returns. Guest users and unconfigured deployments retain reminders evaluated while a Cinecount page is open.

Simkl schedule entries include exact timestamps and power the countdown experience. TMDB commonly supplies calendar dates without exact airtimes; Cinecount preserves that distinction and only runs second-level countdowns for exact timestamps or user-provided local times.

## Background Web Push setup

1. Connect a Neon Postgres database and set `DATABASE_URL` in the app environment. The driver uses Neon's HTTP endpoint; an arbitrary Postgres TCP URL is not sufficient. Apply the idempotent schema with `npm run db:migrate:push` (loads `.env.local`/`.env` through Next's environment loader).
2. Run `npm run push:keys` once. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a real contact `VAPID_SUBJECT` such as `mailto:admin@yourdomain.com`. Keep the private key server-only and reuse the same key pair across deployments. Changing it requires browsers to disable/re-enable their subscriptions.
3. Generate a random `CRON_SECRET` (for example, `openssl rand -hex 32`) and set it in the deployed app. All five environment variables must be present before the app offers background notifications. Use separate databases and VAPID keys for production and previews.
4. Configure the included GitHub Actions scheduler: add repository Actions variable `CINECOUNT_APP_URL` containing the canonical HTTPS production URL, and Actions secret `CRON_SECRET` matching the app. After merging to the default branch, `.github/workflows/push-reminders.yml` calls `GET /api/cron/push` every five minutes. The workflow skips dispatch when the URL is unset. GitHub schedules can be delayed; inactive public repositories may have schedules disabled automatically. For minute-level delivery, use an external scheduler or a Vercel plan supporting an every-minute cron, calling the same endpoint with `Authorization: Bearer <CRON_SECRET>`.
5. Deploy over HTTPS (localhost is a secure-context exception). Sign in, select **Notify Me** on a title with a future release, and allow browser notifications. Profile → Notifications & reminders shows sync errors, retry, and disable controls. On iOS/iPadOS 16.4+, add Cinecount to the Home Screen and enable notifications from the installed app. Device/browser notification settings still apply.

Reminders retain the existing one-day lead. Exact timestamps are scheduled 1,440 minutes before release. Date-only reminders become due at midnight on the preceding day in the device's IANA timezone, and expire at the end of the release day; they never imply an exact airtime. A reminder targets the saved release/next episode, rather than automatically subscribing to every future episode. Release overrides, cancellation, and imports replace this browser's server snapshot on the next sync. Each browser must enable notifications separately.

The dispatcher claims up to 25 due reminders using PostgreSQL row locks and expiring leases, with five concurrent sends and bounded transport timeouts. Temporary failures retry with backoff until the release expires; HTTP 404/410 removes the expired subscription. Successful acceptance by the push provider is recorded as `delivered` (not a guarantee of display or reading). Delivery is at least once around failures; stable notification tags replace still-visible duplicate alerts. The worker receives pushes without an open app tab and opens `/profile#reminders` on click, without caching pages or authenticated responses.

`npm test` covers validation, timezone/DST scheduling, sender failures, API authorization, account changes, and actual PostgreSQL storage queries through PGlite. `npm run test:e2e -- e2e/web-push.spec.ts` uses Chromium's full headless mode to verify the real browser worker with the application tab closed, tag replacement, and notification click destination. That test injects a push event at the worker boundary and captures the navigation request (synthetic clicks lack OS user activation); testing live browser-vendor transport and real notification clicks requires deployed credentials, a configured scheduler, and a real opted-in device.

## API behavior

Public JSON endpoints validate and bound input, return structured `{ error: { code, message } }` failures, and use an in-memory per-instance rate limiter. Production deployments with multiple instances should replace this limiter with shared infrastructure. TMDB and notification failures emit structured JSON log events suitable for a log drain or monitoring service.

## Testing seams

- Release presentation and countdown calculations
- Portable tracker data and episode progress
- TMDB-to-domain mapping
- Query validation and rate limiting
- Schedule dashboard and detail navigation, mobile navigation, discovery filtering, saving, and authentication redirects in a real browser

## Planned persistence boundary

Background Web Push persists only the reminder delivery snapshot. The next persistence phase should replace the browser adapter with a user-scoped database implementation for watchlists, progress, ratings, notes, and cross-device reminder management. The current domain terms and import format are intended to make that migration incremental rather than a UI rewrite.
