import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiBusiness, apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'
import type { Category, Offer, ProfileStatus } from './listingsApi'
import { formatValueRange, majorToMinor, minorToMajor } from './money'

type Role = 'owner' | 'administrator' | 'member'

const branding: Category = { id: 'cat-1', slug: 'branding-design', name: 'Branding & design', description: null, sort_order: 1, requires_review: false }
const web: Category = { id: 'cat-2', slug: 'web-development', name: 'Web development', description: null, sort_order: 2, requires_review: false }

const OFFER_REQUIRED = ['description', 'deliverables', 'estimated_value', 'delivery_format'] as const

function missingFor(offer: Omit<Offer, 'missing_for_publish'>): string[] {
  return OFFER_REQUIRED.filter((key) => {
    if (key === 'description') return !offer.description
    if (key === 'deliverables') return offer.deliverables.length === 0
    if (key === 'estimated_value') return offer.value_min_minor === null
    return !offer.delivery_format
  })
}

function offer(overrides: Partial<Offer> & Pick<Offer, 'id' | 'title'>): Offer {
  const base: Omit<Offer, 'missing_for_publish'> = {
    business_id: 'business-1',
    category: { id: branding.id, slug: branding.slug, name: branding.name, requires_review: false },
    description: 'Two-week sprint for a new brand.',
    deliverables: ['Logo', 'Brand guidelines'],
    value_min_minor: 150000,
    value_max_minor: 300000,
    currency: 'USD',
    capacity: 2,
    availability: null,
    delivery_format: 'remote',
    location_restrictions: null,
    status: 'draft',
    published_at: null,
    archived_at: null,
    created_at: '2026-11-12T12:00:00Z',
    updated_at: '2026-11-12T12:00:00Z',
    ...overrides,
  }
  return { ...base, missing_for_publish: overrides.missing_for_publish ?? missingFor(base) }
}

interface ServerOptions {
  role?: Role
  profileStatus?: ProfileStatus
  offers?: Offer[]
  reply?: (request: { method: string; url: string; body: unknown }) => MockReply | undefined
}

const TRANSITIONS: Record<string, { from: Offer['status'][]; to: Offer['status'] }> = {
  publish: { from: ['draft'], to: 'active' },
  pause: { from: ['active'], to: 'paused' },
  resume: { from: ['paused'], to: 'active' },
  archive: { from: ['draft', 'active', 'paused'], to: 'archived' },
}

