import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'
import { answeredProfile, apiCategories, applyProfileUpdate, emptyPortfolio, profileBusiness } from '../../test/profileServer'
import type { Business, ProfileUpdate } from './profileApi'
import { normalizeUrl, profileUpdate, profileValues } from './profileForm'
import { checkImageFile } from './uploadsApi'
import { resetImageUrls } from './useImages'

const heading = { level: 1, name: /Show partners what makes you valuable/ } as const

function upload(id: string, category: 'logo' | 'cover') {
  return {
    id,
    business_id: 'business-1',
    category,
    content_type: 'image/png',
    size_bytes: 1200,
    original_filename: `${category}.png`,
    uploaded_by_user_id: 'user-1',
    created_at: '2026-11-12T12:00:00Z',
    url: `https://files.example/${id}.png?signature=abc`,
    url_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  }
}

interface ServerOptions {
  business?: Business
  path?: string
  reply?: (request: { method: string; url: string; body: unknown }) => MockReply | undefined
}

function apiServer({ business: initial = profileBusiness(), reply }: ServerOptions = {}) {
  const server = { business: initial, uploads: 0 }
  const handler: MockHandler = ({ method, url, body }) => {
    const custom = reply?.({ method, url, body })
    if (custom) return custom

    const user = apiUser({ email_verified: true })
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships: [apiMembership({ role: server.business.role })] } }
    if (method === 'get' && url === '/categories') return { status: 200, data: apiCategories }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: server.business }
    if (method === 'get' && url === '/businesses/business-1/portfolio') return { status: 200, data: emptyPortfolio }
    if (method === 'patch' && url === '/businesses/business-1/profile') {
      server.business = applyProfileUpdate(server.business, body as ProfileUpdate)
      return { status: 200, data: server.business }
    }
    if (method === 'post' && url === '/businesses/business-1/uploads') {
      server.uploads += 1
      const category = (body as FormData).get('category') as 'logo' | 'cover'
      return { status: 201, data: upload(`upload-${server.uploads}`, category) }
    }
    const existing = url.match(/^\/businesses\/business-1\/uploads\/(.+)$/)
    if (method === 'get' && existing) return { status: 200, data: upload(existing[1], 'logo') }
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
      <MemoryRouter initialEntries={[options.path ?? '/profile']}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
  await screen.findByRole('heading', heading)
  await screen.findByRole('list', { name: 'Required details' })
  return server
}

function patches(): ProfileUpdate[] {
  return api!.calls('patch', '/businesses/business-1/profile').map(([config]) => JSON.parse(config.data as string))
}

function requiredItem(label: string) {
  return within(screen.getByRole('list', { name: 'Required details' })).getByText(label).closest('li')!
}

function chooseFile(label: string, file: File) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })
}

