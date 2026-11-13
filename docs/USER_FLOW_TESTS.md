# User Flow Tests

Manual, end-to-end checks of everything built so far, through the start of Phase 4. Use it before a demo, after a large merge, or before handing the app to pilot users. Automated tests cover the logic; this doc covers what a person sees when they use the app.

Each flow lists steps and what should happen. Tick a row when it passes. When one fails, note the flow number, the step, and what you saw, then file it or hand it to an agent.

Last updated: 13 November 2026 (start of Phase 4).

## Setup

### Run the app

- API (`bfb-api`): `poetry run uvicorn src.main:app --port 8000` with a migrated database (`poetry run alembic upgrade head`). Locally, invite codes are off and emails are printed in the API's terminal instead of being sent.
- Frontend (`bfb-frontend`): `VITE_API_URL=http://127.0.0.1:8000/api/v1 npm run dev`.
- Use one normal window and one private window, so you can be logged in as two people at once.

### Accounts you need

| Role | How to get it |
|---|---|
| Owner of business A | Register in the app |
| Owner of business B | Register in the app (second window) |
| Member of business A | Invite from A's team page (flow 4) |
| Staff (administrator) | Register, then set `platform_role = 'administrator'` on the user in the database |
| Unverified user | Register and do not open the verification link |

The local demo already has two approved businesses with live listings: Northline Studio (`northline.owner@example.com`) and Harbor & Pine Books (`harbor.owner@example.com`), password `Demo-pass-2026!`. These accounts are local only.

### Finding emails

Verification, password reset and team invitation emails appear in the API's terminal output. Copy the link from there into the browser.

---

## 1. Register, log in, log out

| # | Steps | Expected | Pass |
|---|---|---|---|
| 1.1 | Open `/register`, submit with every field empty | Each required field shows its own error; nothing is sent | [ ] |
| 1.2 | Enter a password under 10 characters, or one with only letters | Password error explaining the rule | [ ] |
| 1.3 | Enter a password containing the part of your email before the @ | Password error | [ ] |
| 1.4 | Leave the terms checkbox unticked | Terms error | [ ] |
| 1.5 | Register with valid details | Success notice telling you to check your email; you are not logged in yet | [ ] |
| 1.6 | Register again with the same email in different capitals | "Already registered" error | [ ] |
| 1.7 | Log in with a wrong password | One generic "email and password don't match" message | [ ] |
| 1.8 | Log in correctly | You land in the app (create-business page if you have no business) | [ ] |
| 1.9 | Reload the page | Still logged in, same page | [ ] |
| 1.10 | Open the app in a second tab, wait 15+ minutes, use both tabs | Both stay logged in; no unexpected log-outs | [ ] |
| 1.11 | Log out from the sidebar | Back to login; pressing Back does not show app pages | [ ] |

## 2. Verify email and reset a password

| # | Steps | Expected | Pass |
|---|---|---|---|
| 2.1 | Log in as an unverified user | A verify-email banner shows, with a resend button | [ ] |
| 2.2 | Try to create a business while unverified | Blocked, with a message to verify first | [ ] |
| 2.3 | Press resend, open the newest link from the API terminal | "Email verified" page; the banner is gone | [ ] |
| 2.4 | Open the same link again | Says the link no longer works | [ ] |
| 2.5 | Log out, click "Forgot password?", enter your email | A neutral "if that account exists" message (same for an unknown email) | [ ] |
| 2.6 | Open the reset link, set a new password | Success; log in with the new password works and the old one does not | [ ] |
| 2.7 | Open the reset link a second time | Says the link no longer works | [ ] |

## 3. Create and switch businesses

| # | Steps | Expected | Pass |
|---|---|---|---|
| 3.1 | As a verified user with no business, create business A | You become owner; onboarding opens | [ ] |
| 3.2 | Create a second business from the sidebar switcher | The switcher lists both; your role shows under the business name | [ ] |
| 3.3 | Switch businesses | Profile, listings, team and matches change to the chosen business | [ ] |
| 3.4 | Reload | The last chosen business is still active | [ ] |

## 4. Team

| # | Steps | Expected | Pass |
|---|---|---|---|
| 4.1 | As owner of A, open `/team`, invite an email as member | Invitation listed as pending; invite email in the API terminal | [ ] |
| 4.2 | Open the invite link logged in as a different email | Refused: the invite is for another email | [ ] |
| 4.3 | Open it as the invited, verified email | You join A as member | [ ] |
| 4.4 | As the member, open `/listings` and `/profile` | Read-only: no create, edit or upload controls | [ ] |
| 4.5 | As owner, change the member to administrator, then back | Role pill updates; the member's controls change after reload | [ ] |
| 4.6 | Try to demote or remove yourself as the only owner | Refused with an explanation | [ ] |
| 4.7 | Remove the member (confirm dialog) | They lose access to A; A disappears from their switcher | [ ] |
| 4.8 | Let an invitation expire, or revoke one | Shows the amber "Expired" pill, or disappears | [ ] |

