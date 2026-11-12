import { beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from './session'

describe('session store', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession()
  })

  it('sets and clears the authenticated session', () => {
    useSessionStore.getState().setSession({
      accessToken: 'access-token',
      activeBusiness: {
        id: 'business-1',
        name: 'Good Ground Creative',
        role: 'owner',
      },
      user: {
        id: 'user-1',
        email: 'founder@example.com',
        displayName: 'BFB Founder',
      },
    })

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: 'access-token',
      activeBusiness: { id: 'business-1' },
      user: { id: 'user-1' },
    })

    useSessionStore.getState().clearSession()

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      activeBusiness: null,
      user: null,
    })
  })
})

