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
  // Team and invitations (API-1.7)
  | 'already_business_member'
  | 'last_business_owner'
  | 'invalid_invitation_token'
  | 'invitation_expired'
  | 'invitation_email_mismatch'
  // Offers and needs (API-2.4, API-2.5, API-2.8)
  | 'invalid_listing_status'
  | 'business_not_approved'
  | 'listing_incomplete'
  | 'invalid_range'
  // Business profile and uploads (API-2.2, API-2.3)
  | 'profile_not_editable'
  | 'invalid_category'
  | 'invalid_upload'
  | 'file_too_large'
  | 'empty_file'
  | 'unsupported_file_type'
  | 'file_content_mismatch'
  | 'invalid_signed_url'
  // Review (API-2.7)
  | 'invalid_profile_status'
  | 'profile_incomplete'
  // Portfolio (API-2.6)
  | 'portfolio_limit_reached'
  | 'portfolio_version_conflict'
  | 'invalid_portfolio_batch'
  | 'portfolio_item_incomplete'
  // Matches (API-3.4)
  | 'match_exists'
  | 'invalid_match_pair'
  | 'invalid_match_status'
  // Marketplace (API-3.1)
  | 'invalid_cursor'
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
  already_business_member: 'That person is already a member of this business.',
  last_business_owner: 'A business needs at least one owner. Make another member an owner first.',
  invalid_invitation_token: 'This invitation link no longer works.',
  invitation_expired: 'This invitation has expired.',
  invitation_email_mismatch: 'This invitation was sent to a different email address.',
  invalid_listing_status: 'This listing changed since you loaded it. Refresh and try again.',
  business_not_approved: 'Your business must be approved before listings can go live.',
  listing_incomplete: 'Add the missing details before this listing can go live.',
  invalid_range: 'The end of a range can’t come before its start.',
  invalid_category: 'That category is no longer available. Choose another.',
  profile_not_editable: 'Your profile can’t be edited while it is in review or suspended.',
  invalid_upload: 'That image is no longer available. Upload it again.',
  file_too_large: 'That file is too large.',
  empty_file: 'That file is empty. Choose another image.',
  unsupported_file_type: 'That file type isn’t supported. Use a JPEG, PNG or WebP image.',
  file_content_mismatch: 'That file isn’t really the image type its name says. Save it again as JPEG, PNG or WebP.',
  invalid_signed_url: 'That image link has expired. Reload the page.',
  invalid_profile_status: 'Your profile’s review status changed. The page has been refreshed.',
  profile_incomplete: 'Fill in the missing details before submitting for review.',
  portfolio_limit_reached: 'Your portfolio is full. Remove a work sample before adding another.',
  portfolio_version_conflict: 'Someone else changed this portfolio. Reload it and try again.',
  invalid_portfolio_batch: 'The portfolio changed since you loaded it. Reload it and try again.',
  portfolio_item_incomplete: 'Each work sample needs a file, a link, or both.',
  invalid_cursor: 'These results changed since you loaded them. Start again from the top.',
  match_exists: 'These two businesses already have an open match.',
  invalid_match_pair: 'One of the chosen offers or needs is no longer available. Reload and choose again.',
  invalid_match_status: 'This match is no longer open, so nothing was changed.',
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
