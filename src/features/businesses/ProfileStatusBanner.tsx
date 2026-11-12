import { CircleCheck, Clock3, PencilLine, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'

import { canEditProfile } from './profileFields'
import { useBusinessProfile } from './useBusinessProfile'
import './ProfileStatusBanner.css'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const SEEN_APPROVAL_KEY = 'bfb.approvalSeen.'

function approvalSeen(businessId: string, decidedAt: string | undefined): boolean {
  try {
    return localStorage.getItem(SEEN_APPROVAL_KEY + businessId) === (decidedAt ?? 'approved')
  } catch {
    return false
  }
}

function rememberApprovalSeen(businessId: string, decidedAt: string | undefined) {
  try {
    localStorage.setItem(SEEN_APPROVAL_KEY + businessId, decidedAt ?? 'approved')
  } catch {
    // Storage unavailable: the banner comes back on the next page load.
  }
}

/**
 * The active business's review status, at the top of every shell page: in review, changes
 * requested (with the reviewer's notes), approved (until dismissed) and suspended. Nothing for drafts.
 * `openProfile` adds an "Edit profile" button to the changes-requested banner (left out on the profile page).
 */
export function ProfileStatusBanner({ openProfile }: { openProfile?: () => void }) {
  const { business } = useBusinessProfile()
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (!business) return null

  const review = business.latest_review
  const editor = canEditProfile(business.role)

  switch (business.profile_status) {
    case 'in_review':
      return (
        <section className="status-banner status-banner-review" aria-label="Profile in review">
          <span className="status-banner-icon"><Clock3 size={18} aria-hidden="true" /></span>
          <p className="status-banner-text">
            <strong>Your profile is in review.</strong>{' '}
            {business.submitted_for_review_at ? `Submitted ${dateFormat.format(new Date(business.submitted_for_review_at))}. ` : ''}
            BFB checks every business before it goes live. Editing is paused until then.
          </p>
        </section>
      )
    case 'changes_requested':
      return (
        <section className="status-banner status-banner-changes" aria-label="Changes requested">
          <span className="status-banner-icon"><PencilLine size={18} aria-hidden="true" /></span>
          <div className="status-banner-text">
            <p><strong>BFB asked for changes to your profile.</strong> Update it, then submit it for review again.</p>
            {review?.notes ? <blockquote className="status-banner-notes">{review.notes}</blockquote> : null}
          </div>
          {editor && openProfile ? <button type="button" className="button button-secondary button-small" onClick={openProfile}>Edit profile</button> : null}
        </section>
      )
    case 'approved': {
      const decidedAt = review?.decision === 'approved' ? review.decided_at : undefined
      if (dismissed === business.id || approvalSeen(business.id, decidedAt)) return null
      return (
        <section className="status-banner status-banner-approved" aria-label="Profile approved">
          <span className="status-banner-icon"><CircleCheck size={18} aria-hidden="true" /></span>
          <div className="status-banner-text">
            <p><strong>{business.display_name} is approved.</strong> Your profile is public, and you can publish offers and needs.</p>
            {review?.decision === 'approved' && review.notes ? <blockquote className="status-banner-notes">{review.notes}</blockquote> : null}
          </div>
          <button
            type="button"
            className="status-banner-dismiss"
            aria-label="Dismiss"
            onClick={() => {
              rememberApprovalSeen(business.id, decidedAt)
              setDismissed(business.id)
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </section>
      )
    }
    case 'suspended':
      return (
        <section className="status-banner status-banner-suspended" aria-label="Business suspended">
          <span className="status-banner-icon"><ShieldAlert size={18} aria-hidden="true" /></span>
          <p className="status-banner-text">
            <strong>{business.display_name} is suspended.</strong> Its profile and listings are hidden. Contact BFB support for help.
          </p>
        </section>
      )
    default:
      return null
  }
}
