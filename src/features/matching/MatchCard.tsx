import { ArrowRight, BadgeCheck, Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { BusinessLogo } from '../businesses/BusinessLogo'
import { formatLocation } from '../businesses/profileLabels'
import { FitBandBadge, ReasonList } from './FitDisplay'
import { FIT_BAND_DESCRIPTIONS, MATCH_STATUS_LABELS, type FactorCopy, type FitBand } from './fitCopy'
import type { BusinessMatchSummary, MatchBusiness } from './matchInboxApi'
import { matchTiming } from './matchInboxDisplay'

/** Reasons for a card: loading, loaded, or not available (the band's description stands in). */
export type CardReasons = FactorCopy[] | 'loading' | 'unavailable'

/** The other business: logo, name, location and BFB's review. */
export function MatchBusinessHeader({ business, as: Heading = 'h3' }: { business: MatchBusiness; as?: 'h2' | 'h3' }) {
  const location = formatLocation(business)
  return (
    <div className="match-business-header">
      <BusinessLogo business={business} />
      <div>
        <Heading>{business.display_name}</Heading>
        <p>
          {location && <span><MapPin size={13} aria-hidden="true" /> {location}</span>}
          {business.profile_status === 'approved' && <span className="match-reviewed"><BadgeCheck size={12} aria-hidden="true" /> Reviewed by BFB</span>}
        </p>
      </div>
    </div>
  )
}

/** One match in the inbox: who, the fit in words, why, and when to answer. */
export function MatchCard({ match, reasons }: { match: BusinessMatchSummary; reasons: CardReasons }) {
  const timing = matchTiming(match)
  const name = match.other_business.display_name
  return (
    <li className={`match-card match-card-${match.status}`}>
      <div className="match-card-top">
        <MatchBusinessHeader business={match.other_business} />
        <div className="match-card-pills">
          {match.status === 'proposed' ? null : <span className={`match-pill match-pill-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>}
          <FitBandBadge band={match.fit_band} />
        </div>
      </div>
      <div className="match-card-reasons" aria-busy={reasons === 'loading'}>
        {reasons === 'loading' && <p className="match-card-muted">Loading the reasons…</p>}
        {reasons === 'unavailable' && <p className="match-card-muted">{FIT_BAND_DESCRIPTIONS[match.fit_band as FitBand]}</p>}
        {Array.isArray(reasons) && reasons.length > 0 && <ReasonList reasons={reasons} label={`Why you were matched with ${name}`} />}
      </div>
      <div className="match-card-foot">
        <span className={`match-timing match-timing-${timing.tone}`}><Clock3 size={14} aria-hidden="true" /> {timing.text}</span>
        <Link className="button button-secondary button-small" to={paths.match(match.id)} aria-label={`View match with ${name}`}>
          View match <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}
