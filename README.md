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

## Product planning

- [Development plan](./docs/DEVELOPMENT_PLAN.md)
- [Business strategy](./docs/BUSINESS_STRATEGY.md)
- [Monetization plan](./docs/MONETIZATION_PLAN.md)
- [System design](./docs/SYSTEM_DESIGN.md)
- [Legal and compliance framework](./docs/LEGAL.md)
- [Market research](./docs/MARKET_RESEARCH.md)
