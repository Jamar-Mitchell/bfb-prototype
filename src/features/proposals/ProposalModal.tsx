import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Send,
  X,
} from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import type { Business } from '../../mocks/businesses'

export function ProposalModal({ business, close, submitted }: { business: Business; close: () => void; submitted: () => void }) {
  const [step, setStep] = useState(1)
  const [offer, setOffer] = useState('Website design')
  const [want, setWant] = useState(business.offers[0])
  const [deliverables, setDeliverables] = useState('')
  const [reviewed, setReviewed] = useState(false)

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="proposal-modal" role="dialog" aria-modal="true" aria-labelledby="proposal-title">
        <div className="modal-head">
          <div><span>PROPOSE AN EXCHANGE</span><h2 id="proposal-title">{step === 1 ? `Build a trade with ${business.name}` : 'Review your proposal'}</h2></div>
          <button className="icon-button" onClick={close}><X size={20} /></button>
        </div>
        <div className="step-indicator"><span className="active"><b>1</b> Exchange</span><i /><span className={step === 2 ? 'active' : ''}><b>2</b> Review</span></div>
        {step === 1 ? (
          <div className="modal-body">
            <div className="proposal-pair">
              <div className="proposal-side"><span>YOU’LL PROVIDE</span><label>Choose your service<select value={offer} onChange={(event) => setOffer(event.target.value)}><option>Website design</option><option>Landing page</option><option>Frontend development</option></select></label><div className="value-input"><span>$</span><input aria-label="Your estimated value" defaultValue="1,800" /></div><small>Estimated exchange value</small></div>
              <div className="proposal-swap"><ArrowRight size={17} /><ArrowLeft size={17} /></div>
              <div className="proposal-side"><span>YOU’LL RECEIVE</span><label>Choose their service<select value={want} onChange={(event) => setWant(event.target.value)}>{business.offers.map((item) => <option key={item}>{item}</option>)}</select></label><div className="value-input"><span>$</span><input aria-label="Their estimated value" defaultValue="1,750" /></div><small>Estimated exchange value</small></div>
            </div>
            <label className="full-field">Proposed deliverables<textarea value={deliverables} onChange={(event) => setDeliverables(event.target.value)} placeholder="Describe what each business will deliver, including scope and key requirements..." /></label>
            <div className="field-row"><label>Target completion<input type="date" defaultValue="2026-11-30" /></label><label>Optional cash component<div className="value-input"><span>$</span><input defaultValue="0" /></div></label></div>
          </div>
        ) : (
          <div className="modal-body review-body">
            <div className="review-partner"><Avatar business={business} /><div><span>PROPOSAL FOR</span><strong>{business.name}</strong><small>{business.category} · {business.location}</small></div></div>
            <div className="review-exchange"><div><span>NORTHSTAR PROVIDES</span><strong>{offer}</strong><small>Estimated value · $1,800</small></div><div className="review-swap"><ArrowRight size={17} /><ArrowLeft size={17} /></div><div><span>{business.name.toUpperCase()} PROVIDES</span><strong>{want}</strong><small>Estimated value · $1,750</small></div></div>
            <div className="review-details"><div><CalendarDays size={17} /><span><small>Target completion</small><strong>November 30, 2026</strong></span></div><div><BriefcaseBusiness size={17} /><span><small>Deliverables</small><strong>{deliverables || 'Final scope to be confirmed together'}</strong></span></div></div>
            <label className="checkbox-field"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /><span><strong>I’ve reviewed this proposal</strong><small>This is a starting point, not a binding legal agreement. Both businesses must confirm final terms.</small></span></label>
          </div>
        )}
        <div className="modal-footer">
          <button className="button button-secondary" onClick={step === 1 ? close : () => setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</button>
          <button className="button button-primary" disabled={step === 2 && !reviewed} onClick={() => step === 1 ? setStep(2) : submitted()}>
            {step === 1 ? <>Review proposal <ArrowRight size={17} /></> : <>Send proposal <Send size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
