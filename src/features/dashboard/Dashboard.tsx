import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  Clock3,
  Handshake,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { businesses } from '../../mocks/businesses'
import { useSessionStore } from '../../stores/session'
import type { Business } from '../businesses/profileApi'
import { canEditProfile } from '../businesses/profileFields'
import { useBusinessProfile } from '../businesses/useBusinessProfile'
import { resumeStep, SUMMARY_STEP } from '../onboarding/onboardingSteps'
import './Dashboard.css'

const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

interface DashboardProps {
  goMarketplace: () => void
  openBusiness: (id: number) => void
  openOnboarding: () => void
  openProfile: () => void
}

/**
 * The user's own business (name, categories, profile status) comes from the API. Matches,
 * exchanges, stats and activity stay demo content until the marketplace phases.
 */
export function Dashboard({ goMarketplace, openBusiness, openOnboarding, openProfile }: DashboardProps) {
  const { business } = useBusinessProfile({ fresh: true })
  const firstName = useSessionStore((state) => state.user?.displayName.trim().split(/\s+/)[0]) || 'there'
  // Needs are listings now (FE-2.4), not profile answers: the need stays demo copy.
  const primaryNeed = 'marketing support'
  const primaryOffer = business?.categories[0]?.name ?? 'website design'

  return (
    <>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-date">{dateFormat.format(new Date()).toUpperCase()}</span>
          <h1>Good evening, {firstName}.<br /><span>Your next growth move is here.</span></h1>
          <p>We found businesses looking for <strong>{primaryOffer.toLowerCase()}</strong> and offering the <strong>{primaryNeed.toLowerCase()}</strong> your team needs.</p>
          <div className="dashboard-hero-actions">
            <button className="button button-primary" onClick={goMarketplace}>Explore your matches <ArrowRight size={17} /></button>
            <button className="button dashboard-ghost-button"><Plus size={16} /> Add what you need</button>
          </div>
          <ProfileNote business={business} openOnboarding={openOnboarding} openProfile={openProfile} />
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

/** One line on the user's own profile: where it stands and the next thing to do. */
function ProfileNote({ business, openOnboarding, openProfile }: { business: Business | null } & Pick<DashboardProps, 'openOnboarding' | 'openProfile'>) {
  const active = useActiveBusiness()
  const name = business?.display_name ?? active.name

  if (!business) {
    return <div className="dashboard-profile-note"><CircleDashed size={15} aria-hidden="true" /><span><strong>{name}</strong></span></div>
  }

  const editor = canEditProfile(business.role)
  let text: string
  let action: { label: string; onClick: () => void } | null = null

  switch (business.profile_status) {
    case 'approved':
      text = 'profile is approved and visible to potential partners.'
      break
    case 'in_review':
      text = 'profile is in review. We’ll show the result here.'
      break
    case 'changes_requested':
      text = 'profile needs a few changes before it can be approved.'
      action = { label: 'See what to change', onClick: openProfile }
      break
    case 'suspended':
      text = 'is suspended and hidden from other businesses.'
      break
    default:
      if (business.completeness.complete) {
        text = 'profile is complete and ready to submit for review.'
        action = { label: 'Review profile', onClick: openProfile }
      } else {
        text = `profile is ${business.completeness.score}% complete.`
        // Setup questions answered: what is left (the logo) is on the profile page.
        const answered = resumeStep(business) === SUMMARY_STEP
        const logoOnly = business.completeness.missing.length === 1 && business.completeness.missing[0] === 'logo'
        action = answered
          ? { label: logoOnly ? 'Add your logo' : 'Finish your profile', onClick: openProfile }
          : { label: 'Finish setup', onClick: openOnboarding }
      }
  }

  const Icon = business.profile_status === 'approved' ? CircleCheck : CircleDashed
  return (
    <div className="dashboard-profile-note">
      <Icon size={15} aria-hidden="true" />
      <span><strong>{name}</strong> {text}</span>
      {action && editor ? <button type="button" className="dashboard-profile-action" onClick={action.onClick}>{action.label} <ArrowRight size={13} aria-hidden="true" /></button> : null}
    </div>
  )
}
