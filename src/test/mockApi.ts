import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { vi } from 'vitest'

import { apiClient } from '../lib/api/client'
import type { ApiUser, TokenResponse } from '../lib/auth/tokens'
import type { ApiBusiness, ApiMembership } from '../lib/businesses/activeBusiness'

export interface MockRequest {
  method: string
  url: string
  body: unknown
  authorization: string | null
  config: InternalAxiosRequestConfig
}

export type MockReply = { status: number; data?: unknown } | 'network-error'

export type MockHandler = (request: MockRequest) => MockReply | Promise<MockReply>

/** API error body in the shared envelope (bfb-api docs/ERROR_CODES.md). */
export function apiErrorBody(code: string, details: unknown = null) {
  return { error: { code, message: code, details } }
}

/** A user as the API returns it. */
export function apiUser(overrides: Partial<ApiUser> = {}): ApiUser {
  return {
    id: 'user-1',
    email: 'founder@example.com',
    display_name: 'Alex Morgan',
    email_verified: false,
    account_status: 'active',
    platform_role: 'user',
    terms_accepted_at: '2026-11-01T00:00:00Z',
    privacy_accepted_at: '2026-11-01T00:00:00Z',
    created_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

export function tokenBody(accessToken: string, refreshToken: string): TokenResponse {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: 900,
    user: apiUser(),
  }
}

/** A business as `GET /businesses/{id}` and `POST /businesses` return it. */
export function apiBusiness(overrides: Partial<ApiBusiness> = {}): ApiBusiness {
  return {
    id: 'business-1',
    display_name: 'Northstar Digital',
    legal_name: null,
    profile_status: 'draft',
    verification_status: 'unverified',
    role: 'owner',
    description: null,
    website_url: null,
    social_links: {},
    location_city: null,
    location_region: null,
    location_country: null,
    service_area: null,
    industry: null,
    business_stage: null,
    team_size: null,
    categories: [],
    logo_upload_id: null,
    cover_upload_id: null,
    completeness: {
      score: 0,
      complete: false,
      missing: ['legal_name', 'description', 'industry', 'business_stage', 'team_size', 'location', 'service_area', 'categories', 'logo'],
    },
    submitted_for_review_at: null,
    latest_review: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

/** A membership as `GET /account` lists it. */
export function apiMembership(overrides: Partial<ApiMembership> = {}): ApiMembership {
  return { business_id: 'business-1', business_name: 'Northstar Digital', role: 'owner', ...overrides }
}

/**
 * Replace the shared client's transport with `handler`. Interceptors still run, so
 * auth headers, refresh-then-retry and error mapping are exercised for real.
 * Returns the adapter mock and a function that restores the real transport.
 */
export function mockApi(handler: MockHandler) {
  const original = apiClient.defaults.adapter

  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const headers = AxiosHeaders.from(config.headers)
    const authorization = headers.get('Authorization')
    const request: MockRequest = {
      method: (config.method ?? 'get').toLowerCase(),
      url: config.url ?? '',
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      authorization: typeof authorization === 'string' ? authorization : null,
      config,
    }
    const reply = await handler(request)

    if (reply === 'network-error') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
    }

    const response: AxiosResponse = {
      config,
      data: reply.data ?? '',
      headers: {},
      status: reply.status,
      statusText: String(reply.status),
    }

    if (reply.status >= 400) {
      throw new AxiosError(`Request failed with status code ${reply.status}`, AxiosError.ERR_BAD_REQUEST, config, null, response)
    }

    return response
  })

  apiClient.defaults.adapter = adapter

  return {
    adapter,
    calls: (method: string, url: string) =>
      adapter.mock.calls.filter(([config]) => (config.method ?? 'get') === method && config.url === url),
    restore: () => {
      apiClient.defaults.adapter = original
    },
  }
}
