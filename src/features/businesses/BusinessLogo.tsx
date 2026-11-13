import { businessInitials } from './businessDisplay'
import './PublicBusinessProfile.css'

/**
 * A real business's logo from a signed `logo_url`, or its initials when it has none.
 * Signed URLs expire after 15 minutes, so pass the one from the latest response.
 */
export function BusinessLogo({
  business,
  size = 'medium',
}: {
  business: { display_name: string; logo_url: string | null }
  size?: 'small' | 'medium' | 'large'
}) {
  if (business.logo_url) {
    return <img className={`avatar avatar-${size} public-profile-logo`} src={business.logo_url} alt={`${business.display_name} logo`} />
  }
  return (
    <div className={`avatar avatar-${size} public-profile-initials`} aria-hidden="true">
      {businessInitials(business.display_name)}
    </div>
  )
}
