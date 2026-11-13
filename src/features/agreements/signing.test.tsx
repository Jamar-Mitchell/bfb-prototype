import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi, type MockReply, type MockRequest } from '../../test/mockApi'
import {
  AGREEMENT,
  AGREEMENT_ID,
  agreementDetail,
  confirmedSigner,
  proposalServer,
  SIGNER_CONSENT,
  signer,
  type ProposalServerOptions,
} from '../../test/proposalServer'
import type { TeamMember } from '../team/teamApi'
import type { Agreement } from './agreementsApi'
import { signerStep, signerStepDetail } from './agreementCopy'

const SIGNER = `${AGREEMENT}/signer`
const CONFIRM = `${AGREEMENT}/signer/confirm`
const SIGN = `${AGREEMENT}/sign`
const MEMBERS = '/businesses/business-1/members'

const team: TeamMember[] = [
  { user_id: 'user-1', display_name: 'Alex Morgan', email: 'founder@example.com', role: 'owner', joined_at: '2026-11-01T00:00:00Z' } as TeamMember,
  { user_id: 'user-2', display_name: 'Jo Park', email: 'jo@northstar.example', role: 'administrator', joined_at: '2026-11-02T00:00:00Z' } as TeamMember,
  { user_id: 'user-3', display_name: 'Riley Chen', email: 'riley@northstar.example', role: 'member', joined_at: '2026-11-03T00:00:00Z' } as TeamMember,
]

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

let api: ReturnType<typeof mockApi> | undefined

/**
 * A fake API whose agreement changes as signers are named, confirm and sign. `reply` answers
 * first, for refusals.
 */
function start(initial: Agreement, { reply, ...options }: ProposalServerOptions = {}) {
  let agreement = initial
  const handle = (request: MockRequest): MockReply | undefined => {
    const { method, url, body } = request
    if (method === 'get' && url === MEMBERS) return { status: 200, data: team }
    if (method === 'get' && url === AGREEMENT) return { status: 200, data: agreement }
    if (method === 'put' && url === SIGNER) {
      const { user_id, title } = body as { user_id: string; title?: string }
      const member = team.find((item) => item.user_id === user_id)!
      const named = signer('a', { user_id, full_name: member.display_name, email: member.email, title: title ?? null })
      agreement = { ...agreement, signers: [named, ...agreement.signers.filter((item) => item.side !== 'a')] }
      return { status: 200, data: named }
    }
    if (method === 'post' && url === CONFIRM) {
      const { full_name, title } = body as { full_name: string; title: string }
      const confirmed = confirmedSigner('a', { full_name, title })
      const signers = [confirmed, ...agreement.signers.filter((item) => item.side !== 'a')]
      const both = signers.length === 2 && signers.every((item) => item.confirmed)
      agreement = { ...agreement, signers, ...(both ? { status: 'signing' as const, signature_provider: 'development', signing_started_at: '2026-11-19T12:00:00Z' } : {}) }
      return { status: 200, data: confirmed }
    }
    if (method === 'post' && url === SIGN) {
      const typed = (body as { full_name: string }).full_name
      const mine = agreement.signers.find((item) => item.side === 'a')!
      if (typed.trim().toLowerCase().replace(/\s+/g, ' ') !== mine.full_name.toLowerCase()) return { status: 422, data: apiErrorBody('signature_name_mismatch') }
      const signers = agreement.signers.map((item) => (item.side === 'a' ? { ...item, status: 'signed' as const, signed_at: '2026-11-20T12:00:00Z' } : item))
      const done = signers.every((item) => item.status === 'signed')
      agreement = { ...agreement, signers, ...(done ? { status: 'signed' as const, signed_at: '2026-11-20T12:00:00Z' } : {}) }
      return { status: 200, data: agreement }
    }
    return undefined
  }
  api = mockApi(proposalServer({ ...options, agreement: initial, reply: async (request) => (await reply?.(request)) ?? handle(request) }))
  return api
}

function logIn() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  logIn()
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

async function signersCard() {
  return screen.findByRole('region', { name: 'Signing' })
}

function signerRow(card: HTMLElement, business: string) {
  return within(card).getByRole('listitem', { name: `Signer for ${business}` })
}

describe('signer copy', () => {
  it('says where each signer is', () => {
    const now = new Date('2026-11-20T12:00:00Z')
    expect(signerStep(null)).toBe('not_named')
    expect(signerStep(signer('a'))).toBe('named')
    expect(signerStepDetail(signer('a'), now)).toBe('Named on 17 Nov. Hasn’t confirmed yet.')
    expect(signerStep(confirmedSigner('a'))).toBe('confirmed')
    expect(signerStepDetail(confirmedSigner('a', { status: 'signed', signed_at: '2026-11-19T12:00:00Z' }), now)).toBe('Signed on 19 Nov.')
    expect(signerStep(signer('b', { status: 'declined' }))).toBe('declined')
  })
})

