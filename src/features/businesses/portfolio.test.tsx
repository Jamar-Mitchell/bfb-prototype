import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply, type MockRequest } from '../../test/mockApi'
import { answeredProfile, apiCategories, profileBusiness } from '../../test/profileServer'
import type { Portfolio, PortfolioBatch, PortfolioItem } from './portfolioApi'
import { buildBatch, draftFromItems, moveDraftItem, removeDraftItem, resetRefs, addDraftItem, updateDraftItem } from './portfolioDraft'
import type { Business } from './profileApi'
import type { PublicBusiness } from './publicProfileApi'
import { checkPortfolioFile } from './uploadsApi'
import { resetImageUrls } from './useImages'

const PATH = '/businesses/business-1/portfolio'

function signed(name: string, contentType: string) {
  return { content_type: contentType, url: `https://files.example/${name}?signature=abc`, url_expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }
}

function item(id: string, title: string, overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id,
    title,
    description: null,
    link_url: null,
    file: signed(`${id}.png`, 'image/png'),
    position: 0,
    upload_id: `upload-${id}`,
    original_filename: `${id}.png`,
    created_at: '2026-11-12T12:00:00Z',
    updated_at: '2026-11-12T12:00:00Z',
    ...overrides,
  }
}

const threeItems = () => [
  item('item-a', 'Bakery identity'),
  item('item-b', 'Packaging refresh'),
  item('item-c', 'Case study', { file: signed('case.pdf', 'application/pdf'), original_filename: 'case.pdf' }),
]

function portfolioOf(items: PortfolioItem[], version = 3): Portfolio {
  return { version, max_items: 24, items: items.map((entry, position) => ({ ...entry, position })) }
}

/** Apply a batch as the API does, enough for these tests. */
function applyBatch(portfolio: Portfolio, batch: PortfolioBatch): Portfolio & { added: Record<string, string> } {
  const added: Record<string, string> = {}
  const byKey = new Map(portfolio.items.filter((entry) => !(batch.remove ?? []).includes(entry.id)).map((entry) => [entry.id, entry]))
  for (const change of batch.update ?? []) {
    const { id, ...fields } = change
    byKey.set(id, { ...byKey.get(id)!, ...(fields as Partial<PortfolioItem>) })
  }
  for (const add of batch.add ?? []) {
    const id = `saved-${add.ref}`
    added[add.ref!] = id
    byKey.set(add.ref!, item(id, add.title, { description: add.description ?? null, link_url: add.link_url ?? null, upload_id: add.upload_id ?? null, file: add.upload_id ? signed(`${id}.png`, 'image/png') : null }))
  }
  const order = batch.order ?? [...byKey.keys()]
  return { ...portfolioOf(order.map((key) => byKey.get(key)!), portfolio.version + 1), added }
}

interface ServerOptions {
  business?: Business
  portfolio?: Portfolio
  reply?: (request: MockRequest, server: { portfolio: Portfolio }) => MockReply | undefined
}

function apiServer({ business = profileBusiness(answeredProfile), portfolio = portfolioOf(threeItems()), reply }: ServerOptions = {}) {
  const server = { business, portfolio, uploads: 0 }
  const handler: MockHandler = (request) => {
    const custom = reply?.(request, server)
    if (custom) return custom
    const { method, url, body } = request
    const user = apiUser({ email_verified: true })
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships: [apiMembership({ role: server.business.role })] } }
    if (method === 'get' && url === '/categories') return { status: 200, data: apiCategories }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: server.business }
    if (method === 'get' && url === PATH) return { status: 200, data: server.portfolio }
    if (method === 'put' && url === PATH) {
      const result = applyBatch(server.portfolio, body as PortfolioBatch)
      server.portfolio = { version: result.version, max_items: result.max_items, items: result.items }
      return { status: 200, data: result }
    }
    if (method === 'post' && url === '/businesses/business-1/uploads') {
      server.uploads += 1
      const file = (body as FormData).get('file') as File
      return {
        status: 201,
        data: {
          id: `new-upload-${server.uploads}`,
          business_id: 'business-1',
          category: (body as FormData).get('category'),
          content_type: file.type,
          size_bytes: file.size,
          original_filename: file.name,
          uploaded_by_user_id: 'user-1',
          created_at: '2026-11-12T12:00:00Z',
          ...signed(file.name, file.type),
        },
      }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
  return { server, handler }
}

let api: ReturnType<typeof mockApi> | undefined

async function openProfile(options: ServerOptions = {}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  const { server, handler } = apiServer(options)
  api = mockApi(handler)
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
  await screen.findByRole('heading', { level: 2, name: /Portfolio/ })
  return server
}

function portfolioSection() {
  return screen.getByRole('region', { name: /Portfolio/ })
}

