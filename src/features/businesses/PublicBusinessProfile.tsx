import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, BadgeCheck, CalendarDays, Globe, MapPin, SearchX, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { isBusinessUuid, paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback'
import { Logo } from '../../components/ui/Logo'
import { toApiError } from '../../lib/api/errors'
import { useSessionStore } from '../../stores/session'
import { businessInitials } from './businessDisplay'
import { PortfolioGallery } from './PortfolioGallery'
import {
  BUSINESS_STAGE_LABELS,
  displayUrl,
  formatLocation,
  orderedSocialLinks,
  SERVICE_AREA_LABELS,
  TEAM_SIZE_LABELS,
} from './profileLabels'
import { getPublicBusiness, type PublicBusiness } from './publicProfileApi'
import './BusinessProfile.css'
import './PublicBusinessProfile.css'

const memberSince = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; business: PublicBusiness }
  | { kind: 'not-found' }
  | { kind: 'error'; error: unknown }

/**
 * `/b/:businessId`: the public profile of a real, approved business, from
 * `GET /public/businesses/{id}`. Works logged in or out. Draft, in-review and unknown
 * businesses all show the same not-found state, as the API does not tell them apart.
 */
export function PublicBusinessProfilePage() {
  const { businessId } = useParams()
  const validId = isBusinessUuid(businessId)
  const [state, setState] = useState<LoadState>(validId ? { kind: 'loading' } : { kind: 'not-found' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!validId) return
    let live = true
    setState({ kind: 'loading' })
    getPublicBusiness(businessId)
      .then((business) => {
        if (live) setState({ kind: 'ready', business })
      })
      .catch((error: unknown) => {
        if (!live) return
        const apiError = toApiError(error)
        setState(apiError.code === 'not_found' ? { kind: 'not-found' } : { kind: 'error', error: apiError })
      })
    return () => {
      live = false
    }
  }, [businessId, validId, reloadKey])

  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

  return (
    <div className="public-profile-page">
      <PublicHeader />
      <main className="public-profile-main">
        {state.kind === 'loading' && <LoadingState label="Loading business profile…" />}
        {state.kind === 'error' && <ErrorState title="We couldn’t load this profile" error={state.error} onRetry={retry} />}
        {state.kind === 'not-found' && <ProfileNotFound />}
        {state.kind === 'ready' && <PublicProfileView business={state.business} />}
      </main>
    </div>
  )
}

function PublicHeader() {
  const go = useAppNavigate()
  const loggedIn = useSessionStore((state) => state.status === 'authenticated')

  return (
    <header className="auth-header public-profile-header">
      <Logo />
      {loggedIn ? (
        <button type="button" className="button button-secondary button-small" onClick={() => go(paths.dashboard)}>Go to dashboard</button>
      ) : (
        <div className="public-profile-header-actions">
          <button type="button" className="text-button" onClick={() => go(paths.login)}>Log in</button>
          <button type="button" className="button button-primary button-small" onClick={() => go(paths.register)}>Join BFB</button>
        </div>
      )}
    </header>
  )
}

function ProfileNotFound() {
  const go = useAppNavigate()
  const loggedIn = useSessionStore((state) => state.status === 'authenticated')

  return (
    <EmptyState
      className="public-profile-card"
      icon={SearchX}
      title="This business profile isn’t available"
      description="The link may be wrong, or the business hasn’t been approved on BFB yet."
      action={
        <button type="button" className="button button-secondary button-small" onClick={() => go(loggedIn ? paths.dashboard : paths.landing)}>
          {loggedIn ? 'Back to dashboard' : 'Go to BFB home'}
        </button>
      }
    />
  )
}

function ProfileLogo({ business }: { business: PublicBusiness }) {
  if (business.logo_url) {
    return <img className="avatar avatar-large public-profile-logo" src={business.logo_url} alt={`${business.display_name} logo`} />
  }
  return <div className="avatar avatar-large public-profile-initials" aria-hidden="true">{businessInitials(business.display_name)}</div>
}

