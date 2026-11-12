import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'
import { answeredProfile, apiCategories, applyProfileUpdate, profileBusiness } from '../../test/profileServer'
import type { Business, ProfileUpdate } from '../businesses/profileApi'
import { resumeStep, stepUpdate, SUMMARY_STEP, WELCOME_STEP } from './onboardingSteps'

const welcomeHeading = { level: 1, name: /Turn what your business does best/ } as const

interface ServerOptions {
  business?: Business
  reply?: (request: { method: string; url: string; body: unknown }) => MockReply | undefined
}

function apiServer({ business: initial = profileBusiness(), reply }: ServerOptions = {}) {
  const server = { business: initial }
  const handler: MockHandler = ({ method, url, body }) => {
    const custom = reply?.({ method, url, body })
    if (custom) return custom

    const user = apiUser({ email_verified: true })
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships: [apiMembership({ role: server.business.role })] } }
    if (method === 'get' && url === '/categories') return { status: 200, data: apiCategories }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: server.business }
    if (method === 'patch' && url === '/businesses/business-1/profile') {
      server.business = applyProfileUpdate(server.business, body as ProfileUpdate)
      return { status: 200, data: server.business }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
  return { server, handler }
}

function renderAt(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
}

let api: ReturnType<typeof mockApi> | undefined

function open(path: string, options: ServerOptions = {}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  const { server, handler } = apiServer(options)
  api = mockApi(handler)
  renderAt(path)
  return server
}

