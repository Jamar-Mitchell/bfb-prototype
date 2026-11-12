import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { RequireAuth } from '../../app/router/RequireAuth'
import { RequireBusiness } from '../../app/router/RequireBusiness'
import { ShellLayout } from '../../app/router/routes'
import { apiGet } from '../../lib/api/requests'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { ACTIVE_BUSINESS_KEY, businessPath, pickActiveBusiness } from '../../lib/businesses/activeBusiness'
import { useActiveBusinessId } from '../../lib/businesses/useActiveBusiness'
import { useSessionStore } from '../../stores/session'
import {
  apiBusiness,
  apiErrorBody,
  apiMembership,
  apiUser,
  mockApi,
  tokenBody,
  type MockHandler,
  type MockReply,
} from '../../test/mockApi'
import { businessInitials } from './businessDisplay'

const northstar = apiMembership({ business_id: 'business-1', business_name: 'Northstar Digital', role: 'owner' })
const frameAndField = apiMembership({ business_id: 'business-2', business_name: 'Frame & Field Studio', role: 'member' })

const dashboardHeading = { level: 1, name: /Good evening/ } as const
const createHeading = { level: 1, name: 'Create your business' } as const

/** A browser that was logged in before the reload. */
function storeTokensFromLastVisit() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
}

interface ServerOptions {
  memberships?: ReturnType<typeof apiMembership>[]
  accountReply?: () => MockReply
  createReply?: () => MockReply
}

/** Restore and login succeed; `/account` lists `memberships`; creating a business follows `createReply`. */
function apiServer({ memberships = [], accountReply, createReply }: ServerOptions = {}): MockHandler {
  return ({ method, url, body }) => {
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: tokenBody('access-2', 'refresh-2') }
    if (method === 'post' && url === '/auth/login') return { status: 200, data: tokenBody('access-1', 'refresh-1') }
    if (method === 'post' && url === '/auth/logout') return { status: 204 }
    if (method === 'get' && url === '/account') return accountReply?.() ?? { status: 200, data: { user: apiUser(), memberships } }
    if (method === 'post' && url === '/businesses') {
      const { display_name, legal_name } = body as { display_name: string; legal_name: string | null }
      return createReply?.() ?? { status: 201, data: apiBusiness({ id: 'business-new', display_name, legal_name }) }
    }
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

function switcherButton() {
  return screen.getByRole('button', { name: /Switch business/ })
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
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

describe('active business', () => {
  it('opens the first business and lets a user with two businesses switch', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ memberships: [northstar, frameAndField] }))
    renderAt('/dashboard')

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(switcherButton()).toHaveAccessibleName('Northstar Digital, Owner. Switch business')
    expect(useSessionStore.getState().activeBusiness).toEqual({ id: 'business-1', name: 'Northstar Digital', role: 'owner' })

    fireEvent.click(switcherButton())
    const menu = screen.getByRole('menu', { name: 'Your businesses' })
    expect(within(menu).getByRole('menuitemradio', { name: /Northstar Digital/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: /Frame & Field Studio/ }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(switcherButton()).toHaveAccessibleName('Frame & Field Studio, Member. Switch business')
    expect(within(switcherButton()).getByText('FF')).toBeInTheDocument()
    expect(useSessionStore.getState().activeBusiness).toEqual({ id: 'business-2', name: 'Frame & Field Studio', role: 'member' })
    expect(localStorage.getItem(ACTIVE_BUSINESS_KEY)).toBe('business-2')
  })

  it('reopens the business the user last switched to', async () => {
    storeTokensFromLastVisit()
    localStorage.setItem(ACTIVE_BUSINESS_KEY, 'business-2')
    api = mockApi(apiServer({ memberships: [northstar, frameAndField] }))
    renderAt('/dashboard')

    await screen.findByRole('heading', dashboardHeading)
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-2')
  })

  it('falls back to the first business when the stored one is no longer a membership', async () => {
    storeTokensFromLastVisit()
    localStorage.setItem(ACTIVE_BUSINESS_KEY, 'business-removed')
    api = mockApi(apiServer({ memberships: [northstar, frameAndField] }))
    renderAt('/dashboard')

    await screen.findByRole('heading', dashboardHeading)
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-1')
    expect(localStorage.getItem(ACTIVE_BUSINESS_KEY)).toBe('business-1')
  })

  it('shows a retry when the businesses cannot be loaded', async () => {
    storeTokensFromLastVisit()
    let reachable = false
    api = mockApi(
      apiServer({
        memberships: [northstar],
        accountReply: () => (reachable ? { status: 200, data: { user: apiUser(), memberships: [northstar] } } : 'network-error'),
      }),
    )
    renderAt('/dashboard')

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load your businesses')

    reachable = true
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
  })

  it('keeps the active business when the access token is refreshed', () => {
    const user = { id: 'user-1', email: 'founder@example.com', displayName: 'Alex Morgan' }
    const business = { id: 'business-2', name: 'Frame & Field Studio', role: 'member' as const }
    useSessionStore.getState().setSession({ accessToken: 'access-1', user })
    useSessionStore.getState().setMemberships([business], business)

    useSessionStore.getState().setSession({ accessToken: 'access-2', user })

    expect(useSessionStore.getState()).toMatchObject({ activeBusiness: business, memberships: [business] })

    useSessionStore.getState().setSession({ accessToken: 'access-3', user: { ...user, id: 'user-2' } })

    expect(useSessionStore.getState()).toMatchObject({ activeBusiness: null, memberships: null })
  })
})

