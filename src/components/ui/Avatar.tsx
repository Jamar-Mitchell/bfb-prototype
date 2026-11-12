import type { Business } from '../../mocks/businesses'

export function Avatar({ business, size = 'medium' }: { business: Business; size?: 'small' | 'medium' | 'large' }) {
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ backgroundColor: business.color, color: business.accent }}
      aria-hidden="true"
    >
      {business.initials}
    </div>
  )
}
