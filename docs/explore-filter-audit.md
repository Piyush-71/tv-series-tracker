# Explore filter audit

The reported missing upcoming titles were primarily a discovery problem: Explore applied filters only after loading a small fixed sample of recent, upcoming, popular, and calendar titles. A valid match outside that sample could never appear.

## Problems and fixes

1. **Missing upcoming titles beyond the first source page.** Discovery now follows the actual date range and paginates the source response instead of fetching only one future page. Regression tests cover both TV and movies on page 2.
2. **Country, language, genre, rating, and custom-date filters searched an unrelated sample.** These constraints now reach TMDB discovery before detail verification. Languages use separate requests merged with OR semantics; other filter combinations remain AND. Source and local verification share calendar-day boundaries.
3. **Title search missed titles outside the sample and could reject original/alternative names.** Search now uses TMDB’s catalog search and retains its name matches while verifying the remaining filters against details.
4. **Returning seasons could be missed by series-first-air discovery.** Returning-season candidates use episode-air-date discovery, then match verified season premieres. When a season date is missing, a confirmed scheduled episode 1 supplies its premiere date. Later episodes never supply a premiere date.
5. **Future cards said “Premiered” or “Released.”** Cards now use “Premieres” or “Releases” for today/future dates and retain past tense for earlier dates, using the selected timezone.
6. **Switching content types reset Upcoming/custom dates to Last 30 days.** Shared date selections survive content switches. Changing New Series to Returning Seasons also preserves an explicit All Dates selection.
7. **Upcoming ordering and season selection hid the nearest premiere.** Selecting Upcoming defaults to soonest first; a title with multiple announced seasons shows the nearest matching future season. Explicit alternative sort choices remain available.
8. **Currently Airing excluded episodes scheduled today.** A date-only next episode today remains eligible throughout that calendar day; an exact airtime is not available from this metadata.
9. **Partial discovery failures and limits were hidden.** Coverage now reports source-page failures and truncated discovery. Continuation snapshots include the query as well as the inventory and local day, preventing reuse across different filters.
10. **Selected filters were hard to read in light mode.** Lime text appeared on pale backgrounds. Content tabs now use the accent background with its paired text color; selected multi-select labels and pending-change feedback use the foreground color.

## Coverage and limits

Discovery fetches at most 10 pages per language, sharing a 20-page budget across languages with at least one page for each selected language (maximum 30 languages). Detail requests run with concurrency 8. Broad queries can exceed that selection; the UI explains that their counts and ordering cover only fetched records and recommends narrower filters. These changes expand relevant coverage without claiming an exhaustive TMDB mirror.

Movie dates remain original release dates. Upcoming begins tomorrow in the selected timezone. Missing dates/ratings and unconfirmed season completion remain unknown. Sample catalog data is excluded.

## Verification

- Regression tests exercise later discovery pages, upstream constraints, original-name search, returning-season discovery and fallback dates, future card wording, today’s episodes, nearest upcoming season selection, query-specific snapshots, partial failures, and filter preservation.
- Explore browser tests cover Apply, desktop/mobile language selection, mode switches, future TV/movie wording, shared URLs, reloads, and Back navigation.
- Live TMDB verification on October 20 returned 69 upcoming Hindi movies and three upcoming returning Hindi series, including season 7 of The Legend of Hanuman. These are observations at verification time; catalog metadata changes.
- A later browser check on October 21 returned 71 upcoming Hindi movies with correct future labels, no page errors, and no horizontal overflow at 375px. Selected controls measured above 13:1 text contrast in light mode; both themes were visually reviewed.
- Passed: `npm test -- --reporter=dot` (85 tests), `PLAYWRIGHT_PORT=3000 npm run test:e2e -- --grep 'discovery|language filters|upcoming dates'` (6 tests), `npm run build`, `npx tsc --noEmit`, and `npm run lint -- --ignore-pattern '.agents/**' --ignore-pattern '.claude/**'`.
- The default lint command also scans ignored local `.agents/skills` scripts with pre-existing CommonJS lint violations; those scripts are outside this change.

TMDB references: [TV discovery](https://developer.themoviedb.org/reference/discover-tv), [movie discovery](https://developer.themoviedb.org/reference/discover-movie), [TV catalog search](https://developer.themoviedb.org/reference/search-tv).
