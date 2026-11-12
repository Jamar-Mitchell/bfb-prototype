import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

export type TeamMember = components['schemas']['TeamMemberResponse']
export type Invitation = components['schemas']['InvitationResponse']
export type BusinessRole = components['schemas']['BusinessRole']

// Team routes (bfb-api docs/BUSINESSES.md, "Team").

/** Everyone in the business: owners first, then administrators, then members. Any member may list. */
export function listMembers(businessId: string) {
  return apiGet('/businesses/{business_id}/members', { path: { business_id: businessId } })
}

/** Owner or administrator. Administrators cannot change owners or make anyone an owner. */
export function changeMemberRole(businessId: string, userId: string, role: BusinessRole) {
  return apiPatch('/businesses/{business_id}/members/{user_id}', { role }, { path: { business_id: businessId, user_id: userId } })
}

/** Owner or administrator. Administrators cannot remove owners. */
export async function removeMember(businessId: string, userId: string): Promise<void> {
  await apiDelete('/businesses/{business_id}/members/{user_id}', { path: { business_id: businessId, user_id: userId } })
}

/** The caller leaves the business. Fails with `last_business_owner` for the only owner. */
export async function leaveBusiness(businessId: string): Promise<void> {
  await apiDelete('/businesses/{business_id}/members/me', { path: { business_id: businessId } })
}

/** Open invitations, newest first, expired ones included. Owner or administrator. */
export function listInvitations(businessId: string) {
  return apiGet('/businesses/{business_id}/invitations', { path: { business_id: businessId } })
}

/** Invite an address. Inviting an address again replaces its open invitation and sends a new email. */
export function inviteMember(businessId: string, email: string, role: BusinessRole) {
  return apiPost('/businesses/{business_id}/invitations', { email, role }, { path: { business_id: businessId } })
}

/** Withdraw an open invitation; its link stops working. */
export async function revokeInvitation(businessId: string, invitationId: string): Promise<void> {
  await apiDelete('/businesses/{business_id}/invitations/{invitation_id}', {
    path: { business_id: businessId, invitation_id: invitationId },
  })
}

// An invitation link works once. StrictMode (and a remount) would run the accept page's effect
// twice, so each token is sent once per user while a request is open, and a success is kept.
const acceptances = new Map<string, ReturnType<typeof postAccept>>()

function postAccept(token: string) {
  return apiPost('/invitations/accept', { token })
}

/** Accept an invitation as the logged-in user. Resolves with the business they joined. */
export function acceptInvitation(token: string, userId: string) {
  const key = `${userId}:${token}`
  let pending = acceptances.get(key)
  if (!pending) {
    pending = postAccept(token)
    // Failures (unverified email, wrong address, offline) may be retried after the user acts.
    pending.catch(() => acceptances.delete(key))
    acceptances.set(key, pending)
  }
  return pending
}
