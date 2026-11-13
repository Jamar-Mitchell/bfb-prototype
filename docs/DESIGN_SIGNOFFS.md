# Design Sign-offs and Open Decisions

Built work that is waiting on Jamar's sign-off. Each item is already in the app with the default described here, so nothing is blocked. To review an item, run the app locally and open the route listed. Tick the box when it is approved, or write the change you want under the item and an agent will pick it up.

Last updated: 13 November 2026 (start of Phase 4).

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
| 46 | Save button: the prototype's bookmark on marketplace cards, and a "Save" / "Saved" button beside the name on the public profile (logged in, not your own business). A failed save flips back with a red-icon toast | `/marketplace`, `/b/<business id>` | FE-3.2 | [ ] |
| 47 | Saved businesses page and its sidebar item: one row per business with logo, name, location, service area, saved date, "View business" and the bookmark; empty state pointing to the marketplace | `/saved` | FE-3.2 | [ ] |
| 49 | Fit band and factor wording, shared by every match screen (`src/features/matching/fitCopy.ts`): "Strong fit" green, "Potential fit" blue, "Limited fit" amber; each factor as name, result word (Fits, Partial, Conflict, Needs confirmation) with a tick, dash, cross or question icon, and a one-sentence reason. No numbers, scores or counts | `/admin/matches/new`, `/admin/matches/<id>` | FE-3.5 | [ ] |
| 50 | Admin "Matches" sidebar item and the Review queue / Matches tabs under the admin headings; the matches list with status and business filters, status and fit pills, both responses per row, "Load more" | `/admin/matches` | FE-3.5 | [ ] |
| 51 | New match, step 1 and 2: approved-business list with a name filter, then the business's suggested fits ranked best first, each with one line per offer-need pair, its fit band, and "Choose pairs" or "Open match" when one is already open | `/admin/matches/new` | FE-3.5 | [ ] |
| 52 | Pair picker: a checkbox per offer-need pair with "Offer from … → Need from …", category, band and factor list; side card with the note for both businesses, the "Expires on" date (default 14 days) and "Create match"; the red "already have an open match" notice linking to it | `/admin/matches/new?business=<id>&candidate=<id>` | FE-3.5 | [ ] |
| 53 | Match detail: note, offers and needs as snapshotted, responses with staff-only decline reasons, status card with expiry and withdrawal reason, feedback card (staff only, once the API sends it), and the withdraw dialog with a required reason | `/admin/matches/<id>` | FE-3.5 | [ ] |
| 57 | "Matches" sidebar item (sparkles icon) with the count of open matches waiting on your business's answer. Staff who also have a business see it as well as the admin "Matches" item | Sidebar | FE-3.3 | [ ] |
| 58 | Match inbox: Open / Accepted / Closed tabs (kept in the URL, Open shows the waiting count), a card grid with logo or initials, name, location, a blue "Reviewed by BFB" badge, the fit band pill, the top three reasons with tick, dash or question icons, a timing line ("Respond by 4 Dec" in amber, "You both accepted on …" in green, "Expired on …" grey) and "View match"; a status pill on accepted and closed cards; an empty state per tab | `/matches` | FE-3.3 | [ ] |
| 59 | Match detail: "A note from BFB" in a pale-blue panel, "Why you were matched" with each pair as two cards ("Your offer" / "Corner Bakery's need", value or budget, delivery, timing) joined by an arrow, the pair's band and every factor; side cards for the other business with "View public profile", both responses, and the status with "Respond by" or "Closed" | `/matches/<id>` | FE-3.3 | [ ] |
| 60 | Dashboard hero: the "12 strong matches" pill becomes "N matches waiting on you" (or "No matches waiting") and opens the inbox; the "Top fit today" card becomes the newest match waiting on you ("RESPOND BY 26 NOV", band in words) and is hidden when there is none; the button reads "See your matches" | `/dashboard` | FE-3.3 | [ ] |
| 64 | "Your answer" card at the top of the match detail's side column: the blue-edged card with "Accept match" (primary) and "Decline" (secondary), full width, and a line when the other business already accepted; after answering, "You accepted on … Waiting for …"; for members, the waiting line and a lock note saying only owners and administrators can answer | `/matches/<id>` on an open match, as owner and as member | FE-3.4 | [ ] |
| 65 | Decline dialog: "Decline the match with …?", the reasons as selectable rows (optional), an optional note, the lock line "seen by BFB only, never by …", and a red "Decline match" button. Your own reason then shows under your response, marked as seen by BFB only | `/matches/<id>`, Decline | FE-3.4 | [ ] |
| 66 | Both-accepted next step: a pale-green "You both accepted" panel above the pairs saying a proposal can be started in the next release and BFB will help you connect | `/matches/<id>` on an accepted match | FE-3.4 | [ ] |
| 67 | "Was this match useful?" card under the pairs: Useful / Not useful chips, then reason chips for that rating plus "Something else", a comment box and "Save feedback"; once saved, the rating pill, reasons and comment with "Edit feedback". Hidden on withdrawn matches | `/matches/<id>` | FE-3.4 | [ ] |
| 79 | "Proposals" sidebar item (file-and-pen icon) under Matches, with the count of proposals waiting on your business's answer | Sidebar | FE-4.1 | [ ] |
| 80 | Proposals page: Waiting on you / Waiting on them / Drafts / Accepted / Closed tabs (kept in the URL; Waiting on you shows the count; the tabs scroll sideways on a phone), one row per proposal with logo or initials, name, location, the summary (or "No summary yet"), a status pill (Draft, Being prepared, Sent, Countered, Accepted, Declined, Withdrawn, Expired), "Version N" or "Not sent yet", whose turn (amber when it is yours), a timing line ("Respond by 27 Nov" in amber, "… responds by …", "Last edited …") and "Open"; an empty state per tab | `/proposals` | FE-4.1 | [ ] |
| 81 | Accepted match next step: the pale-green "You both accepted" panel now has "Start a proposal" (owners and administrators), a lock line for members, or, once a proposal exists, "There's an open proposal for this match. Waiting on …", its status pill and "Open the proposal" | `/matches/<id>` on an accepted match | FE-4.1 | [ ] |
| 82 | Proposal page, first cut: the summary as the heading, one line on where it stands ("Your business is writing version 1…", "… is writing the first version"), a Status card (status, version, whose turn, respond by, closed) and the other business's card. FE-4.3 adds the full terms | `/proposals/<id>` | FE-4.1 | [ ] |

