import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  CircleCheck,
  CircleDashed,
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
import { BusinessLogo } from '../businesses/BusinessLogo'
import { formatLocation } from '../businesses/profileLabels'
import { useBusinessProfile } from '../businesses/useBusinessProfile'
import { milestoneCount } from '../exchanges/exchangeCopy'
import { useActiveExchanges, type ActiveExchanges } from '../exchanges/useActiveExchanges'
import { fitBandLabel } from '../matching/fitCopy'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { useWaitingMatches } from '../matching/waitingMatches'
import { resumeStep, SUMMARY_STEP } from '../onboarding/onboardingSteps'
import './Dashboard.css'

const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

interface DashboardProps {
  goMarketplace: () => void
  goMatches: () => void
  openMatch: (id: string) => void
  openExchange: (id: string) => void
  goExchanges: () => void
  openBusiness: (id: number) => void
  openOnboarding: () => void
  openProfile: () => void
}

/**
 * The user's own business (name, categories, profile status), the matches waiting on it and
 * its active exchanges come from the API. Recommendations, the other stats and activity stay
 * demo content until their phases.
 */
export function Dashboard({ goMarketplace, goMatches, openMatch, openExchange, goExchanges, openBusiness, openOnboarding, openProfile }: DashboardProps) {
  const { business } = useBusinessProfile({ fresh: true })
  const activeId = useActiveBusiness().id
  const { count: waiting, first: nextMatch } = useWaitingMatches(activeId)
  const { state: exchanges, retry: retryExchanges } = useActiveExchanges(activeId)
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
            <button className="button button-primary" onClick={goMatches}>See your matches <ArrowRight size={17} /></button>
            <button className="button dashboard-ghost-button"><Plus size={16} /> Add what you need</button>
          </div>
          <ProfileNote business={business} openOnboarding={openOnboarding} openProfile={openProfile} />
        </div>
        <div className="dashboard-hero-visual">
          <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=88" alt="Business team reviewing growth plans" />
          <div className="dashboard-hero-shade" />
          {waiting !== null && (
            <button type="button" className="dashboard-match-count" onClick={goMatches}>
              <Sparkles size={16} aria-hidden="true" />
              <span>
                <strong>{waiting === 0 ? 'No matches waiting' : `${waiting} ${waiting === 1 ? 'match' : 'matches'} waiting on you`}</strong>
                <small>{waiting === 0 ? 'New introductions from BFB show here' : 'Answer before they expire'}</small>
              </span>
            </button>
          )}
          {nextMatch && (
            <div className="dashboard-featured-match">
              <div className="featured-match-head"><span>RESPOND BY {formatMatchDate(nextMatch.expires_at).toUpperCase()}</span><b>{fitBandLabel(nextMatch.fit_band)}</b></div>
              <div>
                <BusinessLogo business={nextMatch.other_business} size="small" />
                <span><strong>{nextMatch.other_business.display_name}</strong><small>{formatLocation(nextMatch.other_business) || 'Matched by BFB'}</small></span>
              </div>
              <button onClick={() => openMatch(nextMatch.id)}>View match <ArrowUpRight size={14} /></button>
            </div>
          )}
        </div>
      </section>
      <div className="stats-grid">
        {[
          { label: 'Active exchanges', ...exchangeStat(exchanges), icon: Handshake, tone: 'blue' },
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
          <div className="content-heading"><div><h2>Your active exchanges</h2><p>Keep your current collaborations moving.</p></div><button type="button" className="link-button" onClick={goExchanges}>View all <ArrowRight size={16} aria-hidden="true" /></button></div>
          <ActiveExchangeList state={exchanges} retry={retryExchanges} openExchange={openExchange} goExchanges={goExchanges} />
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

/** The "Active exchanges" stat: how many, and when the next milestone is due. */
function exchangeStat(state: ActiveExchanges): { value: string; meta: string } {
  if (state.kind === 'loading') return { value: '…', meta: 'Loading' }
  if (state.kind === 'error') return { value: '–', meta: 'Couldn’t load' }
  if (state.items.length === 0) return { value: '0', meta: 'Starts when an agreement is signed' }
  const next = state.items.map((item) => item.next_due_date).filter((date): date is string => Boolean(date)).sort()[0]
  return { value: `${state.items.length}${state.more ? '+' : ''}`, meta: next ? `Next milestone due ${formatMatchDate(next)}` : 'No milestones due' }
}

/** The newest three active exchanges, in the prototype's rows. */
function ActiveExchangeList({ state, retry, openExchange, goExchanges }: { state: ActiveExchanges; retry: () => void; openExchange: (id: string) => void; goExchanges: () => void }) {
  if (state.kind === 'loading') return <p className="dashboard-panel-note">Loading your exchanges…</p>
  if (state.kind === 'error') {
    return (
      <p className="dashboard-panel-note" role="alert">
        We couldn’t load your exchanges. <button type="button" className="dashboard-profile-action" onClick={retry}>Try again</button>
      </p>
    )
  }
  if (state.items.length === 0) {
    return (
      <p className="dashboard-panel-note">
        No active exchanges yet. One starts when both businesses sign its agreement.{' '}
        <button type="button" className="dashboard-profile-action" onClick={goExchanges}>Go to exchanges <ArrowRight size={13} aria-hidden="true" /></button>
      </p>
    )
  }
  return (
    <ul className="exchange-list" aria-label="Active exchanges">
      {state.items.slice(0, 3).map((exchange) => {
        const other = exchange.other_business
        return (
          <li className="active-exchange" key={exchange.id}>
            <BusinessLogo business={other} size="small" />
            <div className="active-exchange-main">
              <div><strong>Exchange with {other.display_name}</strong><span>{milestoneCount(exchange.milestone_count)} · active since {formatMatchDate(exchange.activated_at)}</span></div>
              <span className="status status-progress">Active</span>
            </div>
            <div className="exchange-progress" aria-hidden="true"><span style={{ width: '0%' }} /></div>
            <div className="exchange-footer">
              <span><CalendarDays size={14} aria-hidden="true" /> {exchange.next_due_date ? `Next due ${formatMatchDate(exchange.next_due_date)}` : 'Nothing due'}</span>
              <button type="button" onClick={() => openExchange(exchange.id)} aria-label={`View exchange with ${other.display_name}`}>View exchange <ArrowRight size={14} aria-hidden="true" /></button>
            </div>
          </li>
        )
      })}
    </ul>
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
