import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  MapPin,
  MessageCircle,
  Search,
  Star,
  X,
} from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import type { Business } from '../../mocks/businesses'
import { ProposalModal } from '../proposals/ProposalModal'
import './BusinessProfile.css'

export function BusinessProfile({ business, goBack }: { business: Business; goBack: () => void }) {
  const [proposalOpen, setProposalOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(false)

  const submitProposal = () => {
    setProposalOpen(false)
    setToast(true)
    localStorage.setItem('bfb-last-proposal', business.name)
    window.setTimeout(() => setToast(false), 3500)
  }

  return (
    <>
      <button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back to marketplace</button>
      <section className="profile-hero">
        <img className="profile-cover" src={business.image} alt={`${business.name} workspace`} />
        <div className="profile-cover-shade" />
        <div className="profile-identity"><Avatar business={business} size="large" /><div><div className="profile-title"><h1>{business.name}</h1><span className="verified"><Check size={12} /> Demo profile</span></div><p>{business.category}</p><div className="profile-meta"><span><MapPin size={15} /> {business.location}</span><span><Star size={14} fill="currentColor" /> {business.rating} ({business.exchanges} exchanges)</span></div></div></div>
        <div className="profile-actions"><button className={`button button-secondary ${saved ? 'saved' : ''}`} onClick={() => setSaved(!saved)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save business'}</button><button className="button button-primary" onClick={() => setProposalOpen(true)}>Propose an exchange <ArrowRight size={17} /></button></div>
      </section>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="profile-section"><h2>About {business.name}</h2><p className="about-copy">{business.description} We partner with founders and growing teams who value clear communication, thoughtful work, and lasting business relationships.</p><button className="website-link">Visit portfolio <ArrowUpRight size={15} /></button></section>
          <section className="profile-section"><div className="content-heading"><div><h2>What they offer</h2><p>Services available for exchange.</p></div></div><div className="listing-grid">{business.offers.map((offer, index) => <article className="listing-card" key={offer}><div className="listing-icon"><BriefcaseBusiness size={19} /></div><div><h3>{offer}</h3><p>{index === 0 ? 'A focused, collaborative engagement built around your business goals.' : 'Professional support with a clear scope, timeline, and practical outcomes.'}</p><span>Estimated value · {business.value}</span></div></article>)}</div></section>
          <section className="profile-section"><div className="content-heading"><div><h2>What they need</h2><p>Ways your business can create value.</p></div></div><div className="need-list">{business.needs.map((need) => <div key={need}><div className="need-icon"><Search size={18} /></div><div><strong>{need}</strong><span>Open to proposals · Flexible scope</span></div><button onClick={() => setProposalOpen(true)}>Propose <ArrowRight size={14} /></button></div>)}</div></section>
        </div>
        <aside className="profile-aside">
          <div className="fit-card"><span className="section-kicker">Potential partner</span><div className="fit-score"><strong>Strong fit</strong></div><p>Their needs align closely with services Northstar Digital offers.</p><div className="fit-reason"><Check size={15} /> They need {business.needs[0].toLowerCase()}</div><div className="fit-reason"><Check size={15} /> They work with growing businesses</div><button className="button button-primary card-button" onClick={() => setProposalOpen(true)}>Start a proposal <ArrowRight size={16} /></button></div>
          <div className="trust-card"><h3>Trade with confidence</h3><div><CircleCheck size={18} /><span><strong>{business.exchanges} completed exchanges</strong><small>Through this demo profile</small></span></div><div><MessageCircle size={18} /><span><strong>Clear communication</strong><small>Typically replies within a day</small></span></div><p>BFB does not guarantee work or hold funds. Confirm all final terms directly.</p></div>
        </aside>
      </div>
      {proposalOpen && <ProposalModal business={business} close={() => setProposalOpen(false)} submitted={submitProposal} />}
      {toast && <div className="toast"><div><CircleCheck size={20} /></div><span><strong>Proposal sent!</strong><small>{business.name} will be notified in this demo.</small></span><button onClick={() => setToast(false)}><X size={16} /></button></div>}
    </>
  )
}
