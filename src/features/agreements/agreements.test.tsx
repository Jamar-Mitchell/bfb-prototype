import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi } from '../../test/mockApi'
import {
  AGREEMENT,
  AGREEMENT_ID,
  AGREEMENTS,
  agreementDetail,
  agreementSummary,
  exchangeTerms,
  PROPOSAL_ID,
  proposalServer,
  studio,
  TERMS_VERSION,
  type ProposalServerOptions,
} from '../../test/proposalServer'
import { agreementStandingText, agreementTiming, DRAFT_TERMS_BANNER, formatAddress } from './agreementCopy'
import { agreementTab } from './agreementsApi'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

let api: ReturnType<typeof mockApi> | undefined

function start(options: ProposalServerOptions = {}) {
  api = mockApi(proposalServer(options))
  return api
}

function logIn() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

const NOW = new Date('2026-11-20T12:00:00Z')

describe('agreement copy', () => {
  it('says where each status stands', () => {
    const agreement = agreementDetail()
    expect(agreementStandingText(agreement, NOW)).toBe(
      'Both businesses accepted version 1 of the proposal on 16 Nov, and BFB prepared this agreement from it. Next, each business names who signs for it. It must be signed by 16 Dec.',
    )
    expect(agreementStandingText({ ...agreement, status: 'expired' }, NOW)).toBe('This agreement wasn’t signed by 16 Dec, so it expired. To go ahead, start a new proposal from the match.')
    expect(agreementStandingText({ ...agreement, status: 'signed' }, NOW)).toBe('Both businesses signed this agreement.')
  })

  it('gives each status a tab and a timing line', () => {
    expect(agreementTab('ready')).toBe('open')
    expect(agreementTab('signing')).toBe('open')
    expect(agreementTab('signed')).toBe('signed')
    expect(agreementTab('expired')).toBe('closed')
    expect(agreementTab('voided')).toBe('closed')
    expect(agreementTiming(agreementSummary(), NOW)).toEqual({ text: 'Sign by 16 Dec', tone: 'action' })
    expect(agreementTiming(agreementSummary({ status: 'expired' }), NOW)).toEqual({ text: 'Expired on 16 Dec', tone: 'closed' })
  })

  it('writes an address on one line with the country by name', () => {
    expect(formatAddress({ line1: '1 Main Street', line2: 'Suite 4', city: 'Detroit', region: 'MI', postal_code: '48201', country: 'US' })).toBe(
      '1 Main Street, Suite 4, Detroit, MI 48201, United States',
    )
    expect(formatAddress({ line1: null, line2: null, city: null, region: null, postal_code: null, country: null })).toBeNull()
  })
})

