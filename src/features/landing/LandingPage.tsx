import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Handshake,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import { Logo } from '../../components/ui/Logo'
import { businesses } from '../../mocks/businesses'

export function LandingPage({ enterApp, signIn }: { enterApp: () => void; signIn: () => void }) {
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
