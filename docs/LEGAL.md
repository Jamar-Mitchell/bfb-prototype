# BFB Legal and Compliance Framework

**Status:** Product-planning document  
**Last reviewed:** November 9, 2026  
**Intended launch market:** United States, beginning with Georgia

> **Not legal or tax advice.** This document identifies issues BFB should take to qualified marketplace, tax, privacy, and payments counsel before enabling real exchanges. It is not a substitute for advice based on BFB's final entity structure, product flow, states of operation, or service categories.

## Executive summary

BFB should operate as a marketplace that helps two independent businesses discover one another, negotiate an exchange, create an agreement, sign it electronically, and document completion.

The recommended initial model is:

- Each participating business contracts directly with the other business.
- BFB provides the marketplace, workflow, records, and attorney-reviewed agreement template.
- BFB is not the provider, employer, agent, joint venturer, guarantor, or legal representative of either business.
- Every accepted exchange produces a signed **Business Exchange Agreement**.
- The parties explicitly agree to the services, deliverables, deadlines, acceptance criteria, fair-market values, and any cash adjustment.
- BFB preserves a tamper-evident contract and activity history.
- BFB does not initially issue trade credits, hold funds itself, or promise that work will be completed.

The largest legal and operational issues are:

1. Contract enforceability and electronic signatures
2. Barter-income and information-reporting obligations
3. Marketplace liability and dispute handling
4. Payments, escrow, and money-transmission exposure
5. Privacy and security
6. Intellectual property and confidentiality
7. Professional licensing and prohibited services
8. Reviews, advertising, and verification claims

## 1. Required agreement structure

### 1.1 BFB Terms of Service

Every business should accept platform terms through an affirmative clickwrap flow. The terms should address:

- Account eligibility and representative authority
- Business-only use and minimum age
- Accurate profiles and listings
- Marketplace rules and prohibited conduct
- BFB's role as a technology marketplace
- No guarantee of identity, quality, legality, value, or performance
- No employment, agency, partnership, fiduciary, or joint-venture relationship
- User responsibility for taxes, licenses, insurance, and legal compliance
- Payments and third-party payment providers
- Reviews, moderation, and content licenses
- Suspension and termination
- Intellectual-property complaints
- Disclaimers, limitation of liability, and indemnification
- Governing law and dispute resolution
- Electronic-record consent
- Amendment and notice procedures

Acceptance should not rely on passive language such as "by using this site." The interface should require a clear action linked to the terms.

### 1.2 Business Exchange Agreement

Each accepted proposal should create a separate contract directly between the businesses. At minimum, it should include:

- Full legal names, entity types, addresses, and authorized representatives
- Services or products supplied by each party
- Detailed deliverables and exclusions
- Milestones, dependencies, and target dates
- Acceptance criteria and review period
- Revision limits and scope-change process
- Estimated fair-market value of each side
- Any cash adjustment and payment schedule
- Responsibility for materials, expenses, taxes, and third parties
- Intellectual-property ownership and license terms
- Confidentiality and data-handling obligations
- Warranties and disclaimers
- Required professional licenses and insurance
- Cancellation, suspension, and termination rights
- Consequences when only one party performs
- Dispute escalation and evidence requirements
- Governing law and venue
- Force majeure
- Electronic signatures and counterparts

The exchanged promises are the contractual consideration: each business receives something of value in return for its own performance.

### 1.3 Privacy Policy

The Privacy Policy should describe:

- Data collected from profiles, listings, messages, contracts, payments, and support
- Purposes and legal bases for processing where applicable
- Service providers and data disclosures
- Analytics and cookies
- Contract and tax-record retention
- Security practices
- User access, correction, and deletion options
- State privacy rights
- Cross-border processing, if introduced
- Contact details for privacy requests

Separate consent may be required for marketing communications, sensitive identifiers, or uses outside the transaction workflow.

### 1.4 Additional policies

Before a real launch, BFB should also prepare:

- Acceptable Use Policy
- Prohibited Services Policy
- Review and Community Guidelines
- Copyright/IP Complaint Policy
- Dispute and Cancellation Policy
- Data Retention Schedule
- Incident Response Plan
- Vendor and subprocessor register

## 2. Recommended contracting workflow