/** A small in-memory BFB API for one business and its offers. */
function apiServer({ role = 'owner', profileStatus = 'approved', offers = [], reply }: ServerOptions = {}): MockHandler {
  let stored = [...offers]
  const user = apiUser({ email_verified: true })

  return ({ method, url, body }) => {
    const custom = reply?.({ method, url, body })
    if (custom) return custom

    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships: [apiMembership({ role })] } }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: apiBusiness({ role, profile_status: profileStatus }) }
    if (method === 'get' && url === '/categories') return { status: 200, data: [branding, web] }
    if (method === 'get' && url === '/businesses/business-1/offers') return { status: 200, data: stored }
    if (method === 'post' && url === '/businesses/business-1/offers') {
      const request = body as Record<string, unknown>
      const created = offer({
        ...(request as Partial<Offer>),
        id: `offer-${stored.length + 1}`,
        title: String(request.title),
        category: { ...branding, id: String(request.category_id) },
        status: 'draft',
      })
      stored = [created, ...stored]
      return { status: 201, data: created }
    }
    const one = url.match(/^\/businesses\/business-1\/offers\/([^/]+)$/)
    if (method === 'patch' && one) {
      const current = stored.find((item) => item.id === one[1])
      if (!current) return { status: 404, data: apiErrorBody('not_found') }
      const { missing_for_publish: _ignored, ...rest } = { ...current, ...(body as Partial<Offer>) }
      const updated = offer(rest)
      stored = stored.map((item) => (item.id === updated.id ? updated : item))
      return { status: 200, data: updated }
    }
    const command = url.match(/^\/businesses\/business-1\/offers\/([^/]+)\/(publish|pause|resume|archive)$/)
    if (method === 'post' && command) {
      const current = stored.find((item) => item.id === command[1])
      if (!current) return { status: 404, data: apiErrorBody('not_found') }
      const transition = TRANSITIONS[command[2]]
      if (!transition.from.includes(current.status)) return { status: 409, data: apiErrorBody('invalid_listing_status', { status: current.status }) }
      const updated = { ...current, status: transition.to }
      stored = stored.map((item) => (item.id === updated.id ? updated : item))
      return { status: 200, data: updated }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

let api: ReturnType<typeof mockApi> | undefined

async function openListings(options: ServerOptions = {}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  api = mockApi(apiServer(options))
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/listings']}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
  await screen.findByRole('heading', { level: 1, name: 'Manage what you trade.' })
  const section = screen.getByRole('region', { name: 'What we offer' })
  await waitFor(() => expect(within(section).queryByText('Loading your offers…')).not.toBeInTheDocument())
  return section
}

function card(section: HTMLElement, title: string) {
  return within(section).getByRole('article', { name: title })
}

function posted(method: string, url: string) {
  return api!.calls(method, url).map(([config]) => (config.data ? JSON.parse(config.data as string) : undefined))
}

async function openCreateForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Add listing' }))
  const dialog = await screen.findByRole('dialog', { name: 'Add an offer' })
  await within(dialog).findByRole('option', { name: 'Branding & design' })
  return dialog
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

describe('listing money', () => {
  it('converts dollars to cents exactly and back', () => {
    expect(majorToMinor('1,500')).toBe(150000)
    expect(majorToMinor('$19.99')).toBe(1999)
    expect(majorToMinor('0.5')).toBe(50)
    expect(majorToMinor('')).toBeNull()
    expect(majorToMinor('12.345')).toBeUndefined()
    expect(majorToMinor('-5')).toBeUndefined()
    expect(majorToMinor('2000000000')).toBeUndefined()
    expect(minorToMajor(150050)).toBe('1500.50')
    expect(minorToMajor(150000)).toBe('1500')
    expect(formatValueRange(150000, 300000, 'USD')).toBe('$1,500–$3,000')
    expect(formatValueRange(1999, null, 'USD')).toBe('$19.99')
    expect(formatValueRange(null, null, 'USD')).toBeNull()
  })
})

describe('offers', () => {
  it('lists offers with their status and filters them', async () => {
    const section = await openListings({
      offers: [
        offer({ id: 'o1', title: 'Brand identity sprint', status: 'active' }),
        offer({ id: 'o2', title: 'Landing pages', status: 'paused' }),
        offer({ id: 'o3', title: 'Frontend development', description: null }),
      ],
    })

    expect(within(card(section, 'Brand identity sprint')).getByText('Active')).toBeInTheDocument()
    expect(within(card(section, 'Brand identity sprint')).getByText('Estimated exchange value · $1,500–$3,000')).toBeInTheDocument()
    expect(within(card(section, 'Landing pages')).getByText('Paused')).toBeInTheDocument()
    expect(within(card(section, 'Frontend development')).getByText('To publish, add a description.')).toBeInTheDocument()
    expect(screen.getByText('1 active offer')).toBeInTheDocument()

    fireEvent.click(within(section).getByRole('button', { name: 'Paused 1' }))
    expect(within(section).getAllByRole('article')).toHaveLength(1)
    expect(within(section).getByRole('button', { name: 'Paused 1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(section).getByRole('button', { name: 'Archived 0' }))
    expect(within(section).getByText('No archived offers.')).toBeInTheDocument()
  })

  it('creates a draft offer, sending money in minor units', async () => {
    const section = await openListings()
    expect(within(section).getByText('No offers yet')).toBeInTheDocument()
    const dialog = await openCreateForm()

    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: 'Brand identity sprint' } })
    fireEvent.change(within(dialog).getByLabelText(/^Category/), { target: { value: 'cat-1' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Two-week sprint.' } })
    const deliverable = within(dialog).getByLabelText('Deliverables')
    fireEvent.change(deliverable, { target: { value: 'Logo' } })
    fireEvent.keyDown(deliverable, { key: 'Enter' })
    fireEvent.change(deliverable, { target: { value: 'Brand guidelines' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Logo' }))
    fireEvent.change(within(dialog).getByLabelText('Estimated value from (USD)'), { target: { value: '1,500' } })
    fireEvent.change(within(dialog).getByLabelText('Estimated value to (USD)'), { target: { value: '3000.50' } })
    fireEvent.change(within(dialog).getByLabelText('Delivery format'), { target: { value: 'hybrid' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create offer' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posted('post', '/businesses/business-1/offers')).toEqual([
      {
        category_id: 'cat-1',
        title: 'Brand identity sprint',
        deliverables: ['Brand guidelines'],
        value_min_minor: 150000,
        value_max_minor: 300050,
        currency: 'USD',
        description: 'Two-week sprint.',
        capacity: null,
        availability: null,
        delivery_format: 'hybrid',
        location_restrictions: null,
      },
    ])
    const created = card(section, 'Brand identity sprint')
    expect(within(created).getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Draft offer “Brand identity sprint” created.')).toBeInTheDocument()
  })

  it('checks the form before sending it', async () => {
    await openListings()
    const dialog = await openCreateForm()

    fireEvent.change(within(dialog).getByLabelText('Estimated value from (USD)'), { target: { value: '500' } })
    fireEvent.change(within(dialog).getByLabelText('Estimated value to (USD)'), { target: { value: '200' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create offer' }))

    expect(await within(dialog).findByText('Enter a title.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose a category.')).toBeInTheDocument()
    expect(api!.calls('post', '/businesses/business-1/offers')).toHaveLength(0)
  })

  it('shows the API’s invalid_range on the maximum value', async () => {
    await openListings({
      reply: ({ method, url }) =>
        method === 'post' && url === '/businesses/business-1/offers'
          ? { status: 422, data: apiErrorBody('invalid_range', { fields: ['value_min_minor', 'value_max_minor'] }) }
          : undefined,
    })
    const dialog = await openCreateForm()

    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: 'Brand sprint' } })
    fireEvent.change(within(dialog).getByLabelText(/^Category/), { target: { value: 'cat-1' } })
    fireEvent.change(within(dialog).getByLabelText('Estimated value from (USD)'), { target: { value: '100' } })
    fireEvent.change(within(dialog).getByLabelText('Estimated value to (USD)'), { target: { value: '200' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create offer' }))

    expect(await within(dialog).findByText('The maximum needs a minimum and can’t be below it.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Estimated value to (USD)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog', { name: 'Add an offer' })).toBeInTheDocument()
  })

  it('edits an offer, showing money in dollars', async () => {
    const section = await openListings({ offers: [offer({ id: 'o1', title: 'Brand sprint', value_min_minor: 150050, value_max_minor: null })] })

    fireEvent.click(within(section).getByRole('button', { name: 'Edit Brand sprint' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit offer' })
    expect(within(dialog).getByLabelText('Estimated value from (USD)')).toHaveValue('1500.50')
    expect(within(dialog).getByRole('list', { name: 'Deliverables added' })).toHaveTextContent('Brand guidelines')

    fireEvent.change(within(dialog).getByLabelText('Estimated value from (USD)'), { target: { value: '2000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posted('patch', '/businesses/business-1/offers/o1')[0]).toMatchObject({ value_min_minor: 200000, value_max_minor: null, capacity: 2 })
    expect(within(card(section, 'Brand sprint')).getByText('Estimated exchange value · $2,000')).toBeInTheDocument()
  })

  it('pauses an active offer and resumes it', async () => {
    const section = await openListings({ offers: [offer({ id: 'o1', title: 'Brand sprint', status: 'active' })] })

    fireEvent.click(within(card(section, 'Brand sprint')).getByRole('button', { name: 'Pause' }))

    expect(await within(card(section, 'Brand sprint')).findByText('Paused')).toBeInTheDocument()
    expect(api!.calls('post', '/businesses/business-1/offers/o1/pause')).toHaveLength(1)
    expect(screen.getByText('“Brand sprint” is paused. Partners won’t see it until you resume it.')).toBeInTheDocument()

    fireEvent.click(within(card(section, 'Brand sprint')).getByRole('button', { name: 'Resume' }))
    expect(await within(card(section, 'Brand sprint')).findByText('Active')).toBeInTheDocument()
  })

  it('disables publish while the business is not approved, and says why', async () => {
    const section = await openListings({ profileStatus: 'in_review', offers: [offer({ id: 'o1', title: 'Brand sprint' })] })

    const note = await screen.findByText('Your business profile is in review. You can publish once it’s approved.')
    const publish = within(card(section, 'Brand sprint')).getByRole('button', { name: 'Publish' })
    expect(publish).toBeDisabled()
    expect(publish.getAttribute('aria-describedby')).toContain(note.id)
  })

  it('disables publish for an incomplete offer and lists what is missing', async () => {
    const section = await openListings({ offers: [offer({ id: 'o1', title: 'Brand sprint', deliverables: [], delivery_format: null })] })

    const brand = card(section, 'Brand sprint')
    await waitFor(() => expect(screen.queryByText(/Checking whether your business/)).not.toBeInTheDocument())
    expect(within(brand).getByText('To publish, add at least one deliverable and a delivery format.')).toBeInTheDocument()
    expect(within(brand).getByRole('button', { name: 'Publish' })).toBeDisabled()
  })

  it('publishes a complete offer once the business is approved', async () => {
    const section = await openListings({ offers: [offer({ id: 'o1', title: 'Brand sprint' })] })

    const publish = within(card(section, 'Brand sprint')).getByRole('button', { name: 'Publish' })
    await waitFor(() => expect(publish).toBeEnabled())
    fireEvent.click(publish)

    expect(await within(card(section, 'Brand sprint')).findByText('Active')).toBeInTheDocument()
    expect(api!.calls('post', '/businesses/business-1/offers/o1/publish')).toHaveLength(1)
    expect(screen.getByText('“Brand sprint” is live.')).toBeInTheDocument()
    expect(within(card(section, 'Brand sprint')).getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('explains a publish the API refuses because the business is no longer approved', async () => {
    const section = await openListings({
      offers: [offer({ id: 'o1', title: 'Brand sprint' })],
      reply: ({ method, url }) =>
        method === 'post' && url.endsWith('/publish') ? { status: 409, data: apiErrorBody('business_not_approved', { profile_status: 'suspended' }) } : undefined,
    })
    const publish = within(card(section, 'Brand sprint')).getByRole('button', { name: 'Publish' })
    await waitFor(() => expect(publish).toBeEnabled())
    fireEvent.click(publish)

    expect(await within(section).findByRole('alert')).toHaveTextContent('Your business is suspended, so its listings can’t go live.')
  })

  it('asks before archiving, since archiving is final', async () => {
    const section = await openListings({ offers: [offer({ id: 'o1', title: 'Brand sprint', status: 'active' })] })

    fireEvent.click(within(section).getByRole('button', { name: 'Archive Brand sprint' }))
    let dialog = await screen.findByRole('alertdialog', { name: 'Archive “Brand sprint”?' })
    expect(dialog).toHaveTextContent('Archiving is final.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api!.calls('post', '/businesses/business-1/offers/o1/archive')).toHaveLength(0)

    fireEvent.click(within(section).getByRole('button', { name: 'Archive Brand sprint' }))
    dialog = await screen.findByRole('alertdialog', { name: 'Archive “Brand sprint”?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive offer' }))

    expect(await within(card(section, 'Brand sprint')).findByText('Archived')).toBeInTheDocument()
    expect(api!.calls('post', '/businesses/business-1/offers/o1/archive')).toHaveLength(1)
    expect(within(section).queryByRole('button', { name: 'Edit Brand sprint' })).not.toBeInTheDocument()
  })

  it('is read-only for members', async () => {
    const section = await openListings({ role: 'member', offers: [offer({ id: 'o1', title: 'Brand sprint' }), offer({ id: 'o2', title: 'Web build', status: 'active' })] })

    expect(screen.queryByRole('button', { name: 'Add listing' })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /^(Edit|Archive) / })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /^(Publish|Pause)$/ })).not.toBeInTheDocument()
    expect(within(card(section, 'Web build')).getByText('Active')).toBeInTheDocument()
  })
})
