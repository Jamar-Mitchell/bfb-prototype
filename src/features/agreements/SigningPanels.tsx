import { useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, PenLine, UserRoundPen } from 'lucide-react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { showToast } from '../../components/feedback'
import { TextField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import type { SessionBusiness } from '../../stores/session'
import { canManageTeam } from '../team/teamPermissions'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import {
  isSigningConflict,
  SIGNER_STEP_LABELS,
  signerLine,
  signerStep,
  signerStepDetail,
} from './agreementCopy'
import { confirmSigner, signAgreement, signerFor, type Agreement, type AgreementParty, type AgreementSigner } from './agreementsApi'

/** The development provider signs inside BFB with a typed name; any other provider signs elsewhere. */
export const IN_APP_PROVIDER = 'development'

function partyName(party: AgreementParty | undefined, fallback: string): string {
  return party?.display_name ?? party?.legal_name ?? fallback
}

/**
 * Side column: who signs for each business and how far they are, your business first, with
 * "Name who signs" / "Change signer" for owners and administrators while the agreement is
 * `ready`.
 */
export function SignersCard({ agreement, business, onNameSigner }: {
  agreement: Agreement
  business: SessionBusiness
  onNameSigner: () => void
}) {
  const me = agreement.my_side
  const sides = [me, me === 'a' ? 'b' : 'a'] as const
  const mySigner = signerFor(agreement, me)
  const canName = agreement.status === 'ready' && canManageTeam(business.role)
  const open = agreement.status === 'ready' || agreement.status === 'signing'

  let intro: string
  switch (agreement.status) {
    case 'ready':
      intro = 'Each business names one owner or administrator to sign. Both confirm, then both sign.'
      break
    case 'signing':
      intro = 'Both signers confirmed. The agreement is out for signature.'
      break
    case 'signed':
      intro = 'Both businesses signed.'
      break
    default:
      intro = 'This agreement can no longer be signed.'
  }

  return (
    <section className="match-panel match-panel-body agreement-signers" aria-labelledby="agreement-signing-title" data-slot="signing">
      <h2 id="agreement-signing-title" className="match-side-title">Signing</h2>
      <p className="agreement-signers-intro">{intro}</p>
      <ul className="agreement-signer-list">
        {sides.map((side) => {
          const party = agreement.parties.find((item) => item.side === side)
          const signer = signerFor(agreement, side)
          const step = signerStep(signer)
          return (
            <li key={side} className="agreement-signer" aria-label={`Signer for ${partyName(party, side === me ? business.name : 'the other business')}`}>
              <div className="agreement-party-head">
                <strong>{partyName(party, side === me ? business.name : 'The other business')}</strong>
                <span className={`match-pill agreement-signer-pill-${step}`}>{SIGNER_STEP_LABELS[step]}</span>
              </div>
              {signer ? <p className="agreement-signer-name">{signerLine(signer)}</p> : null}
              <p className="agreement-party-muted">{signerStepDetail(signer)}</p>
            </li>
          )
        })}
      </ul>
      {canName ? (
        <button type="button" className="button button-secondary button-small" onClick={onNameSigner}>
          <UserRoundPen size={15} aria-hidden="true" /> {mySigner ? 'Change signer' : 'Name who signs'}
        </button>
      ) : agreement.status === 'ready' ? (
        <p className="match-answer-who"><Lock size={13} aria-hidden="true" /> Only owners and administrators of {business.name} can name who signs.</p>
      ) : null}
      {open && <p className="agreement-signers-deadline">Must be signed by {formatMatchDate(agreement.expires_at)}.</p>}
    </section>
  )
}

/**
 * Main column, for the signer named for your business only: confirm name, title, authority and
 * consent; then, once both signers confirmed, sign by typing the confirmed name.
 */
export function YourSignaturePanel({ agreement, userId, businessId, onAgreement, onReload, onConflict }: {
  agreement: Agreement
  userId: string | undefined
  businessId: string
  /** The API returned the agreement as it is now. */
  onAgreement: (agreement: Agreement) => void
  /** Something changed that only a fresh read shows (a confirmation returns the signer only). */
  onReload: () => void
  /** Refused because the agreement or the caller's place in it changed. */
  onConflict: (error: ApiError) => void
}) {
  const [editing, setEditing] = useState(false)
  const signer = signerFor(agreement, agreement.my_side)
  if (!signer || !userId || signer.user_id !== userId) return null
  if (agreement.status !== 'ready' && agreement.status !== 'signing') return null

  const other = agreement.parties.find((party) => party.side !== agreement.my_side)
  const otherName = partyName(other, 'the other business')
  const mine = agreement.parties.find((party) => party.side === agreement.my_side)
  const myLegalName = mine?.legal_name ?? mine?.display_name ?? 'your business'
  const otherSigner = signerFor(agreement, agreement.my_side === 'a' ? 'b' : 'a')

  let body: React.ReactNode
  if (agreement.status === 'ready' && (!signer.confirmed || editing)) {
    body = (
      <ConfirmSignerForm
        agreement={agreement}
        signer={signer}
        businessId={businessId}
        legalName={myLegalName}
        onConfirmed={() => {
          setEditing(false)
          showToast(otherSigner?.confirmed ? 'Confirmed. Signing has started.' : `Confirmed. Signing starts once ${otherName}’s signer confirms.`)
          onReload()
        }}
        onConflict={onConflict}
        onCancel={signer.confirmed ? () => setEditing(false) : undefined}
      />
    )
  } else if (agreement.status === 'ready') {
    body = (
      <>
        <p>
          You confirmed on {formatMatchDate(signer.authority_confirmed_at ?? signer.named_at)} that you sign for {myLegalName} as {signerLine(signer)}.{' '}
          {otherSigner
            ? `Signing starts once ${otherName}’s signer, ${otherSigner.full_name}, confirms too.`
            : `Signing starts once ${otherName} names its signer and they confirm.`}
        </p>
        <div className="match-next-actions">
          <button type="button" className="button button-secondary button-small" onClick={() => setEditing(true)}>Change your details</button>
        </div>
      </>
    )
  } else if (signer.status === 'signed') {
    body = <p>You signed on {formatMatchDate(signer.signed_at ?? agreement.updated_at)}. Waiting for {otherName}’s signer{otherSigner ? `, ${otherSigner.full_name},` : ''} to sign.</p>
  } else if (signer.status === 'declined') {
    body = <p>You declined to sign, so {myLegalName} can’t sign this agreement.</p>
  } else if (agreement.signature_provider === IN_APP_PROVIDER) {
    body = <SignForm agreement={agreement} signer={signer} businessId={businessId} legalName={myLegalName} otherName={otherName} onSigned={onAgreement} onConflict={onConflict} />
  } else {
    body = <p>This agreement is signed with the signature provider, not on BFB. Follow the signing link it sends to {signer.email}.</p>
  }

  return (
    <section className="match-panel match-panel-body match-answer agreement-your-signature" aria-labelledby="agreement-your-signature-title">
      <h2 id="agreement-your-signature-title" className="match-side-title"><PenLine size={14} aria-hidden="true" /> Your signature</h2>
      {body}
    </section>
  )
}

const confirmSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name.').max(200, 'Use 200 characters or fewer.'),
  title: z.string().trim().min(1, 'Enter your title at the business.').max(200, 'Use 200 characters or fewer.'),
  authority: z.boolean().refine((value) => value, 'Tick this box to confirm you may sign for the business.'),
  esignConsent: z.boolean().refine((value) => value, 'Tick this box to agree to electronic records and signatures.'),
})

