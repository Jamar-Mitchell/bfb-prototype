import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Search, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { isBusinessUuid, paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showToast } from '../../components/feedback'
import { TextareaField, TextField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { FactorList, FitBandBadge } from '../matching/FitDisplay'
import { NOTES_MAX } from './NotesDialog'
import {
  createMatch,
  getMatchCandidates,
  listApprovedBusinesses,
  type ApprovedBusiness,
  type CandidatePair,
  type MatchBusiness,
  type MatchCandidate,
  type MatchCandidates,
} from './matchesApi'
import { BusinessMark, businessPlace } from './matchDisplay'
import './Admin.css'

/** `/admin/matches/new?business=&candidate=`: pick a business, a suggested fit, then the pairs. */
export function NewMatchPage() {
  const [params, setParams] = useSearchParams()
  const businessId = params.get('business')
  const candidateId = params.get('candidate')

  const pickBusiness = (id: string | null) => setParams(id ? { business: id } : {})
  const pickCandidate = (id: string | null) => setParams(id && businessId ? { business: businessId, candidate: id } : businessId ? { business: businessId } : {})

  return (
    <>
      <Link className="back-button admin-back" to={paths.adminMatches}><ArrowLeft size={17} aria-hidden="true" /> Back to matches</Link>
      <div className="page-heading">
        <div>
          <span>ADMIN · NEW MATCH</span>
          <h1>Propose a match.</h1>
          <p>Choose an approved business, then one of its suggested fits, then the offers and needs to introduce.</p>
        </div>
      </div>
      {businessId ? (
        <Candidates businessId={businessId} candidateId={candidateId} pickCandidate={pickCandidate} changeBusiness={() => pickBusiness(null)} />
      ) : (
        <BusinessPicker pickBusiness={pickBusiness} />
      )}
    </>
  )
}

function BusinessPicker({ pickBusiness }: { pickBusiness: (id: string) => void }) {
  const [businesses, setBusinesses] = useState<ApprovedBusiness[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let live = true
    setError(null)
    listApprovedBusinesses()
      .then((items) => {
        if (live) setBusinesses(items)
      })
      .catch((caught: unknown) => {
        if (live) setError(toApiError(caught))
      })
    return () => {
      live = false
    }
  }, [reloadKey])

  const term = query.trim().toLowerCase()
  const shown = businesses?.filter((business) => !term || business.display_name.toLowerCase().includes(term) || business.legal_name?.toLowerCase().includes(term))

  if (error) return <ErrorState title="We couldn’t load approved businesses" error={error} onRetry={() => setReloadKey((key) => key + 1)} />
  if (!businesses) return <LoadingState label="Loading approved businesses…" />
  if (businesses.length === 0) {
    return <EmptyState className="admin-card" icon={Sparkles} title="No approved businesses yet" description="Matches are only between approved businesses. Approve some from the review queue first." />
  }

  return (
    <section className="admin-card" aria-labelledby="match-pick-title">
      <div className="admin-card-head">
        <h2 id="match-pick-title">Choose a business</h2>
        <p>Only approved businesses can be matched. You’ll see the businesses that fit it best.</p>
      </div>
      <div className="admin-card-body match-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" aria-label="Find a business" placeholder="Find by name" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {shown && shown.length > 0 ? (
        <ul className="admin-queue" aria-label="Approved businesses">
          {shown.map((business) => (
            <li key={business.id} className="admin-queue-row">
              <BusinessMark business={{ display_name: business.display_name, logo_url: null }} />
              <div className="admin-queue-main">
                <strong>{business.display_name}</strong>
                {business.categories.length > 0 && <small>{business.categories.map((category) => category.name).join(' · ')}</small>}
              </div>
              <div className="admin-queue-side">
                <button type="button" className="button button-secondary button-small" onClick={() => pickBusiness(business.id)} aria-label={`See fits for ${business.display_name}`}>
                  See fits <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="admin-card-body">
          <p className="admin-muted">No approved business matches “{query.trim()}”.</p>
          {isBusinessUuid(query.trim()) && (
            <button type="button" className="button button-secondary button-small match-use-id" onClick={() => pickBusiness(query.trim())}>Use this business ID</button>
          )}
        </div>
      )}
    </section>
  )
}

interface CandidatesProps {
  businessId: string
  candidateId: string | null
  pickCandidate: (id: string | null) => void
  changeBusiness: () => void
}

function Candidates({ businessId, candidateId, pickCandidate, changeBusiness }: CandidatesProps) {
  const [result, setResult] = useState<MatchCandidates | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let live = true
    setResult(null)
    setError(null)
    getMatchCandidates(businessId)
      .then((value) => {
        if (live) setResult(value)
      })
      .catch((caught: unknown) => {
        if (live) setError(toApiError(caught))
      })
    return () => {
      live = false
    }
  }, [businessId, reloadKey])

  if (error) {
    const notApproved = error.code === 'business_not_approved'
    const missing = error.code === 'not_found' || error.code === 'validation_error'
    return (
      <>
        <ErrorState
          title={notApproved ? 'This business isn’t approved' : missing ? 'We couldn’t find this business' : 'We couldn’t load suggested fits'}
          error={error}
          message={notApproved ? 'Only approved businesses can be matched. Choose another business, or review this one first.' : missing ? 'Check the link, or choose a business from the list.' : undefined}
          onRetry={notApproved || missing ? undefined : reload}
        />
        <button type="button" className="button button-secondary match-change" onClick={changeBusiness}>Choose another business</button>
      </>
    )
  }
  if (!result) return <LoadingState label="Finding suggested fits…" />

  const candidate = candidateId ? result.items.find((item) => item.business.id === candidateId) : undefined
  if (candidate) {
    return <PairPicker business={result.business} candidate={candidate} back={() => pickCandidate(null)} reload={reload} />
  }

  return (
    <>
      <BusinessHeader business={result.business} action={<button type="button" className="button button-secondary button-small" onClick={changeBusiness}>Change business</button>} />
      {candidateId && <p className="admin-notice admin-notice-error" role="alert">That business is no longer a suggested fit. Choose another below.</p>}
      {result.items.length === 0 ? (
        <EmptyState
          className="admin-card"
          icon={Sparkles}
          title="No suggested fits yet"
          description="Suggestions need another approved business with an active offer or need in the same category as one of this business’s active needs or offers."
        />
      ) : (
        <section className="admin-card" aria-labelledby="match-candidates-title">
          <div className="admin-card-head">
            <h2 id="match-candidates-title">Suggested fits</h2>
            <p>Best fit first. Each shows the offers and needs that line up in the same category.</p>
          </div>
          <ol className="admin-queue" aria-label="Suggested fits">
            {result.items.map((item) => (
              <CandidateRow key={item.business.id} business={result.business} candidate={item} choose={() => pickCandidate(item.business.id)} />
            ))}
          </ol>
        </section>
      )}
    </>
  )
}

function BusinessHeader({ business, action }: { business: MatchBusiness; action?: React.ReactNode }) {
  return (
    <div className="admin-card match-business">
      <BusinessMark business={business} />
      <div className="admin-queue-main">
        <small>Matching for</small>
        <strong>{business.display_name}</strong>
        <small>{businessPlace(business)}</small>
      </div>
      {action}
    </div>
  )
}

/** "X offers “A” for Y’s need “B”", from whichever side provides. */
function pairSentence(pair: CandidatePair, a: MatchBusiness, b: MatchBusiness): string {
  const [provider, client] = pair.offer.business_id === a.id ? [a, b] : [b, a]
  return `${provider.display_name} offers “${pair.offer.title}” for ${client.display_name}’s need “${pair.need.title}”`
}

function CandidateRow({ business, candidate, choose }: { business: MatchBusiness; candidate: MatchCandidate; choose: () => void }) {
  const name = candidate.business.display_name
  return (
    <li className="admin-queue-row match-candidate">
      <BusinessMark business={candidate.business} />
      <div className="admin-queue-main">
        <strong>{name}</strong>
        <small>{businessPlace(candidate.business)}</small>
        <ul className="match-pair-lines">
          {candidate.pairs.slice(0, 3).map((pair) => (
            <li key={`${pair.offer.id}:${pair.need.id}`}>{pairSentence(pair, business, candidate.business)}</li>
          ))}
          {candidate.pairs.length > 3 && <li>and more</li>}
        </ul>
        <div className="admin-tags">
          <FitBandBadge band={candidate.fit_band} />
          {candidate.open_match_id && <span className="admin-tag">Open match already</span>}
        </div>
      </div>
      <div className="admin-queue-side">
        {candidate.open_match_id ? (
          <Link className="button button-secondary button-small" to={paths.adminMatch(candidate.open_match_id)} aria-label={`Open the existing match with ${name}`}>
            Open match <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" className="button button-primary button-small" onClick={choose} aria-label={`Choose pairs with ${name}`}>
            Choose pairs <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

const DAY = 24 * 60 * 60 * 1000
export const DEFAULT_EXPIRY_DAYS = 14
export const MAX_EXPIRY_DAYS = 90

/** A local calendar date `days` from today, as `YYYY-MM-DD`. */
function dateFromToday(days: number): string {
  const date = new Date(Date.now() + days * DAY)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** End of the chosen day, never more than the API's 90 days from now. */
export function expiryTimestamp(day: string, now = Date.now()): string {
  const endOfDay = new Date(`${day}T23:59:59`).getTime()
  return new Date(Math.min(endOfDay, now + MAX_EXPIRY_DAYS * DAY - 60_000)).toISOString()
}

const pairKey = (pair: CandidatePair) => `${pair.offer.id}:${pair.need.id}`

function pairFormSchema(min: string, max: string) {
  return z.object({
    pairs: z.array(z.string()).min(1, 'Choose at least one offer and need to introduce.'),
    note: z.string().trim().max(NOTES_MAX, `Keep the note under ${NOTES_MAX.toLocaleString('en-US')} characters.`),
    expiresOn: z
      .string()
      .min(1, 'Choose when the match expires.')
      .refine((value) => value >= min && value <= max, `Choose a date from tomorrow up to ${MAX_EXPIRY_DAYS} days away.`),
  })
}

type PairForm = z.infer<ReturnType<typeof pairFormSchema>>

interface PairPickerProps {
  business: MatchBusiness
  candidate: MatchCandidate
  back: () => void
  reload: () => void
}

/** Choose the offer-need pairs, write a note for both businesses, set the expiry and create the match. */
function PairPicker({ business, candidate, back, reload }: PairPickerProps) {
  const navigate = useNavigate()
  const minDate = dateFromToday(1)
  const maxDate = dateFromToday(MAX_EXPIRY_DAYS)
  const schema = useMemo(() => pairFormSchema(minDate, maxDate), [minDate, maxDate])
  const [formError, setFormError] = useState<{ message: string; reload?: boolean } | null>(null)
  const [existingMatchId, setExistingMatchId] = useState<string | null>(candidate.open_match_id)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PairForm>({
    resolver: zodResolver(schema),
    defaultValues: { pairs: [], note: '', expiresOn: dateFromToday(DEFAULT_EXPIRY_DAYS) },
  })
  const other = candidate.business

  const submit = handleSubmit(async ({ pairs, note, expiresOn }) => {
    setFormError(null)
    const chosen = candidate.pairs.filter((pair) => pairs.includes(pairKey(pair)))
    try {
      const match = await createMatch({
        business_a_id: business.id,
        business_b_id: other.id,
        pairs: chosen.map((pair) => ({ offer_id: pair.offer.id, need_id: pair.need.id })),
        operator_note: note.trim() || null,
        expires_at: expiryTimestamp(expiresOn),
      })
      showToast(`Match proposed to ${business.display_name} and ${other.display_name}.`)
      navigate(paths.adminMatch(match.id))
    } catch (caught) {
      const error = toApiError(caught)
      const details = (error.details ?? {}) as Record<string, unknown>
      if (error.code === 'match_exists' && typeof details.match_id === 'string') {
        setExistingMatchId(details.match_id)
        return
      }
      if (error.code === 'invalid_listing_status' || error.code === 'invalid_match_pair' || error.code === 'business_not_approved' || error.code === 'not_found') {
        setFormError({
          message:
            error.code === 'business_not_approved'
              ? 'One of these businesses is no longer approved, so it can’t be matched.'
              : 'One of the chosen offers or needs changed since these fits were loaded. Reload them and choose again.',
          reload: true,
        })
        return
      }
      const unmatched = applyApiFieldErrors<PairForm>(error, setError, {
        knownFields: ['note', 'expiresOn'],
        fieldMap: { operator_note: 'note', expires_at: 'expiresOn' },
      })
      if (error.fieldErrors.length === 0 || unmatched.length > 0) setFormError({ message: error.userMessage })
    }
  })

  return (
    <>
      <button type="button" className="back-button admin-back" onClick={back}><ArrowLeft size={17} aria-hidden="true" /> Back to suggested fits</button>
      <form className="admin-layout" onSubmit={submit} noValidate aria-label={`Match ${business.display_name} with ${other.display_name}`}>
        <div className="admin-main">
          <section className="admin-card" aria-labelledby="match-pairs-title">
            <div className="admin-card-head match-pairs-head">
              <div>
                <h2 id="match-pairs-title">{business.display_name} &amp; {other.display_name}</h2>
                <p>Choose the offers and needs to introduce. Each shows why it fits, and what to confirm.</p>
              </div>
              <FitBandBadge band={candidate.fit_band} />
            </div>
            <fieldset className="match-pairs" aria-describedby={errors.pairs ? 'match-pairs-error' : undefined}>
              <legend className="admin-sr-only">Offer-need pairs</legend>
              {candidate.pairs.map((pair) => {
                const key = pairKey(pair)
                const provider = pair.offer.business_id === business.id ? business : other
                const client = provider === business ? other : business
                return (
                  <div key={key} className="match-pair">
                    <label className="match-pair-choice">
                      <input type="checkbox" value={key} disabled={isSubmitting} {...register('pairs')} aria-label={`${pair.offer.title} for ${pair.need.title}`} />
                      <span className="match-pair-titles">
                        <span><small>Offer from {provider.display_name}</small><strong>{pair.offer.title}</strong></span>
                        <ArrowRight size={16} aria-hidden="true" />
                        <span><small>Need from {client.display_name}</small><strong>{pair.need.title}</strong></span>
                      </span>
                    </label>
                    <div className="match-pair-meta">
                      <span className="admin-tag">{pair.offer.category_name}</span>
                      <FitBandBadge band={pair.fit_band} />
                    </div>
                    <FactorList factors={pair.factors} label={`Why ${pair.offer.title} fits ${pair.need.title}`} />
                  </div>
                )
              })}
            </fieldset>
            {errors.pairs && <p className="admin-notice admin-notice-error match-pairs-error" id="match-pairs-error" role="alert">{errors.pairs.message}</p>}
          </section>
        </div>
        <aside className="admin-side">
          <section className="admin-card admin-decision" aria-labelledby="match-create-title">
            <h2 id="match-create-title">Create the match</h2>
            {existingMatchId ? (
              <div className="admin-notice admin-notice-error match-exists" role="alert">
                <p>{business.display_name} and {other.display_name} already have an open match. Only one can be open at a time.</p>
                <Link to={paths.adminMatch(existingMatchId)}>Open the existing match <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
            ) : (
              <>
                <p>Both businesses see the note and the reasons for each pair, and can accept or decline.</p>
                <TextareaField
                  label="Note for both businesses (optional)"
                  hint="Why you think they should work together."
                  rows={5}
                  maxLength={NOTES_MAX}
                  error={errors.note?.message}
                  disabled={isSubmitting}
                  {...register('note')}
                />
                <TextField
                  label="Expires on"
                  hint={`Unless both accept first, the match expires at the end of this day. Up to ${MAX_EXPIRY_DAYS} days away.`}
                  type="date"
                  min={minDate}
                  max={maxDate}
                  error={errors.expiresOn?.message}
                  disabled={isSubmitting}
                  {...register('expiresOn')}
                />
                {formError && (
                  <div className="admin-notice admin-notice-error match-form-error" role="alert">
                    <p>{formError.message}</p>
                    {formError.reload && <button type="button" className="button button-secondary button-small" onClick={reload}>Reload suggested fits</button>}
                  </div>
                )}
                <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create match'}</button>
              </>
            )}
          </section>
        </aside>
      </form>
    </>
  )
}
