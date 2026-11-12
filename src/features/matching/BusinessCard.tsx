import { Bookmark, MapPin, Star } from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import type { Business } from '../../mocks/businesses'

export function BusinessCard({ business, saved, onSave, onOpen }: { business: Business; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return (
    <article className="business-card">
      <div className="business-image-wrap">
        <img className="business-image" src={business.image} alt={`${business.name} team at work`} />
        <div className="business-image-avatar"><Avatar business={business} /></div>
      </div>
      <div className="business-card-top">
        <span />
        <button className={`save-button ${saved ? 'saved' : ''}`} onClick={onSave} aria-label={`${saved ? 'Unsave' : 'Save'} ${business.name}`}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="business-title-row"><div><h3>{business.name}</h3><span>{business.category}</span></div><div className="rating"><Star size={14} fill="currentColor" /> {business.rating}</div></div>
      <p className="location"><MapPin size={14} /> {business.location}</p>
      <p className="business-description">{business.description}</p>
      <div className="service-block"><span>THEY OFFER</span><div>{business.offers.slice(0, 2).map((item) => <em key={item}>{item}</em>)}</div></div>
      <div className="service-block needs-block"><span>THEY’RE LOOKING FOR</span><div>{business.needs.slice(0, 2).map((item) => <em key={item}>{item}</em>)}</div></div>
      <div className="business-card-footer"><span><small>Estimated exchange value</small><strong>{business.value}</strong></span><button className="button button-secondary button-small" onClick={onOpen}>View business</button></div>
    </article>
  )
}
