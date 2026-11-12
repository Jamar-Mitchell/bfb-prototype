import { create } from 'zustand'

export type SessionUser = {
  id: string
  email: string
  displayName: string
}

export type SessionBusiness = {
  id: string
  name: string
  role: 'owner' | 'administrator' | 'member'
}

/**
 * - `idle`: the app has not checked for a stored session yet.
 * - `restoring`: refreshing a stored session on load.
 * - `authenticated` / `anonymous`: known.
 * - `error`: restoring failed for a transient reason (network, 5xx); tokens are kept.
 */
export type SessionStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous' | 'error'

/** Why the last session ended, for the login page to explain. */
export type SessionEndReason = 'expired' | 'logged-out'

type SessionState = {
  status: SessionStatus
  accessToken: string | null
  activeBusiness: SessionBusiness | null
  user: SessionUser | null
  endReason: SessionEndReason | null
  /** The error that stopped a restore, when `status` is `error`. */
  restoreError: unknown
  setSession: (session: {
    accessToken: string
    activeBusiness?: SessionBusiness | null
    user: SessionUser
  }) => void
  /** Replace the access token and keep the rest of the session. */
  setAccessToken: (accessToken: string) => void
  setActiveBusiness: (business: SessionBusiness | null) => void
  setRestoring: () => void
  setRestoreError: (error: unknown) => void
  clearSession: (reason?: SessionEndReason) => void
}

const emptySession = {
  accessToken: null,
  activeBusiness: null,
  user: null,
  restoreError: null,
}

export const useSessionStore = create<SessionState>((set) => ({
  ...emptySession,
  status: 'idle',
  endReason: null,
  setSession: ({ accessToken, activeBusiness = null, user }) =>
    set({
      status: 'authenticated',
      accessToken,
      activeBusiness,
      user,
      endReason: null,
      restoreError: null,
    }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
  setRestoring: () => set({ status: 'restoring', restoreError: null }),
  setRestoreError: (restoreError) => set({ status: 'error', restoreError }),
  clearSession: (reason) => set({ ...emptySession, status: 'anonymous', endReason: reason ?? null }),
}))