function patches(): ProfileUpdate[] {
  return api!.calls('patch', '/businesses/business-1/profile').map(([config]) => JSON.parse(config.data as string))
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function press(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

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

describe('resume step', () => {
  it('starts with the welcome, picks up at the first unanswered step and ends at the summary', () => {
    expect(resumeStep(profileBusiness())).toBe(WELCOME_STEP)
    expect(resumeStep(profileBusiness({ legal_name: 'Northstar LLC' }))).toBe(1)
    expect(resumeStep(profileBusiness({ ...answeredProfile, description: null }))).toBe(3)
    expect(resumeStep(profileBusiness({ ...answeredProfile, service_area: null }))).toBe(4)
    // The logo is not an onboarding question.
    expect(resumeStep(profileBusiness(answeredProfile))).toBe(SUMMARY_STEP)
  })

  it('saves only the fields of the step, with a blank region cleared', () => {
    const values = {
      display_name: 'Northstar',
      legal_name: 'Northstar LLC',
      business_stage: 'startup',
      category_ids: ['cat-web'],
      industry: 'Web',
      description: 'We build websites.',
      team_size: 'just_me',
      location_city: 'Atlanta',
      location_region: '',
      location_country: 'US',
      service_area: 'local',
    }
    expect(stepUpdate(2, values)).toEqual({ category_ids: ['cat-web'], industry: 'Web' })
    expect(stepUpdate(4, values)).toEqual({ location_city: 'Atlanta', location_region: null, location_country: 'US', service_area: 'local' })
  })
})

describe('onboarding', () => {
  it('saves each step to the business profile as the user continues', async () => {
    const server = open('/onboarding')

    await screen.findByRole('heading', welcomeHeading)
    press(/Build my BFB profile/)

    // Step 1: the basics.
    expect(screen.getByRole('heading', { level: 1, name: 'Tell us about your business.' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Business name/)).toHaveValue('Northstar Digital')
    type(/Legal name/, 'Northstar Digital LLC')
    press(/Growing business/)
    press(/Continue/)

    // Step 2: categories from the API.
    expect(await screen.findByRole('heading', { level: 1, name: 'What does your business provide?' })).toBeInTheDocument()
    expect(patches()[0]).toEqual({ display_name: 'Northstar Digital', legal_name: 'Northstar Digital LLC', business_stage: 'growing' })
    const categories = await screen.findByRole('group', { name: /Service categories/ })
    expect(within(categories).queryByRole('button', { name: /Home services/ })).toBeNull()
    fireEvent.click(within(categories).getByRole('button', { name: /Web & software development/ }))
    fireEvent.click(within(categories).getByRole('button', { name: /Branding & design/ }))
    type(/Industry/, 'Web studio')
    press(/Continue/)

    // Step 3: description and team size.
    expect(await screen.findByRole('heading', { level: 1, name: 'How would you describe your business?' })).toBeInTheDocument()
    expect(patches()[1]).toEqual({ category_ids: ['cat-web', 'cat-brand'], industry: 'Web studio' })
    type(/Business description/, 'Websites for growing businesses.')
    press(/2–10 people/)
    press(/Continue/)

    // Step 4: location and service area.
    expect(await screen.findByRole('heading', { level: 1, name: 'Where does your business operate?' })).toBeInTheDocument()
    type(/City/, 'Atlanta')
    fireEvent.change(screen.getByLabelText(/Country/), { target: { value: 'US' } })
    press(/National/)
    press(/Continue/)

    // Summary: everything but the logo is filled.
    expect(await screen.findByText('ALMOST THERE')).toBeInTheDocument()
    expect(patches()[3]).toEqual({ location_city: 'Atlanta', location_region: null, location_country: 'US', service_area: 'national' })
    expect(screen.getByText(/Still needed: Logo\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your logo' })).toBeInTheDocument()
    expect(server.business.completeness.missing).toEqual(['logo'])
    expect(localStorage.getItem('bfb-onboarding')).toBeNull()
  })

  it('resumes midway at the first unanswered step, with saved answers kept', async () => {
    const { categories, industry, legal_name, business_stage } = answeredProfile
    open('/onboarding', { business: profileBusiness({ legal_name, business_stage, categories, industry }) })

    expect(await screen.findByRole('heading', { level: 1, name: 'How would you describe your business?' })).toBeInTheDocument()
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()

    press(/Back/)
    expect(screen.getByLabelText(/Industry/)).toHaveValue('Web studio')
    const group = await screen.findByRole('group', { name: /Service categories/ })
    expect(within(group).getByRole('button', { name: /Web & software development/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: /Branding & design/ })).toHaveAttribute('aria-pressed', 'false')

    press(/Back/)
    expect(screen.getByLabelText(/Legal name/)).toHaveValue('Northstar Digital LLC')
    expect(screen.getByRole('button', { name: /Growing business/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('checks the answers before saving', async () => {
    open('/onboarding', { business: profileBusiness({ legal_name: 'Northstar LLC' }) })

    expect(await screen.findByRole('heading', { level: 1, name: 'Tell us about your business.' })).toBeInTheDocument()
    press(/Continue/)

    expect(await screen.findByText('Choose the stage that fits best.')).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
  })

  it('allows at most five categories', async () => {
    open('/onboarding', { business: profileBusiness({ legal_name: 'Northstar LLC', business_stage: 'idea' }) })

    const group = await screen.findByRole('group', { name: /Service categories/ })
    const buttons = within(group).getAllByRole('button')
    buttons.slice(0, 5).forEach((button) => fireEvent.click(button))

    expect(within(group).getByText(/5 of 5 selected/)).toBeInTheDocument()
    expect(buttons[5]).toBeDisabled()
  })

  it('opens the summary when every question is answered', async () => {
    open('/onboarding', { business: profileBusiness(answeredProfile) })

    expect(await screen.findByText('ALMOST THERE')).toBeInTheDocument()
    expect(screen.getByText('Web & software development')).toBeInTheDocument()
    expect(screen.getByText('National · Atlanta')).toBeInTheDocument()
  })

  it('explains why setup is unavailable while the profile is in review', async () => {
    open('/onboarding', { business: profileBusiness({ ...answeredProfile, logo_upload_id: 'upload-1', profile_status: 'in_review' }) })

    expect(await screen.findByRole('heading', { level: 1, name: /Profile setup isn’t available/ })).toBeInTheDocument()
    expect(screen.getByText(/is in review/)).toBeInTheDocument()
  })

  it('shows the refusal when the profile was locked meanwhile', async () => {
    let locked = false
    open('/onboarding', {
      business: profileBusiness({ legal_name: 'Northstar LLC' }),
      reply: ({ method, url }) => {
        if (method === 'patch') {
          locked = true
          return { status: 409, data: apiErrorBody('profile_not_editable', { profile_status: 'in_review' }) }
        }
        if (locked && method === 'get' && url === '/businesses/business-1') {
          return { status: 200, data: profileBusiness({ ...answeredProfile, logo_upload_id: 'u', profile_status: 'in_review' }) }
        }
        return undefined
      },
    })

    await screen.findByRole('heading', { level: 1, name: 'Tell us about your business.' })
    press(/Startup/)
    press(/Continue/)

    expect(await screen.findByRole('heading', { level: 1, name: /Profile setup isn’t available/ })).toBeInTheDocument()
  })
})

describe('dashboard', () => {
  it('shows the user’s own business from the API', async () => {
    open('/dashboard', { business: profileBusiness({ legal_name: 'Northstar LLC', categories: answeredProfile.categories }) })

    expect(await screen.findByRole('heading', { level: 1, name: /Good evening, Alex\./ })).toBeInTheDocument()
    expect(await screen.findByText(/profile is 22% complete/)).toBeInTheDocument()
    expect(screen.getByText('web & software development')).toBeInTheDocument()

    press(/Finish setup/)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Tell us about your business.' })).toBeInTheDocument())
  })

  it('sends a user who answered every question to the profile for the logo', async () => {
    open('/dashboard', { business: profileBusiness(answeredProfile) })

    expect(await screen.findByText(/profile is 89% complete/)).toBeInTheDocument()
    press(/Add your logo/)
    expect(await screen.findByRole('heading', { level: 1, name: /Show partners what makes you valuable/ })).toBeInTheDocument()
  })

  it('says when the profile is approved', async () => {
    open('/dashboard', { business: profileBusiness({ ...answeredProfile, logo_upload_id: 'upload-1', profile_status: 'approved' }) })

    expect(await screen.findByText(/profile is approved and visible to potential partners/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Finish setup|Add your logo/ })).toBeNull()
  })
})