export function PublicProfileView({ business }: { business: PublicBusiness }) {
  const location = formatLocation(business)
  const subtitle = business.industry ?? business.categories[0]?.name
  const socials = orderedSocialLinks(business.social_links)
  const details = [
    business.service_area && { label: 'Service area', value: SERVICE_AREA_LABELS[business.service_area] },
    location && { label: 'Location', value: location },
    business.business_stage && { label: 'Stage', value: BUSINESS_STAGE_LABELS[business.business_stage] },
    business.team_size && { label: 'Team size', value: TEAM_SIZE_LABELS[business.team_size] },
  ].filter((item): item is { label: string; value: string } => Boolean(item))

  return (
    <>
      <section className={`profile-hero ${business.cover_url ? '' : 'public-profile-hero-plain'}`} aria-labelledby="public-profile-name">
        {business.cover_url && <img className="profile-cover" src={business.cover_url} alt="" />}
        <div className="profile-cover-shade" />
        <div className="profile-identity">
          <ProfileLogo business={business} />
          <div>
            <div className="profile-title">
              <h1 id="public-profile-name">{business.display_name}</h1>
              {business.verified && <span className="verified"><BadgeCheck size={12} aria-hidden="true" /> Verified business</span>}
            </div>
            {subtitle && <p>{subtitle}</p>}
            <div className="profile-meta">
              {location && <span><MapPin size={15} aria-hidden="true" /> {location}</span>}
              <span><CalendarDays size={14} aria-hidden="true" /> On BFB since {memberSince.format(new Date(business.created_at))}</span>
            </div>
          </div>
        </div>
      </section>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="profile-section" aria-labelledby="public-profile-about">
            <h2 id="public-profile-about">About {business.display_name}</h2>
            {business.description ? (
              <p className="about-copy public-profile-description">{business.description}</p>
            ) : (
              <p className="about-copy">This business hasn’t added a description yet.</p>
            )}
            {(business.website_url || socials.length > 0) && (
              <ul className="public-profile-links" aria-label="Links">
                {business.website_url && (
                  <li>
                    <a className="website-link" href={business.website_url} target="_blank" rel="noopener noreferrer nofollow">
                      <Globe size={15} aria-hidden="true" /> {displayUrl(business.website_url)} <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  </li>
                )}
                {socials.map((social) => (
                  <li key={social.key}>
                    <a className="website-link" href={social.url} target="_blank" rel="noopener noreferrer nofollow">
                      {social.label} <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {business.categories.length > 0 && (
            <section className="profile-section" aria-labelledby="public-profile-categories">
              <h2 id="public-profile-categories">What they do</h2>
              <ul className="public-profile-categories">
                {business.categories.map((category) => <li key={category.id}>{category.name}</li>)}
              </ul>
            </section>
          )}
          {business.portfolio.length > 0 && (
            <section className="profile-section public-portfolio" aria-labelledby="public-profile-portfolio">
              <h2 id="public-profile-portfolio">Portfolio</h2>
              <PortfolioGallery items={business.portfolio} label={`${business.display_name} work samples`} />
            </section>
          )}
        </div>
        <aside className="profile-aside">
          {details.length > 0 && (
            <div className="trust-card public-profile-details">
              <h3>Business details</h3>
              <dl>
                {details.map((item) => (
                  <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                ))}
              </dl>
            </div>
          )}
          <div className="trust-card">
            <h3>Trade with confidence</h3>
            {business.verified && (
              <div><ShieldCheck size={18} aria-hidden="true" /><span><strong>Reviewed by BFB</strong><small>This business’s profile was checked before it went live.</small></span></div>
            )}
            <p>BFB does not guarantee work or hold funds. Confirm all final terms directly.</p>
          </div>
        </aside>
      </div>
    </>
  )
}