/** Titles in the order shown. */
function shownTitles() {
  const list = within(portfolioSection()).getByRole('list', { name: 'Portfolio items' })
  return within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

function puts(): PortfolioBatch[] {
  return api!.calls('put', PATH).map(([config]) => JSON.parse(config.data as string))
}

/** Every request that changed the portfolio: the batch must be the only one. */
function portfolioWrites() {
  return api!.adapter.mock.calls.filter(([config]) => config.url?.startsWith(PATH) && config.method !== 'get')
}

function savePortfolio() {
  fireEvent.click(screen.getByRole('button', { name: /Save portfolio/ }))
}

function png(name: string, size = 1200) {
  const file = new File([new Uint8Array(1)], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

async function addItem({ title, link, file }: { title: string; link?: string; file?: File }) {
  fireEvent.click(within(portfolioSection()).getAllByRole('button', { name: /Add work sample/ })[0])
  const dialog = await screen.findByRole('dialog', { name: 'Add a work sample' })
  if (file) {
    fireEvent.change(within(dialog).getByLabelText('Upload work sample file'), { target: { files: [file] } })
    await within(dialog).findByRole('button', { name: 'Remove file' })
  }
  fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: title } })
  if (link) fireEvent.change(within(dialog).getByLabelText('Link'), { target: { value: link } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add to portfolio' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  resetImageUrls()
  resetRefs()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('portfolio draft', () => {
  const saved = portfolioOf(threeItems()).items

  it('builds no batch when nothing changed', () => {
    expect(buildBatch(3, saved, draftFromItems(saved))).toBeNull()
  })

  it('turns a reorder into one batch with the full order', () => {
    expect(buildBatch(3, saved, moveDraftItem(draftFromItems(saved), 2, 0))).toEqual({
      version: 3,
      add: [],
      update: [],
      remove: [],
      order: ['item-c', 'item-a', 'item-b'],
    })
  })

  it('combines adds, edits, removals and the order, with refs for new items', () => {
    let draft = draftFromItems(saved)
    draft = removeDraftItem(draft, 'item-b')
    draft = addDraftItem(draft, { title: 'Site launch', description: null, link_url: 'https://launch.example', upload_id: null, file: null, original_filename: null }, 'new-1')
    draft = updateDraftItem(draft, 'item-a', { ...draft[0], title: 'Bakery identity, 2026' })
    draft = moveDraftItem(draft, 2, 0)

    expect(buildBatch(3, saved, draft)).toEqual({
      version: 3,
      add: [{ ref: 'new-1', title: 'Site launch', link_url: 'https://launch.example' }],
      update: [{ id: 'item-a', title: 'Bakery identity, 2026' }],
      remove: ['item-b'],
      order: ['new-1', 'item-a', 'item-c'],
    })
  })

  it('checks a work sample file before uploading', () => {
    expect(checkPortfolioFile(png('work.png'))).toBeNull()
    expect(checkPortfolioFile(new File(['%PDF'], 'case.pdf', { type: 'application/pdf' }))).toBeNull()
    expect(checkPortfolioFile(new File(['GIF'], 'a.gif', { type: 'image/gif' }))).toMatch(/or a PDF/)
    expect(checkPortfolioFile(png('big.png', 15 * 1024 * 1024 + 1))).toBe('Work samples must be 15 MB or smaller.')
  })
})

describe('portfolio editor', () => {
  it('shows images, PDFs and the item count', async () => {
    await openProfile()

    expect(shownTitles()).toEqual(['Bakery identity', 'Packaging refresh', 'Case study'])
    expect(within(portfolioSection()).getByText('3 of 24')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open PDF: Case study' })).toHaveAttribute('href', 'https://files.example/case.pdf?signature=abc')
    expect(screen.queryByRole('button', { name: /Save portfolio/ })).not.toBeInTheDocument()
  })

  it('sends a reorder as a single batch request', async () => {
    const server = await openProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Move Bakery identity later' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Bakery identity later' }))
    expect(shownTitles()).toEqual(['Packaging refresh', 'Case study', 'Bakery identity'])
    expect(portfolioWrites()).toHaveLength(0)

    savePortfolio()

    await waitFor(() => expect(screen.queryByRole('button', { name: /Save portfolio/ })).not.toBeInTheDocument())
    expect(portfolioWrites()).toHaveLength(1)
    expect(puts()).toEqual([{ version: 3, add: [], update: [], remove: [], order: ['item-b', 'item-c', 'item-a'] }])
    expect(server.portfolio.version).toBe(4)
    expect(shownTitles()).toEqual(['Packaging refresh', 'Case study', 'Bakery identity'])
    expect(await screen.findByText('Your portfolio was saved.')).toBeInTheDocument()
  })

  it('reorders by drag and drop', async () => {
    await openProfile()
    const tiles = within(screen.getByRole('list', { name: 'Portfolio items' })).getAllByRole('listitem')

    fireEvent.dragStart(tiles[0])
    fireEvent.dragOver(tiles[2])
    fireEvent.drop(tiles[2])
    expect(shownTitles()).toEqual(['Packaging refresh', 'Case study', 'Bakery identity'])

    savePortfolio()
    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(puts()[0].order).toEqual(['item-b', 'item-c', 'item-a'])
  })

  it('sends adds, a removal, an edit and the new order together in one batch', async () => {
    const server = await openProfile()

    await addItem({ title: 'Menu photography', file: png('menu.png') })
    await addItem({ title: 'Site launch', link: 'launch.example' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Packaging refresh' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Bakery identity' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit work sample' })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Logo and signage.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update item' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // The link-only item goes first.
    for (let step = 0; step < 3; step += 1) fireEvent.click(screen.getByRole('button', { name: 'Move Site launch earlier' }))

    expect(shownTitles()).toEqual(['Site launch', 'Bakery identity', 'Case study', 'Menu photography'])
    expect(within(portfolioSection()).getAllByText('New')).toHaveLength(2)
    expect(within(portfolioSection()).getByText('Edited')).toBeInTheDocument()

    savePortfolio()
    await waitFor(() => expect(screen.queryByRole('button', { name: /Save portfolio/ })).not.toBeInTheDocument())

    // The file uploaded on its own first (it must exist before the batch); every change went in one PUT.
    expect(api!.calls('post', '/businesses/business-1/uploads')).toHaveLength(1)
    expect(portfolioWrites()).toHaveLength(1)
    expect(puts()).toEqual([
      {
        version: 3,
        add: [
          { ref: 'new-2', title: 'Site launch', link_url: 'https://launch.example' },
          { ref: 'new-1', title: 'Menu photography', upload_id: 'new-upload-1' },
        ],
        update: [{ id: 'item-a', description: 'Logo and signage.' }],
        remove: ['item-b'],
        order: ['new-2', 'item-a', 'item-c', 'new-1'],
      },
    ])
    expect(server.portfolio.items.map((entry) => entry.title)).toEqual(['Site launch', 'Bakery identity', 'Case study', 'Menu photography'])
    expect(shownTitles()).toEqual(['Site launch', 'Bakery identity', 'Case study', 'Menu photography'])
    expect(within(portfolioSection()).queryByText('New')).not.toBeInTheDocument()
  })

  it('restores the saved order when the batch fails, and can bring the changes back', async () => {
    await openProfile({ reply: ({ method, url }) => (method === 'put' && url === PATH ? { status: 500, data: apiErrorBody('internal_error') } : undefined) })

    fireEvent.click(screen.getByRole('button', { name: 'Move Case study earlier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bakery identity' }))
    expect(shownTitles()).toEqual(['Case study', 'Packaging refresh'])

    savePortfolio()

    expect(await within(portfolioSection()).findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(shownTitles()).toEqual(['Bakery identity', 'Packaging refresh', 'Case study'])
    expect(screen.queryByRole('button', { name: /Save portfolio/ })).not.toBeInTheDocument()
    expect(puts()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /Bring back my changes/ }))
    expect(shownTitles()).toEqual(['Case study', 'Packaging refresh'])
    expect(screen.getByRole('button', { name: /Save portfolio/ })).toBeInTheDocument()
  })

  it('reloads the latest portfolio when someone else changed it', async () => {
    await openProfile({
      reply: ({ method, url }, server) => {
        if (method !== 'put' || url !== PATH) return undefined
        // Another administrator saved first.
        server.portfolio = portfolioOf([item('item-c', 'Case study'), item('item-d', 'Their new sample')], 5)
        return { status: 409, data: apiErrorBody('portfolio_version_conflict', { version: 5 }) }
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Move Case study earlier' }))
    savePortfolio()

    expect(await screen.findByText(/Someone else changed this portfolio while you were editing/)).toBeInTheDocument()
    await waitFor(() => expect(shownTitles()).toEqual(['Case study', 'Their new sample']))
    expect(screen.queryByRole('button', { name: /Save portfolio/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bring back my changes/ })).not.toBeInTheDocument()

    // The next save uses the new version.
    fireEvent.click(screen.getByRole('button', { name: 'Move Their new sample earlier' }))
    api!.restore()
    const { handler } = apiServer({ portfolio: portfolioOf([item('item-c', 'Case study'), item('item-d', 'Their new sample')], 5) })
    api = mockApi(handler)
    savePortfolio()
    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(puts()[0]).toMatchObject({ version: 5, order: ['item-d', 'item-c'] })
  })

  it('needs a file or a link for a new work sample', async () => {
    await openProfile()

    fireEvent.click(within(portfolioSection()).getByRole('button', { name: /Add work sample/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a work sample' })
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Untitled' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to portfolio' }))

    expect(await within(dialog).findByText('Add a file, a link, or both.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Upload work sample file'), { target: { files: [new File(['GIF'], 'a.gif', { type: 'image/gif' })] } })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image, or a PDF.')
    expect(api!.calls('post', '/businesses/business-1/uploads')).toHaveLength(0)
  })

  it('disables adding at the 24-item cap', async () => {
    const full = Array.from({ length: 24 }, (_, index) => item(`item-${index}`, `Sample ${index + 1}`))
    await openProfile({ portfolio: portfolioOf(full) })

    expect(within(portfolioSection()).getByText('24 of 24')).toBeInTheDocument()
    expect(within(portfolioSection()).getByRole('button', { name: /Add work sample/ })).toBeDisabled()
    expect(screen.getByText('Your portfolio is full. Remove a work sample to add another.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Sample 1' }))
    expect(within(portfolioSection()).getByRole('button', { name: /Add work sample/ })).toBeEnabled()
  })

  it('is read-only for members', async () => {
    await openProfile({ business: profileBusiness({ ...answeredProfile, role: 'member' }) })

    expect(screen.getByText('Only owners and administrators can change the portfolio.')).toBeInTheDocument()
    expect(shownTitles()).toEqual(['Bakery identity', 'Packaging refresh', 'Case study'])
    expect(within(portfolioSection()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('is read-only while the profile is in review', async () => {
    await openProfile({ business: profileBusiness({ ...answeredProfile, profile_status: 'in_review' }) })

    expect(screen.getByText(/The portfolio can’t be changed while your profile is in review/)).toBeInTheDocument()
    expect(within(portfolioSection()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Portfolio items' })).getAllByRole('listitem')[0]).not.toHaveAttribute('draggable', 'true')
  })

  it('keeps submitting for review off while the portfolio has unsaved changes', async () => {
    await openProfile({ business: profileBusiness({ ...answeredProfile, logo_upload_id: 'upload-logo' }) })
    const submit = await screen.findByRole('button', { name: /Submit for review/ })
    expect(submit).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Case study' }))
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    expect(submit).toBeEnabled()
    expect(shownTitles()).toEqual(['Bakery identity', 'Packaging refresh', 'Case study'])
  })

  it('shows the empty state', async () => {
    await openProfile({ portfolio: portfolioOf([], 0) })
    expect(within(portfolioSection()).getByText('No work samples yet')).toBeInTheDocument()
    expect(within(portfolioSection()).getByText('0 of 24')).toBeInTheDocument()
  })
})

describe('public profile portfolio', () => {
  const BUSINESS_ID = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'

  it('shows the work samples to a logged-out visitor', async () => {
    const business: PublicBusiness = {
      id: BUSINESS_ID,
      display_name: 'Northside Studio',
      verified: true,
      logo_url: null,
      cover_url: null,
      description: null,
      website_url: null,
      social_links: {},
      location_city: null,
      location_region: null,
      location_country: null,
      service_area: null,
      industry: null,
      business_stage: null,
      team_size: null,
      categories: [],
      portfolio: [
        { id: 'p1', title: 'Bakery identity', description: 'Logo and signage.', link_url: null, file: signed('bakery.png', 'image/png') },
        { id: 'p2', title: 'Case study', description: null, link_url: null, file: signed('case.pdf', 'application/pdf') },
        { id: 'p3', title: 'Site launch', description: null, link_url: 'https://launch.example/', file: null },
      ],
      created_at: '2026-11-12T12:00:00Z',
    }
    api = mockApi(({ method, url }) =>
      method === 'get' && url === `/public/businesses/${BUSINESS_ID}` ? { status: 200, data: business } : { status: 404, data: apiErrorBody('not_found') },
    )
    render(
      <MemoryRouter initialEntries={[`/b/${BUSINESS_ID}`]}>
        <App />
      </MemoryRouter>,
    )

    const gallery = await screen.findByRole('list', { name: 'Northside Studio work samples' })
    expect(within(gallery).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Bakery identity', 'Case study', 'Site launch'])
    expect(within(gallery).getByText('Logo and signage.')).toBeInTheDocument()
    expect(within(gallery).getByRole('link', { name: 'View image: Bakery identity' })).toHaveAttribute('href', 'https://files.example/bakery.png?signature=abc')
    expect(within(gallery).getByRole('link', { name: 'Open PDF: Case study' })).toHaveAttribute('href', 'https://files.example/case.pdf?signature=abc')
    expect(within(gallery).getByRole('link', { name: 'Visit link: Site launch' })).toHaveAttribute('href', 'https://launch.example/')
    expect(within(gallery).queryByRole('button')).not.toBeInTheDocument()
  })
})
