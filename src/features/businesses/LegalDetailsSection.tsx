import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CircleAlert, CircleCheck, Lock, Pencil, Scale, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { LEGAL_DETAILS_SECTION } from '../../app/router/paths'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import {
  describePartyDetailsMissing,
  ENTITY_TYPE_OPTIONS,
  partyDetailsSchema,
  partyDetailsUpdate,
  partyDetailsValues,
  type PartyDetailsValues,
} from './partyDetails'
import { Field, Select } from './profileControls'
import { getCountryOptions } from './profileFields'
import { lockReason } from './ProfileManagementPage'
import { updateProfile, type Business } from './profileApi'
import { loadBusinessProfile, setBusinessProfile } from './useBusinessProfile'

/** API field paths for these fields, so validation errors land on the right input. */
const FIELD_MAP: Record<string, keyof PartyDetailsValues> = {
  'registered_address.line1': 'line1',
  'registered_address.line2': 'line2',
  'registered_address.city': 'city',
  'registered_address.region': 'region',
  'registered_address.postal_code': 'postal_code',
  'registered_address.country': 'country',
}

/**
 * "Legal details for agreements": the legal name, entity type and registered address that
 * name the business in its agreements. Private. Saved on their own, separately from the rest
 * of the profile. `/profile?section=legal-details` brings it into view (and opens it for
 * editing when something is missing), which is where accept and send errors link.
 */
export function LegalDetailsSection({ business }: { business: Business }) {
  const [searchParams] = useSearchParams()
  const linked = searchParams.get('section') === LEGAL_DETAILS_SECTION
  // Locked like the rest of the profile; the page's notice says why.
  const editable = lockReason(business) === null
  const missing = business.party_details_missing ?? []
  const [editing, setEditing] = useState(() => linked && editable && missing.length > 0)
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<PartyDetailsValues>({ resolver: zodResolver(partyDetailsSchema), defaultValues: partyDetailsValues(business) })

  useEffect(() => {
    if (!editing) reset(partyDetailsValues(business))
  }, [business, editing, reset])

  useEffect(() => {
    if (!editable) setEditing(false)
  }, [editable])

  useEffect(() => {
    if (!linked) return
    sectionRef.current?.scrollIntoView?.({ block: 'start' })
    sectionRef.current?.focus({ preventScroll: true })
  }, [linked])

  const save = handleSubmit(async (values) => {
    setProblem(null)
    const changed = (Object.keys(dirtyFields) as Array<keyof PartyDetailsValues>).filter((field) => dirtyFields[field])
    if (changed.length === 0) {
      setEditing(false)
      return
    }
    try {
      const updated = await updateProfile(business.id, partyDetailsUpdate(values, changed))
      setBusinessProfile(updated)
      reset(partyDetailsValues(updated))
      setEditing(false)
      setSaved(true)
    } catch (caught) {
      const error = toApiError(caught)
      if (error.code === 'profile_not_editable') {
        setProblem(error.userMessage)
        void loadBusinessProfile(business.id)
        return
      }
      const unmatched = applyApiFieldErrors(error, setError, { fieldMap: FIELD_MAP })
      if (error.fieldErrors.length === 0 || unmatched.length > 0) setProblem(error.userMessage)
    }
  })

  const fieldsEnabled = editable && editing

  return (
    <section
      id={LEGAL_DETAILS_SECTION}
      ref={sectionRef}
      tabIndex={-1}
      className="manage-profile-card legal-details"
      aria-labelledby="legal-details-title"
    >
      <div className="legal-details-head">
        <div>
          <h2 id="legal-details-title"><Scale size={17} aria-hidden="true" /> Legal details for agreements</h2>
          <p>
            How your business is named in its Business Exchange Agreements. Needed before you can send or accept a proposal.{' '}
            <span className="legal-details-private"><Lock size={12} aria-hidden="true" /> Private: never on your public profile, the marketplace or matches.</span>
          </p>
        </div>
        {editable && !editing ? (
          <button type="button" className="button button-secondary button-small" onClick={() => { setSaved(false); setProblem(null); setEditing(true) }}>
            <Pencil size={15} aria-hidden="true" /> {missing.length > 0 ? 'Add legal details' : 'Edit legal details'}
          </button>
        ) : null}
      </div>
      {missing.length > 0 ? (
        <p className="legal-details-status legal-details-missing"><CircleAlert size={15} aria-hidden="true" /> Still needed: {describePartyDetailsMissing(missing)}.</p>
      ) : (
        <p className="legal-details-status legal-details-ready"><CircleCheck size={15} aria-hidden="true" /> Ready for agreements.</p>
      )}
      {saved ? <div className="inline-success legal-details-saved" role="status"><CircleCheck size={17} aria-hidden="true" /> Your legal details have been saved.</div> : null}
      {problem ? <div className="profile-notice profile-notice-error legal-details-problem" role="alert">{problem}</div> : null}
      <form className="legal-details-form" onSubmit={save} noValidate aria-label="Legal details">
        <div className="form-grid">
          <Field label="Legal name" hint="As registered, for example “Northstar Digital LLC”." error={errors.legal_name?.message} disabled={!fieldsEnabled} {...register('legal_name')} />
          <Select label="Entity type" placeholder="Choose a type" options={ENTITY_TYPE_OPTIONS} disabled={!fieldsEnabled} {...register('entity_type')} />
          <Field className="form-full" label="Street address" error={errors.line1?.message} disabled={!fieldsEnabled} {...register('line1')} />
          <Field className="form-full" label="Address line 2" hint="Optional." error={errors.line2?.message} disabled={!fieldsEnabled} {...register('line2')} />
          <Field label="City" error={errors.city?.message} disabled={!fieldsEnabled} {...register('city')} />
          <Field label="State or region" hint="Optional." error={errors.region?.message} disabled={!fieldsEnabled} {...register('region')} />
          <Field label="Postal code" error={errors.postal_code?.message} disabled={!fieldsEnabled} {...register('postal_code')} />
          <Select label="Country" placeholder="Choose a country" options={getCountryOptions()} error={errors.country?.message} disabled={!fieldsEnabled} {...register('country')} />
        </div>
        {fieldsEnabled ? (
          <div className="legal-details-actions">
            <button type="button" className="button button-secondary" onClick={() => { setProblem(null); reset(partyDetailsValues(business)); setEditing(false) }} disabled={isSubmitting}>
              <X size={16} aria-hidden="true" /> Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              <Check size={16} aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Save legal details'}
            </button>
          </div>
        ) : null}
      </form>
    </section>
  )
}

