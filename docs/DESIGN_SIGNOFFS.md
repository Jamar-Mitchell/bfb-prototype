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
| 82 | Proposal page, first cut: the summary as the heading, one line on where it stands ("Your business is writing version 1…", "… is writing the first version"), a Status card (status, version, whose turn, respond by, closed), the other business's card, and "Continue editing" while your business has a draft. Replaced by the full review in row 96 | `/proposals/<id>` | FE-4.1 | [ ] |
| 86 | Proposal builder layout: "PROPOSAL · VERSION 1 DRAFT" heading, "Proposal to …", five white section panels (Summary and dates, What each business provides, Milestones, Terms, Cash adjustment), a sticky side column with the value comparison and "Before you send" (moves above the sections on a phone), and a navy sticky bar with the save state, "Discard draft" and "Send proposal" (like the portfolio's unsaved-changes bar) | `/proposals/<id>/edit` | FE-4.2 | [ ] |
| 87 | Services: one block per business ("What … provides" with its total), each service as a grey card with title, estimated value in dollars, description, deliverables and "Not included" chips, a "From an offer" tag and a bin icon; "Add from … active offers" select with "Add offer", and "Write a service for …" | `/proposals/<id>/edit` | FE-4.2 | [ ] |
| 88 | Milestones: numbered grey cards with up/down arrow buttons and a bin, title, due date, "Delivered by", "Part of" (a service or general), acceptance criteria and description. Terms: three day/number fields, "Who owns the work" as three selectable rows with one-line explanations, confidentiality as two rows, notes | `/proposals/<id>/edit` | FE-4.2 | [ ] |
| 89 | Value comparison card: each business's total, the difference in bold, one sentence ("Northstar Digital's services are valued $300 more."), a "no value yet" note in amber, "Add a cash adjustment of $300" (or the adjustment in words once set), and the line "The values each business entered. BFB doesn't score or judge the trade." No percentages or scores | `/proposals/<id>/edit` | FE-4.2 | [ ] |
| 90 | "Before you send" checklist (amber icons, each item a link to its section, service or milestone; "Everything needed is filled in." in green), the send dialog with "Time to respond" (default 14 days) and the respond-by date, the discard confirmation, and the saved / unsaved / saving / "Couldn't save your changes · Try again" states | `/proposals/<id>/edit` | FE-4.2 | [ ] |
| 96 | Proposal page: "PROPOSAL · VERSION N" heading with the other business's name and status pill; a "Where it stands" panel (pale blue while open) with whose turn and the respond-by date, or why it closed; the current version as one white document: "Version N · sent by … on …", the summary, the dates, "Who provides what" as two grey columns (your business first) of service cards with value, description, deliverables and "Not included", each with its total, then one sentence on the difference and the cash adjustment ("Harbor Bookkeeping pays Northstar Digital $300 when the work is complete"), milestones as a dated timeline, and terms as plain sentences. Side column: the action card, the Status card and the other business. On a phone the action card and status come first | `/proposals/<id>` | FE-4.3 | [ ] |
| 97 | Action card: "Your answer" with Counter (primary) and Decline for the business that did not send the version; "Continue your counteroffer" once a counter draft exists; "Your proposal" with Withdraw for the sender; a lock line for members; nothing on a closed proposal | `/proposals/<id>` as each business and as a member | FE-4.3 | [ ] |
| 98 | Decline and withdraw dialogs: like the match decline dialog, but a reason is required (red "Choose a reason." if none), with an optional note, the lock line "seen by BFB only, never by …" and a red "Decline proposal" / "Withdraw proposal" button | `/proposals/<id>`, Decline or Withdraw | FE-4.3 | [ ] |
| 99 | Counteroffer builder: the same builder headed "Counteroffer to …" with "A copy of version N to change as you need." | `/proposals/<id>/edit` after Counter | FE-4.3 | [ ] |
| 104 | "Versions" panel under the document: newest first, each "Version N" with a Current / Replaced / Accepted pill, "Sent by … on …. Accepted by …", "Open version N" for older ones, and "What changed from version N-1" (open by default on the current version) | `/proposals/<id>` after a counteroffer | FE-4.4 | [ ] |
| 105 | Change rows: an Added (green), Removed (red) or Changed (blue) tag, what changed in words ("Brand identity sprint (Northstar Digital): value", "Service: Quarterly tax filing (…)") and the old value struck through → the new value in bold; added and removed items in one line (value and deliverables, or due date and who delivers it) | `/proposals/<id>`, Versions | FE-4.4 | [ ] |
| 106 | Older version page: "PROPOSAL · VERSION N", a grey "Replaced" pill, an amber "Replaced by version N" panel saying it can't be accepted or changed with a link to the current version, the same document, and what changed from the version before. No actions | `/proposals/<id>/versions/<n>` | FE-4.4 | [ ] |
| 108 | Accept: "Accept" (primary) above Counter and Decline in "Your answer"; the confirmation "Accept version N?" with a summary box (what your business provides and receives with totals, the cash adjustment in a sentence, when the work ends), a line saying the other business already accepted by sending so this makes it final, and a blue "Accept proposal" button | `/proposals/<id>`, Accept | FE-4.5 | [ ] |
| 109 | "Add your legal details first": an amber box with a scales icon in the accept and send dialogs, saying what is still needed in words, with "Add legal details →" to the profile section | `/proposals/<id>` Accept, or Send in the builder, before legal details are filled | FE-4.5 | [ ] |
| 110 | "Legal details for agreements" on the profile page, between the profile card and the portfolio: scales icon, why it is needed, a "Private" lock line, "Still needed: …" in amber or "Ready for agreements." in green, legal name, entity type, street address, address line 2, city, state or region, postal code and country, with its own "Add / Edit legal details" and "Save legal details". Legal name moved here from the profile card. Linked from proposals with `?section=legal-details`, which scrolls to it and opens it for editing | `/profile`, `/profile?section=legal-details` | FE-4.5 | [ ] |
| 111 | Accepted state: on the proposal, a green "Accepted" panel ("Both businesses accepted version N on …. This version is final. Next, BFB prepares the Business Exchange Agreement…; agreements and signatures arrive in the next release.") with no actions and an Accepted pill in Versions; on the match, the green panel becomes "Proposal accepted" with a check icon and "Open the proposal". FE-5.1 replaces the next-step line | `/proposals/<id>`, `/matches/<id>` after both accept | FE-4.5 | [ ] |
| 115 | Agreement page: "EXCHANGE AGREEMENT" heading with the other business's name, "From version N of your proposal, accepted on …" and a status pill (Ready for signers / Out for signature / Signed / Expired / Voided); a "Where it stands" panel; the agreement in a white "Business Exchange Agreement" panel with the generated document in a frame grown to its full height (the page scrolls, not the frame), naming the Exchange Terms version it incorporates; the document fingerprint (SHA-256) and template version in small grey print under it. Side column: the signing card, Status (status, sign by, proposal version, Exchange Terms version, legal review) and Parties (legal name, "On BFB as …", entity type, address, when each accepted; yours marked "Your business"). On a phone the banner, signing card and status come before the document, as on the proposal page | `/agreements/<id>` | FE-5.1 | [ ] |
| 116 | Draft terms banner: red border, pale red ground, warning icon and "Draft terms, not reviewed by counsel. Not for real exchanges." in bold red, with one plain line under it; not dismissable. Shown on the agreement page, above the agreements list when any listed agreement uses drafts, and on the Exchange Terms page. The generated document and the terms text carry their own draft notice as well | `/agreements/<id>`, `/agreements`, `/legal/exchange-terms` | FE-5.1 | [ ] |
| 117 | "Signing comes next." placeholder: a neutral grey card titled Signing with a pen icon and one line on what happens next (or that the agreement can no longer be signed), no buttons. Replaced by the Signing card (row 123) in FE-5.2 | `/agreements/<id>` | FE-5.1 | [ ] |
| 118 | Agreements list: "AGREEMENTS · Put the exchange in writing." with Open, Signed and Closed tabs; rows like proposals (the other business, "Business Exchange Agreement with …", status pill, a red "Draft terms" pill, "From the proposal" link, "Sign by …" / "Signed on …" / "Expired on …" and Open); empty states per tab, Open linking to proposals. "Agreements" sits in the sidebar between Proposals and Saved businesses with a scroll icon | `/agreements` | FE-5.1 | [ ] |
| 119 | Public Exchange Terms page: the public profile's header (Log in, Join BFB or Go to dashboard), one white card with "BFB LEGAL · Exchange Terms", a line on what they are, version, published date and legal review, an amber "A newer version has replaced this one" line on old versions, the draft banner, the text in a serif reading face, and the fingerprint. An unknown version says so and links to the current one | `/legal/exchange-terms`, `/legal/exchange-terms/<version>` logged out | FE-5.1 | [ ] |
| 120 | Accepted proposal and match link to the agreement: the proposal's green Accepted panel now says "BFB prepared the Business Exchange Agreement from it for both businesses to sign." with a blue "Open the agreement" button (replacing row 111's "arrive in the next release" line); the match's "Proposal accepted" panel has "Open the agreement" (blue) and "Open the proposal" (link). The accept toast adds "BFB prepared the agreement." | `/proposals/<id>`, `/matches/<id>` after both accept | FE-5.1 | [ ] |
| 121 | Agreement not found: "We couldn't find this agreement", saying only the two businesses in an agreement can open it and naming the business you are acting for, with "See your agreements" | `/agreements/<id>` as a third business | FE-5.1 | [ ] |
| 122 | Accept refused because the legal documents are drafts (`legal_document_not_reviewed`, staging and production only): the accept dialog stays open with a red notice that the documents are still drafts waiting for review by counsel, so the agreement can't be prepared yet, and that nothing changed | `/proposals/<id>` Accept, with `BFB_ALLOW_DRAFT_LEGAL_DOCUMENTS=false` | FE-5.1 | [ ] |
| 123 | Signing card (side column, in place of row 117): one line on the stage, then one box per business (yours first) with its name, the signer's name and title, a step pill (grey "No signer yet", amber "Waiting to confirm", blue "Confirmed", green "Signed", red "Declined") and when it happened; "Name who signs" / "Change signer" for owners and administrators while ready, a lock line for members; "Must be signed by …" in small grey print while open | `/agreements/<id>` | FE-5.2 | [ ] |
| 124 | Name who signs dialog: "SIGNING · Name who signs for …", a line on who may sign, a radio list of the business's owners and administrators (name, "(you)", role and email, "Current signer" pill), how many members can't sign with a Team page link, an optional title, and an amber "… replaces them and must confirm" note when changing | `/agreements/<id>`, Name who signs | FE-5.2 | [ ] |
| 125 | "Your signature" panel above "Where it stands", for the named signer only. Confirm: full name and title side by side (stacked on a phone), a red "Draft wording" pill with the wording version, and each consent text in full beside its own checkbox in a grey box that turns red when unticked on submit, then "Confirm". After confirming: what you confirmed, who signing waits on, "Change your details". Sign: "type your full name as you confirmed it: **Name**", a large serif name field, a small line that this signs electronically, and "Sign agreement" with a pen icon; a wrong name shows red under the field. After signing: who you are waiting for | `/agreements/<id>` as the named signer | FE-5.2 | [ ] |
| 126 | Signed state: a green "Signed documents" panel at the top of the agreement with a line on what each file is and that links last 15 minutes, white "Signed agreement" and "Signature certificate" buttons (download icon, open in a new tab), a blue "Open the exchange", and both file fingerprints in small grey print. "Where it stands" says when both signed and that the exchange is active; Status gains Signed (date) and Exchange (Active, linked) | `/agreements/<id>` once both signed | FE-5.3 | [ ] |
| 127 | Exchanges page on real data, in the prototype's cards: the other business's logo or initials (no photo), its name in small blue capitals, "Business exchange with …", location and "Active since …", a blue Active pill; the grey strip shows Milestones, Next due, Active since and Agreement instead of the demo "provides / receive / value / target"; "Signed agreement" and "View details". Tabs are Active (count) and Completed (empty for now); "Incoming" and "Sent" are gone (proposals have their own page) and the heading button is "Agreements" instead of "New proposal" | `/exchanges` | FE-5.3 | [ ] |
| 128 | Exchange page: "EXCHANGE" heading with the other business, "Active since …, under the signed agreement", a green Active pill; a green "Where it stands" saying how many milestones each business delivers; Milestones in order, each with its number (solid blue when you deliver it), title, a grey "Not started" pill, "You deliver" / "You receive" and who delivers to whom, the due date, the description and a grey "Done when: …" box; a read-only note. Side column: Status (status, active since, next due, milestones, agreement, proposal) and the other business | `/exchanges/<id>` | FE-5.3 | [ ] |
| 129 | Dashboard exchanges: "Your active exchanges" lists the newest three real exchanges in the prototype's rows (logo, "Exchange with …", milestones and start date, Active pill, an empty progress bar until delivery, "Next due …", "View exchange"), "View all" in place of the "•••" button, and a one-line empty state. The "Active exchanges" stat shows the real count and when the next milestone is due; the other stats stay demo. The sidebar's demo "3" on Exchanges is gone | `/dashboard` | FE-5.3 | [ ] |

