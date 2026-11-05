import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Compass,
  Handshake,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type View = 'landing' | 'onboarding' | 'dashboard' | 'marketplace' | 'business' | 'exchanges' | 'messages' | 'profile' | 'listings'

type Business = {
  id: number
  name: string
  initials: string
  category: string
  location: string
  description: string
  offers: string[]
  needs: string[]
  value: string
  rating: string
  exchanges: number
  color: string
  accent: string
  image: string
}

const businesses: Business[] = [
  {
    id: 1,
    name: 'Peachtree Growth Co.',
    initials: 'PG',
    category: 'Marketing',
    location: 'Atlanta, GA',
    description:
      'Growth strategy and campaigns that help ambitious small businesses find their next customer.',
    offers: ['Marketing strategy', 'Social campaigns', 'SEO'],
    needs: ['Website redesign', 'Video production'],
    value: '$750–$2,000',
    rating: '4.9',
    exchanges: 18,
    color: '#e8f4ff',
    accent: '#087fe5',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 2,
    name: 'Frame & Field Studio',
    initials: 'FF',
    category: 'Photography',
    location: 'Atlanta, GA',
    description:
      'Warm, modern product and brand photography for founders building memorable companies.',
    offers: ['Product photography', 'Brand photography'],
    needs: ['Brand identity', 'Website maintenance'],
    value: '$300–$900',
    rating: '4.8',
    exchanges: 12,
    color: '#fff2e8',
    accent: '#c75d16',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 3,
    name: 'Good Ground Creative',
    initials: 'GG',
    category: 'Design',
    location: 'Remote',
    description:
      'A thoughtful brand studio helping early-stage teams look established from day one.',
    offers: ['Logo design', 'Brand identity', 'Social templates'],
    needs: ['Photography', 'Bookkeeping'],
    value: '$400–$1,500',
    rating: '5.0',
    exchanges: 9,
    color: '#f1ebff',
    accent: '#7047c7',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 4,
    name: 'ClearPath Bookkeeping',
    initials: 'CP',
    category: 'Business Services',
    location: 'Remote',
    description:
      'Clear, founder-friendly bookkeeping that gives growing businesses confidence in their numbers.',
    offers: ['Monthly bookkeeping', 'Financial organization'],
    needs: ['Website updates', 'Marketing support'],
    value: '$250–$800',
    rating: '4.9',
    exchanges: 21,
    color: '#e7f8f1',
    accent: '#16835d',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 5,
    name: 'Oakline Home Services',
    initials: 'OH',
    category: 'Home Services',
    location: 'Atlanta, GA',
    description:
      'Reliable painting and repair services for offices, studios, and local storefronts.',
    offers: ['Interior painting', 'Small repairs'],
    needs: ['Website refresh', 'Local marketing'],
    value: '$500–$2,000',
    rating: '4.7',
    exchanges: 7,
    color: '#fff7dd',
    accent: '#a46c00',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85',
  },
]

const categories = ['All', 'Marketing', 'Design', 'Photography', 'Business Services', 'Home Services']

function Logo({ light = false }: { light?: boolean }) {
  return (
    <button className={`brand ${light ? 'brand-light' : ''}`} onClick={() => window.scrollTo(0, 0)}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 96 46">
          <path className="brand-b-shape" fillRule="evenodd" d="M2 3h12c7 0 11 4 11 10 0 4-2 7-5 9 4 2 6 5 6 9 0 7-5 11-13 11H2V3Zm8 7v8h4c3 0 4-2 4-4s-1-4-4-4h-4Zm0 15v10h5c3 0 5-2 5-5s-2-5-5-5h-5Z" />
          <g transform="translate(68 0)">
            <path className="brand-b-shape" fillRule="evenodd" d="M2 3h12c7 0 11 4 11 10 0 4-2 7-5 9 4 2 6 5 6 9 0 7-5 11-13 11H2V3Zm8 7v8h4c3 0 4-2 4-4s-1-4-4-4h-4Zm0 15v10h5c3 0 5-2 5-5s-2-5-5-5h-5Z" />
          </g>
          <rect className="brand-f-stem" x="33" y="3" width="7" height="40" rx="3.5" />
          <path className="brand-arrow-shape" d="M38 7h19l-5-5h8l8 8-8 8h-8l5-5H38V7Z" />
          <path className="brand-arrow-shape" d="M64 25H47l5-5h-8l-9 8 9 8h8l-5-5h17v-6Z" />
        </svg>
      </span>
      <span className="brand-copy">
        <strong>BUSINESS FOR BUSINESS</strong>
        <small>Trade value. Grow together.</small>
      </span>
    </button>
  )
}