type ConfirmValues = z.infer<typeof confirmSchema>

function ConfirmSignerForm({ agreement, signer, businessId, legalName, onConfirmed, onConflict, onCancel }: {
  agreement: Agreement
  signer: AgreementSigner
  businessId: string
  legalName: string
  onConfirmed: () => void
  onConflict: (error: ApiError) => void
  onCancel?: () => void
}) {
  const consent = agreement.signer_consent
  const [problem, setProblem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { fullName: signer.full_name, title: signer.title ?? '', authority: false, esignConsent: false },
  })

  const submit = async (values: ConfirmValues) => {
    setProblem(null)
    try {
      await confirmSigner(businessId, agreement.id, {
        full_name: values.fullName.trim(),
        title: values.title.trim(),
        authority_confirmed: values.authority,
        esign_consent: values.esignConsent,
        consent_text_version: consent.version,
      })
      onConfirmed()
    } catch (caught) {
      const error = toApiError(caught)
      if (isSigningConflict(error)) {
        onConflict(error)
        return
      }
      if (error.code === 'invalid_signer') {
        setProblem('You’re no longer an owner or administrator of your business, so you can’t sign for it. Ask an owner to name someone else.')
        return
      }
      const unmatched = applyApiFieldErrors(error, setError, { fieldMap: { full_name: 'fullName', title: 'title' }, knownFields: ['fullName', 'title'] })
      if (error.code !== 'validation_error' || unmatched.length > 0) setProblem(error.userMessage)
    }
  }

  return (
    <form className="agreement-confirm-form" aria-label="Confirm you can sign" noValidate onSubmit={handleSubmit(submit)}>
      <p>You’re named to sign for {legalName}. Before you sign, confirm who you are and that you may sign for it.</p>
      <div className="agreement-confirm-fields">
        <TextField label="Full name" autoComplete="name" required error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Title" autoComplete="organization-title" required hint="Your role at the business, for example Managing Director." error={errors.title?.message} {...register('title')} />
      </div>
      {consent.is_draft && (
        <p className="agreement-consent-draft"><span className="match-pill agreement-pill-draft">Draft wording</span> Version {consent.version}, not reviewed by counsel.</p>
      )}
      <ConsentCheckbox text={consent.authority} error={errors.authority?.message} registration={register('authority')} />
      <ConsentCheckbox text={consent.esign_consent} error={errors.esignConsent?.message} registration={register('esignConsent')} />
      {problem && <p className="match-notice match-notice-error" role="alert">{problem}</p>}
      <div className="agreement-confirm-actions">
        <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Confirming…' : 'Confirm'}</button>
        {onCancel && <button type="button" className="button button-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>}
      </div>
    </form>
  )
}