1. A business creates a proposal.
2. The recipient accepts, declines, or requests changes.
3. The parties agree on scope, deliverables, values, dates, and any cash component.
4. BFB generates the exchange agreement from the final proposal.
5. Each signer confirms their name, title, business, and authority to sign.
6. Each signer affirmatively consents to electronic records and signatures.
7. Both businesses sign the same contract version.
8. BFB locks the executed agreement and records its audit trail.
9. Changes require a signed amendment rather than silently editing the contract.
10. Milestone submissions, acceptance, messages, and completion are recorded.
11. Each party receives a downloadable agreement, completion record, and transaction-value summary.

The audit trail should preserve:

- Contract and amendment versions
- Timestamps
- Account and signer identity
- Consent and signature events
- Relevant delivery and acceptance events
- Document hashes
- IP address and device metadata where appropriate and disclosed

## 3. Electronic signatures

The federal Electronic Signatures in Global and National Commerce Act generally prevents a contract or signature from being denied legal effect solely because it is electronic. Georgia has enacted the Uniform Electronic Transactions Act, including provisions concerning the legal effect, attribution, retention, and admissibility of electronic records and signatures.

Product requirements should include:

- Clear intent to sign
- Consent to transact electronically
- Attribution to the signer
- Ability to review and download the agreement
- A retained record that accurately reflects the signed document
- A reproducible audit trail
- A method to correct errors before execution

A typed name, checkbox, or button can form part of a valid electronic-signature process, but enforceability depends on the complete evidence of intent, consent, attribution, and record integrity.

**Sources**

