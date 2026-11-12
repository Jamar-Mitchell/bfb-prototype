# BFB Frontend Work Packages

This file breaks the [development plan](DEVELOPMENT_PLAN.md#delivery-phases) into packages that one agent session can finish in one pull request. Phases 1 and 2 are broken down in detail. Later phases stay as outlines in the development plan and will be broken down when Phase 2 is close to done.

The API has a matching file: `bfb-api/docs/WORK_PACKAGES.md`. Frontend packages list the API packages they need.

## How to work a package

1. Pick the first `todo` package whose dependencies are all `done`, including API packages. Packages in the same slice with no dependency on each other can run in parallel.
2. Work in your own git worktree on a branch named `wp/<id>-<short-name>`, for example `wp/FE-1.1-register-login`.
3. Set the package to `in progress` in the status table as your first commit.
4. Build only what the package lists. If something outside it is needed, add a new package to this file instead of growing the current one.
5. If a package turns out larger than one pull request, split it into `FE-x.ya`, `FE-x.yb` and note it here.
6. Before pushing, run the gate yourself, because hooks do not run in a fresh worktree:
   `npm run build && npm run lint && npm run test`
7. In the same pull request, set the package to `done`.

Every package also meets the plan's [definition of done](DEVELOPMENT_PLAN.md#definition-of-done) for the frontend: loading, empty, success and error states; BFB terminology; accessible critical interactions; tests for the logic it adds.

**Keep the approved look.** The prototype is the visual reference. Packages change structure and data, not the design, unless the package says otherwise. Prototype screens that are not wired to the API yet (marketplace, exchanges, messages) keep working on demo data from `src/mocks/` until their phase.

## Slices

A slice is a working piece of the product you can demo end to end. It is done when every API and frontend package in it is done.

| Slice | You can demo | API packages | Frontend packages |
|---|---|---|---|
| S0 Foundation | Nothing new to users. Errors, tests and the frontend structure are ready to build on | API-0.1, API-0.2 | FE-0.1, FE-0.2, FE-0.3, FE-0.4 |
| S1 Sign up and log in | Create an account, log in, reload the page and stay logged in, log out | API-1.1, API-1.2 | FE-1.1, FE-1.2 |
| S2 Verify and recover | Verify an email address, reset a forgotten password | API-1.3, API-1.4 | FE-1.3 |
| S3 My business | Create a business, switch between businesses | API-1.5, API-1.6 | FE-1.4 |
| S4 Team and pilot access | Register with a pilot invite code, invite a teammate, change roles | API-1.7, API-1.8 | FE-1.5, FE-1.6 |
| S5 Business profile | Fill in the profile through onboarding, upload a logo, see the public profile | API-2.1, API-2.2, API-2.3 | FE-2.1, FE-2.2, FE-2.8 |
| S6 Offers and needs | Create, edit and pause offers and needs as drafts | API-2.4, API-2.5 | FE-2.3, FE-2.4 |
| S7 Portfolio | Upload work samples and reorder them | API-2.6 | FE-2.5 |
| S8 Verification and approval | Submit a business for review, approve it as an admin, publish offers and needs | API-2.7, API-2.8 | FE-2.6, FE-2.7 |

Recommended order is S0 through S8. The frontend S0 packages need no API work and can start now.

## Status

| ID | Package | Depends on | Status |
|---|---|---|---|
| FE-0.1 | Split App.tsx into routes and features | none | done |
| FE-0.2 | Split styles into tokens and feature styles | FE-0.1 | todo |
| FE-0.3 | API errors, forms and feedback components | FE-0.1 | done |
| FE-0.4 | Typed API contract from OpenAPI | none | done |
| FE-1.1 | Register and log in | FE-0.3, FE-0.4, API-1.2 | todo |
| FE-1.2 | Session restore, protected routes, log out | FE-1.1 | todo |
| FE-1.3 | Verify email and reset password | FE-1.2, API-1.4 | todo |
| FE-1.4 | Create and switch businesses | FE-1.2, API-1.5 | todo |
| FE-1.5 | Team members page | FE-1.4, API-1.7 | todo |
| FE-1.6 | Invite code at registration | FE-1.1, API-1.8 | todo |
| FE-2.1 | Onboarding saved to the API | FE-1.4, API-2.2 | todo |
| FE-2.2 | Profile editor with logo and cover upload | FE-2.1, API-2.3 | todo |
| FE-2.3 | Offers management | FE-1.4, API-2.4 | todo |
| FE-2.4 | Needs management | FE-2.3, API-2.5 | todo |
| FE-2.5 | Portfolio upload and reorder | FE-2.2, API-2.6 | todo |
| FE-2.6 | Submit for review and status banner | FE-2.2, API-2.7 | todo |
| FE-2.7 | Admin review queue | FE-1.2, API-2.8 | todo |
| FE-2.8 | Public business profile from the API | FE-1.2, API-2.2 | todo |

## Phase 0: Foundation

### FE-0.1 Split App.tsx into routes and features

Scope:
- Move each page out of `src/App.tsx` into `src/features/<area>/` following the structure in the development plan, and shared pieces (`Logo`, `Avatar`, `AppShell`) into `src/components/`.
- Replace the view switch with a route table in `src/app/router/`, keeping the hash router and today's URLs.
- Move demo businesses and other sample data into `src/mocks/`.

Done when:
- Every current URL renders the same screen as before. Compare screenshots of each page before and after.
- `src/App.tsx` is only the router entry.
- A test renders each route without crashing.

### FE-0.2 Split styles into tokens and feature styles

Scope:
- Move colors, type, spacing and radius from `index.css` and `App.css` into one tokens file in `src/styles/`.
- Move page-specific rules next to their features. Keep class names unless they collide.

Done when:
- Screens look the same as before, checked by screenshot at desktop and phone width.
- No feature stylesheet uses a literal color that has a token.

### FE-0.3 API errors, forms and feedback components

Scope:
- Turn API errors (the shared shape from API-0.1) into a typed error with the code and a user-facing message, plus a code-to-message map.
- Add React Hook Form with Zod and shared form fields: text input, select, textarea, with label, hint and error text.
- Shared loading, empty and error-state components, and a toast for success messages.

Done when:
- Tests cover error mapping for an API error, a network failure and an unknown error.
- A sample form in a test shows field errors from Zod and from the API.

### FE-0.4 Typed API contract from OpenAPI

Scope:
- An `npm run api:types` script that generates TypeScript types from the API's `/openapi.json` into `src/lib/api/schema.ts`.
- Typed request helpers built on the existing Axios client.
- Document in the README how to regenerate types when the API changes.

Done when:
- Types generate from the running local API and the build passes with them.
- The health endpoint is called through a typed helper in a test.

## Phase 1: Authentication, accounts, and application shell

### FE-1.1 Register and log in

Scope:
- Registration page (name, email, password, terms acceptance) and login page, styled from the prototype.
- Store the session through the existing `useSessionStore`.
- Replace the 401 handler in `src/lib/api/client.ts` with refresh-then-retry. Only one refresh runs at a time; if it fails, clear the session and go to login.
- The landing page's "Sign in" and "Get started" go to these pages.

Done when:
- Tests cover a successful login, wrong credentials, a duplicate email at registration, and two requests failing with 401 at the same time triggering one refresh.

### FE-1.2 Session restore, protected routes, log out

Scope:
- On app load, try to restore the session through the refresh endpoint before rendering protected routes. Show a loading state meanwhile.
- A route guard that sends logged-out users to login and returns them to the page they asked for.
- Log out from the app shell.

Done when:
- Reloading a protected page keeps the user logged in.
- A logged-out visit to `/dashboard` goes to login, then back to `/dashboard` after login.

### FE-1.3 Verify email and reset password

Scope:
- A page that handles the verification link, and a banner for unverified users with a resend button.
- Forgot-password and reset-password pages.

Done when:
- Tests cover a valid link, an expired link, resend, and a completed reset sending the user to login.

### FE-1.4 Create and switch businesses

Scope:
- After first login with no business, show a create-business step.
- A business switcher in the app shell. The active business is stored and sent with business-scoped requests.

Done when:
- A user with two businesses can switch, and pages reload data for the chosen business.
- A user with no business cannot reach business pages.

### FE-1.5 Team members page

Scope:
- A team page listing members and roles, with invite by email, change role and remove.
- An accept-invitation page for the email link.
- Controls hidden or disabled for roles that cannot use them. The API still enforces the rules.

Done when:
- Tests cover inviting, a role change, and the last-owner error shown clearly.

### FE-1.6 Invite code at registration

Scope:
- An invite-code field on registration, prefilled from a link like `#/register?code=...` when present.

Done when:
- Tests cover a valid code and an invalid code error.

## Phase 2: Onboarding, profiles, offers, and needs

### FE-2.1 Onboarding saved to the API

Scope:
- Rebuild the prototype onboarding steps to save each step to the business profile, replacing the `bfb-onboarding` local-storage data.
- Categories come from the API.
- The dashboard reads the profile from the API instead of local storage.

Done when:
- Leaving onboarding midway and coming back resumes at the right step with saved answers.

### FE-2.2 Profile editor with logo and cover upload

Scope:
- Wire the profile management page to the API.
- Logo and cover upload with type and size checks before upload, progress, and error states.
- A completeness meter that lists missing items from the API.

Done when:
- Tests cover saving the profile, a rejected file, and the completeness list updating after a save.

### FE-2.3 Offers management

Scope:
- Wire the offers side of the listings page to the API: create, edit, pause, archive.
- Show status on each offer. Publishing arrives in FE-2.6.

Done when:
- Tests cover creating an offer, a validation error, and pausing.

### FE-2.4 Needs management

Scope:
- The same as FE-2.3 for needs, reusing its components.

Done when:
- Tests cover creating a need, a validation error, and pausing.

### FE-2.5 Portfolio upload and reorder

Scope:
- Add, remove and reorder portfolio items. Collect the changes and send them in one batch request rather than one call per change.

Done when:
- Tests prove a reorder sends a single batch request, and a failed batch restores the previous order.

### FE-2.6 Submit for review and status banner

Scope:
- A submit-for-review action, shown when the profile is complete.
- A status banner for in review, changes requested (with the admin's notes) and approved.
- Publish buttons on offers and needs, enabled once the business is approved.

Done when:
- Tests cover each status and the publish button being enabled only when approved.

### FE-2.7 Admin review queue

Scope:
- An admin area visible only to support and administrator users.
- The review queue, a business detail view, and approve or request-changes actions with notes.

Done when:
- Non-admin users cannot reach the admin routes.
- Tests cover approving and requesting changes.

### FE-2.8 Public business profile from the API

Scope:
- Wire the business profile page to the public endpoint for approved businesses, with a not-found state for others.
- The marketplace stays on demo data until Phase 3.

Done when:
- An approved business's profile shows real data, and an unapproved one shows the not-found state.
