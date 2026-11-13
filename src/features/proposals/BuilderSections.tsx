import { useId, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import { SelectField, TextareaField, TextField } from '../../components/forms'
import { DeliverablesField } from '../listings/DeliverablesField'
import { formatAmount } from '../listings/money'
import { MoneyField, WholeNumberField } from './builderFields'
import { BUILDER_SECTIONS, CASH_TIMING_LABELS, IP_TERMS_COPY, IP_TERMS_ORDER, sectionAnchor, type BuilderSection } from './proposalCopy'
import {
  addMilestone,
  addService,
  emptyMilestone,
  emptyService,
  LIMITS,
  moveMilestone,
  newKey,
  removeMilestone,
  removeService,
  serviceFromOffer,
  sideTotal,
  textValue,
  updateMilestone,
  updateService,
  type CashTiming,
  type DraftCash,
  type DraftMilestone,
  type DraftService,
  type DraftTerms,
} from './proposalDraft'
import type { OfferChoice, Side } from './proposalsApi'

/** What every section needs: the terms, a way to change them, and the two businesses. */
export interface SectionProps {
  terms: DraftTerms
  update: (change: (terms: DraftTerms) => DraftTerms) => void
  names: Record<Side, string>
  mySide: Side
}

function Section({ id, intro, children }: { id: BuilderSection; intro?: ReactNode; children: ReactNode }) {
  const label = BUILDER_SECTIONS.find((section) => section.id === id)?.label
  return (
    <section className="match-panel proposal-section" id={sectionAnchor(id)} aria-labelledby={`${sectionAnchor(id)}-title`} tabIndex={-1}>
      <div className="match-panel-head">
        <h2 id={`${sectionAnchor(id)}-title`}>{label}</h2>
        {intro && <p>{intro}</p>}
      </div>
      <div className="proposal-section-body">{children}</div>
    </section>
  )
}

export function SummarySection({ terms, update }: SectionProps) {
  return (
    <Section id="summary" intro="One line both businesses will recognise, and when the exchange runs.">
      <TextareaField
        label="Summary"
        rows={2}
        maxLength={LIMITS.summary}
        placeholder="e.g. Brand sprint in exchange for six months of bookkeeping"
        hint={`Up to ${LIMITS.summary} characters.`}
        value={terms.summary ?? ''}
        onChange={(event) => update((current) => ({ ...current, summary: textValue(event.target.value) }))}
      />
      <div className="proposal-grid">
        <TextField label="Start date" type="date" value={terms.start_date ?? ''} onChange={(event) => update((current) => ({ ...current, start_date: textValue(event.target.value) }))} />
        <TextField label="End date" type="date" value={terms.end_date ?? ''} onChange={(event) => update((current) => ({ ...current, end_date: textValue(event.target.value) }))} />
      </div>
    </Section>
  )
}

export function ServicesSection({ terms, update, names, mySide, offers }: SectionProps & { offers: Record<Side, OfferChoice[] | null> }) {
  const order: Side[] = mySide === 'a' ? ['a', 'b'] : ['b', 'a']
  return (
    <Section id="services" intro="Each service with what is delivered, what is not, and its estimated value. Values are what each business enters; BFB does not judge the trade.">
      {order.map((side) => (
        <SideServices key={side} side={side} terms={terms} update={update} names={names} mySide={mySide} offers={offers[side]} />
      ))}
    </Section>
  )
}

function SideServices({ side, terms, update, names, mySide, offers }: SectionProps & { side: Side; offers: OfferChoice[] | null }) {
  const services = terms.sides[side].services
  const usedOffers = new Set(services.map((service) => service.offer_id).filter(Boolean))
  const available = (offers ?? []).filter((offer) => !usedOffers.has(offer.id))
  const [choice, setChoice] = useState('')
  const full = services.length >= LIMITS.services
  const who = side === mySide ? `${names[side]} (you)` : names[side]

  const addOffer = () => {
    const offer = available.find((item) => item.id === choice)
    if (!offer) return
    update((current) => addService(current, side, serviceFromOffer(newKey(current, 's'), offer)))
    setChoice('')
  }

  return (
    <div className="proposal-side" id={`proposal-side-${side}`} tabIndex={-1}>
      <div className="proposal-side-head">
        <h3>What {who} provides</h3>
        <span>{formatAmount(sideTotal(terms, side), terms.currency)} in total</span>
      </div>
      {services.length === 0 && <p className="proposal-empty-line">No services yet.</p>}
      <ol className="proposal-items">
        {services.map((service, index) => (
          <ServiceCard key={service.key} side={side} index={index} service={service} currency={terms.currency} update={update} />
        ))}
      </ol>
      {!full && (
        <div className="proposal-add-row">
          {available.length > 0 && (
            <>
              <SelectField
                label={`Add from ${side === mySide ? 'your' : `${names[side]}’s`} active offers`}
                className="proposal-add-select"
                placeholder="Choose an offer"
                options={available.map((offer) => ({ value: offer.id, label: offer.title }))}
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
              />
              <button type="button" className="button button-secondary button-small" onClick={addOffer} disabled={!choice}>
                <Plus size={15} aria-hidden="true" /> Add offer
              </button>
            </>
          )}
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => update((current) => addService(current, side, emptyService(newKey(current, 's'))))}
          >
            <Plus size={15} aria-hidden="true" /> Write a service for {side === mySide ? 'you' : names[side]}
          </button>
        </div>
      )}
    </div>
  )
}

