import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { apiGet } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

type ProfileStatus = components['schemas']['ProfileStatus']

/**
 * "View public profile", shown only once the business is approved (the public page is a
 * not-found for anything else). Pass `profileStatus` when the page already has the business;
 * without it, the link loads `GET /businesses/{id}` itself and stays hidden until it knows.
 */
export function PublicProfileLink({ businessId, profileStatus }: { businessId: string; profileStatus?: ProfileStatus }) {
  const [loadedStatus, setLoadedStatus] = useState<ProfileStatus | null>(null)

  useEffect(() => {
    if (profileStatus !== undefined) return
    let live = true
    apiGet('/businesses/{business_id}', { path: { business_id: businessId } })
      .then((business) => {
        if (live) setLoadedStatus(business.profile_status)
      })
      // Optional link: on failure it simply stays hidden.
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [businessId, profileStatus])

  if ((profileStatus ?? loadedStatus) !== 'approved') return null

  return (
    <Link className="button button-secondary" to={paths.publicBusiness(businessId)}>
      <Eye size={16} aria-hidden="true" /> View public profile
    </Link>
  )
}