describe('naming the signer', () => {
  it('lets an owner name themselves from the owners and administrators, then asks them to confirm', async () => {
    start(agreementDetail())
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const card = await signersCard()
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('No signer yet')
    expect(signerRow(card, 'Northside Studio')).toHaveTextContent('Nobody is named to sign yet.')
    expect(screen.queryByRole('region', { name: 'Your signature' })).not.toBeInTheDocument()

    fireEvent.click(within(card).getByRole('button', { name: 'Name who signs' }))
    const dialog = await screen.findByRole('dialog', { name: 'Name who signs for Northstar Digital' })
    const choices = within(dialog).getByRole('group', { name: 'Who signs' })
    await waitFor(() => expect(within(choices).getAllByRole('radio')).toHaveLength(2))
    expect(within(choices).getByRole('radio', { name: /Alex Morgan \(you\)/ })).toBeChecked()
    expect(within(choices).getByRole('radio', { name: /Jo Park/ })).not.toBeChecked()
    // Members can't sign, so they aren't offered.
    expect(within(dialog).queryByRole('radio', { name: /Riley Chen/ })).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent('1 member can’t sign: only owners and administrators can.')

    fireEvent.change(within(dialog).getByLabelText('Their title (optional)'), { target: { value: 'Founder' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Name signer' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api!.calls('put', SIGNER)).toHaveLength(1)
    expect(JSON.parse(api!.calls('put', SIGNER)[0][0].data as string)).toEqual({ user_id: 'user-1', title: 'Founder' })
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Waiting to confirm')
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Alex Morgan, Founder')
    expect(within(card).getByRole('button', { name: 'Change signer' })).toBeInTheDocument()
    expect(screen.getByText('You’re named to sign. Confirm your details to continue.')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Confirm you can sign' })).toBeInTheDocument()
  })

  it('replaces a confirmed signer, saying their confirmation is cleared', async () => {
    start(agreementDetail({ signers: [confirmedSigner('a', { user_id: 'user-2', full_name: 'Jo Park', title: 'Director' })] }))
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const card = await signersCard()
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Confirmed')
    // Someone else signs for the business, so there is nothing for this user to do.
    expect(screen.queryByRole('region', { name: 'Your signature' })).not.toBeInTheDocument()

    fireEvent.click(within(card).getByRole('button', { name: 'Change signer' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change who signs for Northstar Digital' })
    const jo = await within(dialog).findByRole('radio', { name: /Jo Park/ })
    expect(jo).toBeChecked()
    expect(jo.closest('label')).toHaveTextContent('Current signer')
    expect(within(dialog).getByLabelText('Their title (optional)')).toHaveValue('Director')

    fireEvent.click(within(dialog).getByRole('radio', { name: /Alex Morgan/ }))
    expect(dialog).toHaveTextContent('Jo Park, Director is named now and has confirmed. Alex Morgan replaces them and must confirm before anyone signs.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change signer' }))

    await waitFor(() => expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Waiting to confirm'))
    expect(JSON.parse(api!.calls('put', SIGNER)[0][0].data as string).user_id).toBe('user-1')
  })

  it('reloads and says why when signing started before the change', async () => {
    let started = false
    start(agreementDetail({ signers: [confirmedSigner('a', { user_id: 'user-2', full_name: 'Jo Park' })] }), {
      reply: ({ method, url }) => {
        if (method === 'put' && url === SIGNER) {
          started = true
          return { status: 409, data: apiErrorBody('invalid_agreement_status', { status: 'signing', reason: 'signing_started' }) }
        }
        if (method === 'get' && url === AGREEMENT && started) {
          return { status: 200, data: agreementDetail({ status: 'signing', signature_provider: 'development', signers: [confirmedSigner('a', { user_id: 'user-2', full_name: 'Jo Park' }), confirmedSigner('b')] }) }
        }
        return undefined
      },
    })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    fireEvent.click(within(await signersCard()).getByRole('button', { name: 'Change signer' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Alex Morgan/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change signer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Signing has started, so the signers can’t be changed any more.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Out for signature').length).toBeGreaterThan(0))
    expect(within(await signersCard()).queryByRole('button', { name: 'Change signer' })).not.toBeInTheDocument()
  })

  it('shows a refused choice in the dialog when the person can no longer sign', async () => {
    start(agreementDetail(), {
      reply: ({ method, url }) => (method === 'put' && url === SIGNER ? { status: 422, data: apiErrorBody('invalid_signer', { reason: 'role_not_allowed' }) } : undefined),
    })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    fireEvent.click(within(await signersCard()).getByRole('button', { name: 'Name who signs' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Jo Park/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Name signer' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That person is no longer an owner or administrator of Northstar Digital')
  })

  it('shows members who signs without letting them change it', async () => {
    start(agreementDetail({ signers: [signer('a', { user_id: 'user-2', full_name: 'Jo Park' })] }), { role: 'member' })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const card = await signersCard()
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Jo Park')
    expect(card).toHaveTextContent('Only owners and administrators of Northstar Digital can name who signs.')
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('confirming', () => {
  it('shows the exact consent wording and blocks confirming until every box is ticked', async () => {
    start(agreementDetail({ signers: [signer('a')] }))
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const form = await screen.findByRole('form', { name: 'Confirm you can sign' })
    expect(within(screen.getByRole('region', { name: 'Your signature' })).getByRole('form')).toBe(form)
    expect(within(form).getByLabelText(/Full name/)).toHaveValue('Alex Morgan')
    const authority = within(form).getByRole('checkbox', { name: SIGNER_CONSENT.authority })
    const consent = within(form).getByRole('checkbox', { name: SIGNER_CONSENT.esign_consent })
    expect(form).toHaveTextContent(`Draft wording Version ${SIGNER_CONSENT.version}, not reviewed by counsel.`)

    fireEvent.change(within(form).getByLabelText(/Title/), { target: { value: 'Founder' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Confirm' }))
    expect(await within(form).findByText('Tick this box to confirm you may sign for the business.')).toBeInTheDocument()
    expect(within(form).getByText('Tick this box to agree to electronic records and signatures.')).toBeInTheDocument()

    fireEvent.click(authority)
    fireEvent.click(within(form).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(form).queryByText('Tick this box to confirm you may sign for the business.')).not.toBeInTheDocument())
    expect(within(form).getByText('Tick this box to agree to electronic records and signatures.')).toBeInTheDocument()
    expect(api!.calls('post', CONFIRM)).toHaveLength(0)

    fireEvent.click(consent)
    fireEvent.click(within(form).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(api!.calls('post', CONFIRM)).toHaveLength(1))
    expect(JSON.parse(api!.calls('post', CONFIRM)[0][0].data as string)).toEqual({
      full_name: 'Alex Morgan',
      title: 'Founder',
      authority_confirmed: true,
      esign_consent: true,
      consent_text_version: SIGNER_CONSENT.version,
    })

    const panel = screen.getByRole('region', { name: 'Your signature' })
    await waitFor(() => expect(panel).toHaveTextContent('You confirmed on 18 Nov that you sign for Northstar Digital LLC as Alex Morgan, Founder.'))
    expect(panel).toHaveTextContent('Signing starts once Northside Studio names its signer and they confirm.')
    expect(signerRow(await signersCard(), 'Northstar Digital')).toHaveTextContent('Confirmed')
  })

  it('starts signing when the second signer confirms', async () => {
    start(agreementDetail({ signers: [signer('a', { title: 'Founder' }), confirmedSigner('b')] }))
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const form = await screen.findByRole('form', { name: 'Confirm you can sign' })
    fireEvent.click(within(form).getByRole('checkbox', { name: SIGNER_CONSENT.authority }))
    fireEvent.click(within(form).getByRole('checkbox', { name: SIGNER_CONSENT.esign_consent }))
    fireEvent.click(within(form).getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByRole('form', { name: 'Sign the agreement' })).toBeInTheDocument()
    expect(screen.getByText('Confirmed. Signing has started.')).toBeInTheDocument()
    expect(screen.getAllByText('Out for signature').length).toBeGreaterThan(0)
  })

  it('reloads when the consent wording changed, and says signing is not available when no provider is on', async () => {
    let reply: MockReply = { status: 422, data: apiErrorBody('signer_confirmation_required', { missing: ['consent_text_version'], consent_text_version: '2026-12-draft-2' }) }
    start(agreementDetail({ signers: [signer('a', { title: 'Founder' }), confirmedSigner('b')] }), {
      reply: ({ method, url }) => (method === 'post' && url === CONFIRM ? reply : undefined),
    })
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const tickAndConfirm = async () => {
      const form = await screen.findByRole('form', { name: 'Confirm you can sign' })
      for (const box of within(form).getAllByRole('checkbox')) if (!(box as HTMLInputElement).checked) fireEvent.click(box)
      fireEvent.click(within(form).getByRole('button', { name: 'Confirm' }))
      return form
    }

    await tickAndConfirm()
    expect(await screen.findByText('The consent wording changed since you opened the page. Read it again below, then confirm.')).toBeInTheDocument()
    await waitFor(() => expect(api!.calls('get', AGREEMENT).length).toBeGreaterThan(1))

    reply = { status: 409, data: apiErrorBody('signature_provider_unavailable') }
    const form = await tickAndConfirm()
    expect(await within(form).findByRole('alert')).toHaveTextContent('Signing isn’t switched on here yet, so signing can’t start. Nothing changed.')
  })
})

describe('signing', () => {
  const signing = (overrides: Partial<Agreement> = {}) =>
    agreementDetail({ status: 'signing', signature_provider: 'development', signing_started_at: '2026-11-19T12:00:00Z', signers: [confirmedSigner('a'), confirmedSigner('b')], ...overrides })

  it('shows the sign step only to the named signer', async () => {
    start(signing({ signers: [confirmedSigner('a', { user_id: 'user-2', full_name: 'Jo Park' }), confirmedSigner('b')] }))
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const card = await signersCard()
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Jo Park, Founder')
    expect(card).toHaveTextContent('Both signers confirmed. The agreement is out for signature.')
    expect(screen.queryByRole('region', { name: 'Your signature' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Sign the agreement' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it('refuses a name that does not match, then signs and waits for the other business', async () => {
    start(signing())
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const form = await screen.findByRole('form', { name: 'Sign the agreement' })
    expect(form).toHaveTextContent('type your full name as you confirmed it: Alex Morgan.')
    const name = within(form).getByLabelText(/Type your full name to sign/)

    fireEvent.click(within(form).getByRole('button', { name: 'Sign agreement' }))
    expect(await within(form).findByText('Type your full name to sign.')).toBeInTheDocument()
    expect(api!.calls('post', SIGN)).toHaveLength(0)

    fireEvent.change(name, { target: { value: 'Alex Morgen' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Sign agreement' }))
    expect(await within(form).findByText('This doesn’t match the name you confirmed, Alex Morgan. Capitals and extra spaces don’t matter.')).toBeInTheDocument()

    fireEvent.change(name, { target: { value: '  alex   MORGAN ' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Sign agreement' }))

    const panel = screen.getByRole('region', { name: 'Your signature' })
    await waitFor(() => expect(panel).toHaveTextContent('You signed on 20 Nov. Waiting for Northside Studio’s signer, Sam Lee, to sign.'))
    expect(JSON.parse(api!.calls('post', SIGN)[1][0].data as string)).toEqual({ full_name: 'alex   MORGAN' })
    const card = await signersCard()
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Signed')
    expect(signerRow(card, 'Northside Studio')).toHaveTextContent('Confirmed')
    expect(screen.getByText('Signed. Waiting for Northside Studio’s signer.')).toBeInTheDocument()
  })

  it('marks the agreement signed when the second signature arrives', async () => {
    start(signing({ signers: [confirmedSigner('a'), confirmedSigner('b', { status: 'signed', signed_at: '2026-11-19T15:00:00Z' })] }))
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const card = await signersCard()
    expect(signerRow(card, 'Northside Studio')).toHaveTextContent('Signed on 19 Nov.')
    const form = await screen.findByRole('form', { name: 'Sign the agreement' })
    fireEvent.change(within(form).getByLabelText(/Type your full name to sign/), { target: { value: 'Alex Morgan' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Sign agreement' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Your signature' })).not.toBeInTheDocument())
    expect(screen.getAllByText('Signed').length).toBeGreaterThan(1)
    expect(card).toHaveTextContent('Both businesses signed.')
    expect(signerRow(card, 'Northstar Digital')).toHaveTextContent('Signed on 20 Nov.')
    expect(screen.getByRole('region', { name: 'Where it stands' })).toHaveTextContent('Both businesses signed this agreement on 20 Nov.')
    expect(screen.getByText('Signed. Both businesses have signed the agreement.')).toBeInTheDocument()
  })

  it('points to the provider when the agreement is not signed on BFB', async () => {
    start(signing({ signature_provider: 'docusign' }))
    renderAt(`/agreements/${AGREEMENT_ID}`)

    const panel = await screen.findByRole('region', { name: 'Your signature' })
    expect(panel).toHaveTextContent('This agreement is signed with the signature provider, not on BFB. Follow the signing link it sends to founder@example.com.')
    expect(screen.queryByRole('form', { name: 'Sign the agreement' })).not.toBeInTheDocument()
  })
})
