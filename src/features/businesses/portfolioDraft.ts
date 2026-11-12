import type { PortfolioBatch, PortfolioFile, PortfolioItem } from './portfolioApi'

/**
 * The portfolio as the person is editing it. Every add, edit, removal and move changes only this
 * local draft; "Save portfolio" sends the difference from the saved portfolio as one batch.
 * Separate requests per change race each other and leave the screen out of step with the server.
 */
export interface DraftItem {
  /** The item's ID once saved, or the batch `ref` of a new one. Stable while editing. */
  key: string
  /** `null` for an item added in this session. */
  id: string | null
  title: string
  description: string | null
  link_url: string | null
  upload_id: string | null
  /** Preview of the file: from the portfolio, or from the upload of a new file. */
  file: PortfolioFile | null
  original_filename: string | null
}

/** What the add and edit form produces. */
export type DraftChanges = Pick<DraftItem, 'title' | 'description' | 'link_url' | 'upload_id' | 'file' | 'original_filename'>

export function draftFromItems(items: readonly PortfolioItem[]): DraftItem[] {
  return items.map((item) => ({
    key: item.id,
    id: item.id,
    title: item.title,
    description: item.description,
    link_url: item.link_url,
    upload_id: item.upload_id,
    file: item.file,
    original_filename: item.original_filename,
  }))
}

let refCounter = 0

/** A batch `ref` for a new item, unique on this page. */
export function newRef(): string {
  refCounter += 1
  return `new-${refCounter}`
}

/** For tests: number refs from `new-1` again. */
export function resetRefs() {
  refCounter = 0
}

export function addDraftItem(items: readonly DraftItem[], changes: DraftChanges, ref = newRef()): DraftItem[] {
  return [...items, { key: ref, id: null, ...changes }]
}

export function updateDraftItem(items: readonly DraftItem[], key: string, changes: DraftChanges): DraftItem[] {
  return items.map((item) => (item.key === key ? { ...item, ...changes } : item))
}

export function removeDraftItem(items: readonly DraftItem[], key: string): DraftItem[] {
  return items.filter((item) => item.key !== key)
}

/** Move the item at `from` to index `to` (clamped), shifting the others. */
export function moveDraftItem(items: readonly DraftItem[], from: number, to: number): DraftItem[] {
  const target = Math.max(0, Math.min(items.length - 1, to))
  if (from === target || from < 0 || from >= items.length) return [...items]
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(target, 0, moved)
  return next
}

const EDITABLE_FIELDS = ['title', 'description', 'link_url', 'upload_id'] as const

/**
 * The one batch that turns `saved` into `draft`, or `null` when nothing changed. It always carries
 * the full `order` (kept IDs and new refs), so the result is exactly what the person sees.
 */
export function buildBatch(version: number, saved: readonly PortfolioItem[], draft: readonly DraftItem[]): PortfolioBatch | null {
  const kept = new Set(draft.filter((item) => item.id).map((item) => item.id as string))
  const remove = saved.filter((item) => !kept.has(item.id)).map((item) => item.id)

  const add = draft
    .filter((item) => item.id === null)
    .map((item) => ({
      ref: item.key,
      title: item.title,
      ...(item.description ? { description: item.description } : {}),
      ...(item.upload_id ? { upload_id: item.upload_id } : {}),
      ...(item.link_url ? { link_url: item.link_url } : {}),
    }))

  const savedById = new Map(saved.map((item) => [item.id, item]))
  const update: NonNullable<PortfolioBatch['update']> = []
  for (const item of draft) {
    const before = item.id ? savedById.get(item.id) : undefined
    if (!before) continue
    const changed: Record<string, string | null> = {}
    for (const field of EDITABLE_FIELDS) {
      if ((item[field] ?? null) !== (before[field] ?? null)) changed[field] = item[field]
    }
    if (Object.keys(changed).length > 0) update.push({ id: before.id, ...changed })
  }

  const keptBefore = saved.filter((item) => kept.has(item.id)).map((item) => item.id)
  const keptAfter = draft.filter((item) => item.id).map((item) => item.id as string)
  const reordered = keptBefore.some((id, index) => keptAfter[index] !== id)

  if (add.length === 0 && update.length === 0 && remove.length === 0 && !reordered) return null
  return { version, add, update, remove, order: draft.map((item) => item.key) }
}
