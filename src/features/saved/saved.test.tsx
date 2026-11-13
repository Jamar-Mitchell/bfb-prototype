import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply, type MockRequest } from '../../test/mockApi'
import type { PublicBusiness } from '../businesses/publicProfileApi'
import type { BusinessSummary, MarketplaceListing } from '../matching/marketplaceApi'
import type { SavedBusiness } from './savedApi'

const NORTHSIDE = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
const BAKERY = '8c2d3e4f-3333-4c5d-9e6f-23456789abcd'

const northside: BusinessSummary = {
  id: NORTHSIDE,
  display_name: 'Northside Studio',
  logo_url: null,
  location_city: 'Detroit',
  location_region: 'MI',
  location_country: 'US',
  service_area: 'regional',
}
const bakery: BusinessSummary = { ...northside, id: BAKERY, display_name: 'Corner Bakery', location_city: 'Atlanta', location_region: 'GA', service_area: 'local' }

function offer(id: string, business: BusinessSummary, saved: boolean): MarketplaceListing {
  return {
    kind: 'offer',
    id,
    business,
    category: { id: 'cat-1', slug: 'branding-design', name: 'Branding & design', requires_review: false },
    title: `Listing ${id}`,
    deliverables: ['Logo'],
    value_min_minor: 150000,
    value_max_minor: null,
    currency: 'USD',
    published_at: '2026-11-12T12:00:00Z',
    saved,
    description: 'Two-week sprint.',
    capacity: null,
    availability: null,
    delivery_format: 'remote',
    location_restrictions: null,
  }
}

function publicBusiness(overrides: Partial<PublicBusiness> = {}): PublicBusiness {
  return {
    ...northside,
    verified: true,
    cover_url: null,
    description: 'Brand identity.',
    website_url: null,
    social_links: {},
    industry: null,
    business_stage: null,
    team_size: null,
    categories: [],
    portfolio: [],
    created_at: '2026-11-12T12:00:00Z',
    saved: false,
    ...overrides,
  }
}

function server(reply?: (request: MockRequest) => MockReply | undefined): MockHandler {
  return (request) => {
    const custom = reply?.(request)
    if (custom) return custom
    const { method, url } = request
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: tokenBody('access-2', 'refresh-2') }
    if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [apiMembership()] } }
    if (method === 'get' && url === '/categories') return { status: 200, data: [] }
    if (method === 'get' && url === '/marketplace/facets') return { status: 200, data: { categories: [] } }
    if (method === 'get' && url === '/marketplace/listings') {
      return { status: 200, data: { items: [offer('o1', northside, false), offer('o2', northside, false), offer('o3', bakery, true)], next_cursor: null } }
    }
    if (method === 'put' && url.startsWith('/businesses/business-1/saved/')) return { status: 200, data: { business: northside, saved_at: '2026-11-12T12:00:00Z' } }
    if (method === 'delete' && url.startsWith('/businesses/business-1/saved/')) return { status: 204 }
    if (method === 'get' && url === '/businesses/business-1/saved') return { status: 200, data: [] }
    if (method === 'get' && url === `/public/businesses/${NORTHSIDE}`) return { status: 200, data: publicBusiness() }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function logInFromLastVisit() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
}

let api: ReturnType<typeof mockApi> | undefined

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

function saveButtons(name: string) {
  return screen.getAllByRole('button', { name: `Save ${name}` })
}

