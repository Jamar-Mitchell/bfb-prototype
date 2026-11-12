import type { BusinessRole } from './teamApi'

/**
 * Who may do what on the team page (bfb-api docs/BUSINESSES.md, "Team"). The API enforces the
 * same rules; these only decide which controls to show.
 */

/** Owners and administrators invite people, change roles and remove members. */
export function canManageTeam(role: BusinessRole): boolean {
  return role === 'owner' || role === 'administrator'
}

/** Administrators cannot act on owners, or on owner invitations. */
export function canActOn(callerRole: BusinessRole, targetRole: BusinessRole): boolean {
  if (!canManageTeam(callerRole)) return false
  return callerRole === 'owner' || targetRole !== 'owner'
}

/** Roles the caller may give someone: only owners make owners. */
export function assignableRoles(callerRole: BusinessRole): BusinessRole[] {
  if (callerRole === 'owner') return ['owner', 'administrator', 'member']
  if (callerRole === 'administrator') return ['administrator', 'member']
  return []
}

/** What each role can do, for the role pickers. */
export const ROLE_DESCRIPTIONS: Record<BusinessRole, string> = {
  owner: 'Full control, including owners and the business itself.',
  administrator: 'Invites people and manages the team, except owners.',
  member: 'Works on the business. Cannot manage the team.',
}
