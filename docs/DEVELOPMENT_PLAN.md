# BFB Development Plan

## Purpose

This document defines how BFB will move from a polished prototype into a production MVP.

BFB will be developed as its own product for startups and growing businesses. It will reuse proven architecture, implementation patterns, and selected horizontal modules from RendezView, while keeping BFB's domain model, terminology, user experience, business rules, and brand independent.

The MVP must prove one complete outcome:

> Two businesses can discover a useful fit, negotiate a fair service exchange, sign an agreement, complete the work, and close the exchange with a trustworthy record.

## Product direction

BFB is a business growth network, not simply a barter marketplace.

The initial product will focus on professional and creative service businesses that can exchange clearly scoped work, including:

- Branding and design
- Marketing and content
- Web and software development
- Photography and video
- Business strategy and operations
- Bookkeeping and financial support
- Legal and compliance support, subject to professional-service restrictions

The MVP will support direct bilateral exchanges and optional cash adjustments. It will not launch with an internal currency, wallet, trade-credit system, or BFB-operated escrow.

## Development principles

### 1. Reuse foundations, not product identity

RendezView is the reference implementation for security, infrastructure, state management, notifications, messaging, administration, storage, testing, and deployment.

BFB will not be a renamed RendezView fork. Event, host, vendor, venue, aesthetic, invitation, and RSVP concepts will not be carried into the BFB domain.

### 2. Preserve BFB terminology throughout the system

Database models, APIs, events, UI copy, analytics, and documentation must use BFB concepts:

- Business
- Offer
- Need
- Match
- Proposal
- Agreement
- Exchange
- Milestone
- Delivery
- Completion

Avoid retaining misleading RendezView names such as `VendorRequest` or `Booking` behind BFB labels.

### 3. Build a complete vertical slice before broadening

The first production milestone is not a large feature catalogue. It is one reliable path from account creation through completed exchange.

### 4. Keep the pilot high-touch

Initial matching and verification will be concierge-assisted. Automation should support the operator rather than replace early learning.

### 5. Treat trust as a core product feature

Ownership checks, verification status, proposal history, signatures, state transitions, delivery acceptance, audit records, and dispute information must be explicit and traceable.

### 6. Do not block the MVP on shared-platform extraction

Code may be adapted from RendezView into BFB with attribution and licensing reviewed internally. A generalized Black Tag marketplace platform or shared package can be considered after both products reveal stable common boundaries.

## Target architecture

### Frontend

The current React prototype remains the visual and interaction reference. It will be refactored into a production application rather than discarded.

Recommended stack:

- React 19
- TypeScript
- Vite
- React Router
- Zustand for client and session state
- Axios or the existing RendezView API-client pattern
- Tailwind or modular BFB styles using shared design tokens
- React Hook Form and schema validation
- Vitest and Testing Library
- Playwright for critical user journeys
- PostHog or equivalent product analytics

The current `src/App.tsx` and `src/App.css` must be separated before production API integration.

