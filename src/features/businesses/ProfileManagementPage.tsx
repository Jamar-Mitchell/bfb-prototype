import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CircleCheck, ImagePlus, Lock, Pencil, Plus, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { businessInitials } from './businessDisplay'
import { listCategories, resetCategoriesCache, submitForReview, updateProfile, type Business, type Category } from './profileApi'
import {
  canEditProfile,
  canSubmitForReview,
  completenessLabel,
  getCountryOptions,
  MAX_CATEGORIES,
  SERVICE_AREA_OPTIONS,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  TEAM_SIZE_OPTIONS,
} from './profileFields'
import { profileSchema, profileUpdate, profileValues, type ProfileValues } from './profileForm'
import { BUSINESS_STAGE_LABELS } from './profileLabels'
import { PortfolioEditor } from './PortfolioEditor'
import { PublicProfileLink } from './PublicProfileLink'
import { UPLOAD_LIMITS, type ImageCategory } from './uploadsApi'
import { loadBusinessProfile, setBusinessProfile, useBusinessProfile } from './useBusinessProfile'
import { useImageUpload, useUploadUrl, type ImageUploadState } from './useImages'
import './ProfileManagementPage.css'

/** Completeness keys in the API's order, so done and missing items keep their places. */
const COMPLETENESS_KEYS = ['legal_name', 'description', 'industry', 'business_stage', 'team_size', 'location', 'service_area', 'categories', 'logo']

const ACCEPT = UPLOAD_LIMITS.logo.types.join(',')

const STAGE_OPTIONS = Object.entries(BUSINESS_STAGE_LABELS).map(([value, label]) => ({ value, label }))

/** Business profile editor for the active business: fields, logo and cover, and completeness. */
export function ProfileManagementPage() {
  const { business, error, reload } = useBusinessProfile({ fresh: true })

  if (!business) {
    return (
      <>
        <ProfileHeading />
        {error ? (
          <ErrorState title="We couldn’t load your profile" error={error} onRetry={() => void reload()} />
        ) : (
          <LoadingState label="Loading your profile…" />
        )}
      </>
    )
  }

  return <ProfileEditor key={business.id} business={business} />
}

function ProfileHeading({ children }: { children?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><span>BUSINESS PROFILE</span><h1>Show partners what makes you valuable.</h1><p>A complete profile helps the right businesses find and trust you.</p></div>
      {children ? <div className="manage-profile-actions">{children}</div> : null}
    </div>
  )
}

/**
 * Why the profile is read-only for this user right now, or `null` if they can edit it. In review
 * and suspended are explained by the shell's status banner; the notice only adds that editing is off.
 */
function lockReason(business: Business): string | null {
  if (!canEditProfile(business.role)) return 'Only owners and administrators can edit the business profile.'
  if (business.profile_status === 'in_review') return 'Editing is paused while your profile is in review.'
  if (business.profile_status === 'suspended') return 'Editing is off while this business is suspended.'
  return null
}

