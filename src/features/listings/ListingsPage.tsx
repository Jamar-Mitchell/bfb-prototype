import { Plus } from 'lucide-react'
import { useId, useState } from 'react'

import { EmptyState, ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { ConfirmDialog } from '../team/ConfirmDialog'
import { ListingCard } from './ListingCard'
import { ListingFormDialog } from './ListingFormDialog'
import { listingKinds, type ListingKind, type ListingKindId } from './listingKinds'
import { approvalBlocker, canManageListings, missingPhrase, STATUS_LABELS, type KnownProfileStatus } from './listingRules'
import type { Listing, ListingCommand, ListingStatus } from './listingsApi'
import { useCategories, useProfileStatus } from './useBusinessContext'
import { useListings, type KindListings } from './useListings'
import './ListingsPage.css'

type FormState = { kind: ListingKind; listing: Listing | null; chooseKind?: boolean }
type ArchiveState = { kind: ListingKind; listing: Listing }

const SUCCESS: Record<ListingCommand, (title: string) => string> = {
  publish: (title) => `“${title}” is live.`,
  pause: (title) => `“${title}” is paused. Partners won’t see it until you resume it.`,
  resume: (title) => `“${title}” is live again.`,
  archive: (title) => `“${title}” was archived.`,
}

/** Copy for a refused command. */
function commandProblem(kind: ListingKind, listing: Listing, error: ApiError): string {
  const details = error.details as { profile_status?: KnownProfileStatus; missing?: string[]; status?: ListingStatus } | undefined
  switch (error.code) {
    case 'business_not_approved':
      return approvalBlocker(details?.profile_status ?? 'unknown') ?? 'Your business must be approved before listings can go live.'
    case 'listing_incomplete':
      return `“${listing.title}” still needs ${missingPhrase(kind, details?.missing ?? listing.missing_for_publish)}. Edit it, then try again.`
    case 'invalid_listing_status':
      return `“${listing.title}” changed since the page loaded${details?.status ? ` and is now ${STATUS_LABELS[details.status].toLowerCase()}` : ''}. The list has been refreshed.`
    case 'not_found':
      return `“${listing.title}” no longer exists. The list has been refreshed.`
    case 'business_role_required':
      return `Only owners and administrators can manage ${kind.plural}.`
    default:
      return error.userMessage
  }
}

/** Offers & needs: the business's listings from the API, with their lifecycle. */
export function ListingsPage() {
  const business = useActiveBusiness()
  const businessId = business.id
  const canManage = canManageListings(business.role)
  const { profileStatus, reload: reloadProfileStatus } = useProfileStatus(businessId)
  const categories = useCategories()
  const listings = useListings(listingKinds, businessId)
  const [form, setForm] = useState<FormState | null>(null)
  const [archive, setArchive] = useState<ArchiveState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notices, setNotices] = useState<Partial<Record<ListingKindId, string>>>({})
  const approvalNoteId = useId()

  const setNotice = (kindId: ListingKindId, text: string | null) =>
    setNotices((current) => ({ ...current, [kindId]: text ?? undefined }))

  const runCommand = async (kind: ListingKind, listing: Listing, command: ListingCommand) => {
    setBusyId(listing.id)
    setNotice(kind.id, null)
    try {
      const updated = await kind.command(businessId, listing.id, command)
      listings.upsert(kind.id, updated)
      showToast(SUCCESS[command](updated.title))
    } catch (error) {
      const apiError = toApiError(error)
      setNotice(kind.id, commandProblem(kind, listing, apiError))
      // The page was out of date: show what is true now.
      if (['invalid_listing_status', 'not_found', 'listing_incomplete'].includes(apiError.code)) void listings.reload(kind)
      if (apiError.code === 'business_not_approved' || apiError.code === 'business_role_required') reloadProfileStatus()
    } finally {
      setBusyId(null)
    }
  }

  const confirmArchive = async () => {
    if (!archive) return
    await runCommand(archive.kind, archive.listing, 'archive')
    setArchive(null)
  }

  const saved = (kind: ListingKind, listing: Listing, created: boolean) => {
    listings.upsert(kind.id, listing)
    setForm(null)
    setNotice(kind.id, null)
    showToast(created ? `Draft ${kind.noun} “${listing.title}” created.` : `Changes to “${listing.title}” saved.`)
  }

  const waiting = listingKinds.some((kind) =>
    listings.get(kind.id).listings?.some((listing) => listing.status === 'draft' || listing.status === 'paused'),
  )
  const approvalNote = canManage && waiting ? approvalBlocker(profileStatus) : null

  return (
    <>
      <div className="page-heading">
        <div><span>OFFERS & NEEDS</span><h1>Manage what you trade.</h1><p>Keep your services and business needs current to improve match quality.</p></div>
        {canManage ? (
          <button type="button" className="button button-primary" onClick={() => setForm({ kind: listingKinds[0], listing: null, chooseKind: true })}>
            <Plus size={16} aria-hidden="true" /> Add listing
          </button>
        ) : null}
      </div>
      <div className="listing-summary">
        {listingKinds.map((kind) => {
          const Icon = kind.icon
          const active = listings.get(kind.id).listings?.filter((listing) => listing.status === 'active').length
          return (
            <div key={kind.id}>
              <Icon size={19} aria-hidden="true" />
              <span><strong>{active ?? '–'} active {active === 1 ? kind.noun : kind.plural}</strong><small>{kind.summaryLine}</small></span>
            </div>
          )
        })}
      </div>
      {approvalNote ? <p className="listing-notice listing-notice-info" id={approvalNoteId}>{approvalNote}</p> : null}

      {listingKinds.map((kind) => (
        <ListingsSection
          key={kind.id}
          kind={kind}
          data={listings.get(kind.id)}
          canManage={canManage}
          profileStatus={profileStatus}
          approvalNoteId={approvalNote ? approvalNoteId : undefined}
          busyId={busyId}
          notice={notices[kind.id] ?? null}
          onRetry={() => void listings.reload(kind)}
          onAdd={() => setForm({ kind, listing: null })}
          onEdit={(listing) => setForm({ kind, listing })}
          onCommand={(listing, command) => void runCommand(kind, listing, command)}
          onArchive={(listing) => setArchive({ kind, listing })}
        />
      ))}

      {form ? (
        <ListingFormDialog
          kind={form.kind}
          kindChoices={form.chooseKind ? listingKinds : undefined}
          businessId={businessId}
          categories={categories.categories}
          categoriesFailed={Boolean(categories.error)}
          onRetryCategories={categories.retry}
          listing={form.listing}
          onSaved={(listing, kind) => saved(kind, listing, form.listing === null)}
          onStale={() => void listings.reload(form.kind)}
          onClose={() => setForm(null)}
        />
      ) : null}

      {archive ? (
        <ConfirmDialog
          kicker={`ARCHIVE ${archive.kind.noun.toUpperCase()}`}
          title={`Archive “${archive.listing.title}”?`}
          confirmLabel={`Archive ${archive.kind.noun}`}
          busyLabel="Archiving…"
          busy={busyId === archive.listing.id}
          onConfirm={() => void confirmArchive()}
          onCancel={() => setArchive(null)}
        >
          <p>Archiving is final. The {archive.kind.noun} comes off BFB and can’t be edited, published or brought back. To list it again, add a new {archive.kind.noun}.</p>
        </ConfirmDialog>
      ) : null}
    </>
  )
}