describe('agreement page', () => {
  it('shows the document in a sandboxed frame with its status, parties, Exchange Terms and fingerprint', async () => {
    logIn()
    start()
    renderAt(`/agreements/${AGREEMENT_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
    expect(screen.getByText('EXCHANGE AGREEMENT')).toBeInTheDocument()
    expect(screen.getAllByText('Ready for signers').length).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'Where it stands' })).toHaveTextContent(/Next, each business names who signs for it. It must be signed by 16 Dec/)

    const frame = screen.getByTitle('Business Exchange Agreement between Northstar Digital and Northside Studio')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame).toHaveAttribute('sandbox', 'allow-same-origin')
    expect(frame.getAttribute('srcdoc')).toContain('<h1>Business Exchange Agreement</h1>')
    // The document is never inserted into the page itself.
    expect(screen.queryByRole('heading', { name: 'Business Exchange Agreement', level: 1 })).not.toBeInTheDocument()

    expect(screen.getByText('4f0e'.repeat(16))).toBeInTheDocument()
    const termsLinks = screen.getAllByRole('link', { name: `BFB Exchange Terms, version ${TERMS_VERSION} (opens in a new tab)` })
    expect(termsLinks.length).toBe(2)
    for (const link of termsLinks) {
      expect(link).toHaveAttribute('href', `/legal/exchange-terms/${TERMS_VERSION}`)
      expect(link).toHaveAttribute('target', '_blank')
    }

    const status = screen.getByRole('region', { name: 'Status' })
    expect(within(status).getByText('Sign by').nextSibling).toHaveTextContent('16 Dec')
    expect(within(status).getByRole('link', { name: 'Version 1' })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}`)
    expect(within(status).getByText('Draft, not reviewed by counsel')).toBeInTheDocument()

    const parties = screen.getByRole('region', { name: 'Parties' })
    const items = within(parties).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Northstar Digital LLC')
    expect(items[0]).toHaveTextContent('Your business')
    expect(items[0]).toHaveTextContent('Limited liability company (LLC)')
    expect(items[0]).toHaveTextContent('1 Main Street, Detroit, MI 48201, United States')
    expect(items[1]).toHaveTextContent('Northside Studio Inc.')
    expect(items[1]).toHaveTextContent('On BFB as Northside Studio')
    expect(items[1]).toHaveTextContent('Corporation')

    const signing = screen.getByRole('region', { name: 'Signing' })
    expect(signing).toHaveTextContent('Each business names one owner or administrator to sign.')
    expect(signing).toHaveTextContent('Must be signed by 16 Dec.')
  })

  it('shows the draft banner while the documents are drafts, and not once they are reviewed', async () => {
    logIn()
    start()
    renderAt(`/agreements/${AGREEMENT_ID}`)
    const banner = await screen.findByRole('note', { name: 'Draft terms' })
    expect(banner).toHaveTextContent(DRAFT_TERMS_BANNER)
    expect(DRAFT_TERMS_BANNER).toBe('Draft terms, not reviewed by counsel. Not for real exchanges.')
    cleanup()
    api?.restore()

    const reviewed = { version: '2027-01-reviewed-1', legal_review_status: 'reviewed' as const, content_sha256: 'd'.repeat(64) }
    start({ agreement: agreementDetail({ legal_review_status: 'reviewed', template: reviewed, exchange_terms: reviewed }) })
    renderAt(`/agreements/${AGREEMENT_ID}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Draft terms' })).not.toBeInTheDocument()
    expect(screen.getByText('Reviewed by counsel')).toBeInTheDocument()
  })

  it('says an expired agreement can no longer be signed', async () => {
    logIn()
    start({ agreement: agreementDetail({ status: 'expired' }) })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    expect(await screen.findByRole('region', { name: 'Where it stands' })).toHaveTextContent(/so it expired/)
    expect(screen.getByRole('region', { name: 'Signing' })).toHaveTextContent('This agreement can no longer be signed.')
    expect(screen.queryByText('Sign by')).not.toBeInTheDocument()
  })

  it('shows not found to a business that is not part of the agreement', async () => {
    logIn()
    start({ agreement: agreementDetail({ id: 'someone-elses' }) })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    expect(await screen.findByRole('heading', { name: 'We couldn’t find this agreement' })).toBeInTheDocument()
    expect(screen.getByText(/Only the two businesses in an agreement can open it/)).toBeInTheDocument()
    expect(screen.getByText(/you’re acting for Northstar Digital/)).toBeInTheDocument()
    expect(screen.queryByTitle(/Business Exchange Agreement between/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers a retry when the agreement fails to load', async () => {
    logIn()
    let fail = true
    start({ reply: ({ method, url }) => (method === 'get' && url === AGREEMENT && fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined) })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    expect(await screen.findByRole('heading', { name: 'We couldn’t load this agreement' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
  })
})

describe('agreements list', () => {
  it('lists open agreements with the draft banner, and is in the sidebar', async () => {
    logIn()
    start({ agreements: [agreementSummary(), agreementSummary({ id: 'expired-1', status: 'expired' })] })
    renderAt('/agreements')

    const list = await screen.findByRole('list', { name: 'Open agreements' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Business Exchange Agreement with Northside Studio')
    expect(rows[0]).toHaveTextContent('Ready for signers')
    expect(rows[0]).toHaveTextContent('Draft terms')
    expect(rows[0]).toHaveTextContent('Sign by 16 Dec')
    expect(within(rows[0]).getByRole('link', { name: 'Open agreement with Northside Studio' })).toHaveAttribute('href', `/agreements/${AGREEMENT_ID}`)
    expect(screen.getByRole('note', { name: 'Draft terms' })).toHaveTextContent(DRAFT_TERMS_BANNER)
    expect(screen.getByRole('button', { name: 'Agreements' })).toHaveClass('active')
  })

  it('filters signed agreements on the API and keeps closed ones in the browser', async () => {
    logIn()
    const server = start({ agreements: [agreementSummary(), agreementSummary({ id: 'expired-1', status: 'expired', other_business: { ...studio, display_name: 'Corner Bakery' } })] })
    renderAt('/agreements')
    await screen.findByRole('list', { name: 'Open agreements' })

    fireEvent.click(screen.getByRole('tab', { name: 'Signed' }))
    expect(await screen.findByText('No signed agreements yet')).toBeInTheDocument()
    expect(server.calls('get', AGREEMENTS).some(([config]) => (config.params as { status?: string }).status === 'signed')).toBe(true)

    fireEvent.click(screen.getByRole('tab', { name: 'Closed' }))
    const list = await screen.findByRole('list', { name: 'Closed agreements' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('Corner Bakery')
    expect(list).toHaveTextContent('Expired on 16 Dec')
  })

  it('explains an empty list and links to proposals', async () => {
    logIn()
    start()
    renderAt('/agreements')

    expect(await screen.findByText('No agreements to sign')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See your proposals' })).toHaveAttribute('href', '/proposals')
    expect(screen.queryByRole('note', { name: 'Draft terms' })).not.toBeInTheDocument()
  })
})

describe('Exchange Terms page', () => {
  it('shows the current terms logged out, outside the app shell, with the draft banner', async () => {
    start()
    renderAt('/legal/exchange-terms')

    expect(await screen.findByRole('heading', { level: 1, name: 'Exchange Terms' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1. How these terms work' })).toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Draft terms' })).toHaveTextContent(DRAFT_TERMS_BANNER)
    expect(screen.getByText(TERMS_VERSION)).toBeInTheDocument()
    expect(screen.getByText('c'.repeat(64))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agreements' })).not.toBeInTheDocument()
    expect(api!.calls('get', '/account')).toHaveLength(0)
  })

  it('shows a given version and says when a newer one replaced it', async () => {
    start({
      reply: ({ method, url }) =>
        method === 'get' && url === '/legal/exchange-terms/2026-10-draft-0'
          ? { status: 200, data: exchangeTerms({ version: '2026-10-draft-0', is_current: false, legal_review_status: 'reviewed' }) }
          : undefined,
    })
    renderAt('/legal/exchange-terms/2026-10-draft-0')

    expect(await screen.findByText(/A newer version has replaced this one/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read the current version' })).toHaveAttribute('href', '/legal/exchange-terms')
    expect(screen.queryByRole('note', { name: 'Draft terms' })).not.toBeInTheDocument()
  })

  it('says when a version does not exist', async () => {
    start()
    renderAt('/legal/exchange-terms/nope')

    expect(await screen.findByRole('heading', { name: 'There’s no Exchange Terms version “nope”' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read the current Exchange Terms' })).toHaveAttribute('href', '/legal/exchange-terms')
  })

  it('works logged in too', async () => {
    logIn()
    start()
    renderAt('/legal/exchange-terms')

    expect(await screen.findByRole('heading', { level: 1, name: 'Exchange Terms' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument())
  })
})
