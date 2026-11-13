import type { ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { BusinessLogo } from '../businesses/BusinessLogo'
import { formatLocation } from '../businesses/profileLabels'
import { formatValueRange } from '../listings/money'
import type { MarketplaceListing } from './marketplaceApi'
import './MarketplaceCard.css'

const MAX_DELIVERABLES = 3

/** One active offer or need from another business, in the prototype's card look. */
export function MarketplaceCard({ listing, action }: { listing: MarketplaceListing; action?: ReactNode }) {
  const { business } = listing
  const isOffer = listing.kind === 'offer'
  const summary = isOffer ? listing.description : listing.desired_outcome
  const location = formatLocation(business)
  const value = formatValueRange(listing.value_min_minor, listing.value_max_minor, listing.currency)
  const extra = listing.deliverables.length - MAX_DELIVERABLES

  return (
    <article className="business-card" aria-labelledby={`listing-${listing.id}`}>
      <div className="business-image-wrap business-image-plain">
        <div className="business-image-avatar"><BusinessLogo business={business} /></div>
      </div>
      <div className="business-card-top">
        <span />
        <div className="business-card-actions">
          <span className={`listing-kind-pill listing-kind-${listing.kind}`}>{isOffer ? 'Offer' : 'Need'}</span>
          {action}
        </div>
      </div>
      <div className="business-title-row">
        <div>
          <h3 id={`listing-${listing.id}`}>{listing.title}</h3>
          <span>{listing.category.name}</span>
        </div>
      </div>
      <p className="listing-business-name">{business.display_name}</p>
      {location && <p className="location"><MapPin size={14} aria-hidden="true" /> {location}</p>}
      <p className="business-description">{summary}</p>
      {listing.deliverables.length > 0 && (
        <div className={`service-block ${isOffer ? '' : 'needs-block'}`}>
          <span>{isOffer ? 'THEY OFFER' : 'THEY’RE LOOKING FOR'}</span>
          <div>
            {listing.deliverables.slice(0, MAX_DELIVERABLES).map((item) => <em key={item}>{item}</em>)}
            {extra > 0 && <em>+{extra} more</em>}
          </div>
        </div>
      )}
      <div className="business-card-footer">
        <span>
          <small>{isOffer ? 'Estimated exchange value' : 'Budget'}</small>
          <strong>{value ?? 'Not set'}</strong>
        </span>
        <Link className="button button-secondary button-small" to={paths.publicBusiness(business.id)} aria-label={`View ${business.display_name}`}>
          View business
        </Link>
      </div>
    </article>
  )
}
