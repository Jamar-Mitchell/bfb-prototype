import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'

import { resetCategoriesCache } from '../features/businesses/profileApi'
import { resetBusinessProfile } from '../features/businesses/useBusinessProfile'
import { resetImageUrls } from '../features/businesses/useImages'

// Module-level caches outlive a test: start every test without them.
afterEach(() => {
  resetBusinessProfile()
  resetCategoriesCache()
  resetImageUrls()
})
