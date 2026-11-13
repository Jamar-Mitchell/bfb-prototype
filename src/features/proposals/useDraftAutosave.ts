import { useCallback, useEffect, useRef, useState } from 'react'

import { toApiError, type ApiError } from '../../lib/api/errors'
import type { DraftTerms } from './proposalDraft'
import { saveDraft, type Proposal } from './proposalsApi'

/** How long edits must pause before the draft is saved. Tests shorten it. */
export const autosaveTiming = { delayMs: 900 }

/**
 * - `saved`: the server has everything.
 * - `pending`: edits are waiting for a pause.
 * - `saving`: a save is in flight.
 * - `failed`: the last save failed; the edits are kept and go with the next save.
 */
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'failed'

interface Options {
  businessId: string
  proposalId: string
  revision: number
  /** A save went through: the detail with the new revision and `missing`. */
  onSaved: (proposal: Proposal) => void
  /** A save was refused for a reason a retry cannot fix (`stale_draft`, the proposal moved on, a role change). */
  onRefused: (error: ApiError) => void
}

const REFUSALS = new Set(['stale_draft', 'invalid_proposal_status', 'business_role_required', 'not_found'])

/**
 * Autosaves the whole draft with one `PUT` after edits pause (project rule: batch, no per-field
 * requests). Edits made while a save is in flight go in the next one. A failed save keeps the
 * edits and the next edit, or `retry`, tries again.
 */
export function useDraftAutosave({ businessId, proposalId, revision, onSaved, onRefused }: Options) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [error, setError] = useState<ApiError | null>(null)
  const revisionRef = useRef(revision)
  const latest = useRef<DraftTerms | null>(null)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<Promise<boolean> | null>(null)
  const stopped = useRef(false)
  const callbacks = useRef({ onSaved, onRefused })
  callbacks.current = { onSaved, onRefused }

  /** Adopt a revision from outside (a reload after `stale_draft`). Drops unsaved edits. */
  const reset = useCallback((nextRevision: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    revisionRef.current = nextRevision
    dirty.current = false
    latest.current = null
    stopped.current = false
    setStatus('saved')
    setError(null)
  }, [])

  const run = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current
    const terms = latest.current
    if (!terms || !dirty.current || stopped.current) return Promise.resolve(!dirty.current)
    dirty.current = false
    setStatus('saving')
    const request = saveDraft(businessId, proposalId, revisionRef.current, terms)
      .then((proposal) => {
        if (proposal.draft) revisionRef.current = proposal.draft.revision
        callbacks.current.onSaved(proposal)
        setError(null)
        return true
      })
      .catch((caught: unknown) => {
        const failure = toApiError(caught)
        dirty.current = true
        setError(failure)
        if (REFUSALS.has(failure.code)) {
          stopped.current = true
          callbacks.current.onRefused(failure)
        }
        return false
      })
      .then((ok) => {
        inFlight.current = null
        // Edits made during the save, with no pause pending, go now.
        if (ok && dirty.current && !timer.current) return run()
        setStatus(ok ? (dirty.current ? 'pending' : 'saved') : 'failed')
        return ok
      })
    inFlight.current = request
    return request
  }, [businessId, proposalId])

  /** The draft changed: save it once edits pause. */
  const schedule = useCallback(
    (terms: DraftTerms) => {
      latest.current = terms
      dirty.current = true
      if (stopped.current) return
      if (!inFlight.current) setStatus('pending')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        void run()
      }, autosaveTiming.delayMs)
    },
    [run],
  )

  /** Save now, without waiting for a pause. Resolves `true` once the server has everything. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (inFlight.current) await inFlight.current
    if (!dirty.current) return true
    return run()
  }, [run])

  /** Stop saving: the draft is being discarded or was sent. */
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    stopped.current = true
  }, [])

  // Leaving the page with edits waiting saves them rather than dropping them.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
        void run()
      }
    },
    [run],
  )

  // Closing the tab with unsaved edits asks first.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current && !stopped.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const retry = useCallback(() => {
    stopped.current = false
    void run()
  }, [run])

  return { status, error, schedule, flush, stop, reset, retry }
}
