import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { apiClient } from '../../lib/api/client'
import { clearStoredSession } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi, type MockHandler, type MockReply, type MockRequest } from '../../test/mockApi'
import type { Category } from '../businesses/profileApi'
import type { MarketplaceListing, MarketplacePage } from './marketplaceApi'
import { emptyFilters, filtersFromParams, filtersToParams, filtersToQuery } from './marketplaceFilters'

const branding: Category = { id: 'cat-1', slug: 'branding-design', name: 'Branding & design', description: null, sort_order: 1, requires_review: false }
const web: Category = { id: 'cat-2', slug: 'web-development', name: 'Web development', description: null, sort_order: 2, requires_review: false }

const NORTHSIDE = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
const BAKERY = '8c2d3e4f-3333-4c5d-9e6f-23456789abcd'

function offer(id: string, overrides: Partial<Extract<MarketplaceListing, { kind: 'offer' }>> = {}): MarketplaceListing {
  return {
    kind: 'offer',
    id,
    business: {
      id: NORTHSIDE,
      display_name: 'Northside Studio',
      logo_url: 'http://api.test/storage/logo.png?signature=abc',
      location_city: 'Detroit',
      location_region: 'MI',
      location_country: 'US',
      service_area: 'regional',
    },
    category: { id: branding.id, slug: branding.slug, name: branding.name, requires_review: false },
    title: `Brand identity sprint ${id}`,
    deliverables: ['Logo', 'Brand guidelines', 'Social kit', 'Signage'],
    value_min_minor: 150000,
    value_max_minor: 300000,
    currency: 'USD',
    published_at: '2026-11-12T12:00:00Z',
    saved: null,
    description: 'Two-week sprint for a new brand.',
    capacity: 2,
    availability: null,
    delivery_format: 'remote',
    location_restrictions: null,
    ...overrides,
  }
}

function need(id: string): MarketplaceListing {
  return {
    kind: 'need',
    id,
    business: { id: BAKERY, display_name: 'Corner Bakery', logo_url: null, location_city: 'Atlanta', location_region: 'GA', location_country: 'US', service_area: 'local' },
    category: { id: web.id, slug: web.slug, name: web.name, requires_review: false },
    title: 'A website that takes orders',
    deliverables: ['Online ordering'],
    value_min_minor: 200000,
    value_max_minor: null,
    currency: 'USD',
    published_at: '2026-11-11T12:00:00Z',
    saved: null,
    desired_outcome: 'Customers order cakes online.',
    desired_start_date: null,
    desired_end_date: null,
    location_preference: 'either',
    location_notes: null,
    urgency: null,
  }
}

function page(items: MarketplaceListing[], next: string | null = null): MarketplacePage {
  return { items, next_cursor: next }
}

const facets = { categories: [{ category: branding, count: 1 }, { category: web, count: 1 }] }

type Query = Record<string, unknown>