## 5. Onboarding and profile

| # | Steps | Expected | Pass |
|---|---|---|---|
| 5.1 | Fill onboarding steps 1 and 2, leave, come back | Resumes at step 3 with your answers kept | [ ] |
| 5.2 | Finish onboarding | Summary lists what is still missing (usually the logo) | [ ] |
| 5.3 | On `/profile`, upload a logo that is not an image, or is over 5 MB | Refused before upload with a clear message | [ ] |
| 5.4 | Upload a valid logo and cover | Progress bar, then the image shows; saved without pressing Save | [ ] |
| 5.5 | Edit fields and save | Completeness meter and sidebar card update; hidden at 100% | [ ] |

## 6. Offers and needs

| # | Steps | Expected | Pass |
|---|---|---|---|
| 6.1 | On `/listings`, create an offer with only a title and category | Saved as draft with a "To publish, add …" note | [ ] |
| 6.2 | Enter a value range where max is below min | Range error on the value fields | [ ] |
| 6.3 | Try to publish while the business is not approved | Publish disabled, with the reason | [ ] |
| 6.4 | Create a need, check the same rules | Same behaviour as offers | [ ] |
| 6.5 | (After flow 8) Publish a complete offer | Status becomes Active | [ ] |
| 6.6 | Pause, then resume it | Status changes each time | [ ] |
| 6.7 | Archive it | Asks first; once archived it cannot be edited | [ ] |
| 6.8 | Use the status filter chips | List filters correctly | [ ] |

## 7. Portfolio

Keep the browser's network panel open for 7.3.

| # | Steps | Expected | Pass |
|---|---|---|---|
| 7.1 | Add an image, a PDF and a link | Tiles appear; the "unsaved changes" bar shows | [ ] |
| 7.2 | Drag to reorder, remove one | Order updates on screen | [ ] |
| 7.3 | Save | Exactly one save request; after reload the order is kept | [ ] |
| 7.4 | Stop the API, make a change, save | Error toast; the previous order comes back | [ ] |

## 8. Submit for review and approval

| # | Steps | Expected | Pass |
|---|---|---|---|
| 8.1 | Submit an incomplete profile | Refused, listing what is missing | [ ] |
| 8.2 | Complete the profile (logo included) and submit | Banner shows "In review"; profile editing is locked | [ ] |
| 8.3 | As staff, open `/admin`, open the business, request changes with a note | Business sees "Changes requested" with the note; editing unlocks | [ ] |
| 8.4 | Resubmit, then approve as staff | Business sees "Approved"; publish becomes available | [ ] |
| 8.5 | As a normal user, open `/admin` | No access (sent to the dashboard) | [ ] |

## 9. Public profile

| # | Steps | Expected | Pass |
|---|---|---|---|
| 9.1 | Logged out, open `/b/<approved business id>` | Public profile with logo, details, portfolio and "Verified business" badge; no private fields such as legal name | [ ] |
| 9.2 | Open `/b/<draft business id>` | Not found | [ ] |

## 10. Marketplace

Needs at least two approved businesses with active listings (the demo businesses work).

| # | Steps | Expected | Pass |
|---|---|---|---|
| 10.1 | Open `/marketplace` | Active listings from other approved businesses; your own business is not shown | [ ] |
| 10.2 | Search for a word in a listing title | Results narrow; sort reads "Most relevant first" | [ ] |
| 10.3 | Switch All / Offers / Needs, pick category chips | Results and chip counts update | [ ] |
| 10.4 | Use the Location and Value filters | Results narrow; max below min shows an error | [ ] |
| 10.5 | Copy the URL into another tab | Same search and filters | [ ] |
| 10.6 | Filter to nothing | Empty state with "Reset filters" | [ ] |
| 10.7 | With more than 20 results, press "Load more" | More results, no repeats | [ ] |
| 10.8 | Open a card | The business's public profile | [ ] |
| 10.9 | As an unverified user, open the marketplace | Verify-email prompt instead of results | [ ] |
| 10.10 | Look over every card | No percentages, scores, ratings or "best match" anywhere | [ ] |

## 11. Saved businesses

| # | Steps | Expected | Pass |
|---|---|---|---|
| 11.1 | Save a business from a marketplace card | Bookmark fills immediately | [ ] |
| 11.2 | Save one from its public profile while logged in | Button reads "Saved" | [ ] |
| 11.3 | Open `/saved` | Both listed, newest first | [ ] |
| 11.4 | Log in as another member of the same business, open `/saved` | Same list (shared by the team) | [ ] |
| 11.5 | Unsave from the Saved page, reload | Gone after reload | [ ] |
| 11.6 | Stop the API, press save | Bookmark flips back, error toast | [ ] |