function png(name = 'logo.png', size = 1200) {
  const file = new File([new Uint8Array(1)], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  resetImageUrls()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('profile form helpers', () => {
  it('sends only changed fields, clearing blanks and adding a missing https://', () => {
    const values = { ...profileValues(profileBusiness(answeredProfile)), website_url: 'northstar.example', location_region: '  ' }
    values.social_links.instagram = 'instagram.com/northstar'

    expect(profileUpdate(values, ['website_url', 'location_region', 'social_links'])).toEqual({
      website_url: 'https://northstar.example',
      location_region: null,
      social_links: { instagram: 'https://instagram.com/northstar' },
    })
    expect(normalizeUrl('http://a.example')).toBe('http://a.example')
  })

  it('checks type and size before uploading', () => {
    expect(checkImageFile('logo', png())).toBeNull()
    expect(checkImageFile('logo', new File(['x'], 'logo.gif', { type: 'image/gif' }))).toMatch(/JPEG, PNG or WebP/)
    expect(checkImageFile('logo', png('big.png', 5 * 1024 * 1024 + 1))).toBe('Your logo must be 5 MB or smaller.')
    expect(checkImageFile('cover', png('big.png', 6 * 1024 * 1024))).toBeNull()
    expect(checkImageFile('cover', png('huge.png', 11 * 1024 * 1024))).toBe('Your cover image must be 10 MB or smaller.')
    // No type from the browser: the extension decides, as on the server.
    expect(checkImageFile('logo', new File(['x'], 'logo.webp'))).toBeNull()
  })
})

describe('profile editor', () => {
  it('saves the changed fields and updates the completeness list', async () => {
    await openProfile({ business: profileBusiness({ legal_name: 'Northstar LLC', industry: 'Web studio' }) })

    expect(screen.getByLabelText('Industry')).toHaveValue('Web studio')
    expect(screen.getByLabelText('Industry')).toBeDisabled()
    expect(screen.getByText('22%')).toBeInTheDocument()
    expect(requiredItem('Business description')).toHaveAttribute('data-state', 'missing')
    expect(requiredItem('Service categories')).toHaveAttribute('data-state', 'missing')

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/ }))
    fireEvent.change(screen.getByLabelText('Business description'), { target: { value: 'Websites for growing businesses.' } })
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'northstar.example' } })
    fireEvent.click(await screen.findByRole('button', { name: /Branding & design/ }))
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }))

    expect(await screen.findByText('Your business profile has been updated.')).toBeInTheDocument()
    expect(patches()).toEqual([
      { description: 'Websites for growing businesses.', website_url: 'https://northstar.example', category_ids: ['cat-brand'] },
    ])
    expect(requiredItem('Business description')).toHaveAttribute('data-state', 'done')
    expect(requiredItem('Service categories')).toHaveAttribute('data-state', 'done')
    expect(screen.getByText('44%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit profile/ })).toBeInTheDocument()
  })

  it('shows the API’s field errors and keeps editing', async () => {
    await openProfile({
      reply: ({ method }) =>
        method === 'patch'
          ? { status: 422, data: apiErrorBody('validation_error', [{ loc: ['body', 'website_url'], message: 'URL scheme should be http or https.', type: 'url_scheme' }]) }
          : undefined,
    })

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/ }))
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://ok.example' } })
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }))

    expect(await screen.findByText('URL scheme should be http or https.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeInTheDocument()
  })

  it('refuses a file of the wrong type or size without uploading it', async () => {
    await openProfile()

    chooseFile('Upload logo', new File(['GIF89a'], 'logo.gif', { type: 'image/gif' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image for your logo.')

    chooseFile('Upload logo', png('big.png', 6 * 1024 * 1024))
    expect(await screen.findByText('Your logo must be 5 MB or smaller.')).toBeInTheDocument()

    expect(api!.calls('post', '/businesses/business-1/uploads')).toHaveLength(0)
  })

  it('shows the server’s refusal of a file', async () => {
    await openProfile({
      reply: ({ method, url }) =>
        method === 'post' && url.endsWith('/uploads')
          ? { status: 422, data: apiErrorBody('file_content_mismatch', { allowed: ['image/png'] }) }
          : undefined,
    })

    chooseFile('Upload logo', png())

    expect(await screen.findByText(/isn’t really the image type its name says/)).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
  })

  it('uploads a logo, puts it on the profile and previews it', async () => {
    const server = await openProfile({ business: profileBusiness(answeredProfile) })
    expect(requiredItem('Logo')).toHaveAttribute('data-state', 'missing')

    chooseFile('Upload logo', png())

    const logo = await screen.findByRole('img', { name: 'Northstar Digital logo' })
    expect(logo).toHaveAttribute('src', 'https://files.example/upload-1.png?signature=abc')
    const [config] = api!.calls('post', '/businesses/business-1/uploads')[0]
    expect((config.data as FormData).get('category')).toBe('logo')
    expect((config.data as FormData).get('file')).toBeInstanceOf(File)
    expect(patches()).toEqual([{ logo_upload_id: 'upload-1' }])
    expect(server.business.logo_upload_id).toBe('upload-1')
    expect(requiredItem('Logo')).toHaveAttribute('data-state', 'done')
    expect(screen.getByText('100%')).toBeInTheDocument()
    // The page fetched no extra signed URL: the upload response had one.
    expect(api!.adapter.mock.calls.filter(([request]) => request.method === 'get' && request.url?.includes('/uploads/'))).toHaveLength(0)
  })

  it('fetches a fresh signed URL for a saved logo', async () => {
    await openProfile({ business: profileBusiness({ ...answeredProfile, logo_upload_id: 'saved-logo' }) })

    expect(await screen.findByRole('img', { name: 'Northstar Digital logo' })).toHaveAttribute('src', 'https://files.example/saved-logo.png?signature=abc')
  })

  it('is read-only with an explanation while the profile is in review', async () => {
    await openProfile({ business: profileBusiness({ ...answeredProfile, logo_upload_id: 'saved-logo', profile_status: 'in_review' }) })

    expect(screen.getByText('Editing is paused while your profile is in review.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit profile/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /logo/i })).toBeNull()
    expect(screen.getByLabelText('Business name')).toBeDisabled()
  })

  it('is read-only for members', async () => {
    await openProfile({ business: profileBusiness({ role: 'member' }) })

    expect(screen.getByText('Only owners and administrators can edit the business profile.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit profile/ })).toBeNull()
  })

  it('stops editing when the profile was locked meanwhile', async () => {
    let locked = false
    await openProfile({
      reply: ({ method, url }) => {
        if (method === 'patch') {
          locked = true
          return { status: 409, data: apiErrorBody('profile_not_editable', { profile_status: 'in_review' }) }
        }
        if (locked && method === 'get' && url === '/businesses/business-1') {
          return { status: 200, data: profileBusiness({ ...answeredProfile, logo_upload_id: 'l', profile_status: 'in_review' }) }
        }
        return undefined
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/ }))
    fireEvent.change(screen.getByLabelText('Industry'), { target: { value: 'Design' } })
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }))

    expect(await screen.findByText(/can’t be edited while it is in review/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Editing is paused while your profile is in review.')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Save changes/ })).toBeNull()
  })

  it('shows the real completeness in the sidebar', async () => {
    await openProfile({ business: profileBusiness({ legal_name: 'Northstar LLC' }) })

    expect(screen.getByText('11% complete')).toBeInTheDocument()
  })
})

describe('legal details for agreements', () => {
  const section = () => screen.getByRole('region', { name: 'Legal details for agreements' })

  it('says what is missing, and saves the legal name, entity type and whole address', async () => {
    await openProfile()

    expect(within(section()).getByText(/Still needed: legal name, entity type, street address, city, postal code and country/)).toBeInTheDocument()
    expect(within(section()).getByText(/Private: never on your public profile/)).toBeInTheDocument()
    expect(within(section()).getByLabelText('Legal name')).toBeDisabled()

    fireEvent.click(within(section()).getByRole('button', { name: /Add legal details/ }))
    fireEvent.change(within(section()).getByLabelText('Legal name'), { target: { value: 'Northstar Digital LLC' } })
    fireEvent.change(within(section()).getByLabelText('Entity type'), { target: { value: 'llc' } })
    fireEvent.change(within(section()).getByLabelText('Street address'), { target: { value: '1 Main Street' } })
    fireEvent.change(within(section()).getByLabelText('City'), { target: { value: 'Detroit' } })
    fireEvent.change(within(section()).getByLabelText('Postal code'), { target: { value: '48201' } })
    fireEvent.change(within(section()).getByLabelText('Country'), { target: { value: 'US' } })
    fireEvent.click(within(section()).getByRole('button', { name: /Save legal details/ }))

    expect(await within(section()).findByText('Your legal details have been saved.')).toBeInTheDocument()
    expect(patches()).toEqual([
      {
        legal_name: 'Northstar Digital LLC',
        entity_type: 'llc',
        registered_address: { line1: '1 Main Street', line2: null, city: 'Detroit', region: null, postal_code: '48201', country: 'US' },
      },
    ])
    expect(within(section()).getByText('Ready for agreements.')).toBeInTheDocument()
    expect(within(section()).getByRole('button', { name: /Edit legal details/ })).toBeInTheDocument()
  })

  it('opens for editing when linked from a proposal', async () => {
    await openProfile({ path: '/profile?section=legal-details' })

    expect(within(section()).getByLabelText('Legal name')).toBeEnabled()
    expect(section()).toHaveFocus()
    expect(within(section()).getByRole('button', { name: /Save legal details/ })).toBeInTheDocument()
  })

  it('is read-only for members', async () => {
    await openProfile({ business: profileBusiness({ role: 'member', legal_name: 'Northstar LLC' }) })

    expect(within(section()).getByLabelText('Legal name')).toHaveValue('Northstar LLC')
    expect(within(section()).getByLabelText('Legal name')).toBeDisabled()
    expect(within(section()).queryByRole('button', { name: /legal details/ })).not.toBeInTheDocument()
  })
})
