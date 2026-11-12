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

type SessionState = {
  accessToken: string | null
  activeBusiness: SessionBusiness | null
  user: SessionUser | null
  setSession: (session: {
    accessToken: string
    activeBusiness?: SessionBusiness | null
    user: SessionUser
  }) => void
  setActiveBusiness: (business: SessionBusiness | null) => void
  clearSession: () => void
}

const emptySession = {
  accessToken: null,
  activeBusiness: null,
  user: null,
}

export const useSessionStore = create<SessionState>((set) => ({
  ...emptySession,
  setSession: ({ accessToken, activeBusiness = null, user }) =>
    set({
      accessToken,
      activeBusiness,
      user,
    }),
  setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
  clearSession: () => set(emptySession),
}))