function ConsentCheckbox({ text, error, registration }: { text: string; error?: string; registration: UseFormRegisterReturn }) {
  const errorId = useId()
  return (
    <div className={`agreement-consent ${error ? 'form-field-invalid' : ''}`}>
      <label className="auth-checkbox">
        <input type="checkbox" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...registration} />
        <span>{text}</span>
      </label>
      {error ? <p className="form-field-error" id={errorId}>{error}</p> : null}
    </div>
  )
}

const signSchema = z.object({ fullName: z.string().trim().min(1, 'Type your full name to sign.') })

type SignValues = z.infer<typeof signSchema>

function SignForm({ agreement, signer, businessId, legalName, otherName, onSigned, onConflict }: {
  agreement: Agreement
  signer: AgreementSigner
  businessId: string
  legalName: string
  otherName: string
  onSigned: (agreement: Agreement) => void
  onConflict: (error: ApiError) => void
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignValues>({ resolver: zodResolver(signSchema), defaultValues: { fullName: '' } })

  const submit = async (values: SignValues) => {
    setProblem(null)
    try {
      const updated = await signAgreement(businessId, agreement.id, values.fullName.trim())
      showToast(updated.status === 'signed' ? 'Signed. Both businesses have signed the agreement.' : `Signed. Waiting for ${otherName}’s signer.`)
      onSigned(updated)
    } catch (caught) {
      const error = toApiError(caught)
      if (error.code === 'signature_name_mismatch') {
        setError('fullName', { type: 'server', message: `This doesn’t match the name you confirmed, ${signer.full_name}. Capitals and extra spaces don’t matter.` }, { shouldFocus: true })
      } else if (isSigningConflict(error)) {
        onConflict(error)
      } else {
        setProblem(error.userMessage)
      }
    }
  }

  return (
    <form className="agreement-sign-form" aria-label="Sign the agreement" noValidate onSubmit={handleSubmit(submit)}>
      <p>Both signers confirmed. To sign the Business Exchange Agreement for {legalName}, type your full name as you confirmed it: <strong>{signer.full_name}</strong>.</p>
      <TextField label="Type your full name to sign" autoComplete="off" spellCheck={false} required error={errors.fullName?.message} {...register('fullName')} />
      <p className="agreement-sign-statement">Choosing Sign agreement signs it electronically, with the same effect as a handwritten signature, as you agreed when you confirmed.</p>
      {problem && <p className="match-notice match-notice-error" role="alert">{problem}</p>}
      <div className="agreement-confirm-actions">
        <button type="submit" className="button button-primary" disabled={isSubmitting}><PenLine size={16} aria-hidden="true" /> {isSubmitting ? 'Signing…' : 'Sign agreement'}</button>
      </div>
    </form>
  )
}
