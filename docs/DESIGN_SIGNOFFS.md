# Design Sign-offs and Open Decisions

Built work that is waiting on Jamar's sign-off. Each item is already in the app with the default described here, so nothing is blocked. To review an item, run the app locally and open the route listed. Tick the box when it is approved, or write the change you want under the item and an agent will pick it up.

Last updated: 12 November 2026 (end of Phase 2, start of Phase 3).

## Design sign-offs

| # | Screen or element | Where to see it | Built in | Signed off |
|---|---|---|---|---|
| 1 | Login and register pages, inline notices, error red `#c63b3b`, and the toast | `/login`, `/register` | FE-0.3, FE-1.1 | [ ] |
| 2 | Verify-email banner, "Forgot password?" link, invite-code field | `/dashboard` while unverified, `/login`, `/register` | FE-1.3, FE-1.6 | [ ] |
| 3 | Log-out icon and the full-page loading screen | Sidebar, page reload | FE-1.2 | [ ] |
| 4 | Business switcher and its menu; your role shown under the business name instead of your own name; the create-business page | Sidebar, `/create-business` | FE-1.4 | [ ] |
| 5 | Team page: role pills, amber "Expired" pill, red danger button, confirmation dialog | `/team` | FE-1.5 | [ ] |
| 6 | Onboarding steps and service-area cards | `/onboarding` | FE-2.1 | [ ] |
| 7 | Profile editor: upload buttons, progress bars, completeness meter and the sidebar "Complete your profile" card | `/profile` | FE-2.2 | [ ] |
| 8 | Status banners: in review, changes requested, approved, suspended (four colors) | `/profile`, `/dashboard` | FE-2.6 | [ ] |
| 9 | Listings: status pills, filter chips, the amber "To publish, add …" note, the offer and need form dialog | `/listings` | FE-2.3, FE-2.4 | [ ] |
| 10 | Portfolio tiles, PDF and link tiles, drag styling, the sticky "unsaved changes" bar, the portfolio dialog | `/profile`, Portfolio section | FE-2.5 | [ ] |
| 11 | Admin review queue, business detail page and decision dialog | `/admin` (administrator account) | FE-2.7 | [ ] |
| 12 | Public profile frame and the "Verified business" badge | `/b/<business id>` logged out | FE-2.8 | [ ] |
| 41 | Marketplace listing cards: brand-gradient banner instead of a photo (listings have none), logo or initials, Offer/Need pill, listing title, category, business name and location, "They offer" or "They're looking for" deliverables, value or budget, "View business" to the public profile. No ratings or match claims | `/marketplace` | FE-3.1 | [ ] |
| 42 | Marketplace filters: category chips with counts (multi-select), the All / Offers / Needs toggle, the "Location" and "Value" buttons opening an inline panel with Apply and Clear, "Newest first" / "Most relevant first" in place of the "Best match" sort, "Load more" | `/marketplace` | FE-3.1 | [ ] |
| 43 | Marketplace banner line "Every business here was reviewed by BFB" (replaces "Personalized using your onboarding preferences", which was not true) | `/marketplace` | FE-3.1 | [ ] |

Phase 3 adds rows below 12, numbered from 41. Still to come: fit-band wording, match cards and detail, and the admin match workspace.

## Product decisions

Built with the default shown. Answer by number.

| # | Decision | Default built | Answer |
|---|---|---|---|
| 13 | Password rule | At least 10 characters, a mix of letters and non-letters, and not containing the part of the email before the @ | |
| 14 | Terms at registration | One checkbox for both terms and privacy, no links yet | |
| 15 | Suspended accounts at login | Same error as a wrong password | |
| 16 | Required to submit for review | Logo required, cover optional | |
| 17 | Editing an approved business | Stays approved, no re-review | |
| 18 | Who approves businesses | Support staff and administrators. Administrators only? | |
| 19 | Legal and compliance categories | Flagged in the admin queue, not blocked | |
| 20 | Staff access to business pages | Staff only see businesses through the admin screens | |
| 21 | Accepting an invite | Needs the exact invited email, verified. A business can have several owners | |
| 22 | Password reset and verification | Should a reset also mark the email as verified? Currently no | |
| 23 | Invite codes | Add a disable action? Record which code each user signed up with? Currently neither | |
| 24 | Archived listings | Hide from the "All" view by default? Currently "All" includes archived listings, and there is also an "Archived" filter | |
| 25 | Non-admins opening `/admin` | Currently sent to the dashboard. Show "not found" instead? | |
| 26 | Review history | Show the reviewer's name? Currently hidden | |
| 27 | Unsaved portfolio changes | Warn when leaving the page? Currently no warning | |
| 28 | Public profile content | Show active offers and needs? Put the portfolio before "What they do"? | |
| 29 | Error screen | The button on the full-page error screen is oversized. Fix? | |

## Phase 3 defaults

Decisions made to start Phase 3. Each can be changed later.

| # | Decision | Default built | Answer |
|---|---|---|---|
| 30 | Who can browse the marketplace | Any logged-in user with a verified email. Only active listings of approved businesses appear | |
| 31 | Who creates matches | Support staff and administrators, like review approval | |
| 32 | Who responds to a match | Owners and administrators. Members can view | |
| 33 | Match expiry | 14 days unless both businesses accept first | |
| 34 | Decline reasons and feedback | Seen by staff only, never by the other business | |
| 35 | Saved businesses | Shared by the whole team, not per person | |
| 36 | Fit display | Words only (Strong, Potential, Limited fit) plus reasons. No percentages or scores anywhere | |
| 44 | Marketplace category chips | Every active category is a chip, including those with 0 listings for the current search. Hide the empty ones? | |
| 45 | Marketplace banner photos | Still the prototype's three demo photos, as decoration. Replace with BFB brand imagery? | |

## Before staging

| # | Item | Status |
|---|---|---|
| 37 | Email provider: Resend, Postmark or SendGrid. Needed for real verification, invite and reset emails | Not chosen |
| 38 | Google Cloud Storage bucket and permissions, following `bfb-api/docs/UPLOADS.md` | Not set up |
| 39 | Staging and production refuse to start with local-disk storage? | Not decided |
| 40 | Rate limiting on login, registration and email requests | Planned for Phase 8 |
