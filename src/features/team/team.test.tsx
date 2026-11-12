import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiBusiness, apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'
import { resetResendCooldown } from '../auth/useResendVerification'
import type { Invitation, TeamMember } from './teamApi'
import { assignableRoles, canActOn, canManageTeam } from './teamPermissions'

type Role = TeamMember['role']

function member(overrides: Partial<TeamMember> & Pick<TeamMember, 'user_id' | 'display_name' | 'role'>): TeamMember {
  return { email: `${overrides.user_id}@example.com`, joined_at: '2026-11-01T00:00:00Z', ...overrides }
}

function invitation(overrides: Partial<Invitation> & Pick<Invitation, 'id' | 'email'>): Invitation {
  return {
    role: 'member',
    invited_by_user_id: 'user-1',
    invited_by_name: 'Alex Morgan',
    created_at: '2026-11-10T00:00:00Z',
    expires_at: '2026-11-17T00:00:00Z',
    expired: false,
    ...overrides,
  }
}

const alex = (role: Role = 'owner') => member({ user_id: 'user-1', display_name: 'Alex Morgan', email: 'founder@example.com', role })
const priya = member({ user_id: 'user-2', display_name: 'Priya Shah', role: 'owner' })
const sam = member({ user_id: 'user-3', display_name: 'Sam Lee', role: 'member' })

const northstar = apiMembership({ business_id: 'business-1', business_name: 'Northstar Digital', role: 'owner' })
const frameAndField = apiMembership({ business_id: 'business-2', business_name: 'Frame & Field Studio', role: 'member' })

const dashboardHeading = { level: 1, name: /Good evening/ } as const
const teamHeading = { level: 1, name: 'Your team.' } as const

interface ServerOptions {
  /** The caller's role in business-1; the members list and `/account` agree with it. */
  role?: Role
  members?: TeamMember[]
  invitations?: Invitation[]
  memberships?: ReturnType<typeof apiMembership>[]
  emailVerified?: boolean
  email?: string
  reply?: (request: { method: string; url: string; body: unknown }) => MockReply | undefined
}