type Filter = 'all' | ListingStatus

const FILTERS: Filter[] = ['all', 'draft', 'active', 'paused', 'archived']

interface ListingsSectionProps {
  kind: ListingKind
  data: KindListings
  canManage: boolean
  profileStatus: KnownProfileStatus
  approvalNoteId?: string
  busyId: string | null
  notice: string | null
  onRetry: () => void
  onAdd: () => void
  onEdit: (listing: Listing) => void
  onCommand: (listing: Listing, command: Exclude<ListingCommand, 'archive'>) => void
  onArchive: (listing: Listing) => void
}

/** One kind's listings: status filter, cards, and the loading, empty and error states. */
function ListingsSection({ kind, data, canManage, profileStatus, approvalNoteId, busyId, notice, onRetry, onAdd, onEdit, onCommand, onArchive }: ListingsSectionProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const titleId = useId()
  const all = data.listings
  const count = (value: Filter) => (value === 'all' ? (all?.length ?? 0) : (all?.filter((listing) => listing.status === value).length ?? 0))
  const shown = all?.filter((listing) => filter === 'all' || listing.status === filter) ?? []

  let body
  if (all === null) {
    body = data.error ? (
      <ErrorState title={`We couldn’t load your ${kind.plural}`} error={data.error} onRetry={onRetry} />
    ) : (
      <LoadingState label={`Loading your ${kind.plural}…`} />
    )
  } else if (all.length === 0) {
    body = (
      <EmptyState
        icon={kind.icon}
        title={`No ${kind.plural} yet`}
        description={canManage ? `Add what your business can trade. New ${kind.plural} start as drafts.` : `Owners and administrators add ${kind.plural} for your business.`}
        action={canManage ? <button type="button" className="button button-primary button-small" onClick={onAdd}><Plus size={15} aria-hidden="true" /> {kind.addLabel}</button> : undefined}
      />
    )
  } else if (shown.length === 0) {
    body = <p className="listing-filter-empty">No {STATUS_LABELS[filter as ListingStatus].toLowerCase()} {kind.plural}.</p>
  } else {
    body = (
      <div className="manage-listing-grid">
        {shown.map((listing) => (
          <ListingCard
            key={listing.id}
            kind={kind}
            listing={listing}
            canManage={canManage}
            profileStatus={profileStatus}
            approvalNoteId={approvalNoteId}
            busy={busyId === listing.id}
            onEdit={() => onEdit(listing)}
            onCommand={(command) => onCommand(listing, command)}
            onArchive={() => onArchive(listing)}
          />
        ))}
      </div>
    )
  }

  return (
    <section className="manage-listing-section" aria-labelledby={titleId}>
      <div className="content-heading listing-section-head">
        <div><h2 id={titleId}>{kind.sectionTitle}</h2><p>{kind.sectionDescription}</p></div>
        {all && all.length > 0 ? (
          <div className="listing-filter" role="group" aria-label={`Filter ${kind.plural} by status`}>
            {FILTERS.map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === 'all' ? 'All' : STATUS_LABELS[value]} <span>{count(value)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {notice ? <p className="listing-notice listing-notice-error" role="alert">{notice}</p> : null}
      {all && data.error ? (
        <p className="listing-notice listing-notice-error" role="alert">
          We couldn’t refresh your {kind.plural}. <button type="button" className="text-button" onClick={onRetry}>Try again</button>
        </p>
      ) : null}
      {body}
    </section>
  )
}