- [15 U.S.C. Chapter 96 — Electronic Signatures in Global and National Commerce](https://uscode.house.gov/view.xhtml?path=/prelim@title15/chapter96)
- [Georgia Code Title 10, Chapter 12 — Electronic Transactions](https://law.justia.com/codes/georgia/title-10/chapter-12/)

## 4. Barter taxation and reporting

Barter is generally taxable even when no cash changes hands. The IRS states that a taxpayer must include the fair-market value of property or services received through bartering in gross income.

This has several implications:

- Each party needs an agreed transaction value.
- BFB must clearly distinguish estimated value during negotiation from the final agreed value.
- Parties should receive a durable transaction summary.
- BFB must determine with tax counsel whether it qualifies as a barter exchange for federal reporting purposes.
- A barter exchange generally files Form 1099-B for reportable member transactions.
- Additional requirements may include taxpayer identification collection, backup withholding, corrections, and record retention.
- State sales, use, gross-receipts, or other taxes may apply depending on the state and what is exchanged.

BFB should not tell users that barter is tax-free. The product should display a notice similar to:

> An exchange may create taxable business income even when no cash is paid. The businesses are responsible for determining fair-market value and obtaining tax advice. BFB may be required to report transaction information to tax authorities.

Whether an expense received through barter is deductible depends on the recipient's circumstances and applicable tax law; BFB should not calculate or promise a deduction.

**Sources**

- [IRS Topic No. 420 — Bartering Income](https://www.irs.gov/taxtopics/tc420)
- [IRS — About Form 1099-B](https://www.irs.gov/forms-pubs/about-form-1099-b)
- [IRS Instructions for Form 1099-B](https://www.irs.gov/pub/irs-pdf/i1099b.pdf)

## 5. Payments, cash adjustments, and credits

### Initial recommendation

Use a regulated marketplace payment provider for optional cash adjustments. BFB should not directly receive, pool, store, or manually disburse customer funds.

The provider should handle appropriate onboarding, identity checks, payment processing, settlement, refunds, and required payment records. BFB still needs counsel to confirm its responsibilities and disclosures.

### Avoid during the initial launch

- A redeemable BFB currency
- User wallets maintained by BFB
- Cash redemption of platform credits
- Transfers of credits between unrelated members
- BFB-operated escrow
- Promises that credits maintain a particular cash value

Stored value and payment flows can raise federal and state money-services, money-transmission, unclaimed-property, sanctions, consumer-protection, and accounting questions. A multilateral credit system could improve marketplace liquidity, but it should only be considered after a written legal analysis and validation that bilateral exchanges cannot achieve sufficient liquidity.

**Source**

- [FinCEN — Prepaid Access](https://www.fincen.gov/resources/statutes-regulations/guidance/prepaid-access)

## 6. Marketplace liability and trust

BFB should not promise that businesses are "trusted," "verified," or "guaranteed" unless those terms correspond to a documented process.

Possible labels include:

- Email confirmed
- Business registration checked
- Identity checked by a named provider
- Professional license checked
- Portfolio submitted
- Completed exchanges
- Response rate

Each label should explain what was checked, when, by whom, and what was not checked.

BFB should maintain:

- A reporting and moderation process
- Repeat-offender controls
- Evidence preservation
- Clear review rules
- A process for correcting false business information
- Procedures for subpoenas and legal requests

Disclaimers are useful but do not replace reasonable product controls, accurate marketing, or compliance with applicable law.

## 7. Reviews and endorsements

Reviews should come from genuine experiences. BFB should disclose incentives, prohibit fabricated or selectively suppressed reviews, and avoid presenting demo reviews as real customer experiences.

The current prototype should continue labeling businesses, exchanges, and reviews as fictional demo content.

**Source**

- [FTC — Endorsements, Influencers, and Reviews](https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews)

## 8. Intellectual property and confidentiality

The exchange agreement should not assume that paying—or trading—for work automatically transfers every intellectual-property right.

The agreement should specify:

- Whether deliverables are assigned or licensed
- When ownership transfers
- Rights to pre-existing tools, templates, and code
- Rights in third-party materials
- Open-source obligations
- Portfolio and publicity permissions
- Trademark use
- Treatment of confidential information
- Return or deletion of data at completion

For software, design, photography, marketing, and content exchanges, reusable background materials should normally remain with their original owner while the customer receives clearly defined rights to the final deliverables.

## 9. Professional licensing and prohibited categories

BFB should begin with lower-regulatory-risk professional services such as:

- Design
- Marketing
- Photography
- General business consulting
- Web development
- Bookkeeping that does not constitute regulated accounting or investment advice

Categories requiring additional review may include:

- Legal services
- Medical and mental-health services
- Accounting attest services
- Financial, investment, tax, or insurance advice
- Construction and regulated trades
- Real-estate brokerage
- Childcare
- Transportation
- Alcohol, firearms, pharmaceuticals, and controlled goods

For licensed categories, BFB may need license verification, jurisdiction restrictions, special agreement language, insurance requirements, and category-specific moderation.

## 10. Disputes and completion

BFB should provide a structured escalation process without representing itself as a court or guarantor:

1. Direct resolution between the parties
2. Structured request for changes
3. Submission of contract, messages, files, and milestone evidence
4. Optional neutral mediation
5. Contractually selected arbitration or court process

The agreement should address:

- Partial performance
- Missed deadlines
- Rejected deliverables
- Cure periods
- Refunds of cash adjustments
- Return or destruction of work
- IP rights after termination
- Reviews during active disputes

A future paid dispute service should be reviewed for impartiality, enforceability, and consumer-arbitration requirements.

## 11. Insurance

BFB should discuss at least the following coverage with an experienced broker:

- Technology errors and omissions
- Cyber liability
- Commercial general liability
- Media liability
- Directors and officers coverage
- Crime or funds-transfer coverage if payment exposure is introduced

Businesses exchanging regulated or higher-risk services may need to attest to professional liability, general liability, workers' compensation, or other category-specific insurance.

## 12. Minimum pre-launch legal checklist

- [ ] Form the BFB operating entity
- [ ] Obtain trademark clearance for BFB and the logo
- [ ] Retain marketplace/technology counsel
- [ ] Obtain a written tax analysis of barter-exchange status
- [ ] Finalize Terms of Service and Privacy Policy
- [ ] Create an attorney-reviewed Business Exchange Agreement
- [ ] Implement electronic-signature consent and audit trails
- [ ] Decide whether and how to collect W-9 information
- [ ] Define Form 1099-B responsibilities and operational ownership
- [ ] Select a marketplace payment provider for cash adjustments
- [ ] Create prohibited-service and licensing rules
- [ ] Define verification labels and evidence
- [ ] Implement review and moderation controls
- [ ] Complete privacy and security risk assessments
- [ ] Purchase appropriate insurance
- [ ] Run a limited pilot in one jurisdiction and service cluster

## 13. Recommended counsel questions

1. Will BFB's exact operating model make it a "barter exchange" under federal tax rules?
2. What information returns, taxpayer identification, backup withholding, and retention duties apply?
3. Can BFB facilitate optional cash adjustments through a marketplace payment provider without money-transmitter licensing?
4. What changes would create money-transmission or stored-value exposure?
5. Which contract terms are appropriate for Georgia and interstate transactions?
6. Which service categories should be prohibited or require license verification?
7. What dispute-resolution structure is enforceable and commercially reasonable?
8. What state privacy laws apply at the expected user and revenue thresholds?
9. What verification and marketing claims can BFB accurately make?
10. What insurance coverage and contractual risk allocation are appropriate?