function apiServer({
  role = 'owner',
  members,
  invitations = [],
  memberships,
  emailVerified = true,
  email = 'founder@example.com',
  reply,
}: ServerOptions = {}): MockHandler {
  const team = members ?? [alex(role), sam]
  let open = [...invitations]
  const user = apiUser({ email_verified: emailVerified, email })

  return ({ method, url, body }) => {
    const custom = reply?.({ method, url, body })
    if (custom) return custom

    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'post' && url === '/auth/login') return { status: 200, data: { ...tokenBody('access-1', 'refresh-1'), user } }
    if (method === 'post' && url === '/auth/logout') return { status: 204 }
    if (method === 'get' && url === '/account') {
      return { status: 200, data: { user, memberships: memberships ?? [{ ...northstar, role }] } }
    }
    if (method === 'get' && url === '/businesses/business-1/members') return { status: 200, data: team }
    if (method === 'get' && url === '/businesses/business-1/invitations') return { status: 200, data: open }
    if (method === 'post' && url === '/businesses/business-1/invitations') {
      const { email: invited, role: invitedRole } = body as { email: string; role: Role }
      const created = invitation({ id: `inv-${open.length + 1}`, email: invited, role: invitedRole })
      open = [created, ...open.filter((item) => item.email !== invited)]
      return { status: 201, data: created }
    }
    const revoke = url.match(/^\/businesses\/business-1\/invitations\/(.+)$/)
    if (method === 'delete' && revoke) {
      open = open.filter((item) => item.id !== revoke[1])
      return { status: 204 }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

/** Log in from a previous visit, as an already-restored session would be. */
function storeTokensFromLastVisit() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
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

async function openTeam(options: ServerOptions = {}) {
  storeTokensFromLastVisit()
  api = mockApi(apiServer(options))
  renderAt('/team')
  await screen.findByRole('heading', teamHeading)
  return screen.findByRole('region', { name: 'Members' })
}

let api: ReturnType<typeof mockApi> | undefined

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  resetResendCooldown()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('team permissions', () => {
  it('lets owners act on anyone and administrators on everyone but owners', () => {
    expect(canManageTeam('member')).toBe(false)
    expect(canActOn('owner', 'owner')).toBe(true)
    expect(canActOn('administrator', 'owner')).toBe(false)
    expect(canActOn('administrator', 'member')).toBe(true)
    expect(canActOn('member', 'member')).toBe(false)
    expect(assignableRoles('administrator')).toEqual(['administrator', 'member'])
  })
})

describe('team page', () => {
  it('lists members with their roles and marks the logged-in user', async () => {
    const members = await openTeam({ members: [alex(), priya, sam] })

    const rows = within(members).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('You')).toBeInTheDocument()
    expect(within(rows[0]).getByText('founder@example.com')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('You')).not.toBeInTheDocument()
    expect(within(members).getByRole('combobox', { name: 'Role for Sam Lee' })).toHaveValue('member')
  })

  it('is in the sidebar', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer())
    renderAt('/dashboard')
    await screen.findByRole('heading', dashboardHeading)

    fireEvent.click(screen.getByRole('button', { name: 'Team' }))

    expect(await screen.findByRole('heading', teamHeading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Team' })).toHaveClass('active')
  })

  it('invites someone by email with a role and lists the invitation', async () => {
    await openTeam()
    const invite = screen.getByRole('region', { name: 'Invite a teammate' })

    fireEvent.change(within(invite).getByLabelText('Email'), { target: { value: 'new.person@example.com' } })
    fireEvent.change(within(invite).getByLabelText('Role'), { target: { value: 'administrator' } })
    fireEvent.click(within(invite).getByRole('button', { name: /Send invitation/ }))

    expect(await screen.findByText('Invitation sent to new.person@example.com.')).toBeInTheDocument()
    expect(api!.calls('post', '/businesses/business-1/invitations').map(([config]) => JSON.parse(config.data))).toEqual([
      { email: 'new.person@example.com', role: 'administrator' },
    ])
    const pending = screen.getByRole('region', { name: 'Pending invitations' })
    expect(await within(pending).findByText('new.person@example.com')).toBeInTheDocument()
    expect(within(invite).getByLabelText('Email')).toHaveValue('')
  })

  it('shows an existing member on the email field', async () => {
    await openTeam({
      reply: ({ method, url }) =>
        method === 'post' && url === '/businesses/business-1/invitations' ? { status: 409, data: apiErrorBody('already_business_member') } : undefined,
    })
    const invite = screen.getByRole('region', { name: 'Invite a teammate' })

    fireEvent.change(within(invite).getByLabelText('Email'), { target: { value: 'sam@example.com' } })
    fireEvent.click(within(invite).getByRole('button', { name: /Send invitation/ }))

    expect(await within(invite).findByText('This person is already a member of this business.')).toBeInTheDocument()
    expect(within(invite).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('asks an unverified owner to verify before inviting', async () => {
    await openTeam({ emailVerified: false })
    const invite = screen.getByRole('region', { name: 'Invite a teammate' })

    expect(within(invite).getByRole('alert')).toHaveTextContent('Verify your email address (founder@example.com) before inviting people.')
    expect(within(invite).getByRole('button', { name: /Send invitation/ })).toBeDisabled()
  })

  it('changes a member’s role', async () => {
    let samRole: Role = 'member'
    await openTeam({
      reply: ({ method, url, body }) => {
        if (method === 'patch' && url === '/businesses/business-1/members/user-3') {
          samRole = (body as { role: Role }).role
          return { status: 200, data: { ...sam, role: samRole } }
        }
        if (method === 'get' && url === '/businesses/business-1/members') return { status: 200, data: [alex(), { ...sam, role: samRole }] }
        return undefined
      },
    })

    fireEvent.change(screen.getByRole('combobox', { name: 'Role for Sam Lee' }), { target: { value: 'administrator' } })

    expect(await screen.findByText('Sam Lee is now administrator.')).toBeInTheDocument()
    expect(JSON.parse(api!.calls('patch', '/businesses/business-1/members/user-3')[0][0].data)).toEqual({ role: 'administrator' })
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Role for Sam Lee' })).toHaveValue('administrator'))
  })

  it('explains clearly when the last owner tries to step down', async () => {
    await openTeam({
      reply: ({ method, url }) =>
        method === 'patch' && url === '/businesses/business-1/members/user-1' ? { status: 409, data: apiErrorBody('last_business_owner') } : undefined,
    })

    fireEvent.change(screen.getByRole('combobox', { name: 'Your role' }), { target: { value: 'member' } })
    const dialog = screen.getByRole('alertdialog', { name: 'Become member?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change my role' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You are the only owner. Every business needs one, so make another member an owner before changing your role.',
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Your role' })).toHaveValue('owner')
  })

  it('removes a member after confirming', async () => {
    let team = [alex(), sam]
    await openTeam({
      reply: ({ method, url }) => {
        if (method === 'delete' && url === '/businesses/business-1/members/user-3') {
          team = [alex()]
          return { status: 204 }
        }
        if (method === 'get' && url === '/businesses/business-1/members') return { status: 200, data: team }
        return undefined
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove Sam Lee' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Remove Sam Lee?' })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api!.calls('delete', '/businesses/business-1/members/user-3')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Remove Sam Lee' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Sam Lee was removed from Northstar Digital.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Sam Lee' })).not.toBeInTheDocument())
  })

  it('lists pending invitations with the expired state, invites again and revokes', async () => {
    await openTeam({
      invitations: [
        invitation({ id: 'inv-a', email: 'fresh@example.com' }),
        invitation({ id: 'inv-b', email: 'late@example.com', expired: true, expires_at: '2026-11-08T12:00:00Z' }),
      ],
    })
    const pending = screen.getByRole('region', { name: 'Pending invitations' })
    const [fresh, late] = within(pending).getAllByRole('listitem')
    expect(within(fresh).queryByText('Expired')).not.toBeInTheDocument()
    expect(within(late).getByText('Expired')).toBeInTheDocument()
    expect(within(late).getByText('Expired Nov 8, 2026')).toBeInTheDocument()

    fireEvent.click(within(late).getByRole('button', { name: 'Invite late@example.com again' }))
    expect(await screen.findByText('We sent a new invitation to late@example.com. The old link no longer works.')).toBeInTheDocument()
    expect(JSON.parse(api!.calls('post', '/businesses/business-1/invitations')[0][0].data)).toEqual({ email: 'late@example.com', role: 'member' })

    fireEvent.click(within(pending).getByRole('button', { name: 'Revoke the invitation to fresh@example.com' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Revoke this invitation?' })).getByRole('button', { name: 'Revoke' }))

    expect(await screen.findByText('The invitation to fresh@example.com was withdrawn.')).toBeInTheDocument()
    expect(api!.calls('delete', '/businesses/business-1/invitations/inv-a')).toHaveLength(1)
    await waitFor(() => expect(within(pending).queryByText('fresh@example.com')).not.toBeInTheDocument())
  })
})

describe('team controls by role', () => {
  it('shows a member the team without management controls', async () => {
    const members = await openTeam({ role: 'member', members: [priya, alex('member'), sam] })

    expect(within(members).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(members).queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(within(members).getAllByText('Owner')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Invite a teammate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pending invitations' })).not.toBeInTheDocument()
    expect(api!.calls('get', '/businesses/business-1/invitations')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Leave business/ })).toBeInTheDocument()
  })

  it('keeps administrators away from owners', async () => {
    const members = await openTeam({
      role: 'administrator',
      members: [priya, alex('administrator'), sam],
      invitations: [invitation({ id: 'inv-o', email: 'co.owner@example.com', role: 'owner' }), invitation({ id: 'inv-m', email: 'helper@example.com' })],
    })

    expect(within(members).queryByRole('combobox', { name: 'Role for Priya Shah' })).not.toBeInTheDocument()
    expect(within(members).queryByRole('button', { name: 'Remove Priya Shah' })).not.toBeInTheDocument()
    const samRole = within(members).getByRole('combobox', { name: 'Role for Sam Lee' })
    expect(within(samRole).getAllByRole('option').map((option) => option.textContent)).toEqual(['Administrator', 'Member'])
    expect(within(members).getByRole('button', { name: 'Remove Sam Lee' })).toBeInTheDocument()

    const invite = screen.getByRole('region', { name: 'Invite a teammate' })
    expect(within(within(invite).getByLabelText('Role')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Administrator', 'Member'])

    const pending = screen.getByRole('region', { name: 'Pending invitations' })
    expect(within(pending).queryByRole('button', { name: /co\.owner@example\.com/ })).not.toBeInTheDocument()
    expect(within(pending).getByRole('button', { name: 'Revoke the invitation to helper@example.com' })).toBeInTheDocument()
  })

  it('updates the switcher when the list shows a newer role', async () => {
    await openTeam({ role: 'owner', members: [priya, alex('member')] })

    await waitFor(() => expect(useSessionStore.getState().activeBusiness?.role).toBe('member'))
    expect(screen.queryByRole('region', { name: 'Invite a teammate' })).not.toBeInTheDocument()
  })
})

describe('leaving a business', () => {
  it('leaves after confirming and switches to another business', async () => {
    await openTeam({
      memberships: [northstar, frameAndField],
      reply: ({ method, url }) => (method === 'delete' && url === '/businesses/business-1/members/me' ? { status: 204 } : undefined),
    })

    fireEvent.click(screen.getByRole('button', { name: /Leave business/ }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Leave Northstar Digital?' })).getByRole('button', { name: 'Leave business' }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(api!.calls('delete', '/businesses/business-1/members/me')).toHaveLength(1)
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-2')
    expect(useSessionStore.getState().memberships?.map((business) => business.id)).toEqual(['business-2'])
    expect(screen.getByText('You left Northstar Digital.')).toBeInTheDocument()
  })

  it('sends a user who left their only business to create one', async () => {
    await openTeam({
      role: 'member',
      members: [priya, alex('member')],
      reply: ({ method, url }) => (method === 'delete' && url === '/businesses/business-1/members/me' ? { status: 204 } : undefined),
    })

    fireEvent.click(screen.getByRole('button', { name: /Leave business/ }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Leave business' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Create your business' })).toBeInTheDocument()
  })

  it('tells the only owner to hand over ownership first', async () => {
    await openTeam({
      reply: ({ method, url }) =>
        method === 'delete' && url === '/businesses/business-1/members/me' ? { status: 409, data: apiErrorBody('last_business_owner') } : undefined,
    })

    fireEvent.click(screen.getByRole('button', { name: /Leave business/ }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Leave business' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You are the only owner, so you can’t leave yet. Make another member an owner first, then leave.')
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-1')
  })
})

describe('accepting an invitation', () => {
  const joined = apiBusiness({ id: 'business-9', display_name: 'Peachtree Growth Co.', role: 'member' })
  const peachtree = apiMembership({ business_id: 'business-9', business_name: 'Peachtree Growth Co.', role: 'member' })

  function acceptReply(reply: MockReply) {
    return ({ method, url }: { method: string; url: string }) => (method === 'post' && url === '/invitations/accept' ? reply : undefined)
  }

  it('joins the business, switches to it and opens the dashboard', async () => {
    storeTokensFromLastVisit()
    api = mockApi(
      apiServer({
        reply: ({ method, url }) => {
          if (method === 'post' && url === '/invitations/accept') return { status: 200, data: joined }
          if (method === 'get' && url === '/account') {
            return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [northstar, peachtree] } }
          }
          return undefined
        },
      }),
    )
    renderAt('/accept-invite?token=tok-1')

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    // StrictMode runs the effect twice; the one-shot token goes out once.
    expect(api.calls('post', '/invitations/accept')).toHaveLength(1)
    expect(JSON.parse(api.calls('post', '/invitations/accept')[0][0].data)).toEqual({ token: 'tok-1' })
    expect(useSessionStore.getState().activeBusiness).toEqual({ id: 'business-9', name: 'Peachtree Growth Co.', role: 'member' })
    expect(screen.getByText('You joined Peachtree Growth Co..')).toBeInTheDocument()
    await waitFor(() => expect(useSessionStore.getState().memberships).toHaveLength(2))
  })

  it('explains an invitation for another address and lets the user switch account', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ reply: acceptReply({ status: 403, data: apiErrorBody('invitation_email_mismatch') }) }))
    renderAt('/accept-invite?token=tok-2')

    expect(await screen.findByRole('heading', { level: 1, name: 'This invitation is for another email address' })).toBeInTheDocument()
    expect(screen.getByText(/You’re logged in as founder@example.com/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Log out and switch account' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'You’ve been invited to a business on BFB' })).toBeInTheDocument()
  })

  it('explains an expired invitation', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ reply: acceptReply({ status: 400, data: apiErrorBody('invitation_expired') }) }))
    renderAt('/accept-invite?token=tok-3')

    expect(await screen.findByRole('heading', { level: 1, name: 'This invitation has expired' })).toBeInTheDocument()
    expect(screen.getByText(/Ask the person who invited you to send a new one/)).toBeInTheDocument()
  })

  it('explains a link that was used or withdrawn', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer({ reply: acceptReply({ status: 400, data: apiErrorBody('invalid_invitation_token') }) }))
    renderAt('/accept-invite?token=tok-4')

    expect(await screen.findByRole('heading', { level: 1, name: 'This invitation link no longer works' })).toBeInTheDocument()
  })

  it('asks an unverified user to verify, then accepts on request', async () => {
    let verified = false
    storeTokensFromLastVisit()
    api = mockApi(
      apiServer({
        emailVerified: false,
        reply: ({ method, url }) => {
          if (method === 'post' && url === '/invitations/accept') {
            return verified ? { status: 200, data: joined } : { status: 403, data: apiErrorBody('email_not_verified') }
          }
          if (method === 'post' && url === '/auth/resend-verification') return { status: 202 }
          if (method === 'get' && url === '/account' && verified) {
            return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [northstar, peachtree] } }
          }
          return undefined
        },
      }),
    )
    renderAt('/accept-invite?token=tok-5')

    expect(await screen.findByRole('heading', { level: 1, name: 'Verify your email to join' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }))
    expect(await screen.findByText('We sent a new link to founder@example.com. Check your inbox.')).toBeInTheDocument()

    verified = true
    fireEvent.click(screen.getByRole('button', { name: 'Accept the invitation' }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-9')
  })

  it('keeps the token through logging in and accepts afterwards', async () => {
    api = mockApi(apiServer({ memberships: [northstar, peachtree], reply: acceptReply({ status: 200, data: joined }) }))
    renderAt('/accept-invite?token=tok-6')

    fireEvent.click(await screen.findByRole('button', { name: /Log in to accept/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(api.calls('post', '/invitations/accept')).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'founder@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse 1' } })
    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(JSON.parse(api.calls('post', '/invitations/accept')[0][0].data)).toEqual({ token: 'tok-6' })
    expect(useSessionStore.getState().activeBusiness?.id).toBe('business-9')
  })

  it('keeps the token through registering', async () => {
    api = mockApi(
      apiServer({
        emailVerified: false,
        reply: ({ method, url }) => {
          if (method === 'post' && url === '/auth/register') return { status: 201, data: apiUser() }
          if (method === 'post' && url === '/invitations/accept') return { status: 403, data: apiErrorBody('email_not_verified') }
          return undefined
        },
      }),
    )
    renderAt('/accept-invite?token=tok-7')

    fireEvent.click(await screen.findByRole('link', { name: 'Create an account' }))
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex Morgan' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'founder@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse 1' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse 1' } })
    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))

    // Back on the invitation; this new account still has to verify its email.
    expect(await screen.findByRole('heading', { level: 1, name: 'Verify your email to join' })).toBeInTheDocument()
    expect(JSON.parse(api.calls('post', '/invitations/accept')[0][0].data)).toEqual({ token: 'tok-7' })
  })
})
