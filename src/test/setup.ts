import '@testing-library/jest-dom/vitest'

import { AxiosError } from 'axios'
import { afterEach, beforeAll } from 'vitest'

import { resetCategoriesCache } from '../features/businesses/profileApi'
import { resetBusinessProfile } from '../features/businesses/useBusinessProfile'
import { resetImageUrls } from '../features/businesses/useImages'
import { resetWaitingMatches } from '../features/matching/waitingMatches'
import { resetWaitingProposals } from '../features/proposals/waitingProposals'
import { apiClient } from '../lib/api/client'

// Tests never reach a real API. A request a test did not mock (see `mockApi`) fails as a
// network error and is reported, instead of going to the default API URL.
beforeAll(() => {
  apiClient.defaults.adapter = async (config) => {
    console.error(`Unmocked API request in a test: ${(config.method ?? 'get').toUpperCase()} ${config.url ?? ''}`)
    throw new AxiosError('Unmocked API request', AxiosError.ERR_NETWORK, config)
  }
})

// Module-level caches outlive a test: start every test without them.
afterEach(() => {
  resetBusinessProfile()
  resetCategoriesCache()
  resetImageUrls()
  resetWaitingMatches()
  resetWaitingProposals()
})