function ProfileEditor({ business }: { business: Business }) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [categoriesKey, setCategoriesKey] = useState(0)
  const [portfolioDirty, setPortfolioDirty] = useState(false)
  const locked = lockReason(business)
  const editable = locked === null
  const fieldsEnabled = editable && editing

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: profileValues(business) })

  // Show the latest saved profile while not editing (a reload, an image change).
  useEffect(() => {
    if (!editing) reset(profileValues(business))
  }, [business, editing, reset])

  // Locked meanwhile (submitted for review elsewhere): leave edit mode.
  useEffect(() => {
    if (!editable) setEditing(false)
  }, [editable])

  const startEditing = () => {
    setSaved(false)
    setProblem(null)
    setEditing(true)
  }

  const cancel = () => {
    setProblem(null)
    reset(profileValues(business))
    setEditing(false)
  }

  const save = handleSubmit(async (values) => {
    setProblem(null)
    const changed = (Object.keys(dirtyFields) as Array<keyof ProfileValues>).filter((field) => dirtyFields[field])
    if (changed.length === 0) {
      setEditing(false)
      return
    }
    try {
      const updated = await updateProfile(business.id, profileUpdate(values, changed))
      setBusinessProfile(updated)
      reset(profileValues(updated))
      setEditing(false)
      setSaved(true)
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code === 'profile_not_editable') {
        setProblem(apiError.userMessage)
        void loadBusinessProfile(business.id)
      } else if (apiError.code === 'invalid_category') {
        resetCategoriesCache()
        setCategoriesKey((key) => key + 1)
        setError('category_ids', { type: 'server', message: apiError.userMessage })
      } else {
        const unmatched = applyApiFieldErrors(apiError, setError)
        if (apiError.fieldErrors.length === 0 || unmatched.length > 0) setProblem(apiError.userMessage)
      }
    }
  })

  const categoryIds = watch('category_ids')

  return (
    <>
      <ProfileHeading>
        {editing ? null : <PublicProfileLink businessId={business.id} profileStatus={business.profile_status} />}
        {editable && editing ? (
          <>
            <button type="button" className="button button-secondary" onClick={cancel} disabled={isSubmitting}><X size={16} aria-hidden="true" /> Cancel</button>
            <button type="submit" form="profile-form" className="button button-primary" disabled={isSubmitting}>
              <Check size={16} aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </>
        ) : editable ? (
          <button type="button" className="button button-primary" onClick={startEditing}><Pencil size={16} aria-hidden="true" /> Edit profile</button>
        ) : null}
      </ProfileHeading>
      {locked ? <div className="profile-notice profile-notice-locked" role="status"><Lock size={16} aria-hidden="true" /> {locked}</div> : null}
      {saved ? <div className="inline-success" role="status"><CircleCheck size={17} aria-hidden="true" /> Your business profile has been updated.</div> : null}
      {problem ? <div className="profile-notice profile-notice-error" role="alert">{problem}</div> : null}
      <div className="manage-profile-layout">
        <div className="manage-profile-main">
          <section className="manage-profile-card" aria-label="Profile details">
            <CoverImage business={business} editable={editable} />
            <form id="profile-form" className="manage-profile-content" onSubmit={save} noValidate>
              <LogoImage business={business} editable={editable} />
              <div className="form-grid">
                <Field label="Business name" error={errors.display_name?.message} disabled={!fieldsEnabled} {...register('display_name')} />
                <Field label="Legal name" hint="Private: only BFB sees it." error={errors.legal_name?.message} disabled={!fieldsEnabled} {...register('legal_name')} />
                <Field label="Industry" error={errors.industry?.message} disabled={!fieldsEnabled} {...register('industry')} />
                <Field label="Website" placeholder="https://" error={errors.website_url?.message} disabled={!fieldsEnabled} {...register('website_url')} />
                <Select label="Business stage" placeholder="Choose a stage" options={STAGE_OPTIONS} disabled={!fieldsEnabled} {...register('business_stage')} />
                <Select label="Team size" placeholder="Choose a size" options={TEAM_SIZE_OPTIONS} disabled={!fieldsEnabled} {...register('team_size')} />
                <Field label="City" error={errors.location_city?.message} disabled={!fieldsEnabled} {...register('location_city')} />
                <Field label="State or region" error={errors.location_region?.message} disabled={!fieldsEnabled} {...register('location_region')} />
                <Select label="Country" placeholder="Choose a country" options={getCountryOptions()} disabled={!fieldsEnabled} {...register('location_country')} />
                <Select label="Service area" placeholder="Choose an area" options={SERVICE_AREA_OPTIONS} disabled={!fieldsEnabled} {...register('service_area')} />
                <CategoryPicker
                  key={categoriesKey}
                  selected={categoryIds}
                  current={business.categories}
                  disabled={!fieldsEnabled}
                  error={errors.category_ids?.message}
                  onChange={(ids) => setValue('category_ids', ids, { shouldDirty: true, shouldValidate: true })}
                />
                <TextArea className="form-full" label="Business description" error={errors.description?.message} disabled={!fieldsEnabled} {...register('description')} />
                <fieldset className="form-full profile-social" disabled={!fieldsEnabled}>
                  <legend>Social links</legend>
                  <div className="form-grid">
                    {SOCIAL_LINK_KEYS.map((key) => (
                      <Field key={key} label={SOCIAL_LINK_LABELS[key]} placeholder="https://" error={errors.social_links?.[key]?.message} {...register(`social_links.${key}`)} />
                    ))}
                  </div>
                </fieldset>
              </div>
            </form>
          </section>
          <PortfolioEditor business={business} onDirtyChange={setPortfolioDirty} />
        </div>
        <CompletenessMeter business={business}>
          <SubmitForReview business={business} unsavedChanges={editing || portfolioDirty} />
        </CompletenessMeter>
      </div>
    </>
  )
}

function CoverImage({ business, editable }: { business: Business; editable: boolean }) {
  const { url, refresh } = useUploadUrl(business.id, business.cover_upload_id)
  const { state, upload, dismiss } = useImageUpload(business.id, 'cover')

  return (
    <div className="manage-cover-wrap">
      <div className={`manage-cover ${url ? '' : 'manage-cover-empty'}`}>
        {url ? <img src={url} alt={`${business.display_name} cover`} onError={refresh} /> : null}
        {editable ? (
          <ImagePicker category="cover" state={state} onFile={upload} className="manage-cover-button">
            <Pencil size={15} aria-hidden="true" /> {business.cover_upload_id ? 'Change cover' : 'Add cover'}
          </ImagePicker>
        ) : null}
        <UploadProgress state={state} label="Uploading cover image" />
      </div>
      <UploadError state={state} onDismiss={dismiss} />
    </div>
  )
}

