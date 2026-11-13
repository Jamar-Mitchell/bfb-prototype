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
  agreementDetail,
  EXCHANGE,
  EXCHANGE_ID,
  EXCHANGES,
  exchangeDetail,
  exchangeSummary,
  PROPOSAL_ID,
  proposalServer,
  signedAgreement,
  studio,
  type ProposalServerOptions,
} from '../../test/proposalServer'
import { deliveryLine, milestoneCount } from './exchangeCopy'

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

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

const SIGNED_DOCUMENT = `${AGREEMENT}/signed-document`
const CERTIFICATE = `${AGREEMENT}/certificate`

function fakeTab() {
  const tab = { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
  const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
  return { tab, open }
}

describe('exchange copy', () => {
  it('says who delivers each milestone, from your side', () => {
    const [first, second] = exchangeDetail().milestones
    const names = { mine: 'Northstar Digital', other: 'Northside Studio' }
    expect(deliveryLine(first, 'business-1', names)).toEqual({ text: 'Northstar Digital delivers to Northside Studio', mine: true })
    expect(deliveryLine(second, 'business-1', names)).toEqual({ text: 'Northside Studio delivers to Northstar Digital', mine: false })
    expect(milestoneCount(1)).toBe('1 milestone')
    expect(milestoneCount(3)).toBe('3 milestones')
  })
})

describe('signed agreement', () => {
  it('offers both downloads, fetching a fresh link on each click, and links to the exchange', async () => {
    start({
      agreement: signedAgreement(),
      reply: ({ method, url }) => {
        if (method === 'get' && url === SIGNED_DOCUMENT) return { status: 200, data: { url: 'http://files.example/signed-agreement.html?sig=1', url_expires_at: '2026-11-20T12:15:00Z', content_type: 'text/html; charset=utf-8', sha256: '7d1e'.repeat(16) } }
        if (method === 'get' && url === CERTIFICATE) return { status: 200, data: { url: 'http://files.example/signature-certificate.html?sig=2', url_expires_at: '2026-11-20T12:15:00Z', content_type: 'text/html; charset=utf-8', sha256: '9a2b'.repeat(16) } }
        return undefined
      },
    })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const panel = await screen.findByRole('region', { name: 'Signed documents' })
    expect(screen.getByRole('region', { name: 'Where it stands' })).toHaveTextContent('Both businesses signed this agreement on 20 Nov. The exchange is active')
    expect(panel).toHaveTextContent('7d1e'.repeat(16))
    expect(panel).toHaveTextContent('9a2b'.repeat(16))
    // Links are fetched on click, never up front.
    expect(api!.calls('get', SIGNED_DOCUMENT)).toHaveLength(0)

    const { tab, open } = fakeTab()
    fireEvent.click(within(panel).getByRole('button', { name: 'Download the signed agreement (opens in a new tab)' }))
    await waitFor(() => expect(tab.location.href).toBe('http://files.example/signed-agreement.html?sig=1'))
    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(tab.opener).toBeNull()

    fireEvent.click(within(panel).getByRole('button', { name: 'Download the signed agreement (opens in a new tab)' }))
    await waitFor(() => expect(api!.calls('get', SIGNED_DOCUMENT)).toHaveLength(2))

    fireEvent.click(within(panel).getByRole('button', { name: 'Download the signature certificate (opens in a new tab)' }))
    await waitFor(() => expect(tab.location.href).toBe('http://files.example/signature-certificate.html?sig=2'))

    expect(within(panel).getByRole('link', { name: /Open the exchange/ })).toHaveAttribute('href', `/exchanges/${EXCHANGE_ID}`)
    const status = screen.getByRole('region', { name: 'Status' })
    expect(within(status).getByText('Signed', { selector: 'dt' }).nextSibling).toHaveTextContent('20 Nov')
    expect(within(status).getByRole('link', { name: 'Active' })).toHaveAttribute('href', `/exchanges/${EXCHANGE_ID}`)
  })

  it('closes the tab and says so when a link cannot be fetched', async () => {
    start({
      agreement: signedAgreement(),
      reply: ({ method, url }) => (method === 'get' && url === CERTIFICATE ? { status: 500, data: apiErrorBody('internal_error') } : undefined),
    })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const { tab } = fakeTab()
    fireEvent.click(await screen.findByRole('button', { name: 'Download the signature certificate (opens in a new tab)' }))
    expect(await screen.findByText(/We couldn’t open the signature certificate/)).toBeInTheDocument()
    expect(tab.close).toHaveBeenCalled()
  })

  it('has no downloads before signing', async () => {
    start({ agreement: agreementDetail() })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    await screen.findByRole('region', { name: 'Signing' })
    expect(screen.queryByRole('region', { name: 'Signed documents' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument()
  })
})

describe('exchanges page', () => {
  it('lists active exchanges from the API in the prototype cards', async () => {
    start({ exchanges: [exchangeSummary(), exchangeSummary({ id: 'exchange-2', other_business: { ...studio, id: 'corner', display_name: 'Corner Bakery' }, milestone_count: 1, next_due_date: null })] })
    renderAt('/exchanges')

    expect(await screen.findByRole('heading', { level: 1, name: 'Keep every trade moving.' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Active exchanges' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Business exchange with Northside Studio')
    expect(cards[0]).toHaveTextContent('Active')
    expect(cards[0]).toHaveTextContent('3 milestones')
    expect(cards[0]).toHaveTextContent('18 Jan 2027')
    expect(within(cards[0]).getByRole('link', { name: 'View exchange with Northside Studio' })).toHaveAttribute('href', `/exchanges/${EXCHANGE_ID}`)
    expect(within(cards[0]).getByRole('link', { name: 'Signed agreement' })).toHaveAttribute('href', `/agreements/${AGREEMENT_ID}`)
    expect(cards[1]).toHaveTextContent('1 milestone')
    expect(cards[1]).toHaveTextContent('Nothing due')
    expect(screen.getByRole('tab', { name: 'Active 2' })).toHaveAttribute('aria-selected', 'true')
    expect((api!.calls('get', EXCHANGES)[0][0].params as { status: string }).status).toBe('active')
    // The demo exchanges are gone.
    expect(screen.queryByText(/Peachtree/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Completed 0' }))
    expect(screen.getByText('No completed exchanges yet')).toBeInTheDocument()
  })

  it('explains an empty list and offers a retry on failure', async () => {
    start()
    renderAt('/exchanges')
    expect(await screen.findByText('No active exchanges yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See your agreements' })).toHaveAttribute('href', '/agreements')
    cleanup()
    api?.restore()

    let fail = true
    start({ exchanges: [exchangeSummary()], reply: ({ method, url }) => (method === 'get' && url === EXCHANGES && fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined) })
    renderAt('/exchanges')
    expect(await screen.findByRole('heading', { name: 'We couldn’t load your exchanges' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Active exchanges' })).toBeInTheDocument()
  })
})

describe('exchange page', () => {
  it('shows the milestones read-only, with who delivers each and its due date', async () => {
    start()
    renderAt(`/exchanges/${EXCHANGE_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
    expect(screen.getByText('EXCHANGE')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'signed agreement' })).toHaveAttribute('href', `/agreements/${AGREEMENT_ID}`)
    expect(screen.getByRole('region', { name: 'Where it stands' })).toHaveTextContent('Northstar Digital delivers 2 milestones and Northside Studio delivers 1 milestone')

    const milestones = within(screen.getByRole('list', { name: 'Milestones' })).getAllByRole('listitem')
    expect(milestones).toHaveLength(3)
    expect(milestones[0]).toHaveTextContent('Logo concepts')
    expect(milestones[0]).toHaveTextContent('You deliver · Northstar Digital delivers to Northside Studio')
    expect(milestones[0]).toHaveTextContent('Due 18 Jan 2027')
    expect(milestones[0]).toHaveTextContent('Done when: Three concepts delivered as PDF')
    expect(milestones[0]).toHaveTextContent('Not started')
    expect(milestones[1]).toHaveTextContent('You receive · Northside Studio delivers to Northstar Digital')
    expect(milestones[1]).toHaveTextContent('January books closed.')
    expect(milestones[2]).toHaveTextContent('No due date')
    expect(screen.getByText(/Milestones are read-only for now/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Milestones' })).queryByRole('button')).not.toBeInTheDocument()

    const status = screen.getByRole('region', { name: 'Status' })
    expect(within(status).getByText('Next due').nextSibling).toHaveTextContent('18 Jan 2027')
    expect(within(status).getByRole('link', { name: 'Accepted' })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}`)
    expect(screen.getByRole('button', { name: 'Exchanges' })).toHaveClass('active')
  })

  it('shows not found to a business that is not part of the exchange', async () => {
    start({ exchange: exchangeDetail({ id: 'someone-elses' }) })
    renderAt(`/exchanges/${EXCHANGE_ID}`)

    expect(await screen.findByRole('heading', { name: 'We couldn’t find this exchange' })).toBeInTheDocument()
    expect(screen.getByText(/you’re acting for Northstar Digital/)).toBeInTheDocument()
    expect(api!.calls('get', EXCHANGE)).toHaveLength(1)
  })
})

describe('dashboard', () => {
  it('shows real active exchanges instead of the demo ones', async () => {
    start({ exchanges: [exchangeSummary()] })
    renderAt('/dashboard')

    const list = await screen.findByRole('list', { name: 'Active exchanges' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Exchange with Northside Studio')
    expect(rows[0]).toHaveTextContent('3 milestones · active since 20 Nov')
    expect(rows[0]).toHaveTextContent('Next due 18 Jan 2027')
    expect(screen.queryByText('with Peachtree Growth Co.')).not.toBeInTheDocument()
    expect(screen.queryByText('Website ↔ Growth campaign')).not.toBeInTheDocument()
    expect(screen.getByText('Next milestone due 18 Jan 2027')).toBeInTheDocument()

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'View exchange with Northside Studio' }))
    expect(await screen.findByRole('list', { name: 'Milestones' })).toBeInTheDocument()
  })

  it('says when there are no active exchanges yet', async () => {
    start()
    renderAt('/dashboard')

    expect(await screen.findByText(/No active exchanges yet. One starts when both businesses sign its agreement./)).toBeInTheDocument()
    expect(screen.getByText('Starts when an agreement is signed')).toBeInTheDocument()
  })
})
