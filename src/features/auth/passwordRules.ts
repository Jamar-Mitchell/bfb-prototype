import { z } from 'zod'

/** Copy for each rule the API can list in a `weak_password` error's `details.rules` (bfb-api docs/ERROR_CODES.md). */
export const PASSWORD_RULES: Record<string, string> = {
  too_short: 'Use at least 10 characters.',
  too_long: 'That password is too long. Use 72 characters or fewer.',
  needs_letter_and_non_letter: 'Mix letters with numbers, spaces or symbols.',
  contains_email: 'Don’t include your email address in your password.',
}

export const PASSWORD_HINT = 'At least 10 characters, mixing letters with numbers, spaces or symbols.'

/** Mirrors the API's rules (API-1.1) so most mistakes are caught before submitting. */
export const newPasswordSchema = z
  .string()
  .min(10, PASSWORD_RULES.too_short)
  .refine((value) => /\p{L}/u.test(value) && /[^\p{L}]/u.test(value), PASSWORD_RULES.needs_letter_and_non_letter)

/** The message for a `weak_password` error: the first rule the API says the password breaks. */
export function passwordMessage(details: unknown): string {
  const rules = (details as { rules?: unknown } | null)?.rules
  const first = Array.isArray(rules) ? rules.find((rule): rule is string => typeof rule === 'string' && rule in PASSWORD_RULES) : undefined
  return first ? PASSWORD_RULES[first] : 'Choose a stronger password.'
}
