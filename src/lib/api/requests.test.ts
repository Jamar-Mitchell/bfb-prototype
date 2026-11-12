import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { apiClient } from './client'
import {
  apiGet,
  type BodyArgs,
  fillPath,
  type OperationOf,
  type OptionsArgs,
  type RequestBodyOf,
  type RequestOptions,
  type ResponseOf,
  type RouteOf,
} from './requests'

describe('typed API requests', () => {
  const originalAdapter = apiClient.defaults.adapter
  let adapter: ReturnType<typeof vi.fn<AxiosAdapter>>

  beforeEach(() => {
    adapter = vi.fn<AxiosAdapter>(async (config: InternalAxiosRequestConfig) => ({
      config,
      data: { status: 'ok' },
      headers: {},
      status: 200,
      statusText: 'OK',
    }))
    apiClient.defaults.adapter = adapter
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('calls the health endpoint through the shared client', async () => {
    const health = await apiGet('/health')

    expect(health).toEqual({ status: 'ok' })
    expectTypeOf(health).toEqualTypeOf<{ [key: string]: string }>()

    expect(adapter).toHaveBeenCalledOnce()
    const config = adapter.mock.calls[0][0]
    expect(config.method).toBe('get')
    expect(config.url).toBe('/health')
    expect(config.baseURL).toMatch(/\/api\/v1$/)
  })

  it('passes extra Axios config through', async () => {
    await apiGet('/ready', { timeout: 1_000 })

    expect(adapter.mock.calls[0][0].timeout).toBe(1_000)
  })
})

describe('fillPath', () => {
  it('substitutes and encodes path parameters', () => {
    expect(fillPath('/businesses/{business_id}/members/{member_id}', {
      business_id: 'a b',
      member_id: 7,
    })).toBe('/businesses/a%20b/members/7')
  })

  it('throws when a path parameter is missing', () => {
    expect(() => fillPath('/businesses/{business_id}')).toThrow(/business_id/)
  })
})

// Type-level checks against a fixture shaped like openapi-typescript output, so
// path params and bodies are covered before the real API has such routes.
interface FixturePaths {
  '/api/v1/businesses/{business_id}': {
    get: {
      parameters: { query?: { include?: string }; path: { business_id: string } }
      requestBody?: never
      responses: { 200: { content: { 'application/json': { id: string } } } }
    }
    post?: never
  }
  '/api/v1/businesses': {
    get?: never
    post: {
      parameters: { query?: never; path?: never }
      requestBody: { content: { 'application/json': { name: string } } }
      responses: { 201: { content: { 'application/json': { id: string } } } }
    }
  }
  '/': { get: { parameters: object; responses: object } }
}

describe('request helper types', () => {
  it('derive routes, bodies, responses and options from paths', () => {
    expectTypeOf<RouteOf<FixturePaths, 'get'>>().toEqualTypeOf<'/businesses/{business_id}'>()
    expectTypeOf<RouteOf<FixturePaths, 'post'>>().toEqualTypeOf<'/businesses'>()

    type GetBusiness = OperationOf<FixturePaths, 'get', '/businesses/{business_id}'>
    type CreateBusiness = OperationOf<FixturePaths, 'post', '/businesses'>

    expectTypeOf<ResponseOf<GetBusiness>>().toEqualTypeOf<{ id: string }>()
    expectTypeOf<ResponseOf<CreateBusiness>>().toEqualTypeOf<{ id: string }>()
    expectTypeOf<RequestBodyOf<CreateBusiness>>().toEqualTypeOf<{ name: string }>()
    expectTypeOf<RequestBodyOf<GetBusiness>>().toBeNever()

    expectTypeOf<RequestOptions<GetBusiness>['path']>().toEqualTypeOf<{ business_id: string }>()
    expectTypeOf<RequestOptions<GetBusiness>['query']>().toEqualTypeOf<
      { include?: string } | undefined
    >()

    // Options are required when the route has path params, optional otherwise.
    expectTypeOf<OptionsArgs<GetBusiness>[0]>().toEqualTypeOf<RequestOptions<GetBusiness>>()
    expectTypeOf<OptionsArgs<CreateBusiness>>().toEqualTypeOf<
      [options?: RequestOptions<CreateBusiness>]
    >()
    // A required JSON body is the first, required argument.
    expectTypeOf<BodyArgs<CreateBusiness>[0]>().toEqualTypeOf<{ name: string }>()
    expectTypeOf<BodyArgs<GetBusiness>[0]>().toEqualTypeOf<undefined>()
  })

  it('rejects routes the API does not define', () => {
    // @ts-expect-error -- not a route in the generated schema
    expectTypeOf(apiGet).toBeCallableWith('/not-a-route')
    // @ts-expect-error -- the prefix is supplied by the client's base URL
    expectTypeOf(apiGet).toBeCallableWith('/api/v1/health')
  })
})
