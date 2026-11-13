import { useId, useState } from 'react'
import { Lock, Pencil, ThumbsDown, ThumbsUp } from 'lucide-react'

import { showToast } from '../../components/feedback'
import { TextareaField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { FEEDBACK_RATING_LABELS, FEEDBACK_REASON_LABELS, FEEDBACK_REASONS_FOR, type FeedbackRating, type FeedbackReason } from './fitCopy'
import type { FeedbackBody, MyFeedback } from './matchInboxApi'

export const FEEDBACK_COMMENT_MAX = 2000

interface MatchFeedbackProps {
  feedback: MyFeedback | null
  /** Saves the whole feedback (a full replace) and resolves with what was stored. */
  onSave: (body: FeedbackBody) => Promise<MyFeedback>
  /** A refusal that means the match changed (e.g. withdrawn): the page reloads it. */
  onConflict: (message: string) => void
}

/** "Was this match useful?": a rating, optional reasons and a comment, for BFB. Any member, editable later. */
export function MatchFeedback({ feedback, onSave, onConflict }: MatchFeedbackProps) {
  const titleId = useId()
  const [saved, setSaved] = useState<MyFeedback | null>(feedback)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState<FeedbackRating | null>(feedback?.rating ?? null)
  const [reasons, setReasons] = useState<FeedbackReason[]>(feedback?.reason_codes ?? [])
  const [comment, setComment] = useState(feedback?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = editing || (saved === null && rating !== null)
  const tooLong = comment.trim().length > FEEDBACK_COMMENT_MAX

  const choose = (next: FeedbackRating) => {
    setRating(next)
    setError(null)
  }

  const startEditing = (nextRating = saved?.rating ?? null) => {
    setRating(nextRating)
    setReasons(saved?.reason_codes ?? [])
    setComment(saved?.comment ?? '')
    setEditing(true)
  }

  const toggle = (reason: FeedbackReason) =>
    setReasons((current) => (current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]))

  const save = async () => {
    if (!rating || tooLong) return
    setSaving(true)
    setError(null)
    try {
      const stored = await onSave({ rating, reason_codes: reasons, comment: comment.trim() || null })
      setSaved(stored)
      setEditing(false)
      showToast('Thanks. Your feedback was saved.')
    } catch (caught) {
      const apiError = toApiError(caught)
      if (apiError.code === 'invalid_match_status') onConflict('BFB withdrew this match, so feedback can no longer be left on it.')
      else setError(apiError.userMessage)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setEditing(false)
    setError(null)
    setRating(saved?.rating ?? null)
    setReasons(saved?.reason_codes ?? [])
    setComment(saved?.comment ?? '')
  }

  const shown = rating ? [...new Set<FeedbackReason>([...FEEDBACK_REASONS_FOR[rating], 'other', ...reasons])] : []

  return (
    <section className="match-panel match-feedback" aria-labelledby={titleId}>
      <div className="match-feedback-head">
        <div>
          <h2 id={titleId}>Was this match useful?</h2>
          <p><Lock size={12} aria-hidden="true" /> Helps BFB make better matches. Seen by BFB only.</p>
        </div>
        {saved && !editing && (
          <button type="button" className="button button-secondary button-small" onClick={() => startEditing()}>
            <Pencil size={14} aria-hidden="true" /> Edit feedback
          </button>
        )}
      </div>
      {saved && !editing ? (
        <div className="match-feedback-saved">
          <span className={`match-pill match-pill-feedback-${saved.rating}`}>{FEEDBACK_RATING_LABELS[saved.rating]}</span>
          {saved.reason_codes.length > 0 && (
            <ul aria-label="Your reasons">{saved.reason_codes.map((code) => <li key={code}>{FEEDBACK_REASON_LABELS[code]}</li>)}</ul>
          )}
          {saved.comment && <p>{saved.comment}</p>}
        </div>
      ) : (
        <>
          <div className="match-rating" role="group" aria-label="Was this match useful?">
            <button type="button" aria-pressed={rating === 'useful'} onClick={() => choose('useful')} disabled={saving}>
              <ThumbsUp size={15} aria-hidden="true" /> Useful
            </button>
            <button type="button" aria-pressed={rating === 'not_useful'} onClick={() => choose('not_useful')} disabled={saving}>
              <ThumbsDown size={15} aria-hidden="true" /> Not useful
            </button>
          </div>
          {open && rating && (
            <div className="match-feedback-form">
              <div className="match-reason-chips" role="group" aria-label="Reasons (optional)">
                {shown.map((reason) => (
                  <button key={reason} type="button" aria-pressed={reasons.includes(reason)} onClick={() => toggle(reason)} disabled={saving}>
                    {FEEDBACK_REASON_LABELS[reason]}
                  </button>
                ))}
              </div>
              <TextareaField
                label="Comment"
                hint={`Optional, up to ${FEEDBACK_COMMENT_MAX.toLocaleString('en-US')} characters.`}
                rows={3}
                maxLength={FEEDBACK_COMMENT_MAX}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                error={tooLong ? `Keep it under ${FEEDBACK_COMMENT_MAX.toLocaleString('en-US')} characters.` : undefined}
                disabled={saving}
              />
              {error && <p className="match-notice match-notice-error" role="alert">{error}</p>}
              <div className="match-feedback-actions">
                {editing && <button type="button" className="button button-secondary button-small" onClick={cancel} disabled={saving}>Cancel</button>}
                <button type="button" className="button button-primary button-small" onClick={() => void save()} disabled={saving || tooLong}>
                  {saving ? 'Saving…' : 'Save feedback'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
