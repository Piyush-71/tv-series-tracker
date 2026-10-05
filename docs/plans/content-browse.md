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
- Sort orders: newest premiere, oldest premiere, next episode airing soonest, highest rating, popularity, and title A–Z. Default: newest premiere first. Movies omit next-episode sorting and use release-date labels.
- Original language and followed-title filters are outside the selected initial filter set.
- Country and genre allow multiple selections: OR within one filter, AND between filters.
- New Series, Returning Seasons, and Currently Airing form a single-choice control.
- Apply filter changes with an Apply button.
- Store applied filters in the URL for refresh, Back navigation, and shared links.
- Show one card per show, displaying the most recent matching season.
- Anime means Japanese animated series for this version. Series excludes those; non-Japanese animated series remain in Series, and animated films remain in Movies.
- Movie dates refer to original release dates, not streaming availability.
- Minimum rating uses the overall TMDB title rating out of 10, including for returning seasons. Clearly label the source and scale; exclude unrated titles when a minimum is selected.
- First-version coverage is limited to verified records and clearly stated to viewers. Exclude seasons with unknown completion status from Currently Airing; absence of a next episode is not evidence that a season finished.
- Default view: Series, New Series, last 30 days, newest premiere first. Movies also default to last 30 days. Country, genre, and rating are unrestricted initially. Reset restores the selected mode's defaults.
- Upcoming includes known premiere/release dates beginning tomorrow. Past presets end today. Custom dates include both selected days. Use the viewer's chosen timezone for calendar-day boundaries.
- Currently Airing sorts premieres by the active season's premiere date. Missing next episodes, ratings, or popularity values sort last in their corresponding sort orders.
- Series/Anime/Movie tabs reset mode-specific selections when switching modes.
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

- TMDB title details provide countries, genres, original movie release dates, title ratings, popularity, season premiere dates, and the next scheduled episode.
- The inventory uses two pages of recent premieres/releases from the last 90 days, one page of future premieres/releases, and one page of popular titles. TV additionally includes one page of series with future episodes, one page of Japanese animated series, and up to 80 calendar show IDs. These are candidate sources; only successfully fetched TMDB details become browse records.
- Inventories and options revalidate hourly. Metadata fetches have bounded concurrency, and simultaneous requests share the inventory load.
- Currently Airing requires a started season and a TMDB next episode in that same season dated after the viewer's current calendar day. This includes breaks with a known future episode; hiatuses without confirmed future episodes remain unknown and are excluded.
- Missing dates and ratings remain unknown. An active minimum rating excludes unrated titles. Browse never substitutes the app's sample catalog for verified results.
- Search, country, genre, dates, and rating filters run over the same inventory before sorting, season selection, title deduplication, totals, and pagination. Cards show the latest season that matches the selected dates.
- Load more extends the sorted result prefix while keeping existing cards visible. Snapshot checks reject continuation if the inventory or local calendar day changed, prompting a refresh rather than silently changing the result order.
- The UI states that search and custom dates cover a limited selection rather than the full catalog.

Source references: [TMDB series details](https://developer.themoviedb.org/reference/tv-series-details), [TMDB discovery](https://developer.themoviedb.org/reference/discover-tv), and [TMDB movie details](https://developer.themoviedb.org/reference/movie-details).

## Validation

Tests cover premiere selection, unknown season status, exclusive Anime classification, country/genre combination rules, title search, inclusive date boundaries, timezones, minimum ratings, missing-value sorting, pagination continuity, stale snapshots, and Apply/Reset behavior. Live browser checks cover Movie controls, shared URLs, returning-season results with country/genre filters, Back navigation, and a 390px mobile layout.
