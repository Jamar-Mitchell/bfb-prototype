# BFB — Business for Business

A polished, responsive UI/UX prototype for a business-to-business service exchange marketplace. BFB is positioned for startups, local companies, independent studios, and growing teams that want to preserve cash while accessing the expertise they need.

## Prototype journey

- Public landing page with growth-focused positioning
- Demo dashboard with recommendations and active exchanges
- Searchable, filterable business marketplace
- Detailed business profiles with offers and needs
- Two-step exchange proposal flow with review and confirmation
- Save-business and proposal state persisted in local storage
- Responsive desktop, tablet, and mobile layouts

All businesses, exchanges, values, reviews, and interactions are fictional demo content. The prototype does not implement authentication, payments, escrow, business verification, or binding agreements.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints in the terminal.

## Live prototype

The `main` branch automatically deploys to GitHub Pages:

<https://blacktagdevs.github.io/bfb-frontend/>

Interactive brand exploration:

<https://blacktagdevs.github.io/bfb-frontend/artifacts/bfb-logo-ideas.html>

Deployment is managed by `.github/workflows/deploy-pages.yml`.

## Production build

```bash
npm run build
```

## Stack

- React
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Zod
- Lucide icons
- Custom responsive CSS
- Vitest and Testing Library

## Application foundation

- URL-backed routes using a GitHub Pages-compatible hash router
- Environment-validated API configuration
- Shared Axios client prepared for the BFB API
- In-memory session and active-business store
- Application-level error boundary
- Continuous integration for typing, linting, tests, and production builds

Copy `.env.example` to `.env` when connecting a local API.

## API types

`src/lib/api/schema.ts` holds TypeScript types generated from the API's OpenAPI document with [openapi-typescript](https://openapi-ts.dev/). It is committed, so builds and tests never need a running API. Do not edit it by hand.

Regenerate it whenever the API's routes or schemas change:

1. Start the API (in the `bfb-api` repo): `poetry run uvicorn src.main:app --port 8000`. The OpenAPI document does not need a database.
2. In this repo, run:

   ```bash
   npm run api:types
   ```

3. Fix any type errors the new schema surfaces (`npm run build`), then commit `schema.ts` with the code that uses it.

The default source is `http://127.0.0.1:8000/openapi.json`. FastAPI serves it at the app root, not under `/api/v1`. To use another API, pass the URL or set `BFB_OPENAPI_URL`:

```bash
npm run api:types -- https://api.example.com/openapi.json
BFB_OPENAPI_URL=https://api.example.com/openapi.json npm run api:types
```

Call the API through the typed helpers in `src/lib/api/requests.ts` (`apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`). Routes are written without the `/api/v1` prefix, because the client's base URL already includes it. Paths, path and query parameters, request bodies and responses are all checked against the schema:

```ts
const health = await apiGet('/health')
// Once the API has the route:
const business = await apiGet('/businesses/{business_id}', { path: { business_id: id } })
```

## Authentication

The flow follows the API's `docs/AUTHENTICATION.md`. Login stores the access and refresh tokens in `localStorage` (`src/lib/auth/tokens.ts`) and the user in `useSessionStore`. Registration returns no tokens, so the user logs in afterwards.

When a request fails with `401`, the client (`src/lib/api/client.ts`) refreshes once and retries the request. One refresh runs at a time per tab, and a Web Lock keeps tabs from refreshing together. If the refresh token is rejected, the session is cleared and the user goes to login. A network error or `5xx` during refresh keeps the user logged in.

On load, `restoreSession()` (`src/lib/auth/session.ts`) turns a stored refresh token into a live session while protected routes show a loading state. `RequireAuth` (`src/app/router/RequireAuth.tsx`) guards the app-shell routes and sends logged-out users to login, then back to the page they asked for. Logging out (sidebar account row) clears the tokens and ends the session on the API. Tabs follow each other's logouts and refreshes through `storage` events.

Email verification and password reset follow the same document. The emailed links open `#/verify-email?token=…` and `#/reset-password?token=…` (`src/features/auth/`), which work logged in or not. A verification link is sent to the API once per page load, even under StrictMode, because it works only once. While the logged-in user's `emailVerified` is `false`, the app shell shows a banner with a "Resend email" button; the same button appears on the create-business step when the API answers `email_not_verified`. Resend buttons share a 30-second wait after each send. A completed reset clears the stored tokens (the API has ended every session) and opens login with a notice. "Forgot password?" on the login page opens `#/forgot-password`.

Registration has an optional "Invite code" field for the pilot, prefilled from an invite link like `#/register?code=K7QM-3XRP`. The API checks it only while invites are required (`BFB_REGISTRATION_REQUIRES_INVITE`) and ignores it otherwise, so the field is always shown. The four invite errors appear on the field.

## Businesses

A user acts for one business at a time. The API keeps no current business (`bfb-api` `docs/BUSINESSES.md`): business-scoped routes take the business ID in the path, and the frontend remembers which business is active.

- `RequireBusiness` (`src/app/router/RequireBusiness.tsx`) sits under `RequireAuth` and guards the app-shell pages. It loads the user's memberships from `GET /account` and sends a user without a business to the create-business step (`/create-business`).
- The active business is in `useSessionStore` (`activeBusiness`, `memberships`). Its ID is kept in `localStorage` (`bfb.activeBusinessId`) so a reload opens the same business; if the user no longer belongs to it, their first business is used. Other tabs do not follow a switch.
- Switch from the business switcher in the sidebar account row. The shell remounts the page on a switch, so pages reload their data for the new business.
- For business-scoped requests, use `useActiveBusinessId()` (or `useBusinessPath()`) from `src/lib/businesses/useActiveBusiness.ts`, for example `apiGet('/businesses/{business_id}/...', { path: { business_id } })`, or `businessPath(id, '/offers')` for a plain path.

## Product planning

- [Development plan](./docs/DEVELOPMENT_PLAN.md)
- [Business strategy](./docs/BUSINESS_STRATEGY.md)
- [Monetization plan](./docs/MONETIZATION_PLAN.md)
- [System design](./docs/SYSTEM_DESIGN.md)
- [Legal and compliance framework](./docs/LEGAL.md)
- [Market research](./docs/MARKET_RESEARCH.md)
