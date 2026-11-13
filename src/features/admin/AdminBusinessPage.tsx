import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Link2, MessageSquareWarning, TriangleAlert } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { businessInitials, ROLE_LABELS } from '../businesses/businessDisplay'
import { PortfolioGallery } from '../businesses/PortfolioGallery'
import {
  BUSINESS_STAGE_LABELS,
  displayUrl,
  formatLocation,
  orderedSocialLinks,
  SERVICE_AREA_LABELS,
  TEAM_SIZE_LABELS,
} from '../businesses/profileLabels'
import { approveBusiness, getAdminBusiness, requestBusinessChanges, type AdminBusiness } from './adminApi'
import {
  COMPLETENESS_LABELS,
  DECISION_LABELS,
  formatDateTime,
  LISTING_STATUSES,
  PROFILE_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from './adminDisplay'
import { ReviewDecisionDialog, type DecisionKind } from './ReviewDecisionDialog'
import './Admin.css'

/** Where the queue link came from (its page), so a decision returns there. */
export type AdminBusinessLocationState = { queue?: string } | null

/** `/admin/businesses/:id`: everything a reviewer needs, and the approve / request-changes decision. */
export function AdminBusinessPage() {
  const { businessId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queuePath = (location.state as AdminBusinessLocationState)?.queue ?? paths.admin
  const [business, setBusiness] = useState<AdminBusiness | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<DecisionKind | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let live = true
    setLoadError(null)
    getAdminBusiness(businessId)
      .then((result) => {
        if (live) setBusiness(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [businessId, reloadKey])

  const backToQueue = () => navigate(queuePath)

  if (!business) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        <BackButton onClick={backToQueue} />
        {loadError ? (
          <ErrorState
            title={notFound ? 'This business doesn’t exist' : 'We couldn’t load this business'}
            error={loadError}
            onRetry={notFound ? undefined : reload}
          />
        ) : (
          <LoadingState label="Loading business…" />
        )}
      </>
    )
  }

  const decide = async (kind: DecisionKind, notes: string) => {
    try {
      if (kind === 'approve') await approveBusiness(business.id, notes || undefined)
      else await requestBusinessChanges(business.id, notes)
    } catch (caught) {
      const error = toApiError(caught)
      if (error.code !== 'invalid_profile_status' && error.code !== 'not_found') throw error
      // Someone else decided first (or the business went away): show what it is now.
      setDialog(null)
      setNotice(
        error.code === 'not_found'
          ? 'This business no longer exists.'
          : 'This business is no longer in review, so no decision was recorded. Its current status is shown below.',
      )
      reload()
      return
    }
    showToast(kind === 'approve' ? `${business.display_name} was approved.` : `Changes requested from ${business.display_name}.`)
    navigate(queuePath)
  }

  const inReview = business.profile_status === 'in_review'

  return (
    <>
      <BackButton onClick={backToQueue} />
      <div className="page-heading admin-heading">
        <div>
          <span>ADMIN · BUSINESS REVIEW</span>
          <h1>{business.display_name}</h1>
          <p>{business.legal_name ?? 'No legal name given'}</p>
        </div>
        <div className="admin-status-pills">
          <span className={`admin-status admin-status-${business.profile_status}`}>{PROFILE_STATUS_LABELS[business.profile_status]}</span>
          <span className="admin-status">{VERIFICATION_STATUS_LABELS[business.verification_status]}</span>
        </div>
      </div>
      {notice && <p className="admin-notice admin-notice-error" role="alert">{notice}</p>}
      {business.requires_additional_review && (
        <div className="admin-warning" role="note">
          <TriangleAlert size={18} aria-hidden="true" />
          <div>
            <strong>Needs extra review</strong>
            <span>
              Regulated categories in use: {business.flagged_categories.map((category) => category.name).join(', ')}. Check licences and
              claims before approving.
            </span>
          </div>
        </div>
      )}
      <div className="admin-layout">
        <div className="admin-main">
          <ProfileCard business={business} />
          <PortfolioCard business={business} />
          <MembersCard business={business} />
          <ListingsCard business={business} />
        </div>
        <aside className="admin-side">
          <section className="admin-card admin-decision" aria-labelledby="admin-decision-title">
            <h2 id="admin-decision-title">Decision</h2>
            {inReview ? (
              <>
                <p>
                  {business.submitted_for_review_at ? `Submitted ${formatDateTime(business.submitted_for_review_at)}.` : null} Approving publishes
                  the profile and lets the business publish offers and needs.
                </p>
                <button type="button" className="button button-primary" onClick={() => setDialog('approve')}>
                  <Check size={16} aria-hidden="true" /> Approve
                </button>
                <button type="button" className="button button-secondary" onClick={() => setDialog('request-changes')}>
                  <MessageSquareWarning size={16} aria-hidden="true" /> Request changes
                </button>
              </>
            ) : (
              <p>Decisions can only be made while a business is in review. This one is {PROFILE_STATUS_LABELS[business.profile_status].toLowerCase()}.</p>
            )}
            {business.profile_status === 'approved' && (
              <Link className="button button-secondary" to={`${paths.adminNewMatch}?business=${business.id}`}>
                <Link2 size={16} aria-hidden="true" /> Find matches
              </Link>
            )}
          </section>
          <HistoryCard business={business} />
        </aside>
      </div>
      {dialog && (
        <ReviewDecisionDialog
          kind={dialog}
          businessName={business.display_name}
          onSubmit={(notes) => decide(dialog, notes)}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="back-button admin-back" onClick={onClick}><ArrowLeft size={17} aria-hidden="true" /> Back to review queue</button>
}

function ProfileCard({ business }: { business: AdminBusiness }) {
  const location = formatLocation(business)
  const socials = orderedSocialLinks(business.social_links)
  const flagged = new Set(business.flagged_categories.map((category) => category.id))
  const rows: Array<[string, string | null]> = [
    ['Industry', business.industry],
    ['Location', location || null],
    ['Service area', business.service_area && SERVICE_AREA_LABELS[business.service_area]],
    ['Stage', business.business_stage && BUSINESS_STAGE_LABELS[business.business_stage]],
    ['Team size', business.team_size && TEAM_SIZE_LABELS[business.team_size]],
    ['Created', formatDateTime(business.created_at)],
  ]

  return (
    <section className="admin-card" aria-labelledby="admin-profile-title">
      <div className="admin-card-head">
        <h2 id="admin-profile-title">Profile</h2>
        <p>
          {business.completeness.score}% complete
          {business.completeness.missing.length > 0 &&
            ` · Missing: ${business.completeness.missing.map((key) => COMPLETENESS_LABELS[key] ?? key).join(', ')}`}
        </p>
      </div>
      <div className="admin-card-body">
        <div className="admin-images">
          <figure>
            {business.logo_url ? <img className="admin-logo" src={business.logo_url} alt={`${business.display_name} logo`} /> : <div className="admin-logo admin-initials" aria-hidden="true">{businessInitials(business.display_name)}</div>}
            <figcaption>{business.logo_url ? 'Logo' : 'No logo'}</figcaption>
          </figure>
          <figure className="admin-cover-figure">
            {business.cover_url ? <img className="admin-cover" src={business.cover_url} alt={`${business.display_name} cover`} /> : <div className="admin-cover admin-cover-empty" />}
            <figcaption>{business.cover_url ? 'Cover' : 'No cover'}</figcaption>
          </figure>
        </div>
        <h3 className="admin-subheading">Description</h3>
        <p className="admin-description">{business.description ?? <em>No description.</em>}</p>
        <dl className="admin-facts">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value ?? <em>Not given</em>}</dd></div>
          ))}
          <div>
            <dt>Website</dt>
            <dd>{business.website_url ? <a href={business.website_url} target="_blank" rel="noopener noreferrer nofollow">{displayUrl(business.website_url)} <ArrowUpRight size={13} aria-hidden="true" /></a> : <em>Not given</em>}</dd>
          </div>
          <div>
            <dt>Social</dt>
            <dd>
              {socials.length > 0 ? (
                socials.map((social) => <a key={social.key} href={social.url} target="_blank" rel="noopener noreferrer nofollow">{social.label} <ArrowUpRight size={13} aria-hidden="true" /></a>)
              ) : (
                <em>Not given</em>
              )}
            </dd>
          </div>
        </dl>
        <h3 className="admin-subheading">Categories</h3>
        {business.categories.length > 0 ? (
          <div className="admin-tags">
            {business.categories.map((category) => (
              <span key={category.id} className={flagged.has(category.id) ? 'admin-tag admin-tag-flagged' : 'admin-tag'}>{category.name}</span>
            ))}
          </div>
        ) : (
          <p className="admin-muted">No categories.</p>
        )}
      </div>
    </section>
  )
}

function PortfolioCard({ business }: { business: AdminBusiness }) {
  const count = business.portfolio.length
  return (
    <section className="admin-card" aria-labelledby="admin-portfolio-title">
      <div className="admin-card-head">
        <h2 id="admin-portfolio-title">Portfolio</h2>
        <p>{count === 1 ? '1 work sample' : `${count} work samples`}</p>
      </div>
      <div className="admin-card-body">
        {count > 0 ? <PortfolioGallery items={business.portfolio} label="Work samples" /> : <p className="admin-muted">No work samples.</p>}
      </div>
    </section>
  )
}

function MembersCard({ business }: { business: AdminBusiness }) {
  return (
    <section className="admin-card" aria-labelledby="admin-members-title">
      <div className="admin-card-head">
        <h2 id="admin-members-title">Members</h2>
        <p>{business.members.length === 1 ? '1 person' : `${business.members.length} people`}</p>
      </div>
      <ul className="admin-members">
        {business.members.map((member) => (
          <li key={member.user_id}>
            <div><strong>{member.display_name}</strong><span>{member.email}</span></div>
            <span className="admin-tag">{ROLE_LABELS[member.role]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ListingsCard({ business }: { business: AdminBusiness }) {
  const groups = [
    { label: 'Offers', counts: business.offer_counts },
    { label: 'Needs', counts: business.need_counts },
  ]
  return (
    <section className="admin-card" aria-labelledby="admin-listings-title">
      <div className="admin-card-head">
        <h2 id="admin-listings-title">Offers and needs</h2>
        <p>Listings can be published only after approval.</p>
      </div>
      <table className="admin-counts">
        <thead>
          <tr><th scope="col"><span className="admin-sr-only">Listing</span></th>{LISTING_STATUSES.map((status) => <th scope="col" key={status.key}>{status.label}</th>)}</tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.label}>
              <th scope="row">{group.label}</th>
              {LISTING_STATUSES.map((status) => <td key={status.key}>{group.counts[status.key] ?? 0}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function HistoryCard({ business }: { business: AdminBusiness }) {
  return (
    <section className="admin-card" aria-labelledby="admin-history-title">
      <div className="admin-card-head"><h2 id="admin-history-title">Review history</h2></div>
      {business.reviews.length === 0 ? (
        <p className="admin-muted admin-card-body">No decisions yet. This is the first review.</p>
      ) : (
        <ol className="admin-history">
          {business.reviews.map((review) => (
            <li key={review.id}>
              <span className={`admin-status admin-status-${review.decision}`}>{DECISION_LABELS[review.decision]}</span>
              <small>{formatDateTime(review.created_at)}{review.reviewer_user_id === null ? ' · reviewer account deleted' : ''}</small>
              {review.notes ? <p>{review.notes}</p> : <p className="admin-muted">No notes.</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
