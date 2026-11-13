import { apiGet } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

// Exchange Agreements and the Exchange Terms (bfb-api docs/AGREEMENTS.md). When both businesses
// accept the same proposal version, the API generates one agreement from it. Any member of
// either business can read it; anyone else gets `404 not_found`.

export type Agreement = Schemas['AgreementResponse']
export type AgreementSummary = Schemas['AgreementListItem']
export type AgreementStatus = Schemas['AgreementStatus']
export type AgreementParty = Schemas['AgreementPartyResponse']
export type AgreementLink = Schemas['AgreementSummaryResponse']
export type LegalReviewStatus = Schemas['LegalReviewStatus']
export type ExchangeTerms = Schemas['LegalDocumentResponse']

/** Statuses an agreement can still move from. The rest are final. */
export const OPEN_AGREEMENT_STATUSES: readonly AgreementStatus[] = ['ready', 'signing']

/**
 * Agreements page tabs.
 * - Open: waiting for signers or out for signature.
 * - Signed: both businesses signed.
 * - Closed: expired or voided.
 */
export type AgreementTab = 'open' | 'signed' | 'closed'

export const AGREEMENT_TABS: Array<{ id: AgreementTab; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'signed', label: 'Signed' },
  { id: 'closed', label: 'Closed' },
]

export function readAgreementTab(value: string | null): AgreementTab {
  return AGREEMENT_TABS.some(({ id }) => id === value) ? (value as AgreementTab) : 'open'
}

export function agreementTab(status: AgreementStatus): AgreementTab {
  if (OPEN_AGREEMENT_STATUSES.includes(status)) return 'open'
  return status === 'signed' ? 'signed' : 'closed'
}

export const AGREEMENTS_PAGE_SIZE = 20

/** How many pages a tab that filters in the browser reads, at most, looking for its agreements. */
const PAGE_SCAN = 5

export function listAgreements(businessId: string, { status, limit, cursor }: { status?: AgreementStatus; limit: number; cursor?: string | null }) {
  return apiGet('/businesses/{business_id}/agreements', {
    path: { business_id: businessId },
    query: { limit, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) },
  })
}

export interface AgreementPage {
  items: AgreementSummary[]
  nextCursor: string | null
}

/**
 * One page of a tab, newest first. Signed filters on the API. The API filters on one status at
 * a time, so Open and Closed read the unfiltered list and keep their statuses, reading on (a few
 * pages at most) until they find some, as the Closed proposals tab does.
 */
export async function listAgreementTab(businessId: string, tab: AgreementTab, cursor?: string | null): Promise<AgreementPage> {
  if (tab === 'signed') {
    const page = await listAgreements(businessId, { status: 'signed', limit: AGREEMENTS_PAGE_SIZE, cursor })
    return { items: page.items, nextCursor: page.next_cursor }
  }
  const items: AgreementSummary[] = []
  let next = cursor ?? null
  for (let read = 0; read < PAGE_SCAN; read += 1) {
    const page = await listAgreements(businessId, { limit: 50, cursor: next })
    items.push(...page.items.filter((item) => agreementTab(item.status) === tab))
    next = page.next_cursor
    if (!next || items.length > 0) break
  }
  return { items, nextCursor: next }
}

/** One agreement in full, with its rendered HTML document. `404 not_found` for non-participants. */
export function getAgreement(businessId: string, agreementId: string): Promise<Agreement> {
  return apiGet('/businesses/{business_id}/agreements/{agreement_id}', { path: { business_id: businessId, agreement_id: agreementId } })
}

/** The Exchange Terms: the current version, or a given one (`404 not_found` if unknown). No login needed. */
export function getExchangeTerms(version?: string): Promise<ExchangeTerms> {
  return version
    ? apiGet('/legal/exchange-terms/{version}', { path: { version } })
    : apiGet('/legal/exchange-terms')
}
