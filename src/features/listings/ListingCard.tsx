import { Archive, Pause, Pencil, Play, Send } from 'lucide-react'
import { useId } from 'react'

import type { ListingKind } from './listingKinds'
import { activationBlocker, approvalBlocker, missingText, STATUS_LABELS, type KnownProfileStatus } from './listingRules'
import type { Listing, ListingCommand } from './listingsApi'
import { formatValueRange } from './money'

interface ListingCardProps {
  kind: ListingKind
  listing: Listing
  canManage: boolean
  profileStatus: KnownProfileStatus
  /** ID of the page's note explaining why listings can't go live yet, for screen readers. */
  approvalNoteId?: string
  busy: boolean
  onEdit: () => void
  onCommand: (command: Exclude<ListingCommand, 'archive'>) => void
  onArchive: () => void
}

/** One offer or need, in the prototype's listing card, with its status and lifecycle actions. */
export function ListingCard({ kind, listing, canManage, profileStatus, approvalNoteId, busy, onEdit, onCommand, onArchive }: ListingCardProps) {
  const hintId = useId()
  const Icon = kind.icon
  const summary = kind.summaryOf(listing)
  const value = formatValueRange(listing.value_min_minor, listing.value_max_minor, listing.currency)
  const archived = listing.status === 'archived'
  const canActivate = listing.status === 'draft' || listing.status === 'paused'
  const missing = canActivate ? missingText(kind, listing.missing_for_publish, listing.status === 'paused' ? 'resume' : 'publish') : null
  const blocked = canActivate && activationBlocker(kind, listing, profileStatus) !== null
  const describedBy = [missing ? hintId : null, approvalBlocker(profileStatus) && approvalNoteId ? approvalNoteId : null].filter(Boolean).join(' ') || undefined

  return (
    <article className={`listing-card listing-card-${listing.status}`} aria-labelledby={`${hintId}-title`}>
      <div className={`listing-type-icon ${kind.id === 'offer' ? '' : 'need'}`} aria-hidden="true"><Icon size={19} /></div>
      <div>
        <div className="listing-card-kicker">
          <span>{kind.title.toUpperCase()} · {listing.category.name.toUpperCase()}</span>
          <em className={`listing-status listing-status-${listing.status}`}>{STATUS_LABELS[listing.status]}</em>
        </div>
        <h3 id={`${hintId}-title`}>{listing.title}</h3>
        <p className={summary ? undefined : 'listing-card-placeholder'}>{summary ?? 'No details yet.'}</p>
        <strong>{value ? `${kind.valueLabel} · ${value}` : `${kind.valueLabel} not set`}</strong>
      </div>
      {canManage && !archived ? (
        <div className="listing-actions">
          <button type="button" aria-label={`Edit ${listing.title}`} onClick={onEdit} disabled={busy}><Pencil size={15} aria-hidden="true" /></button>
          <button type="button" aria-label={`Archive ${listing.title}`} onClick={onArchive} disabled={busy}><Archive size={15} aria-hidden="true" /></button>
        </div>
      ) : null}
      {missing || (canManage && !archived) ? (
        <div className="listing-card-footer">
          {missing ? <p className="listing-missing" id={hintId}>{missing}</p> : null}
          {canManage && listing.status === 'draft' ? (
            <button type="button" className="button button-primary button-small listing-command" disabled={busy || blocked} aria-describedby={describedBy} onClick={() => onCommand('publish')}>
              <Send size={14} aria-hidden="true" /> {busy ? 'Publishing…' : 'Publish'}
            </button>
          ) : null}
          {canManage && listing.status === 'active' ? (
            <button type="button" className="button button-secondary button-small listing-command" disabled={busy} onClick={() => onCommand('pause')}>
              <Pause size={14} aria-hidden="true" /> {busy ? 'Pausing…' : 'Pause'}
            </button>
          ) : null}
          {canManage && listing.status === 'paused' ? (
            <button type="button" className="button button-primary button-small listing-command" disabled={busy || blocked} aria-describedby={describedBy} onClick={() => onCommand('resume')}>
              <Play size={14} aria-hidden="true" /> {busy ? 'Resuming…' : 'Resume'}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
