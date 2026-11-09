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

<https://jamar-mitchell.github.io/bfb-prototype/>

Deployment is managed by `.github/workflows/deploy-pages.yml`.

## Production build

```bash
npm run build
```

## Stack

- React
- TypeScript
- Vite
- Lucide icons
- Custom responsive CSS

## Product planning

- [Legal and compliance framework](./LEGAL.md)
- [Market research](./MARKET_RESEARCH.md)
