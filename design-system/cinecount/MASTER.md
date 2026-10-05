# Cinecount design system

Direction: a cinematic, editorial discovery product for TV schedule, movie, series, and anime fans. Use framed imagery, strong typographic hierarchy, generous section spacing, and a restrained lime accent. Keep the existing Cinecount identity.

The ui-ux-pro-max search for “streaming entertainment dark cinematic” matched the entertainment-focused Vibrant & Block-based style and streaming-oriented Inter typography. Adapt those recommendations to a quieter editorial layout, Geist typography, and charcoal/lime palette. The Next.js stack search confirmed responsive optimized images and internal Link navigation. The focused modal search confirmed visible keyboard focus and unobscured controls.

## Semantic tokens

| Role           | Dark    | Light   |
| -------------- | ------- | ------- |
| Background     | #101210 | #f5f5ee |
| Foreground     | #f4f5ef | #20261d |
| Surface        | #191c19 | #ffffff |
| Raised surface | #232723 | #e8ece0 |
| Muted text     | #a8afa5 | #596353 |
| Border         | #343b33 | #c5cebd |
| Accent         | #d5f56a | #d5f56a |
| On accent      | #182008 | #182008 |
| Danger         | #ff9e9e | #a52626 |

Image-backed heroes retain a dark surface in both themes. Their foreground (#f4f5ef) and secondary text (#c6cec1) are independent of the page theme.

## Layout and typography

- Self-host Geist through next/font; body text 16px with 1.5–1.75 line height.
- Constrain content to 1440px, with 20/32/48px responsive gutters.
- Use 1/2/3 columns for episode schedule cards, 2/3/5 columns for collection grids, and 160/200px cards in small-screen rails.
- Section headings 24–30px; page headings 36–60px; feature title 48–72px.
- Use 8px spacing rhythm, 16px poster corners, 24px feature corners, pill actions.
- Titles wrap. Metadata can be smaller; important content remains visible.
- Keep top navigation consistent and reveal labeled navigation on mobile.

## Interaction and accessibility

- Use Lucide SVG icons consistently. Hide decorative icons from assistive technology.
- Controls have at least 44px targets, visible focus, and semantic states.
- Native modal dialogs provide focus containment, Escape dismissal, and focus restoration.
- Label search and filters; announce contextual result counts; offer recovery in empty/error states.
- Use actual links for navigation. Never nest a button inside a link.
- Reflect bookmark state across all instances through the existing tracker store and preserve import/export, reminders, notes, episode progress, and theme/timezone preferences.
- Keep exact-airtime countdowns separate from date-only releases. Retain elapsed countdowns for recently aired episodes. Do not announce every timer tick.
- Use only subtle color/image transitions; respect reduced motion, including rail scrolling.
- Keep streaming and trailer availability truthful. Do not show unverified format claims.