describe('saving from the marketplace', () => {
  it('shows the saved flag from the API and saves a business on every card it has', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt('/marketplace')

    await screen.findByRole('heading', { name: 'Listing o1' })
    expect(api.calls('get', '/marketplace/listings')[0][0].params).toMatchObject({ business_id: 'business-1' })
    expect(saveButtons('Corner Bakery')[0]).toHaveAttribute('aria-pressed', 'true')
    expect(saveButtons('Northside Studio')).toHaveLength(2)

    fireEvent.click(saveButtons('Northside Studio')[0])

    // Optimistic: both Northside cards flip at once.
    for (const button of saveButtons('Northside Studio')) expect(button).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(api!.calls('put', `/businesses/business-1/saved/${NORTHSIDE}`)).toHaveLength(1))
    await waitFor(() => expect(saveButtons('Northside Studio')[0]).toBeEnabled())
    expect(saveButtons('Northside Studio')[1]).toHaveAttribute('aria-pressed', 'true')
  })

  it('unsaves a business', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Listing o3' })

    fireEvent.click(saveButtons('Corner Bakery')[0])

    expect(saveButtons('Corner Bakery')[0]).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(api!.calls('delete', `/businesses/business-1/saved/${BAKERY}`)).toHaveLength(1))
  })

  it('rolls a failed save back and says so', async () => {
    logInFromLastVisit()
    api = mockApi(server(({ method }) => (method === 'put' ? { status: 500, data: apiErrorBody('internal_error') } : undefined)))
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Listing o1' })

    fireEvent.click(saveButtons('Northside Studio')[0])
    expect(saveButtons('Northside Studio')[0]).toHaveAttribute('aria-pressed', 'true')

    expect(await screen.findByText('We couldn’t save Northside Studio. Try again.')).toBeInTheDocument()
    for (const button of saveButtons('Northside Studio')) expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('saved businesses page', () => {
  const savedList: SavedBusiness[] = [
    { business: bakery, saved_at: '2026-11-12T12:00:00Z' },
    { business: northside, saved_at: '2026-11-10T12:00:00Z' },
  ]

  it('lists the saved businesses, newest first, from the sidebar', async () => {
    logInFromLastVisit()
    api = mockApi(server(({ method, url }) => (method === 'get' && url === '/businesses/business-1/saved' ? { status: 200, data: savedList } : undefined)))
    renderAt('/dashboard')

    fireEvent.click(await screen.findByRole('button', { name: 'Saved businesses' }))

    const list = await screen.findByRole('list', { name: 'Saved businesses' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Corner Bakery', 'Northside Studio'])
    expect(within(items[0]).getByText('Saved Nov 12, 2026')).toBeInTheDocument()
    expect(within(items[0]).getByText('Local')).toBeInTheDocument()
    expect(within(items[1]).getByRole('link', { name: 'View Northside Studio' })).toHaveAttribute('href', `/b/${NORTHSIDE}`)
  })

  it('unsaves from the list and can save again', async () => {
    logInFromLastVisit()
    api = mockApi(server(({ method, url }) => (method === 'get' && url === '/businesses/business-1/saved' ? { status: 200, data: savedList } : undefined)))
    renderAt('/saved')

    const button = await screen.findByRole('button', { name: 'Save Northside Studio' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)

    expect(await screen.findByText('Removed from saved')).toBeInTheDocument()
    await waitFor(() => expect(api!.calls('delete', `/businesses/business-1/saved/${NORTHSIDE}`)).toHaveLength(1))
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(api!.calls('put', `/businesses/business-1/saved/${NORTHSIDE}`)).toHaveLength(1))
  })

  it('points to the marketplace when nothing is saved', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt('/saved')

    expect(await screen.findByRole('heading', { name: 'No saved businesses yet' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Browse the marketplace' }))
    expect(await screen.findByRole('heading', { level: 1, name: /Find your next growth partner/ })).toBeInTheDocument()
  })

  it('offers a retry when the list fails to load', async () => {
    logInFromLastVisit()
    api = mockApi(server(({ url }) => (url === '/businesses/business-1/saved' ? { status: 500, data: apiErrorBody('internal_error') } : undefined)))
    renderAt('/saved')

    expect(await screen.findByRole('heading', { name: 'We couldn’t load your saved businesses' })).toBeInTheDocument()
  })
})

describe('saving from the public profile', () => {
  it('asks with the active business and saves', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt(`/b/${NORTHSIDE}`)

    const button = await screen.findByRole('button', { name: 'Save Northside Studio' })
    const calls = api.calls('get', `/public/businesses/${NORTHSIDE}`)
    expect(calls).toHaveLength(1)
    expect(calls[0][0].params).toEqual({ business_id: 'business-1' })
    expect(button).toHaveTextContent('Save')

    fireEvent.click(button)
    expect(button).toHaveTextContent('Saved')
    await waitFor(() => expect(api!.calls('put', `/businesses/business-1/saved/${NORTHSIDE}`)).toHaveLength(1))
  })

  it('rolls back a failed unsave', async () => {
    logInFromLastVisit()
    api = mockApi(
      server(({ method, url }) => {
        if (method === 'get' && url === `/public/businesses/${NORTHSIDE}`) return { status: 200, data: publicBusiness({ saved: true }) }
        if (method === 'delete') return 'network-error'
        return undefined
      }),
    )
    renderAt(`/b/${NORTHSIDE}`)

    const button = await screen.findByRole('button', { name: 'Save Northside Studio' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)

    expect(await screen.findByText('We couldn’t remove Northside Studio from your saved businesses. Try again.')).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('has no save button when logged out or on your own business', async () => {
    api = mockApi(server())
    renderAt(`/b/${NORTHSIDE}`)
    await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
    expect(api.calls('get', `/public/businesses/${NORTHSIDE}`)[0][0].params).toBeUndefined()
    cleanup()
    api.restore()

    logInFromLastVisit()
    api = mockApi(
      server(({ method, url }) =>
        method === 'get' && url === '/account'
          ? { status: 200, data: { user: apiUser(), memberships: [apiMembership({ business_id: NORTHSIDE, business_name: 'Northside Studio' })] } }
          : undefined,
      ),
    )
    renderAt(`/b/${NORTHSIDE}`)
    await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
  })
})

it('forgets the prototype’s local saved list', () => {
  localStorage.setItem('bfb-saved', '[1,2]')
  api = mockApi(server())
  renderAt('/')
  expect(localStorage.getItem('bfb-saved')).toBeNull()
})
