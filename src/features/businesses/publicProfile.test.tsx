import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { isBusinessUuid } from '../../app/router/paths'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiBusiness, apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'
import { formatLocation, orderedSocialLinks } from './profileLabels'
import type { PublicBusiness } from './publicProfileApi'

const APPROVED_ID = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
const DRAFT_ID = '7b2e3d4f-2222-4b3c-8d4e-123456789abc'

function publicBusiness(overrides: Partial<PublicBusiness> = {}): PublicBusiness {
  return {
    id: APPROVED_ID,
    display_name: 'Northside Studio',
    verified: true,
    logo_url: 'http://api.test/storage/logo.png?signature=abc',
    cover_url: null,
    description: 'Brand identity for neighbourhood businesses.',
    website_url: 'https://northside.example/',
    social_links: { linkedin: 'https://linkedin.com/company/northside', instagram: 'https://instagram.com/northside' },
    location_city: 'Detroit',
    location_region: 'MI',
    location_country: 'US',
    service_area: 'regional',
    industry: 'Design',
    business_stage: 'growing',
    team_size: '2_10',
    categories: [{ id: 'cat-1', slug: 'branding-design', name: 'Branding & design', requires_review: false }],
    created_at: '2026-11-12T12:00:00Z',
    ...overrides,
  }
}

function server(reply?: (request: { method: string; url: string }) => MockReply | undefined): MockHandler {
  return ({ method, url }) => {
    const custom = reply?.({ method, url })
    if (custom) return custom
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: tokenBody('access-2', 'refresh-2') }
    if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser(), memberships: [apiMembership()] } }
    if (method === 'get' && url === `/public/businesses/${APPROVED_ID}`) return { status: 200, data: publicBusiness() }
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
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('public business profile', () => {
  it('shows an approved business’s real profile to a logged-out visitor', async () => {
    api = mockApi(server())
    const { container } = renderAt(`/b/${APPROVED_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
    expect(screen.getByText('Verified business')).toBeInTheDocument()
    expect(screen.getByText('Brand identity for neighbourhood businesses.')).toBeInTheDocument()
    expect(screen.getAllByText('Detroit, MI, US').length).toBeGreaterThan(0)
    expect(screen.getByText('Branding & design')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Northside Studio logo' })).toHaveAttribute('src', 'http://api.test/storage/logo.png?signature=abc')
    expect(screen.getByRole('link', { name: /northside\.example/ })).toHaveAttribute('href', 'https://northside.example/')
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://linkedin.com/company/northside')
    const details = screen.getByRole('heading', { name: 'Business details' }).parentElement!
    expect(within(details).getByText('Regional')).toBeInTheDocument()
    expect(within(details).getByText('2–10 people')).toBeInTheDocument()
    // No demo content and no app shell: listings and reviews are not public yet.
    expect(screen.queryByText('What they offer')).not.toBeInTheDocument()
    expect(screen.queryByText(/exchanges\)/)).not.toBeInTheDocument()
    expect(container.querySelector('.app-shell')).toBeNull()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(api.calls('get', `/public/businesses/${APPROVED_ID}`)).toHaveLength(1)
  })

  it('hides the verified badge and empty sections when the API has nothing for them', async () => {
    api = mockApi(
      server(({ url }) =>
        url === `/public/businesses/${APPROVED_ID}`
          ? { status: 200, data: publicBusiness({ verified: false, logo_url: null, description: null, website_url: null, social_links: {}, categories: [], service_area: null, business_stage: null, team_size: null, location_city: null, location_region: null, location_country: null }) }
          : undefined,
      ),
    )
    renderAt(`/b/${APPROVED_ID}`)

    await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
    expect(screen.queryByText('Verified business')).not.toBeInTheDocument()
    expect(screen.getByText('This business hasn’t added a description yet.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What they do' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Business details' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Links' })).not.toBeInTheDocument()
    expect(screen.getByText('NS')).toBeInTheDocument()
  })

  it('shows the not-found state for a business that is not approved', async () => {
    api = mockApi(server())
    renderAt(`/b/${DRAFT_ID}`)

    expect(await screen.findByRole('heading', { name: 'This business profile isn’t available' })).toBeInTheDocument()
    expect(api.calls('get', `/public/businesses/${DRAFT_ID}`)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Go to BFB home' })).toBeInTheDocument()
  })

  it('shows the not-found state for a malformed ID without asking the API', async () => {
    api = mockApi(server())
    renderAt('/b/not-a-business')

    expect(await screen.findByRole('heading', { name: 'This business profile isn’t available' })).toBeInTheDocument()
    expect(api.adapter.mock.calls.filter(([config]) => config.url?.startsWith('/public/'))).toHaveLength(0)
  })

  it('offers a retry when loading fails for another reason', async () => {
    let fail = true
    api = mockApi(
      server(({ url }) => (url === `/public/businesses/${APPROVED_ID}` && fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined)),
    )
    renderAt(`/b/${APPROVED_ID}`)

    expect(await screen.findByRole('heading', { name: 'We couldn’t load this profile' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
  })

  it('offers the dashboard instead of log in to a logged-in visitor', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt(`/b/${APPROVED_ID}`)

    await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
    expect(await screen.findByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument()
  })
})

describe('demo profiles from the marketplace', () => {
  it('keeps numeric demo IDs on demo data', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt('/business/2')

    expect(await screen.findByRole('heading', { level: 1, name: 'Frame & Field Studio' })).toBeInTheDocument()
    expect(api.adapter.mock.calls.filter(([config]) => config.url?.startsWith('/public/'))).toHaveLength(0)
  })

  it('sends a real business ID on the demo route to its public profile', async () => {
    logInFromLastVisit()
    api = mockApi(server())
    renderAt(`/business/${APPROVED_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
  })
})

describe('view public profile link', () => {
  const profileHeading = { level: 1, name: /Show partners what makes you valuable/ } as const

  it('appears on the profile page once the business is approved', async () => {
    logInFromLastVisit()
    api = mockApi(server(({ url }) => (url === '/businesses/business-1' ? { status: 200, data: apiBusiness({ profile_status: 'approved' }) } : undefined)))
    renderAt('/profile')

    await screen.findByRole('heading', profileHeading)
    const link = await screen.findByRole('link', { name: 'View public profile' })
    expect(link).toHaveAttribute('href', '/b/business-1')
  })

  it('stays hidden before approval', async () => {
    logInFromLastVisit()
    api = mockApi(server(({ url }) => (url === '/businesses/business-1' ? { status: 200, data: apiBusiness({ profile_status: 'in_review' }) } : undefined)))
    renderAt('/profile')

    await screen.findByRole('heading', profileHeading)
    await waitFor(() => expect(api!.calls('get', '/businesses/business-1')).toHaveLength(1))
    expect(screen.queryByRole('link', { name: 'View public profile' })).not.toBeInTheDocument()
  })
})

describe('profile helpers', () => {
  it('recognises real business IDs', () => {
    expect(isBusinessUuid(APPROVED_ID)).toBe(true)
    expect(isBusinessUuid('2')).toBe(false)
    expect(isBusinessUuid(undefined)).toBe(false)
  })

  it('formats location and orders social links', () => {
    expect(formatLocation({ location_city: 'Detroit', location_region: null, location_country: 'US' })).toBe('Detroit, US')
    expect(orderedSocialLinks({ x: 'https://x.com/a', linkedin: 'https://l.in/a', mastodon: 'https://m.s/a' }).map((link) => link.label)).toEqual(['LinkedIn', 'X', 'mastodon'])
  })
})