function ServiceCard({ side, index, service, currency, update }: { side: Side; index: number; service: DraftService; currency: string; update: SectionProps['update'] }) {
  const label = service.title?.trim() || `Service ${index + 1}`
  const change = (patch: Partial<DraftService>) => update((current) => updateService(current, side, service.key, patch))
  return (
    <li className="proposal-item" id={`proposal-service-${service.key}`} tabIndex={-1} aria-label={label}>
      <div className="proposal-item-head">
        <strong>{label}</strong>
        {service.offer_id && <span className="proposal-tag">From an offer</span>}
        <button type="button" className="icon-button proposal-item-remove" aria-label={`Remove ${label}`} onClick={() => update((current) => removeService(current, side, service.key))}>
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="proposal-grid">
        <TextField label="Title" maxLength={LIMITS.title} value={service.title ?? ''} onChange={(event) => change({ title: textValue(event.target.value) })} />
        <MoneyField label="Estimated value" currency={currency} value={service.value_minor} onChange={(value) => change({ value_minor: value })} hint="What this would usually cost." />
      </div>
      <TextareaField label="Description" rows={2} maxLength={LIMITS.text} value={service.description ?? ''} onChange={(event) => change({ description: textValue(event.target.value) })} />
      <DeliverablesField label="Deliverables" max={LIMITS.items} value={service.deliverables} onChange={(deliverables) => change({ deliverables })} hint="What the other business receives." />
      <DeliverablesField label="Not included" noun="exclusion" placeholder="e.g. Printing" max={LIMITS.items} value={service.exclusions} onChange={(exclusions) => change({ exclusions })} hint="Optional. Anything someone might assume is included but is not." />
    </li>
  )
}

export function MilestonesSection({ terms, update, names, mySide }: SectionProps) {
  const full = terms.milestones.length >= LIMITS.milestones
  return (
    <Section id="milestones" intro="The steps that show the work is on track. Each business delivers at least one, between the start and end dates.">
      {terms.milestones.length === 0 && <p className="proposal-empty-line">No milestones yet.</p>}
      <ol className="proposal-items" aria-label="Milestones in order">
        {terms.milestones.map((milestone, index) => (
          <MilestoneCard key={milestone.key} index={index} count={terms.milestones.length} milestone={milestone} terms={terms} update={update} names={names} mySide={mySide} />
        ))}
      </ol>
      {!full && (
        <div className="proposal-add-row">
          <button type="button" className="button button-secondary button-small" onClick={() => update((current) => addMilestone(current, emptyMilestone(newKey(current, 'm'), mySide)))}>
            <Plus size={15} aria-hidden="true" /> Add a milestone
          </button>
        </div>
      )}
    </Section>
  )
}

function MilestoneCard({ index, count, milestone, terms, update, names, mySide }: SectionProps & { index: number; count: number; milestone: DraftMilestone }) {
  const label = milestone.title?.trim() || `Milestone ${index + 1}`
  const change = (patch: Partial<DraftMilestone>) => update((current) => updateMilestone(current, milestone.key, patch))
  const services = milestone.responsible ? terms.sides[milestone.responsible].services : []
  const sideOptions = (mySide === 'a' ? ['a', 'b'] : ['b', 'a']).map((side) => ({ value: side, label: side === mySide ? `${names[side]} (you)` : names[side] }))
  return (
    <li className="proposal-item" id={`proposal-milestone-${milestone.key}`} tabIndex={-1} aria-label={label}>
      <div className="proposal-item-head">
        <span className="proposal-step" aria-hidden="true">{index + 1}</span>
        <strong>{label}</strong>
        <div className="proposal-item-tools">
          <button type="button" className="icon-button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => update((current) => moveMilestone(current, milestone.key, -1))}>
            <ArrowUp size={15} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => update((current) => moveMilestone(current, milestone.key, 1))}>
            <ArrowDown size={15} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button proposal-item-remove" aria-label={`Remove ${label}`} onClick={() => update((current) => removeMilestone(current, milestone.key))}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="proposal-grid">
        <TextField label="Title" maxLength={LIMITS.title} value={milestone.title ?? ''} onChange={(event) => change({ title: textValue(event.target.value) })} />
        <TextField label="Due date" type="date" value={milestone.due_date ?? ''} onChange={(event) => change({ due_date: textValue(event.target.value) })} />
        <SelectField
          label="Delivered by"
          placeholder="Choose a business"
          options={sideOptions}
          value={milestone.responsible ?? ''}
          onChange={(event) => change({ responsible: (event.target.value || null) as Side | null })}
        />
        <SelectField
          label="Part of"
          placeholder="General (no one service)"
          options={services.map((service, at) => ({ value: service.key, label: service.title?.trim() || `Service ${at + 1}` }))}
          value={milestone.service_key ?? ''}
          disabled={!milestone.responsible}
          onChange={(event) => change({ service_key: event.target.value || null })}
        />
      </div>
      <TextareaField
        label="Acceptance criteria"
        rows={2}
        maxLength={LIMITS.text}
        placeholder="e.g. Three logo concepts delivered as PDF"
        hint="How both businesses will know it is done."
        value={milestone.acceptance_criteria ?? ''}
        onChange={(event) => change({ acceptance_criteria: textValue(event.target.value) })}
      />
      <TextareaField label="Description" rows={2} maxLength={LIMITS.text} hint="Optional." value={milestone.description ?? ''} onChange={(event) => change({ description: textValue(event.target.value) })} />
    </li>
  )
}

