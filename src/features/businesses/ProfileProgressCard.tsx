import { TrendingUp } from 'lucide-react'

import { useBusinessProfile } from './useBusinessProfile'

/**
 * The sidebar's "Complete your profile" card, with the active business's real completeness.
 * Hidden once the profile is complete (or while it loads); a spacer keeps the account row at the bottom.
 */
export function ProfileProgressCard({ onOpen }: { onOpen: () => void }) {
  const { business } = useBusinessProfile()
  if (!business || business.completeness.complete) return <div className="sidebar-growth-spacer" />

  const { score } = business.completeness
  return (
    <button type="button" className="sidebar-growth sidebar-growth-button" onClick={onOpen}>
      <div className="growth-icon"><TrendingUp size={19} aria-hidden="true" /></div>
      <strong>Complete your profile</strong>
      <span>Stand out to more potential partners.</span>
      <div className="progress" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <span style={{ width: `${score}%` }} />
      </div>
      <small>{score}% complete</small>
    </button>
  )
}