Phase 3 adds rows below 12, numbered from 41. Phase 4 continues from 79, and Phase 5 design rows from 115.

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
| 84 | Finding a match's proposal | The match detail now carries its proposal (the accepted one, else the newest; API-4.4), and the accepted match page uses it. The proposal list is no longer read for this (FE-4.5) | |
| 85 | Closed proposals tab | Like matches (row 63): the API filters on one status at a time, so Closed reads the unfiltered list and keeps declined, withdrawn and expired proposals in the browser. Add a "closed" filter to the API? | |
| 91 | Autosave | The whole draft saves in one request 0.9 seconds after typing stops; there is no Save button. A failed save keeps the edits and tries again with the next edit or "Try again"; closing the tab with unsaved edits asks first | |
| 92 | Draft saved somewhere else (`stale_draft`) | The builder loads the latest saved draft and says your last few seconds of changes were not saved. Merge them instead, or ask which to keep? | |
| 93 | Adding the other business's offers | There is no endpoint for one business's offers, so the builder reads active marketplace offers (up to 250) and keeps that business's. Add one to the API? | |
| 94 | Defaults for a new milestone and cash adjustment | A new milestone is delivered by your business, with no service. The cash adjustment from the comparison is paid by the business that provides less, for the difference; when it is paid is left to choose | |
| 95 | Wording for who owns the work | "Ownership transfers on completion", "License to use", "Each keeps its own", each with a one-line explanation. Needs legal review with row 76 | |
| 100 | Proposal decline reasons | The values don't work for us, The scope isn't right, The dates don't work, We can't agree to the terms, We don't have capacity right now, Something else. Required (the API requires one) and seen by BFB only | |
| 101 | Withdraw reasons | Our plans changed, We don't have capacity right now, The timing no longer works, Something else. Required and seen by BFB only. Withdrawing asks through this dialog; there is no separate "are you sure" | |
| 102 | Counter when a counter draft already exists | "Counter" becomes "Continue your counteroffer"; if the API still answers `draft_exists`, the builder opens on that draft | |
| 103 | An action refused because the proposal changed (`invalid_proposal_status`) | The page loads the proposal again and says why in a red notice ("This proposal closed since you opened it…", "…it's no longer your turn…") | |
| 107 | Order of the version list and changes | Versions newest first; changes in the API's order (dates, then services, milestones, terms, cash). Only the change from the previous version is shown; comparing any two versions (the API allows it) is not offered | |
| 112 | Who sees legal details | Owners and administrators edit them; members see them read-only on the profile page (the API returns them to every member). Never public | |
| 113 | Accepting with a counter draft open | Allowed; the confirmation says the counteroffer draft is deleted (the API discards it) | |
| 114 | Match after a closed proposal | The match page says "The last proposal was declined / withdrawn / expired. You can start a new one." with "Start a proposal" and a link to the last proposal. Whose turn an open proposal is waiting on is no longer shown on the match (the match's proposal has no `waiting_on`); the proposal page shows it | |

## Phase 5 defaults

Decisions made to start Phase 5. Numbered from 130 so they do not collide with Phase 4 rows still being added.

| # | Decision | Default built | Answer |
|---|---|---|---|
| 130 | Legal document structure | Standard Exchange Terms (versioned, incorporated by reference) plus a short per-deal Exchange Agreement generated from the accepted proposal | |
| 131 | Legal review | First versions are drafts written from LEGAL.md and marked "not reviewed by counsel". Staging and production refuse to generate agreements from drafts | |
| 132 | Signers | One per business: an owner or administrator, who confirms name, title, authority and electronic consent | |
| 133 | Signing provider | A development provider signs inside BFB with a typed name, local and demo only. A real provider is needed before real exchanges | |
| 134 | Signing deadline | 30 days after the agreement is generated, then it expires | |
| 135 | E-signature provider | Not chosen. Options: DocuSign, Dropbox Sign, BoldSign | |
| 136 | PDF library | Not approved. Needed for real PDFs of the agreement and certificate (API-5.7) | |
| 137 | Who can publish legal documents | Support and administrator users can publish new Exchange Terms and template versions, including ones marked reviewed (`POST /admin/legal-documents`). Consider administrators only | |
| 138 | Where agreements live | Their own sidebar item, "Agreements", between Proposals and Saved businesses, rather than a tab in Proposals: an agreement outlives its proposal and leads to the exchange. Tabs: Open (ready for signers or out for signature), Signed, Closed (expired or voided) | |
| 139 | Agreements tabs | The API filters on one status at a time, so Open and Closed read the unfiltered list and keep their statuses in the browser (as Closed proposals do, row 85); Signed filters on the API | |
| 140 | How the agreement document is shown | The API's full HTML document in a sandboxed frame that allows no scripts, forms, popups or navigation; `allow-same-origin` only, so the page can measure it and grow the frame to the document's full height (the page scrolls, not the frame). Exchange Terms links open in a new tab so the agreement stays open | |
| 141 | Parties on the agreement page | As named in the agreement (from the details at final acceptance), legal name first with the BFB display name under it when different; later profile edits don't change them | |
| 142 | Final acceptance refused for draft documents | `409 legal_document_not_reviewed` keeps the accept dialog open with an explanation; the proposal is not reloaded, since nothing changed | |
| 143 | Who can be named to sign | Only the business's owners and administrators are offered (the API refuses anyone else); members are counted with a link to the Team page rather than listed. The dialog starts on the current signer, or on you when nobody is named. Full name is not asked for: the API fills in the person's display name and the signer corrects it when they confirm | |
| 144 | Confirming | Both checkboxes start unticked every time, including when a confirmed signer changes their details; the confirm button stays enabled and an unticked box is explained on submit rather than disabling the button. Title is required (the API requires one) | |
| 145 | Typed-name check | The sign field starts empty and shows the confirmed name above it; a mismatch is explained under the field naming the confirmed name, and says capitals and extra spaces don't matter (the API compares that way) | |
| 146 | Signing refused because something changed | A replaced signer, signing already started, a closed agreement, a lost role or changed consent wording reloads the agreement with a red notice saying why, as row 103 does for proposals. "Signing isn't switched on here yet" (no provider) stays in the form, since nothing changed | |
| 147 | Other signature providers | When the agreement uses a provider that signs outside BFB, the signer sees a neutral line to follow the link the provider sends to their email; no sign form | |
| 148 | Downloading signed files | Each click asks the API for a fresh 15-minute link and opens it in a new tab (opened on the click so popup blockers allow it, with no access back to BFB); the link is never stored or shown. A failure closes the tab and shows a red toast | |
| 149 | Exchange list contents | The list item has no service titles or values, so cards show milestones, next due date, start date and the agreement rather than what each business provides; the exchange page shows each milestone with who delivers it. Fetching every exchange's detail for the cards was not worth the extra requests | |
| 150 | Milestone status wording | `pending` reads "Not started" until delivery (Phase 6) adds more statuses | |
| 151 | Draft banner on exchanges | Not shown on exchange screens (the exchange API does not say whether its agreement used drafts); the signed agreement one click away carries it | |

## Before staging

| # | Item | Status |
|---|---|---|
| 37 | Email provider: Resend, Postmark or SendGrid. Needed for real verification, invite and reset emails | Not chosen |
| 38 | Google Cloud Storage bucket and permissions, following `bfb-api/docs/UPLOADS.md` | Not set up |
| 39 | Staging and production refuse to start with local-disk storage? | Not decided |
| 40 | Rate limiting on login, registration and email requests | Planned for Phase 8 |
