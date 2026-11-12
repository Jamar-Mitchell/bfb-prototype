import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, MailPlus, RotateCw, Send, Trash2, UserMinus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showToast } from '../../components/feedback'
import { SelectField, TextField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { removeBusiness, updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { useSessionStore } from '../../stores/session'
import { ResendVerificationButton } from '../auth/ResendVerificationButton'
import { businessInitials, ROLE_LABELS } from '../businesses/businessDisplay'
import { ConfirmDialog } from './ConfirmDialog'
import {
  changeMemberRole,
  inviteMember,
  leaveBusiness,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  type BusinessRole,
  type Invitation,
  type TeamMember,
} from './teamApi'
import { assignableRoles, canActOn, canManageTeam, ROLE_DESCRIPTIONS } from './teamPermissions'
import './TeamPage.css'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value: string) {
  return dateFormat.format(new Date(value))
}

type TeamData = { members: TeamMember[]; invitations: Invitation[] | null }

type Notice = { tone: 'success' | 'error'; text: string }

type PendingConfirm =
  | { kind: 'remove'; member: TeamMember }
  | { kind: 'self-role'; member: TeamMember; role: BusinessRole }
  | { kind: 'revoke'; invitation: Invitation }
  | { kind: 'leave' }

/** Copy for a refused team action. `subject` names the member it was about. */
function problemText(error: ApiError, action: 'role' | 'remove' | 'leave' | 'invitation', subject?: { name: string; isYou: boolean }) {
  switch (error.code) {
    case 'last_business_owner': {
      if (action === 'leave') return 'You are the only owner, so you can’t leave yet. Make another member an owner first, then leave.'
      const who = subject?.isYou ? 'You are' : `${subject?.name ?? 'This person'} is`
      const what = action === 'remove' ? 'removing them' : subject?.isYou ? 'changing your role' : 'changing their role'
      return `${who} the only owner. Every business needs one, so make another member an owner before ${what}.`
    }
    case 'business_role_required':
      return (error.details as { required_role?: string } | undefined)?.required_role === 'owner'
        ? 'Only owners can do that to an owner or an owner invitation.'
        : 'Your role in this business does not allow that.'
    case 'not_found':
      return action === 'invitation'
        ? 'That invitation is no longer open. The list has been refreshed.'
        : 'That person is no longer in this business. The list has been refreshed.'
    default:
      return error.userMessage
  }
}

/** Team page: members and their roles, invitations, and leaving the business. */
export function TeamPage() {
  const business = useActiveBusiness()
  const businessId = business.id
  const userId = useSessionStore((state) => state.user?.id)
  const [data, setData] = useState<TeamData | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const navigate = useNavigate()

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const members = await listMembers(businessId)
        const me = members.find((member) => member.user_id === userId)
        // The list is the freshest word on the caller's role: keep the switcher in step.
        if (me && live) updateBusinessRole(businessId, me.role)
        const role = me?.role ?? useSessionStore.getState().activeBusiness?.role ?? 'member'
        const invitations = canManageTeam(role) ? await listInvitations(businessId) : null
        if (live) {
          setData({ members, invitations })
          setLoadError(null)
        }
      } catch (error) {
        if (live) setLoadError(toApiError(error))
      }
    })()
    return () => {
      live = false
    }
  }, [businessId, userId, reloadKey])

  if (!data) {
    return (
      <>
        <TeamHeading businessName={business.name} />
        {loadError ? (
          <ErrorState title="We couldn’t load your team" error={loadError} onRetry={reload} />
        ) : (
          <LoadingState label="Loading your team…" />
        )}
      </>
    )
  }

  const me = data.members.find((member) => member.user_id === userId)
  const myRole = me?.role ?? business.role
  const manages = canManageTeam(myRole)

  const fail = (error: unknown, action: Parameters<typeof problemText>[1], subject?: TeamMember) => {
    const apiError = toApiError(error)
    setNotice({
      tone: 'error',
      text: problemText(apiError, action, subject ? { name: subject.display_name, isYou: subject.user_id === userId } : undefined),
    })
    // A refusal can mean the list is out of date (someone else changed it): show the current one.
    if (apiError.code === 'not_found' || apiError.code === 'business_role_required') reload()
  }

  const applyRole = async (member: TeamMember, role: BusinessRole) => {
    setBusyId(member.user_id)
    setNotice(null)
    try {
      await changeMemberRole(businessId, member.user_id, role)
      const isYou = member.user_id === userId
      setNotice({
        tone: 'success',
        text: isYou ? `You are now ${ROLE_LABELS[role].toLowerCase()}.` : `${member.display_name} is now ${ROLE_LABELS[role].toLowerCase()}.`,
      })
      reload()
    } catch (error) {
      fail(error, 'role', member)
    } finally {
      setBusyId(null)
    }
  }

  const requestRole = (member: TeamMember, role: BusinessRole) => {
    if (role === member.role) return
    // Changing your own role can take away the controls you are using: ask first.
    if (member.user_id === userId) setConfirm({ kind: 'self-role', member, role })
    else void applyRole(member, role)
  }

  const inviteAgain = async (invitation: Invitation) => {
    setBusyId(invitation.id)
    setNotice(null)
    try {
      await inviteMember(businessId, invitation.email, invitation.role)
      setNotice({ tone: 'success', text: `We sent a new invitation to ${invitation.email}. The old link no longer works.` })
      reload()
    } catch (error) {
      fail(error, 'invitation')
    } finally {
      setBusyId(null)
    }
  }

  const runConfirmed = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    setNotice(null)
    try {
      switch (confirm.kind) {
        case 'remove':
          await removeMember(businessId, confirm.member.user_id)
          setNotice({ tone: 'success', text: `${confirm.member.display_name} was removed from ${business.name}.` })
          reload()
          break
        case 'self-role':
          setConfirm(null)
          await applyRole(confirm.member, confirm.role)
          break
        case 'revoke':
          await revokeInvitation(businessId, confirm.invitation.id)
          setNotice({ tone: 'success', text: `The invitation to ${confirm.invitation.email} was withdrawn.` })
          reload()
          break
        case 'leave': {
          await leaveBusiness(businessId)
          showToast(`You left ${business.name}.`)
          const next = removeBusiness(businessId)
          navigate(next ? paths.dashboard : paths.createBusiness, { replace: true })
          window.scrollTo(0, 0)
          return
        }
      }
    } catch (error) {
      if (confirm.kind === 'remove') fail(error, 'remove', confirm.member)
      else if (confirm.kind === 'revoke') fail(error, 'invitation')
      else fail(error, 'leave')
    } finally {
      setConfirmBusy(false)
      setConfirm(null)
    }
  }

  return (
    <>
      <TeamHeading businessName={business.name} />
      {notice ? (
        <p className={`team-notice team-notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>
      ) : null}

      <div className="team-layout">
        <div className="team-main">
          <section className="team-card" aria-labelledby="team-members-title">
            <div className="team-card-head">
              <div>
                <h2 id="team-members-title">Members</h2>
                <p>{data.members.length === 1 ? '1 person' : `${data.members.length} people`} in {business.name}</p>
              </div>
            </div>
            <ul className="team-list">
              {data.members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isYou={member.user_id === userId}
                  callerRole={myRole}
                  busy={busyId === member.user_id}
                  onRoleChange={(role) => requestRole(member, role)}
                  onRemove={() => setConfirm({ kind: 'remove', member })}
                />
              ))}
            </ul>
          </section>

          {data.invitations ? (
            <section className="team-card" aria-labelledby="team-invitations-title">
              <div className="team-card-head">
                <div>
                  <h2 id="team-invitations-title">Pending invitations</h2>
                  <p>Invitations stay open for 7 days. Inviting someone again sends a fresh link.</p>
                </div>
              </div>
              {data.invitations.length === 0 ? (
                <EmptyState
                  className="team-empty"
                  icon={MailPlus}
                  title="No pending invitations"
                  description="People you invite appear here until they accept."
                />
              ) : (
                <ul className="team-list">
                  {data.invitations.map((invitation) => (
                    <InvitationRow
                      key={invitation.id}
                      invitation={invitation}
                      canAct={canActOn(myRole, invitation.role)}
                      busy={busyId === invitation.id}
                      onInviteAgain={() => void inviteAgain(invitation)}
                      onRevoke={() => setConfirm({ kind: 'revoke', invitation })}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside className="team-side">
          {manages ? <InviteCard businessId={businessId} callerRole={myRole} onInvited={(email) => {
            setNotice({ tone: 'success', text: `Invitation sent to ${email}.` })
            reload()
          }} /> : null}
          <section className="team-card team-leave" aria-labelledby="team-leave-title">
            <h2 id="team-leave-title">Leave {business.name}</h2>
            <p>You will lose access to this business. Someone will need to invite you again to come back.</p>
            <button type="button" className="button button-secondary button-small team-leave-button" onClick={() => setConfirm({ kind: 'leave' })}>
              <LogOut size={15} aria-hidden="true" /> Leave business
            </button>
          </section>
        </aside>
      </div>

      {confirm ? <TeamConfirm confirm={confirm} businessName={business.name} busy={confirmBusy} onConfirm={() => void runConfirmed()} onCancel={() => setConfirm(null)} /> : null}
    </>
  )
}

function TeamHeading({ businessName }: { businessName: string }) {
  return (
    <div className="page-heading">
      <div>
        <span>TEAM</span>
        <h1>Your team.</h1>
        <p>Everyone who works on {businessName} in BFB, and what they can do.</p>
      </div>
    </div>
  )
}

interface MemberRowProps {
  member: TeamMember
  isYou: boolean
  callerRole: BusinessRole
  busy: boolean
  onRoleChange: (role: BusinessRole) => void
  onRemove: () => void
}

function MemberRow({ member, isYou, callerRole, busy, onRoleChange, onRemove }: MemberRowProps) {
  const editable = canActOn(callerRole, member.role)
  // Keep the member's current role selectable even if the caller could not give it.
  const roles = assignableRoles(callerRole)
  const options = (roles.includes(member.role) ? roles : [member.role, ...roles]).map((role) => ({ value: role, label: ROLE_LABELS[role] }))

  return (
    <li className="team-row">
      <span className="team-avatar" aria-hidden="true">{businessInitials(member.display_name)}</span>
      <span className="team-person">
        <strong>
          {member.display_name}
          {isYou ? <span className="team-you">You</span> : null}
        </strong>
        <span>{member.email}</span>
        <small>Joined {formatDate(member.joined_at)}</small>
      </span>
      <span className="team-row-actions">
        {editable ? (
          <select
            className="team-role-select"
            aria-label={isYou ? 'Your role' : `Role for ${member.display_name}`}
            value={member.role}
            disabled={busy}
            onChange={(event) => onRoleChange(event.target.value as BusinessRole)}
          >
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <span className={`team-role team-role-${member.role}`}>{ROLE_LABELS[member.role]}</span>
        )}
        {editable && !isYou ? (
          <button type="button" className="team-icon-button team-icon-danger" aria-label={`Remove ${member.display_name}`} onClick={onRemove} disabled={busy}>
            <UserMinus size={15} aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </li>
  )
}

interface InvitationRowProps {
  invitation: Invitation
  canAct: boolean
  busy: boolean
  onInviteAgain: () => void
  onRevoke: () => void
}

function InvitationRow({ invitation, canAct, busy, onInviteAgain, onRevoke }: InvitationRowProps) {
  const invitedBy = invitation.invited_by_name ? `Invited by ${invitation.invited_by_name}` : 'Invited'

  return (
    <li className={`team-row ${invitation.expired ? 'team-row-expired' : ''}`}>
      <span className="team-avatar team-avatar-pending" aria-hidden="true"><Send size={15} /></span>
      <span className="team-person">
        <strong>
          {invitation.email}
          {invitation.expired ? <span className="team-expired">Expired</span> : null}
        </strong>
        <span>{ROLE_LABELS[invitation.role]} · {invitedBy} on {formatDate(invitation.created_at)}</span>
        <small>{invitation.expired ? `Expired ${formatDate(invitation.expires_at)}` : `Expires ${formatDate(invitation.expires_at)}`}</small>
      </span>
      {canAct ? (
        <span className="team-row-actions">
          <button type="button" className="button button-secondary button-small team-again" onClick={onInviteAgain} disabled={busy} aria-label={`Invite ${invitation.email} again`}>
            <RotateCw size={14} aria-hidden="true" /> {busy ? 'Sending…' : 'Invite again'}
          </button>
          <button type="button" className="team-icon-button team-icon-danger" aria-label={`Revoke the invitation to ${invitation.email}`} onClick={onRevoke} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </span>
      ) : null}
    </li>
  )
}

const inviteSchema = z.object({
  email: z.email('Enter a valid email address.'),
  role: z.enum(['owner', 'administrator', 'member']),
})

type InviteValues = z.infer<typeof inviteSchema>

function InviteCard({ businessId, callerRole, onInvited }: { businessId: string; callerRole: BusinessRole; onInvited: (email: string) => void }) {
  const user = useSessionStore((state) => state.user)
  const [problem, setProblem] = useState<'email-not-verified' | string | null>(null)
  const unverified = user?.emailVerified === false
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '', role: 'member' } })

  const submit = handleSubmit(async ({ email, role }) => {
    setProblem(null)
    try {
      await inviteMember(businessId, email, role)
      reset({ email: '', role })
      onInvited(email)
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code === 'already_business_member') {
        setError('email', { type: 'server', message: 'This person is already a member of this business.' }, { shouldFocus: true })
        return
      }
      if (apiError.code === 'email_not_verified') {
        setProblem('email-not-verified')
        return
      }
      if (apiError.code === 'business_role_required') {
        setProblem('Only owners can invite someone as an owner.')
        return
      }
      const unmatched = applyApiFieldErrors(apiError, setError, { knownFields: ['email', 'role'] })
      if (apiError.fieldErrors.length === 0 || unmatched.length > 0) setProblem(apiError.userMessage)
    }
  })

  const role = watch('role')

  return (
    <section className="team-card team-invite" aria-labelledby="team-invite-title">
      <div className="team-invite-icon" aria-hidden="true"><Users size={19} /></div>
      <h2 id="team-invite-title">Invite a teammate</h2>
      <p>We’ll email them a link to join. They sign in or create an account with that address.</p>
      {unverified || problem === 'email-not-verified' ? (
        <p className="team-notice team-notice-error team-invite-notice" role="alert">
          Verify your email address{user?.email ? ` (${user.email})` : ''} before inviting people.{' '}
          <ResendVerificationButton email={user?.email} />
        </p>
      ) : problem ? (
        <p className="team-notice team-notice-error team-invite-notice" role="alert">{problem}</p>
      ) : null}
      <form onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
        <SelectField
          label="Role"
          options={assignableRoles(callerRole).map((value) => ({ value, label: ROLE_LABELS[value] }))}
          hint={ROLE_DESCRIPTIONS[role]}
          error={errors.role?.message}
          {...register('role')}
        />
        <button type="submit" className="button button-primary button-small team-invite-submit" disabled={isSubmitting || unverified}>
          <MailPlus size={15} aria-hidden="true" /> {isSubmitting ? 'Sending…' : 'Send invitation'}
        </button>
      </form>
    </section>
  )
}

interface TeamConfirmProps {
  confirm: PendingConfirm
  businessName: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

function TeamConfirm({ confirm, businessName, busy, onConfirm, onCancel }: TeamConfirmProps) {
  const shared = { busy, onConfirm, onCancel }
  switch (confirm.kind) {
    case 'remove':
      return (
        <ConfirmDialog {...shared} kicker="REMOVE MEMBER" title={`Remove ${confirm.member.display_name}?`} confirmLabel="Remove" busyLabel="Removing…">
          <p>{confirm.member.display_name} ({confirm.member.email}) will lose access to {businessName} right away. You can invite them again later.</p>
        </ConfirmDialog>
      )
    case 'self-role':
      return (
        <ConfirmDialog {...shared} kicker="CHANGE YOUR ROLE" title={`Become ${ROLE_LABELS[confirm.role].toLowerCase()}?`} confirmLabel="Change my role" busyLabel="Changing…">
          <p>{ROLE_DESCRIPTIONS[confirm.role]} You may not be able to change it back yourself.</p>
        </ConfirmDialog>
      )
    case 'revoke':
      return (
        <ConfirmDialog {...shared} kicker="REVOKE INVITATION" title="Revoke this invitation?" confirmLabel="Revoke" busyLabel="Revoking…">
          <p>The link sent to {confirm.invitation.email} will stop working. You can invite them again later.</p>
        </ConfirmDialog>
      )
    case 'leave':
      return (
        <ConfirmDialog {...shared} kicker="LEAVE BUSINESS" title={`Leave ${businessName}?`} confirmLabel="Leave business" busyLabel="Leaving…">
          <p>You will lose access to {businessName} right away. To come back, someone on the team will need to invite you again.</p>
        </ConfirmDialog>
      )
  }
}