function LogoImage({ business, editable }: { business: Business; editable: boolean }) {
  const { url, refresh } = useUploadUrl(business.id, business.logo_upload_id)
  const { state, upload, dismiss } = useImageUpload(business.id, 'logo')

  return (
    <div className="manage-logo-row">
      <div className="northstar-large manage-logo">
        {url ? <img src={url} alt={`${business.display_name} logo`} onError={refresh} /> : <span aria-hidden="true">{businessInitials(business.display_name)}</span>}
        <UploadProgress state={state} label="Uploading logo" />
      </div>
      {editable ? (
        <div className="manage-logo-actions">
          <ImagePicker category="logo" state={state} onFile={upload} className="button button-secondary button-small">
            <ImagePlus size={15} aria-hidden="true" /> {business.logo_upload_id ? 'Change logo' : 'Add logo'}
          </ImagePicker>
          <small>JPEG, PNG or WebP, up to 5 MB. Images save as soon as they upload.</small>
        </div>
      ) : null}
      <UploadError state={state} onDismiss={dismiss} />
    </div>
  )
}

interface ImagePickerProps {
  category: ImageCategory
  state: ImageUploadState
  onFile: (file: File) => Promise<boolean>
  className: string
  children: ReactNode
}

/** A button that opens the file chooser; the chosen file is checked and uploaded at once. */
function ImagePicker({ category, state, onFile, className, children }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = state.status === 'uploading'
  return (
    <>
      <button type="button" className={className} onClick={() => inputRef.current?.click()} disabled={busy}>{children}</button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        aria-label={category === 'logo' ? 'Upload logo' : 'Upload cover image'}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void onFile(file)
        }}
      />
    </>
  )
}

function UploadProgress({ state, label }: { state: ImageUploadState; label: string }) {
  if (state.status !== 'uploading') return null
  const percent = Math.round(state.progress * 100)
  return (
    <div className="upload-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span style={{ width: `${Math.max(percent, 4)}%` }} />
    </div>
  )
}

function UploadError({ state, onDismiss }: { state: ImageUploadState; onDismiss: () => void }) {
  if (state.status !== 'error') return null
  return (
    <p className="profile-notice profile-notice-error upload-error" role="alert">
      <span>{state.message}</span>
      <button type="button" className="upload-error-dismiss" aria-label="Dismiss" onClick={onDismiss}><X size={14} aria-hidden="true" /></button>
    </p>
  )
}

interface CategoryPickerProps {
  selected: string[]
  current: Business['categories']
  disabled: boolean
  error?: string
  onChange: (ids: string[]) => void
}

