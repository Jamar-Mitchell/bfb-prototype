import { formatAmount } from '../listings/money'
import {
  cancellationText,
  CASH_TIMING_LABELS,
  confidentialityText,
  formatFullDate,
  IP_TERMS_COPY,
  reviewPeriodText,
  revisionLimitText,
} from './proposalCopy'
import { compareValues, findService, normalizeTerms, otherSide, type DraftMilestone, type DraftService, type DraftTerms } from './proposalDraft'
import type { SentVersion, Side } from './proposalsApi'

/**
 * One sent version as a readable document: the summary and dates, what each business provides
 * with the values side by side, the cash adjustment, milestones by date and the terms in words.
 * Values are the amounts the businesses entered and their difference, nothing more.
 */
export function ProposalDocument({ version, names, mySide }: { version: SentVersion; names: Record<Side, string>; mySide: Side }) {
  const terms = normalizeTerms(version.terms)
  const order: Side[] = [mySide, otherSide(mySide)]
  const money = (minor: number) => formatAmount(minor, terms.currency)
  const comparison = compareValues(terms)

  return (
    <article className="match-panel proposal-document" aria-labelledby="proposal-document-title">
      <header className="proposal-doc-head">
        <small>Version {version.version_number} · sent by {names[version.author_side]} on {formatFullDate(version.sent_at)}</small>
        <h2 id="proposal-document-title">{terms.summary ?? 'No summary'}</h2>
        <p className="proposal-doc-dates">
          {terms.start_date && terms.end_date
            ? <>From <strong>{formatFullDate(terms.start_date)}</strong> to <strong>{formatFullDate(terms.end_date)}</strong></>
            : 'No dates set'}
        </p>
      </header>

      <section className="proposal-doc-section" aria-labelledby="proposal-doc-provides">
        <h3 id="proposal-doc-provides">Who provides what</h3>
        <div className="proposal-doc-sides">
          {order.map((side) => (
            <div key={side} className="proposal-doc-side">
              <h4>{names[side]} provides</h4>
              <ul className="proposal-doc-services">
                {terms.sides[side].services.map((service) => <ServiceItem key={service.key} service={service} money={money} />)}
              </ul>
              <p className="proposal-doc-total"><span>Total value</span><strong>{money(comparison.totals[side])}</strong></p>
            </div>
          ))}
        </div>
        <p className="proposal-doc-difference">
          {comparison.higher
            ? <>{names[comparison.higher]}’s services are valued <strong>{money(comparison.difference)}</strong> more.</>
            : 'Both businesses’ services are valued the same.'}
          {' '}<CashSentence terms={terms} names={names} money={money} />
        </p>
        <small className="proposal-values-foot">The values each business entered. BFB doesn’t score or judge the trade.</small>
      </section>

      <section className="proposal-doc-section" aria-labelledby="proposal-doc-milestones">
        <h3 id="proposal-doc-milestones">Milestones</h3>
        <MilestoneTimeline terms={terms} names={names} />
      </section>

      <section className="proposal-doc-section" aria-labelledby="proposal-doc-terms">
        <h3 id="proposal-doc-terms">Terms</h3>
        <dl className="proposal-doc-terms">
          <div><dt>Review period</dt><dd>{reviewPeriodText(terms.review_period_days)}</dd></div>
          <div><dt>Revisions</dt><dd>{revisionLimitText(terms.revision_limit)}</dd></div>
          <div>
            <dt>Who owns the work</dt>
            <dd>{terms.ip_terms ? <><strong>{IP_TERMS_COPY[terms.ip_terms].label}.</strong> {IP_TERMS_COPY[terms.ip_terms].description}</> : 'Not chosen.'}</dd>
          </div>
          <div><dt>Confidentiality</dt><dd>{confidentialityText(terms.confidentiality)}</dd></div>
          <div><dt>Cancellation</dt><dd>{cancellationText(terms.cancellation_notice_days)}</dd></div>
          {terms.notes && <div><dt>Notes</dt><dd className="proposal-doc-pre">{terms.notes}</dd></div>}
        </dl>
      </section>
    </article>
  )
}

function ServiceItem({ service, money }: { service: DraftService; money: (minor: number) => string }) {
  return (
    <li className="proposal-doc-service">
      <div className="proposal-doc-service-head">
        <strong>{service.title ?? 'Untitled service'}</strong>
        <span>{service.value_minor ? money(service.value_minor) : 'No value'}</span>
      </div>
      {service.description && <p className="proposal-doc-pre">{service.description}</p>}
      {service.deliverables.length > 0 && (
        <>
          <small>Deliverables</small>
          <ul className="proposal-doc-list">{service.deliverables.map((item, at) => <li key={at}>{item}</li>)}</ul>
        </>
      )}
      {service.exclusions.length > 0 && (
        <>
          <small>Not included</small>
          <ul className="proposal-doc-list proposal-doc-list-muted">{service.exclusions.map((item, at) => <li key={at}>{item}</li>)}</ul>
        </>
      )}
    </li>
  )
}

/** "Harbor Bookkeeping pays Northstar Digital $300 when the work is complete." */
export function CashSentence({ terms, names, money }: { terms: DraftTerms; names: Record<Side, string>; money: (minor: number) => string }) {
  const cash = terms.cash_adjustment
  if (!cash || !cash.payer || !cash.amount_minor) return <>No cash changes hands.</>
  const timing = cash.timing ? ` ${CASH_TIMING_LABELS[cash.timing].toLowerCase()}` : ''
  return (
    <>
      Cash adjustment: <strong>{names[cash.payer]} pays {names[otherSide(cash.payer)]} {money(cash.amount_minor)}</strong>{timing}.
      {cash.note ? ` ${cash.note}` : ''}
    </>
  )
}

/** Milestones sorted by due date (undated last, in their order), as a vertical timeline. */
function MilestoneTimeline({ terms, names }: { terms: DraftTerms; names: Record<Side, string> }) {
  const sorted = terms.milestones
    .map((milestone, at) => ({ milestone, at }))
    .sort((x, y) => (x.milestone.due_date ?? '9999').localeCompare(y.milestone.due_date ?? '9999') || x.at - y.at)
    .map(({ milestone }) => milestone)
  if (sorted.length === 0) return <p className="proposal-empty-line">No milestones.</p>
  return (
    <ol className="proposal-timeline" aria-label="Milestones by date">
      {sorted.map((milestone) => <MilestoneItem key={milestone.key} milestone={milestone} terms={terms} names={names} />)}
    </ol>
  )
}

function MilestoneItem({ milestone, terms, names }: { milestone: DraftMilestone; terms: DraftTerms; names: Record<Side, string> }) {
  const service = findService(terms, milestone.service_key)
  return (
    <li className="proposal-timeline-item">
      <span className="proposal-timeline-date">{milestone.due_date ? formatFullDate(milestone.due_date) : 'No date'}</span>
      <div>
        <strong>{milestone.title ?? 'Untitled milestone'}</strong>
        <p className="proposal-timeline-who">
          {milestone.responsible ? `Delivered by ${names[milestone.responsible]}` : 'No business assigned'}
          {service ? ` · Part of ${service.service.title ?? 'a service'}` : ''}
        </p>
        {milestone.acceptance_criteria && <p><span className="proposal-timeline-label">Done when:</span> {milestone.acceptance_criteria}</p>}
        {milestone.description && <p className="proposal-doc-pre">{milestone.description}</p>}
      </div>
    </li>
  )
}
