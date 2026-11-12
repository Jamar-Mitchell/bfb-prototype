import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Handshake,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import { Logo } from '../../components/ui/Logo'
import { businesses } from '../../mocks/businesses'

const serviceOptions = [
  'Website design',
  'Marketing strategy',
  'Brand identity',
  'Photography',
  'Bookkeeping',
  'Frontend development',
  'Social media',
  'Video production',
  'Business consulting',
  'Home services',
  'Copywriting',
  'SEO',
]

export function Onboarding({ complete, exit }: { complete: () => void; exit: () => void }) {
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [offers, setOffers] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])
  const [goal, setGoal] = useState('')
  const totalSteps = 5

  const toggle = (value: string, values: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }
  const nextDisabled =
    (step === 1 && (!businessName.trim() || !businessType)) ||
    (step === 2 && offers.length === 0) ||
    (step === 3 && needs.length === 0) ||
    (step === 4 && !goal)
  const finish = () => {
    localStorage.setItem('bfb-onboarding', JSON.stringify({ businessName, businessType, offers, needs, goal }))
    complete()
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <Logo />
        <button className="text-button" onClick={exit}>Exit setup</button>
      </header>
      <div className="onboarding-progress" aria-label={`Step ${Math.max(step, 1)} of ${totalSteps}`}>
        <span style={{ width: `${step === 0 ? 8 : (step / totalSteps) * 100}%` }} />
      </div>
      <main className="onboarding-main">
        {step === 0 && (
          <section className="welcome-step welcome-step-redesign">
            <div className="welcome-copy">
              <span className="onboarding-kicker">WELCOME TO BFB</span>
              <h1>Turn what your business does best into what it needs next.</h1>
              <p>Tell us what you provide and where you need support. We’ll shape a marketplace experience around your business.</p>
              <div className="welcome-points">
                <span><div><Check size={14} /></div><strong>Find compatible businesses</strong><small>See partners whose needs align with your strengths.</small></span>
                <span><div><Check size={14} /></div><strong>Exchange with clarity</strong><small>Align on scope, value, and deliverables before work begins.</small></span>
              </div>
              <button className="button button-primary button-large" onClick={() => setStep(1)}>Build my BFB profile <ArrowRight size={18} /></button>
              <small>Takes about 2 minutes · Everything can be updated later</small>
            </div>
            <div className="welcome-photo-panel">
              <img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1000&q=88" alt="Business owners collaborating together" />
              <div className="welcome-photo-shade" />
              <div className="welcome-photo-label"><span className="live-dot" /> Growing businesses, matched</div>
              <div className="welcome-match-card">
                <div><span>STRONG POTENTIAL MATCH</span><strong>Northstar Digital × Peachtree Growth</strong></div>
                <div className="welcome-trade"><span>Website design</span><div><ArrowRight size={13} /><ArrowLeft size={13} /></div><span>Marketing</span></div>
                <small><Sparkles size={12} /> Needs align on both sides</small>
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="question-step">
            <div className="step-count">01 <span>/ 05</span></div>
            <span className="onboarding-kicker">THE BASICS</span>
            <h1>Tell us about your business.</h1>
            <p>This helps potential partners understand who you are and what you do.</p>
            <div className="onboarding-form">
              <label>Business name<input autoFocus value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. Northstar Digital Studio" /></label>
              <label>Which best describes your business?
                <div className="business-type-grid">
                  {[
                    ['Startup', 'Building something new'],
                    ['Growing business', 'Scaling an established company'],
                    ['Independent studio', 'Creative or professional practice'],
                    ['Local business', 'Serving a local community'],
                  ].map(([title, copy]) => (
                    <button type="button" className={businessType === title ? 'selected' : ''} key={title} onClick={() => setBusinessType(title)}>
                      <Building2 size={20} /><span><strong>{title}</strong><small>{copy}</small></span>{businessType === title && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="question-step">
            <div className="step-count">02 <span>/ 05</span></div>
            <span className="onboarding-kicker">YOUR VALUE</span>
            <h1>What does your business provide?</h1>
            <p>Select the services, products, or expertise you’d be open to exchanging.</p>
            <div className="choice-grid">
              {serviceOptions.map((service) => (
                <button key={service} className={offers.includes(service) ? 'selected' : ''} onClick={() => toggle(service, offers, setOffers)}>
                  <span>{service}</span><div>{offers.includes(service) ? <Check size={15} /> : <Plus size={15} />}</div>
                </button>
              ))}
            </div>
            <div className="selection-note"><Sparkles size={16} /><span><strong>{offers.length || 'No'} selected</strong> · Choose everything your business can confidently deliver.</span></div>
          </section>
        )}

        {step === 3 && (
          <section className="question-step">
            <div className="step-count">03 <span>/ 05</span></div>
            <span className="onboarding-kicker">YOUR NEEDS</span>
            <h1>What services are you looking for?</h1>
            <p>Choose the support that would make the biggest difference to your business right now.</p>
            <div className="choice-grid needs-choice-grid">
              {serviceOptions.filter((service) => !offers.includes(service)).map((service) => (
                <button key={service} className={needs.includes(service) ? 'selected' : ''} onClick={() => toggle(service, needs, setNeeds)}>
                  <span>{service}</span><div>{needs.includes(service) ? <Check size={15} /> : <Plus size={15} />}</div>
                </button>
              ))}
            </div>
            <div className="selection-note"><Search size={16} /><span><strong>{needs.length || 'No'} selected</strong> · We’ll prioritize businesses offering these services.</span></div>
          </section>
        )}

        {step === 4 && (
          <section className="question-step">
            <div className="step-count">04 <span>/ 05</span></div>
            <span className="onboarding-kicker">YOUR GOAL</span>
            <h1>What would make BFB valuable to you?</h1>
            <p>Pick the outcome that best matches what your business needs today.</p>
            <div className="goal-list">
              {[
                ['Preserve cash while growing', 'Access important services without putting more pressure on cash flow.', TrendingUp],
                ['Build trusted partnerships', 'Create lasting relationships with complementary businesses.', Handshake],
                ['Find specialized expertise', 'Connect with professionals who can fill a gap on your team.', Search],
                ['Turn unused capacity into value', 'Trade available time, inventory, or expertise for something useful.', Zap],
              ].map(([title, copy, Icon]) => {
                const GoalIcon = Icon as typeof TrendingUp
                return <button key={title as string} className={goal === title ? 'selected' : ''} onClick={() => setGoal(title as string)}><div><GoalIcon size={20} /></div><span><strong>{title as string}</strong><small>{copy as string}</small></span><i>{goal === title ? <Check size={15} /> : null}</i></button>
              })}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="welcome-step complete-step">
            <div className="complete-icon"><Check size={34} /></div>
            <span className="onboarding-kicker">YOU’RE READY</span>
            <h1>We found your first potential matches.</h1>
            <p>Your profile is ready, and these businesses align with the value you can provide and the support you’re looking for.</p>
            <div className="complete-match-grid">
              {businesses.slice(0, 3).map((business, index) => (
                <article key={business.id}>
                  <img src={business.image} alt="" />
                  <div className="complete-match-copy"><Avatar business={business} size="small" /><span><strong>{business.name}</strong><small>{business.category}</small></span><b>{index === 0 ? 'Strong' : 'Good'}</b></div>
                </article>
              ))}
            </div>
            <div className="onboarding-summary">
              <div><span>YOU PROVIDE</span><strong>{offers.slice(0, 3).join(', ')}</strong></div>
              <ArrowRight size={20} />
              <div><span>YOU’RE LOOKING FOR</span><strong>{needs.slice(0, 3).join(', ')}</strong></div>
            </div>
            <button className="button button-primary button-large" onClick={finish}>View my matches <ArrowRight size={18} /></button>
          </section>
        )}
      </main>
      {step > 0 && step < 5 && (
        <footer className="onboarding-footer">
          <button className="button button-secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Back</button>
          <span>Step {step} of {totalSteps}</span>
          <button className="button button-primary" disabled={nextDisabled} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={17} /></button>
        </footer>
      )}
    </div>
  )
}
