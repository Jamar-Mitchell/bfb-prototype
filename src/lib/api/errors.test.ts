import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

import { apiClient } from './client'
import { ApiError, getErrorMessage, toApiError } from './errors'

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig

function responseError(status: number, data: unknown, requestId?: string) {
  const headers = new AxiosHeaders(requestId ? { 'X-Request-ID': requestId } : {})
  const response: AxiosResponse = { status, statusText: '', data, headers, config }
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, {}, response)
}

describe('toApiError', () => {
  it('maps an API error envelope with field errors and the request ID', () => {
    const error = toApiError(
      responseError(
        422,
        {
          error: {
            code: 'validation_error',
            message: 'Request validation failed.',
            details: [
              { loc: ['body', 'email'], message: 'value is not a valid email address', type: 'value_error' },
              { loc: ['body', 'address', 'city'], message: 'Field required', type: 'missing' },
            ],
          },
        },
        'req-123',
      ),
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('validation_error')
    expect(error.status).toBe(422)
    expect(error.requestId).toBe('req-123')
    expect(error.message).toBe('Request validation failed.')
    expect(error.userMessage).toBe(getErrorMessage('validation_error'))
    expect(error.fieldErrors).toEqual([
      { field: 'email', message: 'value is not a valid email address', type: 'value_error' },
      { field: 'address.city', message: 'Field required', type: 'missing' },
    ])
  })

  it('keeps feature codes and falls back to the generic message for codes it does not know', () => {
    const error = toApiError(
      responseError(409, { error: { code: 'email_already_registered', message: 'Taken.', details: null } }),
    )

    expect(error.code).toBe('email_already_registered')
    expect(error.status).toBe(409)
    expect(error.fieldErrors).toEqual([])
    expect(error.userMessage).toBe(getErrorMessage('unknown_error'))
  })

  it('maps a response without the envelope by status', () => {
    expect(toApiError(responseError(502, '<html>Bad gateway</html>')).code).toBe('internal_error')
    expect(toApiError(responseError(418, null)).code).toBe('http_error')
  })

  it('maps a network failure', () => {
    const error = toApiError(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}))

    expect(error.code).toBe('network_error')
    expect(error.isNetworkError).toBe(true)
    expect(error.status).toBeUndefined()
    expect(error.requestId).toBeUndefined()
    expect(error.userMessage).toMatch(/could not reach BFB/)
  })

  it('maps an unknown error', () => {
    const cause = new TypeError('Cannot read properties of undefined')
    const error = toApiError(cause)

    expect(error.code).toBe('unknown_error')
    expect(error.message).toBe('Cannot read properties of undefined')
    expect(error.cause).toBe(cause)
    expect(error.userMessage).toBe(getErrorMessage('unknown_error'))
    expect(toApiError('a thrown string').code).toBe('unknown_error')
  })

  it('returns an ApiError unchanged', () => {
    const error = new ApiError({ code: 'forbidden', message: 'No.' })
    expect(toApiError(error)).toBe(error)
  })
})

describe('apiClient', () => {
  it('rejects failed requests with an ApiError', async () => {
    const request = apiClient.get('/businesses/missing', {
      adapter: async () => {
        throw responseError(404, { error: { code: 'not_found', message: 'Not found.', details: null } }, 'req-404')
      },
    })

    await expect(request).rejects.toMatchObject({ name: 'ApiError', code: 'not_found', status: 404, requestId: 'req-404' })
  })
})