## 12. Staff: create a match

| # | Steps | Expected | Pass |
|---|---|---|---|
| 12.1 | As staff, open Admin → Matches → New match | Business picker with approved businesses | [ ] |
| 12.2 | Pick Northline Studio | Suggested fits, best first; Harbor & Pine Books as Strong fit | [ ] |
| 12.3 | Choose pairs | Each pair shows its factors as words (Fits, Partial, Conflict, Needs confirmation) | [ ] |
| 12.4 | Add a note, keep the 14-day expiry, create | Match detail opens, status Proposed, both responses pending | [ ] |
| 12.5 | Try to create the same match again | Notice that a match already exists, with a link to it | [ ] |
| 12.6 | Filter the matches list by status and business | List filters correctly | [ ] |

## 13. Businesses respond to a match

Use the match from flow 12. Log in as each owner in a different window.

| # | Steps | Expected | Pass |
|---|---|---|---|
| 13.1 | As Northline's owner, look at the sidebar and dashboard | "Matches" shows a waiting count of 1 | [ ] |
| 13.2 | Open `/matches` | Match card in the Open tab: other business, fit band in words, top reasons, "Respond by" date | [ ] |
| 13.3 | Open the match | Note from BFB, each offer and need side by side, every factor in words, link to the other public profile; no numbers for fit | [ ] |
| 13.4 | As a member (not owner or administrator), open it | No Accept or Decline; a note says who can answer | [ ] |
| 13.5 | As Northline's owner, Accept | Your response shows accepted; status stays Proposed; waiting count drops | [ ] |
| 13.6 | As Harbor's owner, Accept | "You both accepted" panel; match moves to the Accepted tab for both | [ ] |
| 13.7 | Create a second match (withdraw the first or use other businesses), decline it with a reason and note | Dialog says the other business will not see why; your reason shows under your response | [ ] |
| 13.8 | As the other business, open the declined match | Shows declined, but no reason or note | [ ] |
| 13.9 | As staff, open the declined match | Decline reason and note visible, marked staff only | [ ] |
| 13.10 | On any match, answer "Was this match useful?" with reasons and a comment, then edit it | Saved and editable; only staff see it in the admin match detail | [ ] |
| 13.11 | As staff, withdraw an open match with a reason | Moves to Closed for both businesses; feedback is no longer offered | [ ] |
| 13.12 | Open a match in two windows, answer in one, then the other | The second shows that it was already answered and refreshes | [ ] |

## 14. Proposals

Use the match from flow 13 once both businesses accepted it. Log in as each owner in a different window.

| # | Steps | Expected | Pass |
|---|---|---|---|
| 14.1 | As Northline's owner, open the accepted match | "You both accepted" panel with "Start a proposal" | [ ] |
| 14.2 | As a member of Northline, open the same match | No start button; a line says owners and administrators can start one | [ ] |
| 14.3 | As Northline's owner, press "Start a proposal" | Toast "Proposal started…"; the proposal page opens | [ ] |
| 14.4 | Open `/proposals`, then each tab | Nothing under Waiting on you; the new proposal under Drafts as "Draft", "Not sent yet", "Waiting on you to send it" | [ ] |
| 14.5 | Go back to the match | The panel links to the open proposal instead of offering to start one | [ ] |
| 14.6 | As Harbor's owner, open `/proposals?tab=them` and the match | The proposal shows as "Being prepared" with no terms; the match links to it and has no start button | [ ] |
| 14.7 | In two windows as Northline's owner and administrator, press "Start a proposal" in both before reloading | The second says a proposal is already open and links to it | [ ] |

## 15. Across the app

| # | Check | Expected | Pass |
|---|---|---|---|
| 15.1 | Repeat flows 10, 11, 13 and 14 at phone width (about 390 px) | Usable, no sideways scrolling | [ ] |
| 15.2 | Use the main flows with the keyboard only | Every control reachable; dialogs trap focus and close with Escape | [ ] |
| 15.3 | Stop the API and visit each main page | Clear error with a retry, no blank screens | [ ] |
| 15.4 | Slow the network (browser throttling) | Loading states show, no layout jumps | [ ] |
| 15.5 | Search the whole app for fit numbers | None. Fit is always Strong, Potential or Limited in words | [ ] |

## Known gaps (not failures)

- Exchanges, messages, the landing page and the dashboard's "Recommended for you" still use demo data until their phases.
- Emails are printed, not sent, until an email provider is chosen ([DESIGN_SIGNOFFS.md](DESIGN_SIGNOFFS.md) row 37).
- The proposal page shows where a proposal stands but not yet its full terms; review, counteroffers and accepting arrive with the rest of Phase 4.
- Design and product items waiting on sign-off are in [DESIGN_SIGNOFFS.md](DESIGN_SIGNOFFS.md). A flow that passes here can still change there.
