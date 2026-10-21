# Content browse design

Status: approved and implemented in the existing Explore page.

## Settled decisions

- Provide a unified browse page with both filtering and sorting.
- Upgrade the existing Explore page with separate Series, Anime, and Movie modes.
- Movie mode retains country, genre, release-date range, and minimum rating, and hides season controls and next-episode sorting.
- Filter by country of origin, genre, air-date range, and minimum rating.
- Series browsing distinguishes New Series, Returning Seasons, and Currently Airing.
- Currently Airing includes a season that has started but has not finished, including midseason breaks.
- Hide the date-range control for Currently Airing so older ongoing seasons remain eligible.
- New Series and Returning Seasons use the season premiere date, with a default recent window of 30 days.
- Air-date choices include last 7, 30, and 90 days, upcoming, and custom dates.
- Sort orders: newest premiere, oldest premiere, next episode airing soonest, highest rating, popularity, and title A–Z. Default: newest premiere first for past dates, soonest first for Upcoming. Movies omit next-episode sorting and use release-date labels.
- Original language supports multiple selections, with OR within languages and AND with the other filters. Followed-title filtering remains outside this page.
- Country and genre allow multiple selections: OR within one filter, AND between filters.
- New Series, Returning Seasons, and Currently Airing form a single-choice control.
- Apply filter changes with an Apply button.
- Store applied filters in the URL for refresh, Back navigation, and shared links.
- Show one card per show, displaying the most recent matching season for past/custom ranges and the nearest announced season for Upcoming.
- Anime means Japanese animated series for this version. Series excludes those; non-Japanese animated series remain in Series, and animated films remain in Movies.
- Movie dates refer to original release dates, not streaming availability.
- Minimum rating uses the overall TMDB title rating out of 10, including for returning seasons. Clearly label the source and scale; exclude unrated titles when a minimum is selected.
- First-version coverage is limited to verified records and clearly stated to viewers. Exclude seasons with unknown completion status from Currently Airing; absence of a next episode is not evidence that a season finished.
- Default view: Series, New Series, last 30 days, newest premiere first. Movies also default to last 30 days. Country, genre, and rating are unrestricted initially. Reset restores the selected mode's defaults.
- Upcoming includes known premiere/release dates beginning tomorrow. Past presets end today. Custom dates include both selected days. Use the viewer's chosen timezone for calendar-day boundaries.
- Currently Airing sorts premieres by the active season's premiere date. Missing next episodes, ratings, or popularity values sort last in their corresponding sort orders.
- Series/Anime/Movie tabs preserve dates and shared filters. Movie mode clears the season-status selection and substitutes a supported sort for next-episode sorting.
- Include title search, removable applied-filter chips, collapsible mobile filters, and a Load more control.
- Empty results show No matches and a Clear filters action.
- Apply filtering and sorting across the available result set before pagination. Loading more must preserve the chosen order.

## Implementation obligations

- Identify reliable evidence for season completion before including a season in Currently Airing.
- Preserve unknown metadata rather than substituting today's date or a zero rating.
- Filter against the matching season's premiere date rather than the show's original first-air date for Returning Seasons.
- Ensure metadata enrichment and result totals reflect the documented verified coverage.
- Preserve the same filtering and ordering rules for title search and subsequent result pages.
- Read the relevant installed Next.js guides before code changes, as required by AGENTS.md.

## Existing app constraints

Explore already provides catalog filters. Schedule listings have no filter controls and their current episode model lacks country and genre metadata. The calendar feed is not an exhaustive season catalog and has no season-completion flag. Current TV discovery dates refer to the show's first air date, not returning-season premieres. The implementation needs discovery metadata alongside verified season timing to deliver this design.

## Implemented data approach

Explore uses a separate browse inventory and API; the existing catalog API remains available to the other pages.

- TMDB discovery/search summaries provide new-series and original movie dates, genres, language, ratings, popularity, and TV origin countries. Movie country constraints are applied by discovery upstream because movie summaries omit origin countries. Returning/currently-airing seasons, next-episode sorting, incomplete summaries, and country-filtered title search still require full detail verification before filtering and pagination.
- Discovery follows the applied dates, country, genre, original language, minimum rating, and supported sort. New series use first-air dates; returning seasons use episode air dates to find candidates before verifying season premieres. Anime discovery targets Japanese animation. Title searches use TMDB catalog search, retaining original/translated/alternative-name matches instead of filtering an English display title again. Search-only constraints that TMDB cannot accept are verified locally.
- Discovery follows pagination with a maximum of 10 pages per language and a shared budget of 20 pages (at least one per selected language, up to 30). Each page has up to 20 candidate titles. Broad queries can still exceed this bounded selection. The page explicitly reports a discovery limit or failed discovery pages and offers narrower filters; totals and ordering cover the fetched, verified selection. Source summaries can become browse records when they contain the fields needed for the selected filters; otherwise details are required.
- Source pages, compact per-title details, genre lists, and configuration revalidate hourly in independent leaf caches. Nesting unstable_cache would bypass cache reads in this installed Next.js runtime, so inventory assembly stays outside these cache scopes. In-flight inventory keys include the applied query and local day; per-title in-flight requests share work across filters. Discovery pages run with concurrency 4 after fetching their first page, and required detail requests use concurrency 8.
- Currently Airing requires a started season and a TMDB next episode in that same season dated on or after the viewer's current calendar day. This includes breaks with a known future episode; hiatuses without confirmed future episodes remain unknown and are excluded.
- Missing dates and ratings remain unknown. An active minimum rating excludes unrated titles. Browse never substitutes the app's sample catalog for verified results.
- Country, language, genre, dates, and rating are verified by the source query or local metadata before sorting, season selection, title deduplication, totals, and pagination. A confirmed next episode numbered 1 can supply a missing season-premiere date. Cards show Premieres/Releases for today or future dates, and Premiered/Released for past dates in the chosen timezone.
- Load more extends the sorted result prefix while keeping existing cards visible. Snapshot checks reject continuation if the inventory, applied query, or local calendar day changed, prompting a refresh rather than silently changing the result order.
- Search and custom dates fetch their own candidates rather than reusing unrelated popular/recent titles.
- The initial browse response returns matches without waiting for optional card details. A snapshot-bound `details=1` request fills in visible-card origin countries and next-episode labels afterward. Filters and Load More remain usable during this request. New queries cancel stale detail updates, previously loaded card metadata stays visible during pagination, and failed optional details do not remove valid summary matches.

Audit findings and regression evidence: [Explore filter audit](../explore-filter-audit.md).

Source references: [TMDB series details](https://developer.themoviedb.org/reference/tv-series-details), [TMDB discovery](https://developer.themoviedb.org/reference/discover-tv), and [TMDB movie details](https://developer.themoviedb.org/reference/movie-details).

## Validation

Tests cover premiere selection, unknown season status, exclusive Anime classification, country/genre combination rules, title search, inclusive date boundaries, timezones, minimum ratings, missing-value sorting, pagination continuity, stale snapshots, and Apply/Reset behavior. Live browser checks cover Movie controls, shared URLs, returning-season results with country/genre filters, Back navigation, and a 390px mobile layout.