function server(listings: (query: Query, request: MockRequest) => MockReply | undefined = () => undefined): MockHandler {
  return (request) => {
    const { method, url } = request
    const query = (request.config.params ?? {}) as Query
    if (method === 'get' && url === '/categories') return { status: 200, data: [branding, web] }
    if (method === 'get' && url === '/marketplace/facets') return { status: 200, data: facets }
    if (method === 'get' && url === '/marketplace/listings') return listings(query, request) ?? { status: 200, data: page([offer('o1'), need('n1')]) }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

let currentLocation = ''

function LocationProbe() {
  const location = useLocation()
  currentLocation = `${location.pathname}${location.search}`
  return null
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
}

let api: ReturnType<typeof mockApi> | undefined

function listingCalls() {
  return api!.calls('get', '/marketplace/listings').map(([config]) => (config.params ?? {}) as Query)
}

beforeEach(() => {
  localStorage.clear()
  useSessionStore.getState().setSession({
    accessToken: 'access-token',
    user: { id: 'user-1', email: 'founder@example.com', displayName: 'Alex Morgan', emailVerified: true },
  })
  const business = { id: 'business-1', name: 'Northstar Digital', role: 'owner' as const }
  useSessionStore.getState().setMemberships([business], business)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  clearStoredSession()
  vi.restoreAllMocks()
})

describe('marketplace', () => {
  it('shows real offers and needs from other businesses', async () => {
    api = mockApi(server())
    renderAt('/marketplace')

    const card = (await screen.findByRole('heading', { name: 'Brand identity sprint o1' })).closest('article')!
    expect(within(card).getByText('Offer')).toBeInTheDocument()
    expect(within(card).getByText('Branding & design')).toBeInTheDocument()
    expect(within(card).getByText('Northside Studio')).toBeInTheDocument()
    expect(within(card).getByText('Detroit, MI, US')).toBeInTheDocument()
    expect(within(card).getByText('$1,500–$3,000')).toBeInTheDocument()
    expect(within(card).getByText('+1 more')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Northside Studio logo' })).toHaveAttribute('src', 'http://api.test/storage/logo.png?signature=abc')
    expect(within(card).getByRole('link', { name: 'View Northside Studio' })).toHaveAttribute('href', `/b/${NORTHSIDE}`)

    const needCard = screen.getByRole('heading', { name: 'A website that takes orders' }).closest('article')!
    expect(within(needCard).getByText('Need')).toBeInTheDocument()
    expect(within(needCard).getByText('Budget')).toBeInTheDocument()
    expect(within(needCard).getByText('$2,000')).toBeInTheDocument()
    expect(within(needCard).getByText('CB')).toBeInTheDocument()

    // Counts come from the facets; the viewer's own business is left out.
    expect(await screen.findByText('2 listings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Branding & design 1/ })).toBeInTheDocument()
    expect(listingCalls()[0]).toMatchObject({ exclude_business_id: 'business-1', limit: 20 })
    expect(screen.getByText('Newest first')).toBeInTheDocument()
    // No numeric match claims, ratings or "Best match" sort.
    expect(screen.queryByText(/%|Best match/)).not.toBeInTheDocument()
  })

  it('puts a search in the URL and asks the API for the most relevant results', async () => {
    api = mockApi(server())
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Brand identity sprint o1' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Search marketplace' }), { target: { value: 'logo design' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(currentLocation).toBe('/marketplace?q=logo+design'))
    await waitFor(() => expect(listingCalls().at(-1)).toMatchObject({ q: 'logo design' }))
    expect(await screen.findByText('Most relevant first')).toBeInTheDocument()
    expect(api.calls('get', '/marketplace/facets').at(-1)![0].params).toMatchObject({ q: 'logo design' })
  })

  it('reads filters from the URL, so a shared search loads the same results', async () => {
    api = mockApi(server())
    renderAt(`/marketplace?kind=need&category=${web.id}&delivery=local&country=us&min=500&max=2500&q=cakes`)

    await screen.findByRole('heading', { name: 'A website that takes orders' })
    expect(listingCalls()[0]).toMatchObject({
      kind: 'need',
      category_id: [web.id],
      delivery: ['local'],
      country: 'US',
      value_min_minor: 50000,
      value_max_minor: 250000,
      q: 'cakes',
    })
    expect(screen.getByRole('textbox', { name: 'Search marketplace' })).toHaveValue('cakes')
    expect(screen.getByRole('button', { name: 'Needs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Location \(2\)/ })).toBeInTheDocument()
  })

  it('refetches when a filter changes and sends repeated parameters the way the API reads them', async () => {
    api = mockApi(server())
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Brand identity sprint o1' })

    fireEvent.click(await screen.findByRole('button', { name: /Branding & design/ }))
    await waitFor(() => expect(listingCalls()).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', { name: /Web development/ }))
    await waitFor(() => expect(listingCalls()).toHaveLength(3))
    expect(currentLocation).toBe(`/marketplace?category=${branding.id}&category=${web.id}`)
    const [config] = api.calls('get', '/marketplace/listings').at(-1)!
    expect(apiClient.getUri(config)).toContain(`category_id=${branding.id}&category_id=${web.id}`)
    // Facets ignore the category filter so every chip keeps its count.
    expect(api.calls('get', '/marketplace/facets').at(-1)![0].params).not.toHaveProperty('category_id')

    fireEvent.click(screen.getByRole('button', { name: 'Offers' }))
    await waitFor(() => expect(listingCalls().at(-1)).toMatchObject({ kind: 'offer', category_id: [branding.id, web.id] }))

    fireEvent.click(screen.getByRole('button', { name: /Location/ }))
    const panel = screen.getByRole('form', { name: 'Location filters' })
    fireEvent.change(within(panel).getByRole('textbox', { name: 'Country' }), { target: { value: 'us' } })
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'Hybrid' }))
    expect(within(panel).queryByRole('checkbox', { name: 'Local' })).not.toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(listingCalls().at(-1)).toMatchObject({ kind: 'offer', country: 'US', delivery: ['hybrid'] }))
    expect(screen.queryByRole('form', { name: 'Location filters' })).not.toBeInTheDocument()
  })

  it('checks a value range before searching', async () => {
    api = mockApi(server())
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Brand identity sprint o1' })

    fireEvent.click(screen.getByRole('button', { name: /Value/ }))
    const panel = screen.getByRole('form', { name: 'Value filters' })
    fireEvent.change(within(panel).getByRole('textbox', { name: 'Minimum ($)' }), { target: { value: '5000' } })
    fireEvent.change(within(panel).getByRole('textbox', { name: 'Maximum ($)' }), { target: { value: '100' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply' }))

    expect(within(panel).getByRole('alert')).toHaveTextContent('The maximum can’t be below the minimum.')
    expect(listingCalls()).toHaveLength(1)

    fireEvent.change(within(panel).getByRole('textbox', { name: 'Maximum ($)' }), { target: { value: '9,000' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(listingCalls().at(-1)).toMatchObject({ value_min_minor: 500000, value_max_minor: 900000 }))
  })

  it('shows an empty state with a reset when nothing matches', async () => {
    api = mockApi(server((query) => (query.q ? { status: 200, data: page([]) } : undefined)))
    renderAt('/marketplace?q=zebra&kind=offer')

    expect(await screen.findByRole('heading', { name: 'No listings match your search' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(await screen.findByRole('heading', { name: 'Brand identity sprint o1' })).toBeInTheDocument()
    expect(currentLocation).toBe('/marketplace')
    expect(screen.getByRole('textbox', { name: 'Search marketplace' })).toHaveValue('')
    expect(listingCalls().at(-1)).not.toHaveProperty('q')
  })

  it('says when there are no listings at all', async () => {
    api = mockApi(server(() => ({ status: 200, data: page([]) })))
    renderAt('/marketplace')

    expect(await screen.findByRole('heading', { name: 'No offers or needs yet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument()
  })

  it('loads more with the cursor and stops on the last page', async () => {
    api = mockApi(server((query) => (query.cursor === 'cursor-2' ? { status: 200, data: page([offer('o3')]) } : { status: 200, data: page([offer('o1'), offer('o2')], 'cursor-2') })))
    renderAt('/marketplace?q=brand')
    await screen.findByRole('heading', { name: 'Brand identity sprint o2' })

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByRole('heading', { name: 'Brand identity sprint o3' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(listingCalls().at(-1)).toMatchObject({ q: 'brand', cursor: 'cursor-2' })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('starts again from the first page when the cursor is no longer accepted', async () => {
    api = mockApi(server((query) => (query.cursor ? { status: 400, data: apiErrorBody('invalid_cursor') } : { status: 200, data: page([offer('o1')], 'stale') })))
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Brand identity sprint o1' })

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => expect(listingCalls().filter((query) => !query.cursor)).toHaveLength(2))
    expect(await screen.findByRole('heading', { name: 'Brand identity sprint o1' })).toBeInTheDocument()
  })

  it('shows an API error with a retry', async () => {
    let fail = true
    api = mockApi(server(() => (fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined)))
    renderAt('/marketplace')

    expect(await screen.findByRole('heading', { name: 'We couldn’t load the marketplace' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Brand identity sprint o1' })).toBeInTheDocument()
  })

  it('keeps loaded results when loading more fails', async () => {
    api = mockApi(server((query) => (query.cursor ? 'network-error' : { status: 200, data: page([offer('o1')], 'next') })))
    renderAt('/marketplace')
    await screen.findByRole('heading', { name: 'Brand identity sprint o1' })

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach BFB.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Brand identity sprint o1' })).toBeInTheDocument()
  })

  it('asks an unverified user to verify their email', async () => {
    api = mockApi(server(() => ({ status: 403, data: apiErrorBody('email_not_verified') })))
    renderAt('/marketplace')

    expect(await screen.findByRole('heading', { name: 'Verify your email to browse the marketplace' })).toBeInTheDocument()
  })
})

describe('marketplace filters in the URL', () => {
  it('round-trips and drops values the API would reject', () => {
    const filters = filtersFromParams(new URLSearchParams('kind=offer&category=a&category=b&delivery=remote&delivery=bogus&country=usa&min=abc&max=10.5'))
    expect(filters).toMatchObject({ kind: 'offer', categoryIds: ['a', 'b'], delivery: ['remote'] })
    expect(filtersToQuery(filters)).toEqual({ kind: 'offer', category_id: ['a', 'b'], delivery: ['remote'], value_max_minor: 1050 })
    expect(filtersToParams(emptyFilters).toString()).toBe('')
  })
})
