import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { SelectField, TextareaField, TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { DeliverablesField } from './DeliverablesField'
import {
  emptyListingForm,
  invalidRangeField,
  listingFieldMap,
  listingFormFields,
  listingFormSchema,
  type ListingFormValues,
} from './listingForm'
import type { ListingKind } from './listingKinds'
import { missingPhrase } from './listingRules'
import type { Category, Listing } from './listingsApi'

const DELIVERY_FORMATS = [
  { value: 'remote', label: 'Remote' },
  { value: 'in_person', label: 'In person' },
  { value: 'hybrid', label: 'Hybrid' },
]

interface ListingFormDialogProps {
  kind: ListingKind
  businessId: string
  /** `null` while loading. */
  categories: Category[] | null
  categoriesFailed: boolean
  onRetryCategories: () => void
  /** The listing to edit, or `null` to create one. */
  listing: Listing | null
  onSaved: (listing: Listing) => void
  /** The listing changed under the form (archived by someone else): reload the list. */
  onStale: () => void
  onClose: () => void
}

/** Create or edit an offer or need. Built from the prototype's "Add listing" modal. */
export function ListingFormDialog({ kind, businessId, categories, categoriesFailed, onRetryCategories, listing, onSaved, onStale, onClose }: ListingFormDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: listing ? kind.toForm(listing) : emptyListingForm,
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    setFocus('title')
    return () => previous?.focus?.()
  }, [setFocus])

  // A category that was retired since the listing was made stays selectable, so an edit keeps it.
  const categoryOptions = (categories ?? []).map((category) => ({ value: category.id, label: category.name }))
  if (listing && !categoryOptions.some((option) => option.value === listing.category.id)) {
    categoryOptions.unshift({ value: listing.category.id, label: listing.category.name })
  }

  const submit = handleSubmit(async (values) => {
    setProblem(null)
    try {
      const saved = listing ? await kind.update(businessId, listing.id, values) : await kind.create(businessId, values)
      onSaved(saved)
    } catch (error) {
      const apiError = toApiError(error)
      switch (apiError.code) {
        case 'invalid_range': {
          const { field, message } = invalidRangeField(apiError)
          setError(field, { type: 'server', message }, { shouldFocus: true })
          return
        }
        case 'invalid_category':
          setError('category_id', { type: 'server', message: 'That category is no longer available. Choose another.' }, { shouldFocus: true })
          return
        case 'listing_incomplete': {
          const missing = (apiError.details as { missing?: string[] } | undefined)?.missing ?? []
          const needed = missing.length > 0 ? missingPhrase(kind, missing) : 'every required detail'
          setProblem(`A live or paused ${kind.noun} needs ${needed}. Put it back to save.`)
          return
        }
        case 'invalid_listing_status':
          setProblem(`This ${kind.noun} was archived, so it can’t be edited any more.`)
          onStale()
          return
        case 'business_role_required':
          setProblem(`Only owners and administrators can change ${kind.plural}.`)
          return
        default: {
          const unmatched = applyApiFieldErrors(apiError, setError, { fieldMap: listingFieldMap, knownFields: listingFormFields })
          if (apiError.fieldErrors.length === 0 || unmatched.length > 0) setProblem(apiError.userMessage)
        }
      }
    }
  })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isSubmitting) {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? [],
      )
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

  const heading = listing ? `Edit ${kind.noun}` : kind.addLabel

  return (
    <div className="modal-backdrop">
      <div className="quick-modal listing-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} onKeyDown={onKeyDown}>
        <div className="modal-head">
          <div><span>{listing ? `EDIT ${kind.noun.toUpperCase()}` : `NEW ${kind.noun.toUpperCase()}`}</span><h2 id={titleId}>{heading}</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose} disabled={isSubmitting}><X size={19} aria-hidden="true" /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="modal-body listing-dialog-body">
            {problem ? <p className="listing-notice listing-notice-error" role="alert">{problem}</p> : null}
            <div className="listing-form-grid">
              <TextField label="Title" required className="form-full" placeholder="e.g. Brand identity sprint" error={errors.title?.message} {...register('title')} />
              <SelectField
                label="Category"
                required
                className="form-full"
                placeholder={categories ? 'Choose a category' : categoriesFailed ? 'Categories didn’t load' : 'Loading categories…'}
                hint={
                  categoriesFailed && !categories ? (
                    <>We couldn’t load the categories. <button type="button" className="text-button listing-inline-button" onClick={onRetryCategories}>Try again</button></>
                  ) : undefined
                }
                options={categoryOptions}
                error={errors.category_id?.message}
                {...register('category_id')}
              />
              {kind.id === 'offer' ? (
                <TextareaField
                  label="Description"
                  className="form-full"
                  placeholder="What you do, who it suits and how an exchange works."
                  error={errors.description?.message}
                  {...register('description')}
                />
              ) : null}
              <Controller
                control={control}
                name="deliverables"
                render={({ field, fieldState }) => (
                  <DeliverablesField
                    value={field.value}
                    onChange={field.onChange}
                    hint="What the partner receives. Press Enter or Add after each one."
                    error={fieldState.error?.message ?? (Array.isArray(errors.deliverables) ? errors.deliverables.find(Boolean)?.message : undefined)}
                  />
                )}
              />
              <TextField
                label={`${kind.valueFieldLabel} from (USD)`}
                inputMode="decimal"
                placeholder="1500"
                hint="A single estimate, or the low end of a range."
                error={errors.value_min?.message}
                {...register('value_min')}
              />
              <TextField
                label={`${kind.valueFieldLabel} to (USD)`}
                inputMode="decimal"
                placeholder="3000"
                hint="Optional. Leave blank for a single estimate."
                error={errors.value_max?.message}
                {...register('value_max')}
              />
              {kind.id === 'offer' ? (
                <>
                  <SelectField
                    label="Delivery format"
                    placeholder="Choose a format"
                    options={DELIVERY_FORMATS}
                    error={errors.delivery_format?.message}
                    {...register('delivery_format')}
                  />
                  <TextField
                    label="Capacity"
                    inputMode="numeric"
                    placeholder="2"
                    hint="Exchanges you can take on at once."
                    error={errors.capacity?.message}
                    {...register('capacity')}
                  />
                  <TextField label="Availability" placeholder="e.g. Weekdays, from January" error={errors.availability?.message} {...register('availability')} />
                  <TextField
                    label="Location restrictions"
                    placeholder="e.g. Detroit metro only for in-person work"
                    error={errors.location_restrictions?.message}
                    {...register('location_restrictions')}
                  />
                </>
              ) : null}
            </div>
          </div>
          <div className="modal-footer listing-dialog-footer">
            {!listing ? <small>New {kind.plural} start as drafts. Publish when they’re ready.</small> : null}
            <button type="button" className="button button-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : listing ? 'Save changes' : `Create ${kind.noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
