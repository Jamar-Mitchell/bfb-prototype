import { Check, ChevronLeft, ChevronRight, GripVertical, Images, Lock, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'

import { EmptyState, ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { ConfirmDialog } from '../team/ConfirmDialog'
import { getPortfolio, savePortfolio, type Portfolio, type PortfolioItem } from './portfolioApi'
import {
  addDraftItem,
  buildBatch,
  draftFromItems,
  moveDraftItem,
  removeDraftItem,
  updateDraftItem,
  type DraftChanges,
  type DraftItem,
} from './portfolioDraft'
import { PortfolioTile } from './PortfolioGallery'
import { PortfolioItemDialog } from './PortfolioItemDialog'
import type { Business } from './profileApi'
import { canEditProfile } from './profileFields'
import { loadBusinessProfile } from './useBusinessProfile'
import './Portfolio.css'

type Saved = Pick<Portfolio, 'version' | 'max_items' | 'items'>

type Notice =
  | { kind: 'conflict'; message: string }
  /** The save failed and the saved portfolio is shown again; `attempted` brings the changes back. */
  | { kind: 'error'; message: string; attempted: DraftItem[] | null }

type DialogState = { mode: 'add' } | { mode: 'edit'; key: string } | null

/** Why the portfolio is read-only for this person right now, or `null` if they can change it. */
export function portfolioLockReason(business: Pick<Business, 'role' | 'profile_status'>): string | null {
  if (!canEditProfile(business.role)) return 'Only owners and administrators can change the portfolio.'
  if (business.profile_status === 'in_review') return 'The portfolio can’t be changed while your profile is in review, because BFB reviews it with the profile.'
  if (business.profile_status === 'suspended') return 'The portfolio can’t be changed while this business is suspended.'
  return null
}

/** The other person's change makes ours stale: reload and let the person redo it. */
function isStale(error: ApiError): boolean {
  if (error.code === 'portfolio_version_conflict') return true
  const reason = (error.details as { reason?: string } | undefined)?.reason
  return error.code === 'invalid_portfolio_batch' && (reason === 'unknown_items' || reason === 'order_mismatch')
}

function saveProblem(error: ApiError, maxItems: number): string {
  switch (error.code) {
    case 'portfolio_limit_reached':
      return `A portfolio holds up to ${maxItems} work samples. Remove one before adding another.`
    case 'invalid_upload':
      return 'A file in your changes is no longer available. Upload it again.'
    default:
      return error.userMessage
  }
}

function isChanged(item: DraftItem, saved: Map<string, PortfolioItem>): boolean {
  const before = item.id ? saved.get(item.id) : undefined
  if (!before) return false
  return before.title !== item.title || before.description !== item.description || before.link_url !== item.link_url || before.upload_id !== item.upload_id
}

interface PortfolioEditorProps {
  business: Business
  /** Told whenever the portfolio gains or loses unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * The business's work samples on the profile page. Owners and administrators add, edit, remove and
 * reorder them in a local draft; "Save portfolio" sends all of it as one batch request.
 */
export function PortfolioEditor({ business, onDirtyChange }: PortfolioEditorProps) {
  const [saved, setSaved] = useState<Saved | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [draft, setDraft] = useState<DraftItem[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<{ key: string; direction: 'earlier' | 'later' } | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const refreshedFiles = useRef(false)
  const businessId = business.id

  const locked = portfolioLockReason(business)
  const editable = locked === null

  const apply = useCallback((portfolio: Saved) => {
    setSaved({ version: portfolio.version, max_items: portfolio.max_items, items: portfolio.items })
    setDraft(draftFromItems(portfolio.items))
  }, [])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      apply(await getPortfolio(businessId))
    } catch (error) {
      setLoadError(toApiError(error))
    }
  }, [apply, businessId])

  useEffect(() => {
    void load()
  }, [load])

  const batch = saved && editable ? buildBatch(saved.version, saved.items, draft) : null
  const dirty = batch !== null

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  // Locked meanwhile (submitted for review elsewhere): drop the draft and show the saved portfolio.
  useEffect(() => {
    if (!editable && saved) setDraft(draftFromItems(saved.items))
  }, [editable, saved])

  // Keyboard moves: keep focus on the moved item's button (or its other one at either end).
  useEffect(() => {
    if (!focusTarget) return
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(`[data-move-key="${CSS.escape(focusTarget.key)}"]`)
    const list = Array.from(buttons ?? [])
    const preferred = list.find((button) => button.dataset.moveDirection === focusTarget.direction && !button.disabled)
    ;(preferred ?? list.find((button) => !button.disabled))?.focus()
    setFocusTarget(null)
  }, [focusTarget, draft])

  if (!saved) {
    return (
      <PortfolioSection>
        {loadError ? <ErrorState title="We couldn’t load your portfolio" error={loadError} onRetry={() => void load()} /> : <LoadingState label="Loading portfolio…" />}
      </PortfolioSection>
    )
  }

  const maxItems = saved.max_items
  const items = editable ? draft : draftFromItems(saved.items)
  const full = items.length >= maxItems
  const savedById = new Map(saved.items.map((item) => [item.id, item]))

  const save = async () => {
    if (!batch) return
    const attempted = draft
    setSaving(true)
    setNotice(null)
    try {
      apply(await savePortfolio(businessId, batch))
      showToast('Your portfolio was saved.')
    } catch (caught) {
      const error = toApiError(caught)
      // Nothing was applied (all or nothing): show the saved portfolio again, not the failed draft.
      setDraft(draftFromItems(saved.items))
      if (isStale(error)) {
        try {
          apply(await getPortfolio(businessId))
          setNotice({ kind: 'conflict', message: 'Someone else changed this portfolio while you were editing, so your changes weren’t saved. The latest version is shown below.' })
        } catch {
          setNotice({ kind: 'error', message: 'Someone else changed this portfolio while you were editing, so your changes weren’t saved. Reload the page to see the latest version.', attempted: null })
        }
      } else if (error.code === 'profile_not_editable') {
        setNotice({ kind: 'error', message: error.userMessage, attempted: null })
        void loadBusinessProfile(businessId)
      } else {
        setNotice({ kind: 'error', message: saveProblem(error, maxItems), attempted })
      }
    } finally {
      setSaving(false)
    }
  }

  const reapply = (attempted: DraftItem[]) => {
    setDraft(attempted)
    setNotice(null)
  }

  const move = (from: number, to: number, viaKeyboard?: 'earlier' | 'later') => {
    if (to < 0 || to >= draft.length || from === to) return
    const moved = draft[from]
    setDraft(moveDraftItem(draft, from, to))
    setAnnouncement(`${moved.title} moved to position ${to + 1} of ${draft.length}.`)
    if (viaKeyboard) setFocusTarget({ key: moved.key, direction: viaKeyboard })
  }

  const remove = (item: DraftItem) => {
    setDraft(removeDraftItem(draft, item.key))
    setAnnouncement(`${item.title} removed. Save the portfolio to keep this change.`)
  }

  const submitDialog = (changes: DraftChanges) => {
    if (dialog?.mode === 'edit') setDraft(updateDraftItem(draft, dialog.key, changes))
    else setDraft(addDraftItem(draft, changes))
    setDialog(null)
  }

  // Signed file URLs expire after 15 minutes: fetch fresh ones once per visit, keeping the draft.
  const refreshFiles = () => {
    if (refreshedFiles.current) return
    refreshedFiles.current = true
    getPortfolio(businessId).then(
      (fresh) => {
        const files = new Map(fresh.items.map((item) => [item.id, item]))
        const withFresh = <T extends { id: string | null; upload_id: string | null; file: DraftItem['file'] }>(item: T): T => {
          const latest = item.id ? files.get(item.id) : undefined
          return latest && latest.upload_id === item.upload_id ? { ...item, file: latest.file } : item
        }
        setSaved((current) => (current ? { ...current, items: current.items.map(withFresh) } : current))
        setDraft((current) => current.map(withFresh))
      },
      () => {
        // The tile keeps its placeholder.
      },
    )
  }

  const onDragStart = (event: DragEvent<HTMLLIElement>, key: string) => {
    setDragKey(key)
    event.dataTransfer?.setData('text/plain', key)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (event: DragEvent<HTMLLIElement>, key: string) => {
    if (!dragKey) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    if (overKey !== key) setOverKey(key)
  }

  const onDrop = (event: DragEvent<HTMLLIElement>, key: string) => {
    event.preventDefault()
    if (dragKey) move(draft.findIndex((item) => item.key === dragKey), draft.findIndex((item) => item.key === key))
    setDragKey(null)
    setOverKey(null)
  }

  const endDrag = () => {
    setDragKey(null)
    setOverKey(null)
  }

  const editing = dialog?.mode === 'edit' ? draft.find((item) => item.key === dialog.key) ?? null : null
  const canReorder = editable && !saving && items.length > 1

  return (
    <PortfolioSection
      count={`${items.length} of ${maxItems}`}
      action={
        editable ? (
          <button type="button" className="button button-secondary button-small" onClick={() => setDialog({ mode: 'add' })} disabled={full || saving}>
            <Plus size={15} aria-hidden="true" /> Add work sample
          </button>
        ) : null
      }
    >
      {locked ? <p className="portfolio-note"><Lock size={14} aria-hidden="true" /> {locked}</p> : null}
      {editable && full ? <p className="portfolio-note">Your portfolio is full. Remove a work sample to add another.</p> : null}
      {notice ? (
        <div className={`profile-notice ${notice.kind === 'conflict' ? 'profile-notice-locked' : 'profile-notice-error'} portfolio-notice`} role="alert">
          <span>{notice.message}</span>
          {notice.kind === 'error' && notice.attempted ? (
            <button type="button" className="portfolio-text-button" onClick={() => reapply(notice.attempted!)}>
              <RotateCcw size={13} aria-hidden="true" /> Bring back my changes
            </button>
          ) : null}
        </div>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          className="portfolio-empty"
          icon={Images}
          title="No work samples yet"
          description={editable ? 'Add images, PDFs or links that show partners what your business delivers.' : 'This business hasn’t added any work samples.'}
          action={
            editable ? (
              <button type="button" className="button button-primary button-small" onClick={() => setDialog({ mode: 'add' })} disabled={saving}>
                <Plus size={15} aria-hidden="true" /> Add work sample
              </button>
            ) : undefined
          }
        />
      ) : (
        <ol className={`portfolio-grid ${editable ? 'portfolio-grid-editable' : ''}`} aria-label="Portfolio items" ref={listRef}>
          {items.map((item, index) => {
            const badge = !editable ? null : item.id === null ? 'New' : isChanged(item, savedById) ? 'Edited' : null
            return (
              <li
                key={item.key}
                draggable={canReorder}
                className={[dragKey === item.key ? 'portfolio-dragging' : '', overKey === item.key && dragKey !== item.key ? 'portfolio-drop-target' : ''].filter(Boolean).join(' ') || undefined}
                onDragStart={canReorder ? (event) => onDragStart(event, item.key) : undefined}
                onDragOver={canReorder ? (event) => onDragOver(event, item.key) : undefined}
                onDrop={canReorder ? (event) => onDrop(event, item.key) : undefined}
                onDragEnd={canReorder ? endDrag : undefined}
              >
                <PortfolioTile
                  item={{ ...item, id: item.key }}
                  onImageError={refreshFiles}
                  meta={editable && item.original_filename ? <small className="portfolio-filename">{item.original_filename}</small> : null}
                  badge={badge ? <span className="portfolio-badge">{badge}</span> : null}
                >
                  {editable ? (
                    <div className="portfolio-controls">
                      {canReorder ? <span className="portfolio-grip" title="Drag to reorder" aria-hidden="true"><GripVertical size={15} /></span> : null}
                      <button
                        type="button"
                        className="portfolio-icon-button"
                        aria-label={`Move ${item.title} earlier`}
                        data-move-key={item.key}
                        data-move-direction="earlier"
                        disabled={!canReorder || index === 0}
                        onClick={() => move(index, index - 1, 'earlier')}
                      >
                        <ChevronLeft size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="portfolio-icon-button"
                        aria-label={`Move ${item.title} later`}
                        data-move-key={item.key}
                        data-move-direction="later"
                        disabled={!canReorder || index === items.length - 1}
                        onClick={() => move(index, index + 1, 'later')}
                      >
                        <ChevronRight size={15} aria-hidden="true" />
                      </button>
                      <span className="portfolio-controls-spacer" />
                      <button type="button" className="portfolio-icon-button" aria-label={`Edit ${item.title}`} disabled={saving} onClick={() => setDialog({ mode: 'edit', key: item.key })}>
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button type="button" className="portfolio-icon-button portfolio-remove" aria-label={`Remove ${item.title}`} disabled={saving} onClick={() => remove(item)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </PortfolioTile>
              </li>
            )
          })}
        </ol>
      )}
      <p className="portfolio-sr-only" aria-live="polite">{announcement}</p>
      {dirty ? (
        <div className="portfolio-savebar" role="region" aria-label="Unsaved portfolio changes">
          <span>You have unsaved changes to your portfolio.</span>
          <div>
            <button type="button" className="button button-secondary button-small" onClick={() => setConfirmDiscard(true)} disabled={saving}>Discard</button>
            <button type="button" className="button button-primary button-small" onClick={() => void save()} disabled={saving}>
              <Check size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save portfolio'}
            </button>
          </div>
        </div>
      ) : null}
      {dialog && editable ? (
        <PortfolioItemDialog key={dialog.mode === 'edit' ? dialog.key : 'add'} businessId={businessId} item={editing} onSubmit={submitDialog} onClose={() => setDialog(null)} />
      ) : null}
      {confirmDiscard ? (
        <ConfirmDialog
          kicker="PORTFOLIO"
          title="Discard your changes?"
          confirmLabel="Discard changes"
          busyLabel="Discarding…"
          busy={false}
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => {
            setDraft(draftFromItems(saved.items))
            setNotice(null)
            setConfirmDiscard(false)
          }}
        >
          <p>The portfolio goes back to how it was last saved. Files you uploaded for these changes won’t be shown.</p>
        </ConfirmDialog>
      ) : null}
    </PortfolioSection>
  )
}

function PortfolioSection({ count, action, children }: { count?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="manage-profile-card portfolio-section" aria-labelledby="portfolio-title">
      <div className="portfolio-head">
        <div>
          <h2 id="portfolio-title">Portfolio {count ? <small>{count}</small> : null}</h2>
          <p>Work samples partners see on your public profile: images, PDFs or links.</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
