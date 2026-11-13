import type { ApiError } from '../../lib/api/errors'
import { NotesDialog, type NotesDialogCopy } from './NotesDialog'

export type DecisionKind = 'approve' | 'request-changes'

const COPY: Record<DecisionKind, (name: string) => NotesDialogCopy> = {
  approve: (name) => ({
    kicker: 'APPROVE BUSINESS',
    title: `Approve ${name}?`,
    intro: 'The business is marked verified, its public profile goes live and it can publish offers and needs.',
    label: 'Notes for the business (optional)',
    hint: 'Shown to the business’s team.',
    confirm: 'Approve business',
    busy: 'Approving…',
  }),
  'request-changes': (name) => ({
    kicker: 'REQUEST CHANGES',
    title: `Ask ${name} for changes?`,
    intro: 'The business goes back to editing and can submit again once it has made the changes.',
    label: 'What should they change?',
    hint: 'Shown to the business’s team. Be specific.',
    confirm: 'Request changes',
    busy: 'Sending…',
    requiredMessage: 'Tell the business what to change.',
  }),
}

interface ReviewDecisionDialogProps {
  kind: DecisionKind
  businessName: string
  /** Sends the decision. Throws on failure; the dialog shows the error and stays open. */
  onSubmit: (notes: string) => Promise<void>
  onCancel: () => void
  describeError?: (error: ApiError) => string | undefined
}

/** Confirms an approve or request-changes decision and collects the notes. */
export function ReviewDecisionDialog({ kind, businessName, ...props }: ReviewDecisionDialogProps) {
  return <NotesDialog copy={COPY[kind](businessName)} {...props} />
}
