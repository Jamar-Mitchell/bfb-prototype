import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Flag,
  Globe,
  ImagePlus,
  Map as MapIcon,
  MapPin,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { ErrorState, LoadingState } from '../../components/feedback'
import { Avatar } from '../../components/ui/Avatar'
import { Logo } from '../../components/ui/Logo'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { businesses as demoBusinesses } from '../../mocks/businesses'
import { listCategories, resetCategoriesCache, updateProfile, type Business, type Category } from '../businesses/profileApi'
import {
  BUSINESS_STAGE_OPTIONS,
  canEditProfile,
  completenessLabel,
  getCountryOptions,
  isProfileLocked,
  MAX_CATEGORIES,
  SERVICE_AREA_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from '../businesses/profileFields'
import { loadBusinessProfile, setBusinessProfile, useBusinessProfile } from '../businesses/useBusinessProfile'
import {
  onboardingSchema,
  onboardingValues,
  QUESTION_STEPS,
  resumeStep,
  stepUpdate,
  SUMMARY_STEP,
  WELCOME_STEP,
  type OnboardingField,
  type OnboardingValues,
} from './onboardingSteps'
import './Onboarding.css'

const TOTAL_STEPS = QUESTION_STEPS.length
const SERVICE_AREA_ICONS = { local: MapPin, regional: MapIcon, national: Flag, international: Globe } as const

interface OnboardingProps {
  /** Finished: open the dashboard. */
  complete: () => void
  /** Leave setup; answers saved so far are kept. */
  exit: () => void
  /** Open the profile editor (to upload the logo). */
  openProfile: () => void
}

/**
 * Profile setup for the active business. Each step saves to the API as the user continues,
 * so leaving midway and coming back resumes at the first unanswered step.
 */
export function Onboarding({ complete, exit, openProfile }: OnboardingProps) {
  const { business, error, reload } = useBusinessProfile()
  const [loaded, setLoaded] = useState(false)

  // Always start from the latest saved answers, not a copy cached by another page.
  useEffect(() => {
    let live = true
    void reload().finally(() => {
      if (live) setLoaded(true)
    })
    return () => {
      live = false
    }
  }, [reload])

  let content: ReactNode
  if (!loaded || !business) {
    content = error ? (
      <ErrorState title="We couldn’t load your profile" error={error} onRetry={() => void reload()} />
    ) : (
      <LoadingState label="Loading your profile…" />
    )
  } else if (!canEditProfile(business.role) || isProfileLocked(business.profile_status)) {
    content = <SetupUnavailable business={business} exit={exit} />
  } else {
    return <OnboardingFlow business={business} complete={complete} exit={exit} openProfile={openProfile} />
  }

  return (
    <div className="onboarding-page">
      <OnboardingHeader exit={exit} />
      <div className="onboarding-progress"><span style={{ width: '8%' }} /></div>
      <main className="onboarding-main">{content}</main>
    </div>
  )
}

function OnboardingHeader({ exit }: { exit: () => void }) {
  return (
    <header className="onboarding-header">
      <Logo />
      <button type="button" className="text-button" onClick={exit}>Exit setup</button>
    </header>
  )
}

/** Members cannot edit the profile, and nobody can while it is in review or suspended. */
function SetupUnavailable({ business, exit }: { business: Business; exit: () => void }) {
  const reason = !canEditProfile(business.role)
    ? `Only owners and administrators can set up the profile of ${business.display_name}.`
    : business.profile_status === 'in_review'
      ? `${business.display_name} is in review. You can make changes again once BFB has reviewed it.`
      : `${business.display_name} is suspended, so its profile can’t be changed. Contact BFB support for help.`

  return (
    <section className="welcome-step">
      <span className="onboarding-kicker">PROFILE SETUP</span>
      <h1>Profile setup isn’t available right now.</h1>
      <p>{reason}</p>
      <button type="button" className="button button-primary button-large" onClick={exit}>Go to dashboard <ArrowRight size={18} aria-hidden="true" /></button>
    </section>
  )
}

interface FlowProps extends OnboardingProps {
  business: Business
}

function OnboardingFlow({ business, complete, exit, openProfile }: FlowProps) {
  const [step, setStep] = useState(() => resumeStep(business))
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [categoriesKey, setCategoriesKey] = useState(0)

  const {
    register,
    setValue,
    getValues,
    setError,
    trigger,
    watch,
    formState: { errors },
  } = useForm<OnboardingValues>({ resolver: zodResolver(onboardingSchema), defaultValues: onboardingValues(business) })

  const goTo = (next: number) => {
    setProblem(null)
    setStep(next)
    window.scrollTo(0, 0)
  }

  const choose = (field: OnboardingField, value: string) => {
    setValue(field, value, { shouldValidate: Boolean(errors[field]) })
  }

  const saveStep = async () => {
    const fields = QUESTION_STEPS[step - 1].fields
    if (!(await trigger([...fields], { shouldFocus: true }))) return

    setSaving(true)
    setProblem(null)
    try {
      setBusinessProfile(await updateProfile(business.id, stepUpdate(step, getValues())))
      goTo(step + 1)
    } catch (saveError) {
      const apiError = toApiError(saveError)
      if (apiError.code === 'profile_not_editable') {
        // Submitted for review (or suspended) meanwhile: reloading shows why setup stopped.
        setProblem(apiError.userMessage)
        void loadBusinessProfile(business.id)
      } else if (apiError.code === 'invalid_category') {
        resetCategoriesCache()
        setCategoriesKey((key) => key + 1)
        setValue('category_ids', [])
        setError('category_ids', { type: 'server', message: apiError.userMessage })
      } else {
        const unmatched = applyApiFieldErrors(apiError, setError, { knownFields: fields })
        if (apiError.fieldErrors.length === 0 || unmatched.length > 0) setProblem(apiError.userMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const progress = step === WELCOME_STEP ? 8 : (Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100
  const values = watch()

  return (
    <div className="onboarding-page">
      <OnboardingHeader exit={exit} />
      <div
        className="onboarding-progress"
        role="progressbar"
        aria-label="Profile setup"
        aria-valuemin={0}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={Math.min(step, TOTAL_STEPS)}
        aria-valuetext={step === SUMMARY_STEP ? 'Done' : `Step ${Math.max(step, 1)} of ${TOTAL_STEPS}`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <main className="onboarding-main">
        {step === WELCOME_STEP && <WelcomeStep start={() => goTo(1)} />}

        {step === 1 && (
          <QuestionStep number={1} kicker="THE BASICS" title="Tell us about your business." intro="This helps potential partners understand who you are and what you do.">
            <div className="onboarding-form">
              <TextInput label="Business name" error={errors.display_name?.message} placeholder="e.g. Northstar Digital Studio" {...register('display_name')} />
              <TextInput
                label="Legal name"
                hint="The registered name. Use your business name if it’s the same. Only BFB sees it."
                error={errors.legal_name?.message}
                placeholder="e.g. Northstar Digital Studio LLC"
                {...register('legal_name')}
              />
              <ChoiceGroup label="Which best describes your business?" error={errors.business_stage?.message}>
                <div className="business-type-grid">
                  {BUSINESS_STAGE_OPTIONS.map(({ value, label, description }) => {
                    const selected = values.business_stage === value
                    return (
                      <button type="button" aria-pressed={selected} className={selected ? 'selected' : ''} key={value} onClick={() => choose('business_stage', value)}>
                        <Building2 size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span>{selected && <Check size={16} aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              </ChoiceGroup>
            </div>
          </QuestionStep>
        )}

        {step === 2 && (
          <QuestionStep number={2} kicker="YOUR VALUE" title="What does your business provide?" intro="Choose the categories your services fall under. Partners browse and match by them.">
            <CategoryChoices
              key={categoriesKey}
              selected={values.category_ids}
              error={errors.category_ids?.message}
              onChange={(ids) => setValue('category_ids', ids, { shouldValidate: Boolean(errors.category_ids) })}
            />
            <div className="onboarding-form onboarding-form-after">
              <TextInput label="Industry" hint="In your own words, for example “Branding agency” or “Specialty coffee”." error={errors.industry?.message} {...register('industry')} />
            </div>
          </QuestionStep>
        )}

        {step === 3 && (
          <QuestionStep number={3} kicker="ABOUT YOU" title="How would you describe your business?" intro="A short description is the first thing partners read on your profile.">
            <div className="onboarding-form">
              <TextArea
                label="Business description"
                hint="What you do, who you do it for, and what makes you good at it."
                error={errors.description?.message}
                {...register('description')}
              />
              <ChoiceGroup label="How big is your team?" error={errors.team_size?.message}>
                <div className="choice-grid">
                  {TEAM_SIZE_OPTIONS.map(({ value, label }) => {
                    const selected = values.team_size === value
                    return (
                      <button type="button" aria-pressed={selected} key={value} className={selected ? 'selected' : ''} onClick={() => choose('team_size', value)}>
                        <span>{label}</span><div aria-hidden="true">{selected ? <Check size={15} /> : <Plus size={15} />}</div>
                      </button>
                    )
                  })}
                </div>
              </ChoiceGroup>
            </div>
          </QuestionStep>
        )}

        {step === 4 && (
          <QuestionStep number={4} kicker="WHERE YOU WORK" title="Where does your business operate?" intro="Partners use this to find businesses that can work with them.">
            <div className="onboarding-form">
              <div className="onboarding-form-row">
                <TextInput label="City" autoComplete="address-level2" error={errors.location_city?.message} {...register('location_city')} />
                <TextInput label="State or region" hint="Optional." autoComplete="address-level1" error={errors.location_region?.message} {...register('location_region')} />
              </div>
              <CountrySelect label="Country" error={errors.location_country?.message} {...register('location_country')} />
              <ChoiceGroup label="Who can you work with?" error={errors.service_area?.message}>
                <div className="goal-list">
                  {SERVICE_AREA_OPTIONS.map(({ value, label, description }) => {
                    const Icon = SERVICE_AREA_ICONS[value]
                    const selected = values.service_area === value
                    return (
                      <button type="button" aria-pressed={selected} key={value} className={selected ? 'selected' : ''} onClick={() => choose('service_area', value)}>
                        <div aria-hidden="true"><Icon size={20} /></div><span><strong>{label}</strong><small>{description}</small></span><i aria-hidden="true">{selected ? <Check size={15} /> : null}</i>
                      </button>
                    )
                  })}
                </div>
              </ChoiceGroup>
            </div>
          </QuestionStep>
        )}

        {step === SUMMARY_STEP && <SummaryStep business={business} complete={complete} openProfile={openProfile} editAnswers={() => goTo(1)} />}

        {problem ? <p className="onboarding-problem" role="alert">{problem}</p> : null}
      </main>
      {step > WELCOME_STEP && step < SUMMARY_STEP && (
        <footer className="onboarding-footer">
          <button type="button" className="button button-secondary" onClick={() => goTo(step - 1)} disabled={saving}><ArrowLeft size={17} aria-hidden="true" /> Back</button>
          <span>Step {step} of {TOTAL_STEPS}</span>
          <button type="button" className="button button-primary" disabled={saving} onClick={() => void saveStep()}>
            {saving ? 'Saving…' : <>Continue <ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </footer>
      )}
    </div>
  )
}

function WelcomeStep({ start }: { start: () => void }) {
  return (
    <section className="welcome-step welcome-step-redesign">
      <div className="welcome-copy">
        <span className="onboarding-kicker">WELCOME TO BFB</span>
        <h1>Turn what your business does best into what it needs next.</h1>
        <p>Tell us what you provide and where you work. We’ll shape a marketplace experience around your business.</p>
        <div className="welcome-points">
          <span><div><Check size={14} /></div><strong>Find compatible businesses</strong><small>See partners whose needs align with your strengths.</small></span>
          <span><div><Check size={14} /></div><strong>Exchange with clarity</strong><small>Align on scope, value, and deliverables before work begins.</small></span>
        </div>
        <button type="button" className="button button-primary button-large" onClick={start}>Build my BFB profile <ArrowRight size={18} aria-hidden="true" /></button>
        <small>Takes about 2 minutes · Saved as you go · Everything can be updated later</small>
      </div>
      <div className="welcome-photo-panel">
        <img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1000&q=88" alt="Business owners collaborating together" />
        <div className="welcome-photo-shade" />
        <div className="welcome-photo-label"><span className="live-dot" /> Growing businesses, matched</div>
        <div className="welcome-match-card">
          <div><span>STRONG POTENTIAL MATCH</span><strong>Northstar Digital × Peachtree Growth</strong></div>
          <div className="welcome-trade"><span>Website design</span><div><ArrowRight size={13} /><ArrowLeft size={13} /></div><span>Marketing</span></div>
          <small><Sparkles size={12} /> Needs align on both sides</small>
        </div>
      </div>
    </section>
  )
}

interface QuestionStepProps {
  number: number
  kicker: string
  title: string
  intro: string
  children: ReactNode
}

function QuestionStep({ number, kicker, title, intro, children }: QuestionStepProps) {
  const titleId = useId()
  return (
    <section className="question-step" aria-labelledby={titleId}>
      <div className="step-count">{String(number).padStart(2, '0')} <span>/ {String(TOTAL_STEPS).padStart(2, '0')}</span></div>
      <span className="onboarding-kicker">{kicker}</span>
      <h1 id={titleId}>{title}</h1>
      <p>{intro}</p>
      {children}
    </section>
  )
}

function CategoryChoices({ selected, error, onChange }: { selected: string[]; error?: string; onChange: (ids: string[]) => void }) {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const errorId = useId()

  useEffect(() => {
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
  }, [attempt])

  const retry = useCallback(() => {
    setLoadError(null)
    setAttempt((value) => value + 1)
  }, [])

  if (!categories) {
    return loadError ? (
      <ErrorState title="We couldn’t load the categories" error={loadError} onRetry={retry} />
    ) : (
      <LoadingState label="Loading categories…" />
    )
  }

  const full = selected.length >= MAX_CATEGORIES
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])

  return (
    <div role="group" aria-label={`Service categories, up to ${MAX_CATEGORIES}`} aria-describedby={error ? errorId : undefined}>
      <div className="choice-grid">
        {categories.map((category) => {
          const isSelected = selected.includes(category.id)
          return (
            <button
              type="button"
              key={category.id}
              aria-pressed={isSelected}
              className={isSelected ? 'selected' : ''}
              disabled={!isSelected && full}
              title={category.description ?? undefined}
              onClick={() => toggle(category.id)}
            >
              <span>{category.name}</span><div aria-hidden="true">{isSelected ? <Check size={15} /> : <Plus size={15} />}</div>
            </button>
          )
        })}
      </div>
      <div className="selection-note">
        <Sparkles size={16} aria-hidden="true" />
        <span><strong>{selected.length || 'None'} of {MAX_CATEGORIES} selected</strong> · Choose what your business can confidently deliver.</span>
      </div>
      <FieldError id={errorId} text={error} />
    </div>
  )
}

interface SummaryStepProps {
  business: Business
  complete: () => void
  openProfile: () => void
  editAnswers: () => void
}

function SummaryStep({ business, complete, openProfile, editAnswers }: SummaryStepProps) {
  const provides = business.categories.slice(0, 3).map((category) => category.name).join(', ')
  const area = SERVICE_AREA_OPTIONS.find((option) => option.value === business.service_area)?.label
  const serves = [area, business.location_city].filter(Boolean).join(' · ')
  const missing = business.completeness.missing

  return (
    <section className="welcome-step complete-step">
      <div className="complete-icon"><Check size={34} aria-hidden="true" /></div>
      <span className="onboarding-kicker">{missing.length ? 'ALMOST THERE' : 'YOU’RE READY'}</span>
      <h1>We found your first potential matches.</h1>
      <p>Your answers are saved, and these businesses align with the value you can provide.</p>
      <div className="complete-match-grid">
        {demoBusinesses.slice(0, 3).map((demo, index) => (
          <article key={demo.id}>
            <img src={demo.image} alt="" />
            <div className="complete-match-copy"><Avatar business={demo} size="small" /><span><strong>{demo.name}</strong><small>{demo.category}</small></span><b>{index === 0 ? 'Strong' : 'Good'}</b></div>
          </article>
        ))}
      </div>
      <div className="onboarding-summary">
        <div><span>YOU PROVIDE</span><strong>{provides || 'No categories yet'}</strong></div>
        <ArrowRight size={20} aria-hidden="true" />
        <div><span>YOU WORK</span><strong>{serves || 'Not set yet'}</strong></div>
      </div>
      {missing.length ? (
        <div className="onboarding-missing">
          <ImagePlus size={18} aria-hidden="true" />
          <span>
            <strong>One more step before BFB can review your business</strong>
            <small>Still needed: {missing.map(completenessLabel).join(', ')}.</small>
          </span>
          <button type="button" className="button button-secondary button-small" onClick={openProfile}>
            {missing.length === 1 && missing[0] === 'logo' ? 'Add your logo' : 'Finish your profile'}
          </button>
        </div>
      ) : null}
      <button type="button" className="button button-primary button-large" onClick={complete}>View my matches <ArrowRight size={18} aria-hidden="true" /></button>
      <button type="button" className="text-button onboarding-edit" onClick={editAnswers}>Change my answers</button>
    </section>
  )
}

// Inputs in the onboarding look: the label wraps its control, as in the prototype.

type ControlProps = { label: string; hint?: string; error?: string }

function useControlIds(hint?: string, error?: string) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  // Named by the label text alone: a wrapping label would also pull in a select's options.
  return { labelId: `${id}-label`, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined }
}

function Hint({ id, text }: { id?: string; text?: string }) {
  return text ? <small className="onboarding-hint" id={id}>{text}</small> : null
}

function FieldError({ id, text }: { id?: string; text?: string }) {
  return text ? <small className="onboarding-error" id={id}>{text}</small> : null
}

function TextInput({ label, hint, error, ...props }: ControlProps & ComponentPropsWithRef<'input'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label>
      <span id={labelId}>{label}</span>
      <input {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      <Hint id={hintId} text={hint} />
      <FieldError id={errorId} text={error} />
    </label>
  )
}

function TextArea({ label, hint, error, ...props }: ControlProps & ComponentPropsWithRef<'textarea'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label>
      <span id={labelId}>{label}</span>
      <textarea rows={5} {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      <Hint id={hintId} text={hint} />
      <FieldError id={errorId} text={error} />
    </label>
  )
}

function CountrySelect({ label, hint, error, ...props }: ControlProps & ComponentPropsWithRef<'select'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label>
      <span id={labelId}>{label}</span>
      <select {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
        <option value="">Choose a country</option>
        {getCountryOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <Hint id={hintId} text={hint} />
      <FieldError id={errorId} text={error} />
    </label>
  )
}

function ChoiceGroup({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const labelId = useId()
  const errorId = useId()
  return (
    <div className="onboarding-group" role="group" aria-labelledby={labelId} aria-describedby={error ? errorId : undefined}>
      <span id={labelId} className="onboarding-group-label">{label}</span>
      {children}
      <FieldError id={errorId} text={error} />
    </div>
  )
}
