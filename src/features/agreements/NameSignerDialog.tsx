import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState } from '../../components/feedback'
import { TextField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import type { SessionBusiness } from '../../stores/session'
import { listMembers, type TeamMember } from '../team/teamApi'
import { canManageTeam } from '../team/teamPermissions'
import { invalidSignerText, isSigningConflict, signerLine } from './agreementCopy'
import { nameSigner, type AgreementSigner } from './agreementsApi'

const ROLE_LABELS = { owner: 'Owner', administrator: 'Administrator', member: 'Member' } as const

/**
 * Names the business's signer, or replaces them, from its owners and administrators. Focus
 * starts on the first choice, Escape cancels, and Tab stays inside the dialog.
 */
export function NameSignerDialog({ business, agreementId, userId, current, onNamed, onConflict, onCancel }: {
  business: SessionBusiness
  agreementId: string
  userId: string | undefined
  current: AgreementSigner | null
  onNamed: (signer: AgreementSigner) => void
  onConflict: (error: ApiError) => void
  onCancel: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [chosen, setChosen] = useState<string | null>(current?.user_id ?? userId ?? null)
  const [title, setTitle] = useState(current?.title ?? '')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setLoadError(null)
    listMembers(business.id)
      .then((result) => {
        if (live) setMembers(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [business.id, reloadKey])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    return () => previous?.focus?.()
  }, [])

  // Focus the chosen person once the team loads (the close button until then).
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector<HTMLElement>('input[type=radio]:checked, input[type=radio], button')?.focus()
  }, [members])

  const signers = members?.filter((member) => canManageTeam(member.role)) ?? []
  const others = members ? members.length - signers.length : 0
  const selected = signers.find((member) => member.user_id === chosen) ?? null
  const replacing = current && selected && current.user_id !== selected.user_id

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)') ?? [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected) {
      setProblem('Choose who signs for the business.')
      return
    }
    const trimmed = title.trim()
    if (trimmed.length > 200) {
      setProblem('Use 200 characters or fewer for the title.')
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      const signer = await nameSigner(business.id, agreementId, { user_id: selected.user_id, ...(trimmed ? { title: trimmed } : {}) })
      onNamed(signer)
    } catch (caught) {
      const error = toApiError(caught)
      setBusy(false)
      if (isSigningConflict(error)) {
        onConflict(error)
      } else if (error.code === 'invalid_signer') {
        setProblem(invalidSignerText(error, business.name))
        setReloadKey((key) => key + 1)
      } else {
        setProblem(error.userMessage)
      }
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="match-dialog proposal-dialog agreement-signer-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} ref={dialogRef} onKeyDown={onKeyDown}>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="modal-head">
            <div><span>SIGNING</span><h2 id={titleId}>{current ? 'Change who signs' : 'Name who signs'} for {business.name}</h2></div>
            <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={busy}><X size={19} aria-hidden="true" /></button>
          </div>
          <div className="modal-body">
            <p className="match-dialog-intro" id={bodyId}>
              The signer must be an owner or administrator of {business.name}. They confirm their name, title and authority, then sign for the business. You can choose yourself.
            </p>
            {members === null ? (
              loadError ? (
                <ErrorState title="We couldn’t load your team" error={loadError} onRetry={() => setReloadKey((key) => key + 1)} />
              ) : (
                <LoadingState label="Loading your team…" />
              )
            ) : (
              <>
                <fieldset className="agreement-signer-choices">
                  <legend>Who signs</legend>
                  {signers.map((member) => (
                    <label key={member.user_id} className={`agreement-signer-choice ${chosen === member.user_id ? 'selected' : ''}`}>
                      <input type="radio" name="signer" value={member.user_id} checked={chosen === member.user_id} onChange={() => setChosen(member.user_id)} />
                      <span>
                        <strong>{member.display_name}{member.user_id === userId ? ' (you)' : ''}</strong>
                        <small>{ROLE_LABELS[member.role]} · {member.email}</small>
                      </span>
                      {current?.user_id === member.user_id && <span className="match-pill">Current signer</span>}
                    </label>
                  ))}
                </fieldset>
                {others > 0 && (
                  <p className="agreement-signer-others">
                    {others === 1 ? '1 member' : `${others} members`} can’t sign: only owners and administrators can. Change roles on the <Link to={paths.team}>Team page</Link>.
                  </p>
                )}
                <TextField
                  label="Their title (optional)"
                  hint="For example Managing Director. The signer can correct it when they confirm."
                  value={title}
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                />
                {replacing && (
                  <p className="agreement-signer-replace">
                    {signerLine(current)} is named now{current.confirmed ? ' and has confirmed' : ''}. {selected.display_name} replaces them and must confirm before anyone signs.
                  </p>
                )}
              </>
            )}
            {problem && <p className="match-notice match-notice-error" role="alert">{problem}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={busy || members === null}>{busy ? 'Saving…' : current ? 'Change signer' : 'Name signer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