Suggested frontend structure:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── guards/
├── components/
│   ├── ui/
│   ├── layout/
│   └── feedback/
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── businesses/
│   ├── listings/
│   ├── matching/
│   ├── proposals/
│   ├── agreements/
│   ├── exchanges/
│   ├── messages/
│   ├── notifications/
│   └── admin/
├── lib/
│   ├── api/
│   ├── analytics/
│   ├── uploads/
│   └── validation/
├── stores/
├── styles/
└── types/
```

### Backend

BFB will use a slim FastAPI backend modeled on RendezView's production architecture.

Recommended stack:

- FastAPI with synchronous routes
- PostgreSQL
- SQLAlchemy
- Alembic migrations
- Pydantic request and response schemas
- JWT access tokens
- Rotating opaque refresh tokens
- Managed object storage with local-development fallback
- Transactional email provider
- Server-Sent Events for initial realtime updates
- Stripe Connect only when cash adjustments enter the pilot
- E-signature provider for binding exchange agreements
- Pytest for unit, service, route, authorization, and workflow tests

Suggested backend structure:

```text
src/
├── api/
│   ├── dependencies/
│   └── routes/
├── core/
│   ├── config.py
│   ├── security.py
│   ├── storage.py
│   └── events.py
├── models/
├── schemas/
├── services/
├── notifications/
├── integrations/
│   ├── email/
│   ├── signatures/
│   └── stripe/
├── workers/
└── tests/
```

Routes will handle transport and authorization. Services will own business logic and transactions.

### Repository strategy

- Continue using this repository as the BFB frontend and product-documentation home.
- Refactor the prototype incrementally instead of rewriting its visual experience.
- Create a separate `bfb-api` repository for the FastAPI application.
- Keep BFB and RendezView deployable independently.
- Do not create runtime dependencies between the two products.
- Record every adapted RendezView module in a reuse matrix before implementation.

## Reuse classification

Every reused capability will be classified before coding:

| Classification | Meaning |
|---|---|
| Adopt | Reuse with minimal changes because the capability is domain-neutral |
| Adapt | Reuse the pattern and meaningful implementation while replacing domain assumptions |
| Reference | Study the implementation, then write a BFB-specific version |
| Exclude | Do not bring the capability into the MVP |

## RendezView reuse matrix

| Capability | RendezView source area | Strategy | BFB treatment |
|---|---|---|---|
| Access and refresh tokens | API security and auth routes | Adopt | Preserve rotation, revocation, expiry, and theft-detection behavior |
| Frontend session state | Frontend auth store and API client | Adapt | Use BFB routes, roles, profile selection, and analytics identity |
| Users and ownership | User, profile, role, and ownership dependencies | Adapt | A user may own or join one or more businesses |
| Route authorization | Role and ownership guards | Adopt | Require business membership and action-specific permissions |
| Onboarding | Vendor and venue onboarding flows | Reference | Create BFB questions for business identity, offers, needs, goals, and capacity |
| Profiles | Vendor profiles | Adapt | Build business profiles with trust, work samples, offers, and needs |
| Portfolio uploads | Portfolio and storage services | Adopt | Use for logos, cover images, work samples, and delivery attachments |
| Listings | Services, pricing, and categories | Adapt | Separate offers from needs and support estimated exchange values |
| Matching | Weighted matching service | Reference | Score reciprocal fit, value compatibility, timing, location, and trust |
| Conversations | Conversation models, routes, and inbox store | Adapt | Attach threads to matches, proposals, or exchanges |
| Attachments | Message and upload handling | Adopt | Apply BFB MIME, size, retention, and authorization rules |
| Notifications | Dispatcher, outbox, delivery ledger, and SSE | Adopt | Define BFB event types, templates, preferences, and deep links |
| Proposal negotiation | Request, quote, and counteroffer patterns | Adapt | Use immutable proposal versions and explicit acceptance |
| Workflow transitions | Booking state machine and state log | Adapt | Implement a BFB exchange lifecycle and append-only history |
| Verification | Admin review and profile status workflow | Adapt | Verify business identity and selected trust signals |
| Administration | Admin routes, tables, and impersonation | Adapt | Support pilot operations, matching, moderation, and support |
| Audit records | Audit service and attribution | Adopt | Record consequential user, admin, agreement, and exchange actions |
| Reviews | Completed-booking review patterns | Adapt | Allow reviews only after a completed exchange |
| Stripe Connect | Accounts, payments, webhooks, and idempotency | Reference later | Introduce only for optional cash adjustments |
| Event planning | Events, venues, aesthetics, invitations, and RSVPs | Exclude | Not part of BFB |
| Internal credits | Event or host credit systems | Exclude | No BFB trade currency in the MVP |
| Complex scheduling | Event availability and calendar systems | Exclude initially | Use simple date ranges and milestone due dates |

Before adapting a module, implementation work must verify the current source code and tests. Existing documentation may be stale and is not the final source of truth.

## BFB domain model

### Identity and access

#### User

Represents an authenticated person.

Core fields:

- Identity and contact information
- Authentication status
- Email verification status
- Platform roles
- Account status
- Terms and privacy-policy acceptance

#### Business

Represents the organization participating in BFB.

Core fields:

- Legal and display names
- Description
- Website and social links
- Location and service area
- Industry and business stage
- Team size
- Verification status
- Profile status
- Logo and cover image

#### BusinessMember

Connects users to businesses.

Initial roles:

- Owner
- Administrator
- Member

Permissions must be checked on the server for every business-scoped action.

### Marketplace

#### ServiceOffer

Defines work a business can provide.

Core fields:

- Category and title
- Description and deliverables
- Estimated cash value or value range
- Capacity and availability
- Delivery format
- Location restrictions
- Status

#### BusinessNeed

Defines work a business is seeking.

Core fields:

- Category and title
- Problem or desired outcome
- Expected deliverables
- Estimated value or budget range
- Desired timeline
- Remote or local preference
- Urgency
- Status

#### MatchSuggestion

Stores an explainable potential fit.

Core fields:

- Participating businesses
- Matched offers and needs
- Fit factors
- Missing or conflicting factors
- Source: system, concierge, or direct discovery
- Status
- Expiration

The UI will use language such as "Strong fit" and "Needs align." It will not present unsupported precision as a percentage.

### Negotiation

#### ExchangeProposal

Represents the proposal container and current negotiation status.

#### ExchangeProposalVersion

Stores each immutable offer or counteroffer.

Each version defines:

- Services provided by each party
- Deliverables
- Estimated fair-market values
- Optional cash adjustment
- Milestones
- Target dates
- Revision limits
- Acceptance criteria
- Cancellation terms
- Intellectual-property terms
- Confidentiality terms
- Expiration

Acceptance must identify the exact proposal version accepted by both businesses.

### Agreement and exchange

#### ExchangeAgreement

Represents the binding agreement generated from an accepted proposal.

It stores:

- Source proposal version
- Generated document version
- Signature-provider identifiers
- Signer identities
- Signature status and timestamps
- Final signed-document location
- Agreement amendments

#### Exchange

Represents the active and completed service exchange.

Initial lifecycle:

```text
draft
→ proposed
→ negotiating
→ accepted
→ awaiting_signatures
→ active
→ awaiting_completion
→ completed
```

Terminal or exceptional states:

```text
declined
expired
cancelled
disputed
```

Every transition must:

- Be authorized
- Validate the current state
- Be idempotent where appropriate
- Create an append-only state record
- Produce an audit record
- Dispatch relevant user notifications

#### ExchangeMilestone

Defines a deliverable owed by one business to the other.

#### DeliverySubmission

Captures submitted work, links, notes, attachments, and submission time.

#### AcceptanceDecision

Captures acceptance or requested changes against a delivery.

#### ExchangeReview

Allows each business to review the other after completion.

#### TaxRecord

Stores the values and parties needed for year-end reporting. Final reporting requirements must be approved by qualified legal and tax professionals before launch.

## API design principles

- Use versioned routes under `/api/v1`.
- Scope business-owned resources by business identity.
- Never trust a frontend-provided owner or role.
- Return stable machine-readable error codes.
- Use idempotency keys for consequential retries.
- Paginate marketplace, conversation, notification, and admin collections.
- Use explicit commands for state transitions rather than broad update endpoints.
- Keep accepted proposal versions and signed agreements immutable.
- Use batch endpoints for related reorder or multi-action operations.
- Generate OpenAPI documentation and typed frontend clients where practical.

Representative resource groups:

```text
/auth
/account
/businesses
/business-members
/offers
/needs
/matches
/proposals
/agreements
/exchanges
/milestones
/deliveries
/conversations
/notifications
/uploads
/reviews
/admin
```

## Security and trust requirements

The MVP will inherit RendezView's security posture where applicable:

- Short-lived access tokens
- Rotating refresh tokens
- Refresh-token revocation and reuse detection
- Secure password hashing
- Login rate limiting and lockout controls
- Verified-email gates
- Role and business-ownership authorization
- MIME and file-size validation
- Signed or protected object access
- Server-side state-transition validation
- Audit logs for consequential actions
- Admin impersonation attribution
- Webhook signature verification
- Secret management outside source control
- Environment-specific CORS and cookie policies

Additional BFB requirements:

- Both businesses must accept the same proposal version.
- Both authorized signers must sign before activation.
- Estimated values must be captured before agreement generation.
- Sensitive legal and tax data must have restricted access.
- Regulated professional-service categories may require additional verification or exclusion.

## Notification event catalogue

Initial user-facing events:

```text
business.verification_submitted
business.verification_approved
business.verification_changes_requested
match.suggested
match.accepted
match.declined
proposal.received
proposal.countered
proposal.accepted
proposal.expiring
agreement.ready
agreement.signed_by_party
agreement.completed
exchange.activated
milestone.upcoming
milestone.overdue
delivery.submitted
delivery.changes_requested
delivery.accepted
exchange.completion_requested
exchange.completed
exchange.disputed
message.received
review.available
```

Events will pass through a notification dispatcher and outbox rather than sending email directly from route handlers.

## MVP scope

### Included

- Invite-only account registration
- Email verification and password recovery
- Business creation and team ownership
- Guided business onboarding
- Business profile and portfolio
- Service offers and business needs
- Search and basic filters
- Concierge-created and rule-based match suggestions
- Explainable match reasons
- Proposal creation and counteroffers
- Immutable proposal history
- Agreement generation
- E-signatures
- Exchange workspace
- Milestones and delivery submissions
- Business-to-business messaging
- In-app and email notifications
- Completion confirmation
- Reviews
- Admin verification and pilot operations
- Audit trail
- Basic product analytics

### Deferred

- Public self-service registration
- Native mobile applications
- AI-generated match claims
- Internal trade credits
- BFB wallet
- BFB-operated escrow
- Automated tax filing
- Subscription billing
- Multi-party exchanges
- Complex calendar availability
- Advanced disputes and arbitration tooling
- Broad international support
- Automated payouts
- Public API

## Delivery phases

The phases are ordered by dependency, but design, legal review, and infrastructure work may progress in parallel when safe.

### Phase 0: Production baseline and reuse inventory

**Goal:** Establish clean BFB repositories and decide exactly what will be adapted.

Work:

- Confirm all approved prototype changes are committed and deployed.
- Preserve the current prototype as the UX baseline.
- Create the `bfb-api` repository and environments.
- Add frontend route, feature, and state architecture.
- Create the detailed source-file reuse matrix.
- Document which RendezView implementations are adopted, adapted, referenced, or excluded.
- Define environment variables and secret ownership.
- Establish coding, review, migration, and test conventions.
- Create initial CI workflows.

Exit criteria:

- Frontend and API build in CI.
- Local setup is documented.
- No production feature depends on a RendezView runtime.
- The reuse matrix has an owner and source reference for every adopted module.

### Phase 1: Authentication, accounts, and application shell

**Goal:** Replace prototype navigation assumptions with real authenticated sessions.

Backend:

- Users
- Access and refresh tokens
- Email verification
- Password reset
- Session revocation
- Account endpoint
- Business and business-member models
- Role and ownership dependencies
- Initial audit framework

Frontend:

- API client
- Auth store
- Login, registration, verification, and recovery
- Protected routes
- Session restoration
- Business selector
- Production application shell
- Error and loading states

Exit criteria:

- An invited user can create and verify an account.
- The user can create or join a business.
- Unauthorized business access is rejected by API tests.
- Refresh rotation and logout behavior are tested.

### Phase 2: Onboarding, profiles, offers, and needs

**Goal:** Create trustworthy, searchable business supply and demand.

Backend:

- Business profile lifecycle
- Offers
- Needs
- Categories
- Portfolio items
- Upload service
- Verification submission
- Admin review

Frontend:

- Production onboarding flow
- Business profile editor
- Offer and need management
- Portfolio upload and ordering
- Profile completeness
- Verification status
- Public business profile

Exit criteria:

- A business can complete onboarding and submit for review.
- An administrator can approve or request changes.
- An approved profile can publish active offers and needs.
- Upload access and ownership are tested.

### Phase 3: Marketplace and matching

**Goal:** Help businesses find relevant opportunities without overstating match quality.

Backend:

- Marketplace search and filtering
- Match-suggestion model
- Match-factor calculation
- Concierge match creation
- Match acceptance and decline
- Match feedback

Initial match factors:

- Offer-to-need category compatibility
- Reciprocal need compatibility
- Estimated-value overlap
- Timeline compatibility
- Remote or location compatibility
- Business capacity
- Verification and trust signals

Frontend:

- Marketplace
- Search and filters
- Explainable match cards
- Saved businesses
- Match detail
- Accept, decline, and feedback actions
- Admin match workspace

Exit criteria:

- An operator can create a match between two qualified businesses.
- Both businesses can understand why the match was suggested.
- Match decisions and feedback are stored.
- No UI displays fabricated precision.

### Phase 4: Proposals and negotiation

**Goal:** Let two businesses turn a match into a precise, versioned agreement proposal.

Backend:

- Proposal container
- Immutable proposal versions
- Drafting and submission
- Counteroffers
- Expiration
- Acceptance by both parties
- Authorization and transition tests
- Proposal audit events

Frontend:

- Proposal builder
- Service and value comparison
- Milestone editor
- Optional cash adjustment
- Terms and acceptance criteria
- Review screen
- Proposal timeline
- Counteroffer experience

Exit criteria:

- Each counteroffer creates a new immutable version.
- Both businesses accept the exact same version.
- Expired or superseded versions cannot be accepted.
- The accepted version contains everything needed to generate an agreement.

### Phase 5: Agreements and signatures

**Goal:** Convert an accepted proposal into a binding, traceable agreement.

Work:

- Select an e-signature provider.
- Finalize agreement templates with legal counsel.
- Generate agreements from accepted proposal versions.
- Create signature requests.
- Process signed-document webhooks idempotently.
- Store signed documents securely.
- Activate exchanges only after all required signatures.
- Record legal-document and policy versions.

Exit criteria:

- Agreement contents match the accepted proposal.
- Both authorized representatives sign.
- Webhook retries do not duplicate state transitions.
- The final document and signature evidence are retrievable by authorized parties.

### Phase 6: Exchange workspace, delivery, and completion

**Goal:** Support the work after signing.

Backend:

- Exchange state machine
- Append-only state log
- Milestones
- Delivery submissions
- Change requests
- Acceptance decisions
- Completion requests
- Cancellation and basic dispute intake

Frontend:

- Exchange overview
- Party responsibilities
- Milestone timeline
- Delivery submission
- Attachment handling
- Acceptance or change request
- Completion confirmation
- Status history

Exit criteria:

- Both businesses can see the same obligations and history.
- Deliverables can be submitted and accepted.
- Completion requires the configured party confirmations.
- Every consequential action creates an audit record and notification.

### Phase 7: Messaging, notifications, and reviews

**Goal:** Centralize communication and improve repeat trust.

Work:

- Match-, proposal-, and exchange-linked conversations
- Attachments
- System messages for important transitions
- Notification center
- Email preferences
- Realtime updates
- Delivery ledger
- Post-completion reviews

Exit criteria:

- Users receive reliable in-app and email updates.
- Message access is limited to authorized business members.
- Delivery attempts and failures are observable.
- Reviews are only available after qualifying completed exchanges.

Messaging may begin earlier where needed, but this phase completes and hardens the full experience.

### Phase 8: Admin operations and concierge pilot

**Goal:** Give the BFB team the tools to operate a safe, high-touch launch.

Admin capabilities:

- User and business search
- Profile verification
- Offer and need moderation
- Match creation and recommendation
- Proposal and exchange visibility
- Agreement and signature status
- Dispute intake
- Notification delivery inspection
- Account suspension
- Audited impersonation
- Pilot analytics

Pilot:

- Recruit 25–50 qualified businesses.
- Focus on one geographic or founder community.
- Target 8–12 completed exchanges over 6–8 weeks.
- Conduct structured interviews after matching, proposal, and completion.

Exit criteria:

- Operators can resolve common pilot issues without database access.
- Every admin action is attributed and audited.
- Pilot metrics and feedback can be exported.

### Phase 9: Cash adjustments and operational hardening

**Goal:** Add payments only after the non-cash exchange workflow is validated.

Potential work:

- Stripe Connect onboarding
- Cash-adjustment PaymentIntents
- Transfer timing
- Refund and cancellation rules
- Webhook idempotency
- Payment reconciliation
- Dispute and chargeback visibility
- Finance and tax exports

This phase requires legal, tax, and operational approval before production release.

## Testing strategy

### Backend

- Unit tests for scoring, value overlap, and state-transition rules
- Service tests for transactions and idempotency
- Route tests for roles, business ownership, and invalid states
- Migration tests
- Notification outbox and delivery tests
- Signature and payment webhook tests
- Security tests for cross-business access

### Frontend

- Component tests for forms and state-driven actions
- Store tests for auth, proposals, exchanges, messaging, and notifications
- API error and session-expiry tests
- Accessibility checks for critical forms and dialogs
- Playwright coverage for the primary vertical slice

### Required MVP end-to-end journey

```text
Invitation
→ account verification
→ business onboarding
→ offer and need publication
→ match suggestion
→ proposal
→ counteroffer
→ mutual acceptance
→ agreement signatures
→ active exchange
→ milestone delivery
→ acceptance
→ completion
→ review
```

The MVP is not release-ready until this journey succeeds against production-like services without manual database changes.

## Observability and analytics

### Operational monitoring

- Structured API logs
- Request and correlation identifiers
- Error tracking
- Background-delivery failures
- Signature webhook failures
- Notification backlog
- Slow queries
- State-transition failures
- Admin audit search

### Product funnel

Track:

- Invitation acceptance
- Onboarding completion
- Verification approval
- First offer published
- First need published
- Match viewed
- Match accepted
- Proposal started
- Proposal submitted
- Proposal accepted
- Agreement signed
- Exchange activated
- Delivery accepted
- Exchange completed
- Repeat exchange initiated

## Pilot success metrics

The pilot should prioritize completed value over registrations.

Primary metrics:

- Qualified business activation rate
- Time to first relevant match
- Match-to-conversation rate
- Conversation-to-proposal rate
- Proposal acceptance rate
- Agreement completion rate
- Exchange completion rate
- Median time to completion
- Total estimated exchange value
- Dispute and cancellation rate
- Repeat participation intent

Qualitative questions:

- Did the match solve a real business need?
- Did both sides understand the exchange value?
- Was proposal negotiation clear?
- Did the agreement increase confidence?
- What required operator intervention?
- Would each business use BFB again?
- Would either business pay for access or successful introductions?

## Legal and policy gates

The following items require qualified legal or tax review before public launch:

- BFB Terms of Service
- Privacy Policy
- Electronic-signature disclosures
- Exchange-agreement templates
- Intellectual-property clauses
- Confidentiality clauses
- Cancellation and dispute terms
- Professional-service restrictions
- Insurance requirements
- Fair-market-value guidance
- Barter-exchange classification
- Form 1099-B or other reporting obligations
- Data retention and deletion
- Cash-adjustment handling

The implementation must store the policy and agreement versions accepted by each user.

## Definition of done

A feature is complete only when:

- Its BFB behavior and terminology are documented.
- API authorization covers role and business ownership.
- Service logic is not embedded in route handlers.
- State changes are validated server-side.
- Consequential actions create audit records.
- User-facing events use the notification dispatcher.
- Loading, empty, success, and error states exist.
- Relevant tests pass.
- Analytics events are defined where useful.
- Accessibility is reviewed for critical interactions.
- Documentation and API contracts are current.
- No event-specific RendezView assumptions remain.

## Immediate implementation sequence

The first development batch should be:

1. Confirm the prototype repository contains every approved visual change.
2. Refactor the frontend shell, routes, and shared UI without changing the approved BFB experience.
3. Create `bfb-api` with configuration, PostgreSQL, migrations, tests, and CI.
4. Adapt RendezView's authentication and refresh-token security.
5. Implement `User`, `Business`, and `BusinessMember`.
6. Connect real registration, login, session restoration, and business creation.
7. Replace local-storage onboarding with persisted BFB profile, offer, and need data.
8. Add upload storage and the first admin verification queue.

At the end of this batch, BFB should have a real account and business foundation while still presenting the visual identity established by the prototype.

## Post-MVP architecture review

After the pilot, compare BFB and RendezView for genuinely stable shared capabilities.

Possible future shared packages:

- Authentication primitives
- Storage adapters
- Notification contracts
- Audit-event utilities
- API error conventions
- Frontend UI primitives
- Test factories

Shared extraction should happen only when it reduces duplication without coupling the products' release cycles or domain models.
