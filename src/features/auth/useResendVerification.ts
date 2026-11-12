import { useCallback, useEffect, useState } from 'react'

import { toApiError } from '../../lib/api/errors'
import { resendVerification } from './authApi'

/** After sending, the resend buttons stay disabled this long so one click cannot become a burst of emails. */
export const RESEND_COOLDOWN_MS = 30_000

// Shared by every resend button, so leaving a page and coming back does not reset the wait.
let cooldownUntil = 0

/** For tests: forget the last send. */
export function resetResendCooldown() {
  cooldownUntil = 0
}

function coolingDownNow() {
  return Date.now() < cooldownUntil
}

export type ResendStatus = 'idle' | 'sending' | 'sent' | 'error'

/** Send a new verification link to `email`, then wait `RESEND_COOLDOWN_MS` before allowing another. */
export function useResendVerification(email: string | undefined) {
  const [status, setStatus] = useState<ResendStatus>(() => (coolingDownNow() ? 'sent' : 'idle'))
  const [coolingDown, setCoolingDown] = useState(coolingDownNow)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coolingDown) return
    const timer = setTimeout(() => setCoolingDown(false), Math.max(0, cooldownUntil - Date.now()))
    return () => clearTimeout(timer)
  }, [coolingDown])

  const send = useCallback(async () => {
    if (!email || coolingDownNow()) return
    setStatus('sending')
    setError(null)

    try {
      await resendVerification(email)
      cooldownUntil = Date.now() + RESEND_COOLDOWN_MS
      setCoolingDown(true)
      setStatus('sent')
    } catch (sendError) {
      setError(toApiError(sendError).userMessage)
      setStatus('error')
    }
  }, [email])

  return { send, status, error, disabled: !email || status === 'sending' || coolingDown }
}