/** Up to five categories. While not editing it shows the saved ones without loading the list. */
function CategoryPicker({ selected, current, disabled, error, onChange }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const labelId = useId()
  const errorId = useId()

  useEffect(() => {
    if (disabled) return
    let live = true
    listCategories().then(
      (list) => {
        if (live) setCategories(list)
      },
      (failure: unknown) => {
        if (live) setLoadError(failure)
      },
    )
    return () => {
      live = false
    }
  }, [disabled, attempt])

  const full = selected.length >= MAX_CATEGORIES
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  const options = disabled || !categories ? current : categories
  const retry = () => {
    setLoadError(null)
    setAttempt((value) => value + 1)
  }

  let body: ReactNode
  if (!disabled && !categories) {
    body = loadError ? <ErrorState title="We couldn’t load the categories" error={loadError} onRetry={retry} /> : <LoadingState label="Loading categories…" />
  } else if (options.length === 0) {
    body = <p className="profile-empty-value">No categories yet.</p>
  } else {
    body = (
      <div className="category-chips">
        {options.map((category) => {
          const isSelected = selected.includes(category.id)
          return (
            <button
              type="button"
              key={category.id}
              className={isSelected ? 'selected' : ''}
              aria-pressed={isSelected}
              disabled={disabled || (!isSelected && full)}
              onClick={() => toggle(category.id)}
            >
              {isSelected ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />} {category.name}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="form-full profile-categories" role="group" aria-labelledby={labelId} aria-describedby={error ? errorId : undefined}>
      <span id={labelId} className="profile-field-label">Categories <small>Up to {MAX_CATEGORIES}</small></span>
      {body}
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </div>
  )
}

function scoreLabel(score: number): string {
  if (score >= 100) return 'Complete'
  if (score >= 75) return 'Good foundation'
  if (score >= 40) return 'Getting there'
  return 'Just started'
}

/** The API's completeness: the score, and each required item done or still missing. */
function CompletenessMeter({ business, children }: { business: Business; children?: ReactNode }) {
  const { score, missing } = business.completeness
  const keys = [...COMPLETENESS_KEYS, ...missing.filter((key) => !COMPLETENESS_KEYS.includes(key))]
  return (
    <aside className="profile-completion" aria-labelledby="profile-strength-title">
      <h2 id="profile-strength-title">Profile strength</h2>
      <div className="completion-score"><strong>{score}%</strong><span>{scoreLabel(score)}</span></div>
      <div className="completion-bar" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <span style={{ width: `${score}%` }} />
      </div>
      <p>{missing.length ? 'Complete these details before you submit your business for review.' : 'Every required detail is filled in.'}</p>
      <ul className="completion-list" aria-label="Required details">
        {keys.map((key) => {
          const done = !missing.includes(key)
          return (
            <li key={key} className={`completion-item ${done ? 'done' : ''}`} data-state={done ? 'done' : 'missing'}>
              {done ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />} {completenessLabel(key)}
              <span className="profile-sr-only">{done ? ', done' : ', missing'}</span>
            </li>
          )
        })}
      </ul>
      {children}
    </aside>
  )
}

/**
 * "Submit for review", for owners and administrators once every required item is filled in and
 * the profile is a draft or has changes requested. The profile is locked until BFB decides.
 */
function SubmitForReview({ business, unsavedChanges }: { business: Business; unsavedChanges: boolean }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  if (!canEditProfile(business.role) || !canSubmitForReview(business.profile_status) || !business.completeness.complete) return null

  const submit = async () => {
    setBusy(true)
    setProblem(null)
    try {
      setBusinessProfile(await submitForReview(business.id))
      showToast('Your profile was submitted for review.')
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code === 'profile_incomplete') {
        const missing = (apiError.details as { missing?: string[] } | undefined)?.missing ?? []
        setProblem(missing.length ? `Still needed: ${missing.map(completenessLabel).join(', ')}.` : apiError.userMessage)
      } else {
        setProblem(apiError.userMessage)
      }
      // The saved profile differs from what this page showed: show the current one.
      if (apiError.code === 'profile_incomplete' || apiError.code === 'invalid_profile_status') void loadBusinessProfile(business.id)
    } finally {
      setBusy(false)
    }
  }

  const again = business.profile_status === 'changes_requested'
  return (
    <div className="submit-review">
      <p>{again ? 'Made the requested changes? Send your profile back to BFB.' : 'BFB reviews every business before it goes live. You can’t edit the profile while it’s in review.'}</p>
      <button type="button" className="button button-primary submit-review-button" onClick={() => void submit()} disabled={busy || unsavedChanges}>
        <Send size={15} aria-hidden="true" /> {busy ? 'Submitting…' : again ? 'Submit again' : 'Submit for review'}
      </button>
      {unsavedChanges ? <small>Save or cancel your changes first.</small> : null}
      {problem ? <p className="profile-notice profile-notice-error submit-review-error" role="alert">{problem}</p> : null}
    </div>
  )
}

// Inputs in the prototype's profile look: the label wraps its control and names it.

type FieldProps = { label: string; hint?: string; error?: string; className?: string }

function useControlIds(hint?: string, error?: string) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return { labelId: `${id}-label`, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined }
}

function Field({ label, hint, error, className, ...props }: FieldProps & ComponentPropsWithRef<'input'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label className={className}>
      <span id={labelId}>{label}</span>
      <input {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      {hint ? <small className="profile-field-hint" id={hintId}>{hint}</small> : null}
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </label>
  )
}

function TextArea({ label, hint, error, className, ...props }: FieldProps & ComponentPropsWithRef<'textarea'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label className={className}>
      <span id={labelId}>{label}</span>
      <textarea {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      {hint ? <small className="profile-field-hint" id={hintId}>{hint}</small> : null}
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </label>
  )
}

type SelectProps = FieldProps & ComponentPropsWithRef<'select'> & { placeholder: string; options: ReadonlyArray<{ value: string; label: string }> }

function Select({ label, error, className, placeholder, options, hint: _hint, ...props }: SelectProps) {
  const { labelId, errorId, describedBy } = useControlIds(undefined, error)
  return (
    <label className={className}>
      <span id={labelId}>{label}</span>
      <select {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </label>
  )
}