describe('business pages reload for the chosen business', () => {
  /** Stands in for a business page: loads the active business from the API. */
  function BusinessProbe() {
    const businessId = useActiveBusinessId()
    const [name, setName] = useState<string | null>(null)

    useEffect(() => {
      let live = true
      void apiGet('/businesses/{business_id}', { path: { business_id: businessId } }).then((business) => {
        if (live) setName(business.display_name)
      })
      return () => {
        live = false
      }
    }, [businessId])

    return <h1>{name ?? 'Loading business'}</h1>
  }

  function ProbeRoutes() {
    return useRoutes([
      {
        element: <RequireAuth />,
        children: [{ element: <RequireBusiness />, children: [{ element: <ShellLayout />, children: [{ path: '/probe', element: <BusinessProbe /> }] }] }],
      },
    ])
  }

  it('fetches the new business’s data after a switch', async () => {
    const names: Record<string, string> = { 'business-1': 'Northstar Digital', 'business-2': 'Frame & Field Studio' }
    api = mockApi(({ method, url }) => {
      const id = url.match(/^\/businesses\/([^/]+)$/)?.[1]
      if (method === 'get' && id && names[id]) return { status: 200, data: apiBusiness({ id, display_name: names[id] }) }
      return { status: 404, data: apiErrorBody('not_found') }
    })
    useSessionStore.getState().setSession({ accessToken: 'access-1', user: { id: 'user-1', email: 'founder@example.com', displayName: 'Alex Morgan' } })
    useSessionStore.getState().setMemberships(
      [
        { id: 'business-1', name: 'Northstar Digital', role: 'owner' },
        { id: 'business-2', name: 'Frame & Field Studio', role: 'member' },
      ],
      { id: 'business-1', name: 'Northstar Digital', role: 'owner' },
    )

    render(
      <MemoryRouter initialEntries={['/probe']}>
        <ProbeRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Northstar Digital' })).toBeInTheDocument()

    fireEvent.click(switcherButton())
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Frame & Field Studio/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Frame & Field Studio' })).toBeInTheDocument()
    expect(api.calls('get', '/businesses/business-1')).toHaveLength(1)
    expect(api.calls('get', '/businesses/business-2')).toHaveLength(1)
  })
})

describe('create a business', () => {
  async function logIn() {
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    type('Email', 'founder@example.com')
    type('Password', 'correct horse 1')
    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))
  }

  it('sends a user with no business to the create-business step after login', async () => {
    api = mockApi(apiServer({ memberships: [] }))
    renderAt('/login')

    await logIn()

    expect(await screen.findByRole('heading', createHeading)).toBeInTheDocument()
    expect(document.querySelector('.app-shell')).toBeNull()
  })

  it.each(['/dashboard', '/marketplace', '/business/2', '/exchanges', '/messages', '/profile', '/listings'])(
    'keeps a user with no business away from %s',
    async (path) => {
      storeTokensFromLastVisit()
      api = mockApi(apiServer({ memberships: [] }))
      renderAt(path)

      expect(await screen.findByRole('heading', createHeading)).toBeInTheDocument()
      expect(document.querySelector('.app-shell')).toBeNull()
    },
  )

  it('creates the business and opens the dashboard with it active', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ memberships: [] }))
    renderAt('/dashboard')

    await screen.findByRole('heading', createHeading)
    type(/Business name/, '  Good Ground Creative  ')
    fireEvent.click(screen.getByRole('button', { name: /Create business/ }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(JSON.parse(api.calls('post', '/businesses')[0][0].data)).toEqual({ display_name: 'Good Ground Creative', legal_name: null })
    expect(switcherButton()).toHaveAccessibleName('Good Ground Creative, Owner. Switch business')
    expect(useSessionStore.getState()).toMatchObject({
      activeBusiness: { id: 'business-new', name: 'Good Ground Creative', role: 'owner' },
      memberships: [{ id: 'business-new' }],
    })
    expect(localStorage.getItem(ACTIVE_BUSINESS_KEY)).toBe('business-new')
  })

  it('creates another business from the switcher and switches to it', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ memberships: [northstar] }))
    renderAt('/dashboard')

    await screen.findByRole('heading', dashboardHeading)
    fireEvent.click(switcherButton())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Create another business' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Create another business' })).toBeInTheDocument()
    type(/Business name/, 'Second Shop')
    type(/Legal name/, 'Second Shop LLC')
    fireEvent.click(screen.getByRole('button', { name: /Create business/ }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(JSON.parse(api.calls('post', '/businesses')[0][0].data)).toEqual({ display_name: 'Second Shop', legal_name: 'Second Shop LLC' })
    expect(useSessionStore.getState().memberships?.map((business) => business.id)).toEqual(['business-1', 'business-new'])
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-new')
  })

  it('asks the user to verify their email when the API requires it', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ memberships: [], createReply: () => ({ status: 403, data: apiErrorBody('email_not_verified') }) }))
    renderAt('/dashboard')

    await screen.findByRole('heading', createHeading)
    type(/Business name/, 'Good Ground Creative')
    fireEvent.click(screen.getByRole('button', { name: /Create business/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verify your email address (founder@example.com) before creating a business, then try again.',
    )
    expect(screen.getByRole('heading', createHeading)).toBeInTheDocument()
    expect(useSessionStore.getState().memberships).toEqual([])
  })

  it('checks the business name before calling the API', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ memberships: [] }))
    renderAt('/dashboard')

    await screen.findByRole('heading', createHeading)
    type(/Business name/, '   ')
    fireEvent.click(screen.getByRole('button', { name: /Create business/ }))

    expect(await screen.findByText('Enter your business name.')).toBeInTheDocument()
    expect(api.calls('post', '/businesses')).toHaveLength(0)
  })

  it('lets a user with no business log out from the create step', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ memberships: [] }))
    renderAt('/dashboard')

    await screen.findByRole('heading', createHeading)
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', memberships: null, activeBusiness: null })
  })
})

describe('helpers', () => {
  it('builds business-scoped paths', () => {
    expect(businessPath('business-1')).toBe('/businesses/business-1')
    expect(businessPath('business-1', '/offers')).toBe('/businesses/business-1/offers')
    expect(businessPath('a/b')).toBe('/businesses/a%2Fb')
  })

  it('picks the preferred business, else the first, else none', () => {
    const businesses = [
      { id: 'a', name: 'A', role: 'owner' as const },
      { id: 'b', name: 'B', role: 'member' as const },
    ]
    expect(pickActiveBusiness(businesses, 'b')?.id).toBe('b')
    expect(pickActiveBusiness(businesses, 'gone')?.id).toBe('a')
    expect(pickActiveBusiness(businesses, null)?.id).toBe('a')
    expect(pickActiveBusiness([], 'a')).toBeNull()
  })

  it('makes initials from the business name', () => {
    expect(businessInitials('Northstar Digital')).toBe('ND')
    expect(businessInitials('frame & field studio')).toBe('FF')
    expect(businessInitials('Acme')).toBe('AC')
    expect(businessInitials('  ')).toBe('?')
  })
})
