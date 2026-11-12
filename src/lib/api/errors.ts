import axios from 'axios'

/**
 * Codes from the API error contract (bfb-api docs/ERROR_CODES.md), plus two
 * client-side codes for failures that never reached the API or could not be read.
 */
export type ApiErrorCode =
  | 'validation_error'
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'http_error'
  | 'internal_error'
  | 'network_error'
  | 'unknown_error'
  // Auth feature codes (API-1.1, API-1.2)
  | 'email_already_registered'
  | 'weak_password'
  | 'terms_not_accepted'
  | 'invalid_credentials'
  | 'invalid_refresh_token'
  | 'access_token_expired'
  // Business codes (API-1.5)
  | 'email_not_verified'
  | 'business_role_required'
  // Email verification and password reset (API-1.3, API-1.4)
  | 'invalid_verification_token'
  | 'verification_token_expired'
  | 'invalid_password_reset_token'
  | 'password_reset_token_expired'
  // Pilot invite codes at registration (API-1.8)
  | 'invite_code_required'
  | 'invalid_invite_code'
  | 'invite_code_expired'
  | 'invite_code_exhausted'
  // Feature codes are added by later packages; keep the type open for them.
  | (string & {})

export interface ApiFieldError {
  /** Field path without the `body`/`query`/`path`/`header` prefix, joined with dots, e.g. `address.city`. */
  field: string
  message: string
  type: string
}

export const API_ERROR_MESSAGES: Record<string, string> = {
  validation_error: 'Some details need fixing. Check the highlighted fields and try again.',
  bad_request: 'We could not process that request. Check the details and try again.',
  unauthorized: 'Your session has ended. Log in again to continue.',
  forbidden: 'You do not have permission to do that.',
  not_found: 'We could not find what you were looking for.',
  method_not_allowed: 'That action is not available.',
  conflict: 'This was changed by someone else or already exists. Refresh and try again.',
  http_error: 'Something went wrong. Please try again.',
  internal_error: 'Something went wrong on our side. Please try again in a moment.',
  network_error: 'We could not reach BFB. Check your connection and try again.',
  unknown_error: 'Something unexpected happened. Please try again.',
  email_already_registered: 'An account with this email already exists. Log in instead.',
  weak_password: 'Choose a stronger password.',
  terms_not_accepted: 'Accept the Terms of Service and Privacy Policy to create an account.',
  invalid_credentials: 'That email and password don’t match.',
  invalid_refresh_token: 'Your session has ended. Log in again to continue.',
  access_token_expired: 'Your session has ended. Log in again to continue.',
  email_not_verified: 'Verify your email address before creating a business.',
  business_role_required: 'Your role in this business does not allow that.',
  invalid_verification_token: 'This verification link no longer works.',
  verification_token_expired: 'This verification link has expired.',
  invalid_password_reset_token: 'This reset link no longer works.',
  password_reset_token_expired: 'This reset link has expired.',
  invite_code_required: 'BFB is invite-only during the pilot. Enter your invite code.',
  invalid_invite_code: 'We don’t recognise that invite code. Check it and try again.',
  invite_code_expired: 'That invite code has expired. Ask the person who sent it for a new one.',
  invite_code_exhausted: 'That invite code has been used up. Ask the person who sent it for a new one.',
}

/** User-facing copy for an error code. Unknown codes fall back to the generic message. */
export function getErrorMessage(code: string): string {
  return API_ERROR_MESSAGES[code] ?? API_ERROR_MESSAGES.unknown_error
}

interface ApiErrorInit {
  code: ApiErrorCode
  /** Developer-facing message from the API (or a client-side description). Do not show it to users. */
  message: string
  status?: number
  requestId?: string
  fieldErrors?: ApiFieldError[]
  details?: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** HTTP status, or `undefined` when no response was received. */
  readonly status?: number
  /** Value of the `X-Request-ID` response header, for bug reports and error UI. */
  readonly requestId?: string
  readonly fieldErrors: ApiFieldError[]
  readonly details?: unknown

  constructor(init: ApiErrorInit) {
    super(init.message, { cause: init.cause })
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.requestId = init.requestId
    this.fieldErrors = init.fieldErrors ?? []
    this.details = init.details
  }

  /** User-facing message for this error's code. */
  get userMessage(): string {
    return getErrorMessage(this.code)
  }

  get isNetworkError(): boolean {
    return this.code === 'network_error'
  }
}

const LOCATION_PREFIXES = new Set(['body', 'query', 'path', 'header'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFieldErrors(details: unknown): ApiFieldError[] {
  if (!Array.isArray(details)) return []

  return details.flatMap((item): ApiFieldError[] => {
    if (!isRecord(item) || !Array.isArray(item.loc)) return []

    const loc = item.loc.map(String)
    const path = LOCATION_PREFIXES.has(loc[0]) ? loc.slice(1) : loc

    return [
      {
        field: path.join('.'),
        message: typeof item.message === 'string' ? item.message : 'This value is not valid.',
        type: typeof item.type === 'string' ? item.type : 'unknown',
      },
    ]
  })
}

function readRequestId(headers: unknown): string | undefined {
  if (!headers) return undefined
  const getter = (headers as { get?: (name: string) => unknown }).get
  const value =
    typeof getter === 'function'
      ? getter.call(headers, 'x-request-id')
      : (headers as Record<string, unknown>)['x-request-id']
  return typeof value === 'string' && value ? value : undefined
}

/** Turn anything thrown by an API call into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const response = error.response

    if (!response) {
      return new ApiError({
        code: 'network_error',
        message: error.message || 'Network request failed',
        cause: error,
      })
    }

    const requestId = readRequestId(response.headers)
    const body: unknown = response.data
    const envelope = isRecord(body) && isRecord(body.error) ? body.error : undefined

    if (envelope && typeof envelope.code === 'string') {
      return new ApiError({
        code: envelope.code,
        message: typeof envelope.message === 'string' ? envelope.message : error.message,
        status: response.status,
        requestId,
        details: envelope.details ?? undefined,
        fieldErrors: envelope.code === 'validation_error' ? parseFieldErrors(envelope.details) : [],
        cause: error,
      })
    }

    // A response without the shared envelope, e.g. from a proxy or CDN.
    return new ApiError({
      code: response.status >= 500 ? 'internal_error' : 'http_error',
      message: error.message || `Request failed with status ${response.status}`,
      status: response.status,
      requestId,
      cause: error,
    })
  }

  return new ApiError({
    code: 'unknown_error',
    message: error instanceof Error ? error.message : 'Unknown error',
    cause: error,
  })
}