Phase 3 adds rows below 12, numbered from 41. Phase 4 continues from 79.

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
| 48 | Unsaving on the Saved page | The row stays, faded, with "Removed from saved", so it can be saved again; it is gone on the next visit. Remove it at once instead? | |
| 54 | Choosing a business to match | The API has no staff business search, so the workspace lists approved businesses (up to 1,000, from the review list) and filters them by name in the browser. Add a search endpoint before the pilot grows? | |
| 55 | Match expiry chosen by staff | A date, default 14 days away, from tomorrow up to 90 days; the match expires at the end of that day in the operator's time zone | |
| 56 | Pairs preselected in the pair picker | None: staff tick each offer-need pair to introduce. Preselect the best pair? | |
| 61 | "Reviewed by BFB" on match cards | The match's business summary has no verification flag, so the badge shows for an approved profile, not the public profile's "Verified business". Add verification to the match summary? | |
| 62 | Reasons on a match card | The top three: what fits, then what partly fits, then what needs confirming. Conflicts only on the detail. The match list has no factors, so each card loads its match's detail (one request per card). Add the top reasons to the list API? | |
| 63 | Closed matches tab | The API filters on one status at a time, so Closed reads the unfiltered list and keeps declined, expired and withdrawn matches in the browser. Add a "closed" filter to the API? | |
| 68 | Accepting a match | One click, no confirmation step (declining asks first). Add a confirmation? | |
| 69 | Feedback reasons offered | Useful shows the four positive reasons, Not useful the six negative ones, both plus "Something else". The API accepts any reason with either rating | |
| 70 | Who leaves feedback | Any member, once per business per match: a teammate's save replaces the business's feedback | |

## Phase 4 defaults

Decisions made to start Phase 4. Each can be changed later.

| # | Decision | Default built | Answer |
|---|---|---|---|
| 71 | Where proposals start | Only from a match both businesses accepted. One open proposal per match | |
| 72 | Who negotiates | Owners and administrators draft, send, counter, accept, decline and withdraw. Members view | |
| 73 | Sending counts as accepting | Sending a version records the sender's acceptance; the other business then accepts, declines or counters | |
| 74 | Proposal expiry | 14 days after each version is sent; the sender can choose 1 to 30 days | |
| 75 | Cash adjustment | Recorded as a term only. No money moves until Phase 9 | |
| 76 | IP terms choices | Transfer on payment and completion, license to use, or each keeps their own. Wording needs legal review before launch | |
| 77 | Party details for agreements | Legal name, entity type and registered address are required before accepting; private | |
| 78 | Value comparison | Shows each side's total and the difference, and offers a cash adjustment for the difference. No fairness score | |
| 83 | Which tab a proposal is on | Your own unsent first version is under Drafts, not Waiting on you; a counteroffer you are writing stays under Waiting on you; the other business's unsent first version is under Waiting on them as "Being prepared". The sidebar count is the Waiting on you tab | |
| 84 | Finding a match's proposal | The match carries no proposal, so the accepted match page reads the business's proposals (up to 500) and links the match's open or accepted one. Add the proposal to the match API? | |
| 85 | Closed proposals tab | Like matches (row 63): the API filters on one status at a time, so Closed reads the unfiltered list and keeps declined, withdrawn and expired proposals in the browser. Add a "closed" filter to the API? | |

## Before staging

| # | Item | Status |
|---|---|---|
| 37 | Email provider: Resend, Postmark or SendGrid. Needed for real verification, invite and reset emails | Not chosen |
| 38 | Google Cloud Storage bucket and permissions, following `bfb-api/docs/UPLOADS.md` | Not set up |
| 39 | Staging and production refuse to start with local-disk storage? | Not decided |
| 40 | Rate limiting on login, registration and email requests | Planned for Phase 8 |
