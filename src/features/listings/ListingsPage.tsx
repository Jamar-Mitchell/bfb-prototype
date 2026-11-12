import { useState } from 'react'
import {
  BriefcaseBusiness,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { demoListings, type Listing } from '../../mocks/listings'
import './ListingsPage.css'

export function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>(demoListings)
  const [modal, setModal] = useState(false)
  const [type, setType] = useState<'Offer' | 'Need'>('Offer')
  const [title, setTitle] = useState('')
  const addListing = () => {
    if (!title.trim()) return
    setListings((current) => [...current, { id: Date.now(), type, title: title.trim(), description: 'New listing ready for details and matching.', value: 'Value to discuss' }])
    setTitle('')
    setModal(false)
  }

  return (
    <>
      <div className="page-heading">
        <div><span>OFFERS & NEEDS</span><h1>Manage what you trade.</h1><p>Keep your services and business needs current to improve match quality.</p></div>
        <button className="button button-primary" onClick={() => setModal(true)}><Plus size={16} /> Add listing</button>
      </div>
      <div className="listing-summary">
        <div><BriefcaseBusiness size={19} /><span><strong>{listings.filter((item) => item.type === 'Offer').length} active offers</strong><small>Services your business can provide</small></span></div>
        <div><Search size={19} /><span><strong>{listings.filter((item) => item.type === 'Need').length} active needs</strong><small>Support your business is seeking</small></span></div>
      </div>
      {(['Offer', 'Need'] as const).map((listingType) => (
        <section className="manage-listing-section" key={listingType}>
          <div className="content-heading"><div><h2>{listingType === 'Offer' ? 'What we offer' : 'What we need'}</h2><p>{listingType === 'Offer' ? 'Services available to exchange.' : 'Opportunities for potential partners.'}</p></div></div>
          <div className="manage-listing-grid">
            {listings.filter((item) => item.type === listingType).map((listing) => (
              <article key={listing.id}>
                <div className={`listing-type-icon ${listingType === 'Need' ? 'need' : ''}`}>{listingType === 'Offer' ? <BriefcaseBusiness size={19} /> : <Search size={19} />}</div>
                <div><span>{listing.type.toUpperCase()}</span><h3>{listing.title}</h3><p>{listing.description}</p><strong>Estimated exchange value · {listing.value}</strong></div>
                <div className="listing-actions"><button aria-label={`Edit ${listing.title}`}><Pencil size={15} /></button><button aria-label={`Delete ${listing.title}`} onClick={() => setListings((current) => current.filter((item) => item.id !== listing.id))}><Trash2 size={15} /></button></div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {modal && <div className="modal-backdrop"><div className="quick-modal"><div className="modal-head"><div><span>NEW LISTING</span><h2>Add an offer or need</h2></div><button className="icon-button" onClick={() => setModal(false)}><X size={19} /></button></div><div className="modal-body"><label className="full-field">Listing type<select value={type} onChange={(event) => setType(event.target.value as 'Offer' | 'Need')}><option>Offer</option><option>Need</option></select></label><label className="full-field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Email marketing strategy" /></label></div><div className="modal-footer"><button className="button button-secondary" onClick={() => setModal(false)}>Cancel</button><button className="button button-primary" onClick={addListing}>Add listing</button></div></div></div>}
    </>
  )
}
