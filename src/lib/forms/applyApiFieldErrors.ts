import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError, type ApiFieldError } from '../api/errors'

interface ApplyApiFieldErrorsOptions<TFieldValues extends FieldValues> {
  /** Map API field paths to form field names when they differ, e.g. `{ business_name: 'businessName' }`. */
  fieldMap?: Record<string, Path<TFieldValues>>
  /** Form field names that exist. API errors for other fields are returned as unmatched. */
  knownFields?: readonly Path<TFieldValues>[]
  /** Focus the first field that received an error. Defaults to true. */
  shouldFocus?: boolean
}

/**
 * Put the API's validation errors on matching form fields.
 * Returns the errors that matched no field, so the caller can show them in a form-level message.
 */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  options: ApplyApiFieldErrorsOptions<TFieldValues> = {},
): ApiFieldError[] {
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) return []

  const { fieldMap = {}, knownFields, shouldFocus = true } = options
  const unmatched: ApiFieldError[] = []
  let focused = false

  for (const fieldError of error.fieldErrors) {
    const name = (fieldMap[fieldError.field] ?? fieldError.field) as Path<TFieldValues>

    if (!fieldError.field || (knownFields && !knownFields.includes(name))) {
      unmatched.push(fieldError)
      continue
    }

    setError(
      name,
      { type: 'server', message: fieldError.message },
      { shouldFocus: shouldFocus && !focused },
    )
    focused = true
  }

  return unmatched
}