function Avatar({ business, size = 'medium' }: { business: Business; size?: 'small' | 'medium' | 'large' }) {
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

function LandingPage({ enterApp, signIn }: { enterApp: () => void; signIn: () => void }) {
  return (
    <div className="landing-page">
      <div className="announcement-bar">
        <span><Sparkles size={13} /> A smarter way for growing businesses to access what they need</span>
        <button onClick={enterApp}>See how BFB works <ArrowRight size={14} /></button>
      </div>
      <header className="public-header container">
        <Logo />
        <nav className="public-nav" aria-label="Primary navigation">
          <button onClick={enterApp}>Marketplace</button>
          <a href="#how-it-works">How it works</a>
          <a href="#examples">Examples</a>
        </nav>
        <div className="header-actions">
          <button className="text-button" onClick={signIn}>Sign in</button>
          <button className="button button-primary button-small" onClick={enterApp}>
            Get started <ArrowUpRight size={16} />
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> The growth network built on shared value</div>
            <h1>Exchange what your business does best <span>for what it needs next.</span></h1>
            <p>
              Connect with growing businesses, trade professional services, and preserve cash for
              the expenses and opportunities that can’t wait.
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-large" onClick={enterApp}>
                Explore the marketplace <ArrowRight size={18} />
              </button>
              <a className="button button-secondary button-large" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                {businesses.slice(0, 4).map((business) => (
                  <Avatar key={business.id} business={business} size="small" />
                ))}
              </div>
              <div><strong>Made for momentum</strong><span>Startups, local businesses & growing teams</span></div>
            </div>
            <div className="hero-benefits">
              <span><Check size={14} /> No credit card required</span>
              <span><Check size={14} /> Explore the demo instantly</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Example service exchange">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-photo-frame">
              <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=88" alt="Growing business team collaborating around a table" />
              <div className="hero-photo-caption"><div className="exchange-logo peachtree">PG</div><span><strong>Peachtree Growth Co.</strong><small>Atlanta, GA · Marketing</small></span></div>
            </div>
            <div className="hero-match-overlay">
              <div className="match-topline"><span className="live-dot" /> NEEDS ALIGN <span className="match-score">Strong fit</span></div>
              <div className="overlay-trade">
                <div><span>THEY OFFER</span><strong>Growth campaign</strong></div>
                <div className="overlay-swap"><ArrowRight size={15} /><ArrowLeft size={15} /></div>
                <div><span>THEY NEED</span><strong>Website redesign</strong></div>
              </div>
              <button onClick={enterApp}>View business <ArrowUpRight size={15} /></button>
            </div>
            <div className="floating-card floating-one"><Sparkles size={18} /><div><strong>12 new matches</strong><span>Ready to explore today</span></div></div>
            <div className="floating-card floating-two"><TrendingUp size={18} /><div><strong>$1,800 in shared value</strong><span>One potential exchange</span></div></div>
          </div>
        </section>

        <section className="impact-strip">
          <div className="container">
            <div><strong>5 min</strong><span>to create your business profile</span></div>
            <div><strong>1:1</strong><span>clear, direct business exchanges</span></div>
            <div><strong>More runway</strong><span>for the investments cash should cover</span></div>
            <p>Every exchange begins with clear scope, value, and deliverables.</p>
          </div>
        </section>

        <section className="logo-strip">
          <div className="container">
            <span>Built for every stage of growth</span>
            <div className="business-types">
              <strong><Building2 size={19} /> Local businesses</strong>
              <strong><TrendingUp size={19} /> Growing teams</strong>
              <strong><Sparkles size={19} /> Startups</strong>
              <strong><BriefcaseBusiness size={19} /> Independent studios</strong>
            </div>
          </div>
        </section>

        <section className="featured-section container">
          <div className="featured-heading">
            <div><span className="section-kicker">Explore the network</span><h2>Businesses with something valuable to share.</h2></div>
            <button className="button button-secondary" onClick={enterApp}>Browse marketplace <ArrowRight size={16} /></button>
          </div>
          <div className="featured-grid">
            {businesses.slice(0, 3).map((business, index) => (
              <article className="featured-card" key={business.id}>
                <img src={business.image} alt={`${business.name} team`} />
                <div className="featured-card-shade" />
                <div className="featured-card-top"><span><Sparkles size={12} /> {index === 0 ? 'Strong fit' : 'Needs align'}</span><Avatar business={business} size="small" /></div>
                <div className="featured-card-copy"><small>{business.category} · {business.location}</small><h3>{business.name}</h3><p>Offers <strong>{business.offers[0]}</strong> and needs <strong>{business.needs[0]}</strong>.</p><button onClick={enterApp}>View potential exchange <ArrowRight size={14} /></button></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section container" id="how-it-works">
          <div className="section-heading">
            <span className="section-kicker">Simple by design</span>
            <h2>Turn what you already have into what you need next.</h2>
            <p>BFB makes business-to-business exchange clear, professional, and easy to manage.</p>
          </div>
          <div className="steps-grid">
            {[
              { icon: BriefcaseBusiness, number: '01', title: 'Show what you offer', copy: 'List the services, products, or expertise your business can confidently provide.' },
              { icon: Search, number: '02', title: 'Find the right fit', copy: 'Discover businesses whose needs align with your strengths—and vice versa.' },
              { icon: Handshake, number: '03', title: 'Agree and grow', copy: 'Define deliverables, align on value, and track the exchange from start to finish.' },
            ].map(({ icon: Icon, number, title, copy }) => (
              <article className="step-card" key={number}>
                <div className="step-top"><div className="step-icon"><Icon size={22} /></div><span>{number}</span></div>
                <h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="example-section" id="examples">
          <div className="container example-layout">
            <div className="example-copy">
              <span className="section-kicker">Value goes both ways</span>
              <h2>A better way to build your business.</h2>
              <p>
                Your expertise is valuable. Put it to work to access the support, services, and
                creative talent that move your business forward.
              </p>
              <button className="button button-dark button-large" onClick={enterApp}>
                Find your next match <ArrowRight size={18} />
              </button>
            </div>
            <div className="examples-list">
              {[
                ['Website design', 'Marketing campaign', '01'],
                ['Product photography', 'Brand identity', '02'],
                ['Bookkeeping', 'Website maintenance', '03'],
              ].map(([offer, need, number]) => (
                <div className="example-row" key={number}>
                  <span className="example-number">{number}</span>
                  <strong>{offer}</strong>
                  <div className="mini-swap"><ArrowRight size={14} /><ArrowLeft size={14} /></div>
                  <strong>{need}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section container">
          <div>
            <span className="section-kicker">Your next opportunity is already here</span>
            <h2>Grow through the value you create.</h2>
            <p>Join the demo marketplace and discover what your business can unlock.</p>
          </div>
          <button className="button button-primary button-large" onClick={enterApp}>
            Launch BFB demo <ArrowUpRight size={18} />
          </button>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <Logo light />
          <p>© 2026 BFB. Prototype experience.</p>
          <div><a href="#how-it-works">How it works</a><a href="#examples">About</a><a href="#examples">Contact</a></div>
        </div>
      </footer>
    </div>
  )
}

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

function Onboarding({ complete, exit }: { complete: () => void; exit: () => void }) {
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

function AppShell({
  view,
  setView,
  children,
}: {
  view: View
  setView: (view: View) => void
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'marketplace' as View, label: 'Marketplace', icon: Compass },
    { id: 'exchanges' as View, label: 'Exchanges', icon: Handshake, count: '3' },
    { id: 'messages' as View, label: 'Messages', icon: MessageCircle, unread: true },
  ]
  const manageItems = [
    { id: 'profile' as View, label: 'Business profile', icon: Building2 },
    { id: 'listings' as View, label: 'Offers & needs', icon: BriefcaseBusiness },
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head"><Logo /><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
        <nav className="side-nav">
          <span className="side-label">Workspace</span>
          {navItems.map(({ id, label, icon: Icon, count, unread }) => (
            <button key={id} className={view === id || (id === 'marketplace' && view === 'business') ? 'active' : ''} onClick={() => { setView(id); setMobileOpen(false) }}>
              <Icon size={19} /> {label} {count && <span className="nav-count">{count}</span>} {unread && <span className="message-dot" />}
            </button>
          ))}
          <span className="side-label side-label-second">Manage</span>
          {manageItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setMobileOpen(false) }}>
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-growth">
          <div className="growth-icon"><TrendingUp size={19} /></div>
          <strong>Complete your profile</strong>
          <span>Stand out to more potential partners.</span>
          <div className="progress"><span /></div>
          <small>75% complete</small>
        </div>
        <div className="account-row">
          <div className="account-avatar">ND</div>
          <div><strong>Northstar Digital</strong><span>Alex Morgan</span></div>
          <ChevronDown size={16} />
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="topbar-search"><Search size={18} /><input aria-label="Search BFB" placeholder="Search BFB..." /><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><button className="icon-button"><Bell size={19} /><span className="notification-dot" /></button><button className="button button-primary button-small" onClick={() => setView('listings')}><Plus size={16} /> New listing</button></div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
    </div>
  )
}

function Dashboard({ goMarketplace, openBusiness }: { goMarketplace: () => void; openBusiness: (id: number) => void }) {
  const onboarding = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('bfb-onboarding') ?? '{}') as {
        businessName?: string
        needs?: string[]
        offers?: string[]
      }
    } catch {
      return {}
    }
  }, [])
  const primaryNeed = onboarding.needs?.[0] ?? 'marketing support'
  const primaryOffer = onboarding.offers?.[0] ?? 'website design'

  return (
    <>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-date">MONDAY, NOVEMBER 2</span>
          <h1>Good evening, Alex.<br /><span>Your next growth move is here.</span></h1>
          <p>We found businesses looking for <strong>{primaryOffer.toLowerCase()}</strong> and offering the <strong>{primaryNeed.toLowerCase()}</strong> your team needs.</p>
          <div className="dashboard-hero-actions">
            <button className="button button-primary" onClick={goMarketplace}>Explore your matches <ArrowRight size={17} /></button>
            <button className="button dashboard-ghost-button"><Plus size={16} /> Add what you need</button>
          </div>
          <div className="dashboard-profile-note"><CircleCheck size={15} /><span><strong>{onboarding.businessName ?? 'Northstar Digital Studio'}</strong> profile is active and visible to potential partners.</span></div>
        </div>
        <div className="dashboard-hero-visual">
          <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=88" alt="Business team reviewing growth plans" />
          <div className="dashboard-hero-shade" />
          <div className="dashboard-match-count"><Sparkles size={16} /><span><strong>12 strong matches</strong><small>Based on your profile</small></span></div>
          <div className="dashboard-featured-match">
            <div className="featured-match-head"><span>TOP FIT TODAY</span><b>Strong</b></div>
            <div><Avatar business={businesses[0]} size="small" /><span><strong>{businesses[0].name}</strong><small>{businesses[0].category} · {businesses[0].location}</small></span></div>
            <button onClick={() => openBusiness(businesses[0].id)}>View match <ArrowUpRight size={14} /></button>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        {[
          { label: 'Active exchanges', value: '2', meta: '1 needs your attention', icon: Handshake, tone: 'blue' },
          { label: 'Incoming proposals', value: '3', meta: '+2 this week', icon: Send, tone: 'purple' },
          { label: 'Saved businesses', value: '8', meta: 'View your shortlist', icon: Bookmark, tone: 'green' },
        ].map(({ label, value, meta, icon: Icon, tone }) => (
          <article className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
            <div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>
            <ArrowUpRight className="stat-arrow" size={18} />
          </article>
        ))}
      </div>
      <section className="dashboard-section">
        <div className="content-heading"><div><h2>Recommended for you</h2><p>Businesses with needs that match your services.</p></div><button className="link-button" onClick={goMarketplace}>View marketplace <ArrowRight size={16} /></button></div>
        <div className="recommend-grid">
          {businesses.slice(0, 3).map((business, index) => (
            <article className="recommend-card" key={business.id}>
              <img className="recommend-image" src={business.image} alt="" />
              <div className="recommend-top"><Avatar business={business} /><span className="match-pill"><Sparkles size={12} /> {index === 0 ? 'Strong fit' : 'Needs align'}</span></div>
              <h3>{business.name}</h3><p className="business-meta">{business.category} · {business.location}</p>
              <div className="match-reason"><CircleCheck size={16} /><span>They need <strong>{business.needs[0].toLowerCase()}</strong></span></div>
              <p>{business.description}</p>
              <button className="button button-secondary card-button" onClick={() => openBusiness(business.id)}>View business <ArrowRight size={16} /></button>
            </article>
          ))}
        </div>
      </section>
      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <div className="content-heading"><div><h2>Your active exchanges</h2><p>Keep your current collaborations moving.</p></div><button className="more-button">•••</button></div>
          <div className="exchange-list">
            <div className="active-exchange">
              <Avatar business={businesses[0]} size="small" />
              <div className="active-exchange-main"><div><strong>Website ↔ Growth campaign</strong><span>with Peachtree Growth Co.</span></div><span className="status status-progress">In progress</span></div>
              <div className="exchange-progress"><span style={{ width: '65%' }} /></div>
              <div className="exchange-footer"><span><CalendarDays size={14} /> Due Nov 18</span><button>View exchange <ArrowRight size={14} /></button></div>
            </div>
            <div className="active-exchange">
              <Avatar business={businesses[1]} size="small" />
              <div className="active-exchange-main"><div><strong>Landing page ↔ Product photos</strong><span>with Frame & Field Studio</span></div><span className="status status-awaiting">Awaiting review</span></div>
              <div className="exchange-progress"><span style={{ width: '90%' }} /></div>
              <div className="exchange-footer"><span><Clock3 size={14} /> Action requested</span><button>Review delivery <ArrowRight size={14} /></button></div>
            </div>
          </div>
        </section>
        <section className="dashboard-panel activity-panel">
          <div className="content-heading"><div><h2>Recent activity</h2><p>The latest from your network.</p></div></div>
          {[
            ['PG', 'Peachtree sent a message', 'About website deliverables', '12m'],
            ['FF', 'New delivery submitted', 'Product photography package', '2h'],
            ['CP', 'ClearPath saved your business', 'Your profile is getting noticed', '1d'],
          ].map(([initials, title, copy, time], index) => (
            <div className="activity-row" key={title}>
              <div className="activity-avatar" style={{ background: businesses[index].color, color: businesses[index].accent }}>{initials}</div>
              <div><strong>{title}</strong><span>{copy}</span></div><small>{time}</small>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

function BusinessCard({ business, saved, onSave, onOpen }: { business: Business; saved: boolean; onSave: () => void; onOpen: () => void }) {
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

function Marketplace({ openBusiness }: { openBusiness: (id: number) => void }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [saved, setSaved] = useState<number[]>(() => JSON.parse(localStorage.getItem('bfb-saved') ?? '[]'))

  useEffect(() => localStorage.setItem('bfb-saved', JSON.stringify(saved)), [saved])

  const filtered = useMemo(() => businesses.filter((business) => {
    const matchesCategory = category === 'All' || business.category === category
    const haystack = [business.name, business.category, business.description, ...business.offers, ...business.needs].join(' ').toLowerCase()
    return matchesCategory && haystack.includes(search.toLowerCase())
  }), [category, search])

  return (
    <>
      <section className="marketplace-banner">
        <div><span>DISCOVER YOUR NETWORK</span><h1>Find your next growth partner.</h1><p>Explore businesses ready to exchange skills, services, and value.</p><div><Sparkles size={14} /> Personalized using your onboarding preferences</div></div>
        <div className="marketplace-banner-images">{businesses.slice(0, 3).map((business) => <img key={business.id} src={business.image} alt="" />)}</div>
      </section>
      <div className="market-search">
        <Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services, needs, or businesses..." aria-label="Search marketplace" />
        <button className="button button-primary">Search</button>
      </div>
      <div className="market-tools">
        <div className="category-chips">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <button className="filter-button"><MapPin size={16} /> Location <ChevronDown size={15} /></button>
      </div>
      <div className="results-heading"><p><strong>{filtered.length} businesses</strong> match your search</p><button>Best match <ChevronDown size={15} /></button></div>
      {filtered.length ? (
        <div className="business-grid">
          {filtered.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              saved={saved.includes(business.id)}
              onSave={() => setSaved((current) => current.includes(business.id) ? current.filter((id) => id !== business.id) : [...current, business.id])}
              onOpen={() => openBusiness(business.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state"><Search size={28} /><h2>No matches yet</h2><p>Try a different search or reset your category filter.</p><button className="button button-primary" onClick={() => { setSearch(''); setCategory('All') }}>Reset filters</button></div>
      )}
    </>
  )
}

function ProposalModal({ business, close, submitted }: { business: Business; close: () => void; submitted: () => void }) {
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

function BusinessProfile({ business, goBack }: { business: Business; goBack: () => void }) {
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

type ExchangeStatus = 'Awaiting response' | 'Changes requested' | 'In progress' | 'Awaiting confirmation' | 'Completed'

function ExchangesPage() {
  const [tab, setTab] = useState('Active')
  const [statuses, setStatuses] = useState<Record<number, ExchangeStatus>>({
    1: 'In progress',
    2: 'Awaiting confirmation',
    3: 'Awaiting response',
    4: 'Changes requested',
    5: 'Completed',
  })

  const exchanges = [
    { id: 1, business: businesses[0], type: 'Active', title: 'Website redesign ↔ Growth campaign', give: 'Website redesign', receive: '90-day growth campaign', value: '$1,800 each', due: 'Nov 18' },
    { id: 2, business: businesses[1], type: 'Active', title: 'Landing page ↔ Product photography', give: 'Conversion landing page', receive: '24 edited product photos', value: '$900 each', due: 'Nov 8' },
    { id: 3, business: businesses[3], type: 'Incoming', title: 'Website updates ↔ Bookkeeping setup', give: 'Website maintenance', receive: '3-month bookkeeping setup', value: '$750 each', due: 'Proposed Dec 12' },
    { id: 4, business: businesses[2], type: 'Sent', title: 'Frontend support ↔ Brand identity', give: 'Frontend implementation', receive: 'Brand identity package', value: '$1,400 each', due: 'Proposed Dec 4' },
    { id: 5, business: businesses[4], type: 'Completed', title: 'Website refresh ↔ Studio painting', give: 'Five-page website refresh', receive: 'Studio interior painting', value: '$1,600 each', due: 'Completed Oct 14' },
  ]
  const visible = exchanges.filter((exchange) => exchange.type === tab)

  return (
    <>
      <div className="page-heading">
        <div><span>EXCHANGES</span><h1>Keep every trade moving.</h1><p>Review proposals, track deliverables, and complete active exchanges.</p></div>
        <button className="button button-primary"><Plus size={16} /> New proposal</button>
      </div>
      <div className="exchange-tabs">
        {['Incoming', 'Sent', 'Active', 'Completed'].map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item} <span>{exchanges.filter((exchange) => exchange.type === item).length}</span>
          </button>
        ))}
      </div>
      <div className="exchange-page-list">
        {visible.map((exchange) => (
          <article className="exchange-page-card" key={exchange.id}>
            <div className="exchange-card-business">
              <img src={exchange.business.image} alt="" />
              <Avatar business={exchange.business} />
              <div><span>{exchange.business.name}</span><strong>{exchange.title}</strong><small>Last updated 2 hours ago</small></div>
              <span className={`status ${statuses[exchange.id] === 'Completed' ? 'status-complete' : statuses[exchange.id] === 'Awaiting confirmation' ? 'status-awaiting' : 'status-progress'}`}>{statuses[exchange.id]}</span>
            </div>
            <div className="exchange-trade-summary">
              <div><small>NORTHSTAR PROVIDES</small><strong>{exchange.give}</strong></div>
              <div className="mini-swap"><ArrowRight size={14} /><ArrowLeft size={14} /></div>
              <div><small>YOU RECEIVE</small><strong>{exchange.receive}</strong></div>
              <div><small>AGREED VALUE</small><strong>{exchange.value}</strong></div>
              <div><small>TARGET</small><strong>{exchange.due}</strong></div>
            </div>
            <div className="exchange-card-actions">
              <button className="button button-secondary">View details</button>
              {tab === 'Incoming' && <><button className="button button-secondary" onClick={() => setStatuses({ ...statuses, [exchange.id]: 'Changes requested' })}>Request changes</button><button className="button button-primary" onClick={() => setStatuses({ ...statuses, [exchange.id]: 'In progress' })}>Accept proposal</button></>}
              {tab === 'Active' && <button className="button button-primary" onClick={() => setStatuses({ ...statuses, [exchange.id]: 'Awaiting confirmation' })}>Mark delivered</button>}
              {tab === 'Sent' && <button className="button button-primary">Send message</button>}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function MessagesPage() {
  const [selected, setSelected] = useState(0)
  const [draft, setDraft] = useState('')
  const [sentMessages, setSentMessages] = useState<string[]>([])
  const conversations = [
    { business: businesses[0], preview: 'The campaign timeline looks good...', time: '12m', unread: 2 },
    { business: businesses[1], preview: 'I uploaded the final photo set.', time: '2h', unread: 1 },
    { business: businesses[3], preview: 'Would a three-month setup work?', time: '1d', unread: 0 },
    { business: businesses[2], preview: 'Thanks for the revised proposal.', time: '2d', unread: 0 },
  ]
  const active = conversations[selected]
  const sendMessage = () => {
    if (!draft.trim()) return
    setSentMessages((current) => [...current, draft.trim()])
    setDraft('')
  }

  return (
    <>
      <div className="page-heading messages-heading">
        <div><span>MESSAGES</span><h1>Business conversations.</h1><p>Keep proposal details and exchange communication in one place.</p></div>
      </div>
      <div className="messages-layout">
        <aside className="conversation-list">
          <div className="conversation-search"><Search size={16} /><input placeholder="Search conversations..." aria-label="Search conversations" /></div>
          {conversations.map((conversation, index) => (
            <button key={conversation.business.id} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}>
              <Avatar business={conversation.business} />
              <span><strong>{conversation.business.name}</strong><small>{conversation.preview}</small></span>
              <em>{conversation.time}</em>
              {conversation.unread > 0 && <b>{conversation.unread}</b>}
            </button>
          ))}
        </aside>
        <section className="message-panel">
          <header className="message-panel-head">
            <Avatar business={active.business} />
            <div><strong>{active.business.name}</strong><span>Usually replies within a day</span></div>
            <button className="button button-secondary button-small">View exchange</button>
          </header>
          <div className="message-thread">
            <div className="thread-date">TODAY</div>
            <div className="message incoming"><p>Hi Alex! We reviewed the latest website direction and the overall structure looks great.</p><span>10:14 AM</span></div>
            <div className="message outgoing"><p>Great to hear. I’ve also added the updated services section and mobile navigation.</p><span>10:28 AM</span></div>
            <div className="message incoming"><p>{active.preview} Can we confirm the remaining deliverables before Friday?</p><span>11:02 AM</span></div>
            {sentMessages.map((message, index) => <div className="message outgoing" key={`${message}-${index}`}><p>{message}</p><span>Now</span></div>)}
          </div>
          <div className="message-composer">
            <button className="icon-button"><Paperclip size={18} /></button>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} placeholder="Write a message..." aria-label="Write a message" />
            <button className="button button-primary" onClick={sendMessage}><Send size={16} /> Send</button>
          </div>
        </section>
      </div>
    </>
  )
}

function ProfileManagementPage() {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Northstar Digital Studio',
    category: 'Web Development & Design',
    location: 'Atlanta, GA · Available remotely',
    website: 'northstardigital.demo',
    description: 'We build polished websites and digital experiences for growing businesses.',
  })
  const update = (key: keyof typeof profile, value: string) => setProfile((current) => ({ ...current, [key]: value }))

  return (
    <>
      <div className="page-heading">
        <div><span>BUSINESS PROFILE</span><h1>Show partners what makes you valuable.</h1><p>A complete profile helps the right businesses find and trust you.</p></div>
        <button className="button button-primary" onClick={() => { if (editing) setSaved(true); setEditing(!editing) }}>{editing ? <><Check size={16} /> Save changes</> : <><Pencil size={16} /> Edit profile</>}</button>
      </div>
      {saved && <div className="inline-success"><CircleCheck size={17} /> Your business profile has been updated.</div>}
      <div className="manage-profile-layout">
        <section className="manage-profile-card">
          <div className="manage-cover">
            <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85" alt="Northstar Digital Studio office" />
            {editing && <button><Pencil size={15} /> Change cover</button>}
          </div>
          <div className="manage-profile-content">
            <div className="northstar-large">ND</div>
            <div className="form-grid">
              <label>Business name<input disabled={!editing} value={profile.name} onChange={(event) => update('name', event.target.value)} /></label>
              <label>Category<input disabled={!editing} value={profile.category} onChange={(event) => update('category', event.target.value)} /></label>
              <label>Location & availability<input disabled={!editing} value={profile.location} onChange={(event) => update('location', event.target.value)} /></label>
              <label>Website<input disabled={!editing} value={profile.website} onChange={(event) => update('website', event.target.value)} /></label>
              <label className="form-full">Business description<textarea disabled={!editing} value={profile.description} onChange={(event) => update('description', event.target.value)} /></label>
            </div>
          </div>
        </section>
        <aside className="profile-completion">
          <h2>Profile strength</h2>
          <div className="completion-score"><strong>75%</strong><span>Good foundation</span></div>
          <div className="completion-bar"><span /></div>
          <p>Complete these details to appear in more relevant searches.</p>
          <div className="completion-item done"><Check size={14} /> Business basics</div>
          <div className="completion-item done"><Check size={14} /> Services offered</div>
          <div className="completion-item"><Plus size={14} /> Add portfolio images</div>
          <div className="completion-item"><Plus size={14} /> Add another business need</div>
        </aside>
      </div>
    </>
  )
}

type Listing = { id: number; type: 'Offer' | 'Need'; title: string; description: string; value: string }

function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([
    { id: 1, type: 'Offer', title: 'Website design', description: 'Strategy, UX, visual design, and responsive implementation.', value: '$1,000–$2,500' },
    { id: 2, type: 'Offer', title: 'Landing pages', description: 'Focused conversion pages for campaigns and product launches.', value: '$600–$1,200' },
    { id: 3, type: 'Offer', title: 'Frontend development', description: 'Production-ready React interfaces and design systems.', value: '$1,000–$2,500' },
    { id: 4, type: 'Need', title: 'Marketing support', description: 'Growth strategy and campaign execution for a new service launch.', value: '$750–$1,500' },
    { id: 5, type: 'Need', title: 'Product photography', description: 'Clean, editorial product photos for our portfolio and social channels.', value: '$400–$900' },
    { id: 6, type: 'Need', title: 'Bookkeeping', description: 'Monthly categorization, reporting, and financial organization.', value: '$250–$600' },
  ])
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

function App() {
  const [view, setView] = useState<View>(() => window.location.hash === '#dashboard' ? 'dashboard' : 'landing')
  const [selectedId, setSelectedId] = useState(1)

  const openBusiness = (id: number) => {
    setSelectedId(id)
    setView('business')
    window.scrollTo(0, 0)
  }

  if (view === 'landing') return <LandingPage enterApp={() => setView('onboarding')} signIn={() => setView('dashboard')} />
  if (view === 'onboarding') return <Onboarding complete={() => setView('dashboard')} exit={() => setView('landing')} />

  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? businesses[0]

  return (
    <AppShell view={view} setView={setView}>
      {view === 'dashboard' && <Dashboard goMarketplace={() => setView('marketplace')} openBusiness={openBusiness} />}
      {view === 'marketplace' && <Marketplace openBusiness={openBusiness} />}
      {view === 'business' && <BusinessProfile business={selectedBusiness} goBack={() => setView('marketplace')} />}
      {view === 'exchanges' && <ExchangesPage />}
      {view === 'messages' && <MessagesPage />}
      {view === 'profile' && <ProfileManagementPage />}
      {view === 'listings' && <ListingsPage />}
    </AppShell>
  )
}

export default App
