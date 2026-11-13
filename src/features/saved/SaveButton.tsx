import { Bookmark } from 'lucide-react'

import './SaveButton.css'

/**
 * The prototype's bookmark button. `labelled` adds "Save" / "Saved" text beside the icon, for
 * places with room such as the public profile.
 */
export function SaveButton({
  name,
  saved,
  pending,
  onToggle,
  labelled = false,
}: {
  name: string
  saved: boolean
  pending: boolean
  onToggle: () => void
  labelled?: boolean
}) {
  return (
    <button
      type="button"
      className={`save-button ${saved ? 'saved' : ''} ${labelled ? 'save-button-labelled' : ''}`}
      onClick={onToggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={`Save ${name}`}
    >
      <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      {labelled && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}