export function TermsSection({ terms, update }: SectionProps) {
  const ipName = useId()
  const confidentialName = useId()
  return (
    <Section id="terms" intro="How work is reviewed, how many rounds of changes are included, who owns the work, and how either business can stop.">
      <div className="proposal-grid proposal-grid-3">
        <WholeNumberField label="Review period" suffix="days" max={365} hint="1 to 30 days to review each delivery." value={terms.review_period_days} onChange={(value) => update((current) => ({ ...current, review_period_days: value }))} />
        <WholeNumberField label="Revision rounds" max={100} hint="0 to 10 rounds of changes included." value={terms.revision_limit} onChange={(value) => update((current) => ({ ...current, revision_limit: value }))} />
        <WholeNumberField label="Cancellation notice" suffix="days" max={365} hint="0 to 90 days’ notice to stop." value={terms.cancellation_notice_days} onChange={(value) => update((current) => ({ ...current, cancellation_notice_days: value }))} />
      </div>
      <fieldset className="match-choices proposal-choices">
        <legend>Who owns the work</legend>
        {IP_TERMS_ORDER.map((choice) => (
          <label key={choice} className="match-choice proposal-choice">
            <input type="radio" name={ipName} checked={terms.ip_terms === choice} onChange={() => update((current) => ({ ...current, ip_terms: choice }))} />
            <span><strong>{IP_TERMS_COPY[choice].label}</strong><small>{IP_TERMS_COPY[choice].description}</small></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="match-choices proposal-choices proposal-choices-inline">
        <legend>Confidentiality</legend>
        <label className="match-choice">
          <input type="radio" name={confidentialName} checked={terms.confidentiality === true} onChange={() => update((current) => ({ ...current, confidentiality: true }))} />
          Keep each other’s information confidential
        </label>
        <label className="match-choice">
          <input type="radio" name={confidentialName} checked={terms.confidentiality === false} onChange={() => update((current) => ({ ...current, confidentiality: false }))} />
          No confidentiality clause
        </label>
      </fieldset>
      <TextareaField label="Notes" rows={3} maxLength={LIMITS.text} hint="Optional. Anything else both businesses should agree on." value={terms.notes ?? ''} onChange={(event) => update((current) => ({ ...current, notes: textValue(event.target.value) }))} />
    </Section>
  )
}

export function CashSection({ terms, update, names, mySide }: SectionProps) {
  const cash = terms.cash_adjustment
  const change = (patch: Partial<DraftCash>) => update((current) => ({ ...current, cash_adjustment: { ...(current.cash_adjustment ?? { payer: null, amount_minor: null, timing: null, note: null }), ...patch } }))
  const sideOptions = (mySide === 'a' ? ['a', 'b'] : ['b', 'a']).map((side) => ({ value: side, label: side === mySide ? `${names[side]} (you)` : names[side] }))
  return (
    <Section id="cash" intro="Optional. Cash that evens out the two sides. It is recorded as a term; no money moves through BFB.">
      {cash ? (
        <>
          <div className="proposal-grid">
            <SelectField label="Who pays" placeholder="Choose a business" options={sideOptions} value={cash.payer ?? ''} onChange={(event) => change({ payer: (event.target.value || null) as Side | null })} />
            <MoneyField label="Amount" currency={terms.currency} value={cash.amount_minor} onChange={(value) => change({ amount_minor: value })} />
            <SelectField
              label="When"
              placeholder="Choose when"
              options={(Object.keys(CASH_TIMING_LABELS) as CashTiming[]).map((timing) => ({ value: timing, label: CASH_TIMING_LABELS[timing] }))}
              value={cash.timing ?? ''}
              onChange={(event) => change({ timing: (event.target.value || null) as CashTiming | null })}
            />
            <TextField label="Note" hint="Optional." maxLength={LIMITS.note} value={cash.note ?? ''} onChange={(event) => change({ note: textValue(event.target.value) })} />
          </div>
          <button type="button" className="text-button proposal-text-button" onClick={() => update((current) => ({ ...current, cash_adjustment: null }))}>
            Remove the cash adjustment
          </button>
        </>
      ) : (
        <div className="proposal-add-row">
          <p className="proposal-empty-line">No cash changes hands.</p>
          <button type="button" className="button button-secondary button-small" onClick={() => change({})}>
            <Plus size={15} aria-hidden="true" /> Add a cash adjustment
          </button>
        </div>
      )}
    </Section>
  )
}
