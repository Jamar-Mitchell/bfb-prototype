import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronDown, CircleDollarSign, MailCheck, MapPin, Search, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState, ErrorState, LoadingState } from '../../components/feedback'
import { useActiveBusinessId } from '../../lib/businesses/useActiveBusiness'
import { businesses as bannerImages } from '../../mocks/businesses'
import { useSessionStore } from '../../stores/session'
import { ResendVerificationButton } from '../auth/ResendVerificationButton'
import { listCategories, type Category } from '../businesses/profileApi'
import { SaveButton } from '../saved/SaveButton'
import { useSaveToggle } from '../saved/useSaveToggle'
import { LocationPanel, ValuePanel } from './MarketplaceFilterPanels'
import { MarketplaceCard } from './MarketplaceCard'
import {
  deliveryOptionsFor,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  hasActiveFilters,
  locationFilterCount,
  valueFilterCount,
  type MarketplaceFilters,
  type MarketplaceKind,
} from './marketplaceFilters'
import { useCategoryCounts, useMarketplaceSearch } from './useMarketplaceSearch'
import './Marketplace.css'

const KIND_TABS: Array<{ value: MarketplaceKind | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'offer', label: 'Offers' },
  { value: 'need', label: 'Needs' },
]

/** Active service categories for the chips. Empty until loaded, or if they could not be. */
function useCategories(): Category[] {
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    let live = true
    listCategories()
      .then((items) => {
        if (live) setCategories(items)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  return categories
}

/**
 * Active offers and needs of approved businesses (`GET /marketplace/listings`), with the
 * filters in the URL query. The viewer's own business is left out.
 */
export function Marketplace() {
  const viewerBusinessId = useActiveBusinessId()
  const email = useSessionStore((state) => state.user?.email)
  const [params, setParams] = useSearchParams()
  const filterKey = filtersToParams(filtersFromParams(params)).toString()
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(filterKey)), [filterKey])
  const query = useMemo(() => filtersToQuery(filters), [filters])
  const { state, loadMore, retry } = useMarketplaceSearch(query, viewerBusinessId)
  const { counts, total } = useCategoryCounts(query, viewerBusinessId)
  const categories = useCategories()
  const { isSaved, isPending, toggle } = useSaveToggle(viewerBusinessId)
  const [openPanel, setOpenPanel] = useState<'location' | 'value' | null>(null)

  // The search box follows the URL (back button, reset) but is edited freely until submitted.
  const [searchText, setSearchText] = useState(filters.q)
  const [syncedQ, setSyncedQ] = useState(filters.q)
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q)
    setSearchText(filters.q)
  }

  function update(patch: Partial<MarketplaceFilters>) {
    setParams(filtersToParams({ ...filters, ...patch }))
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    update({ q: searchText })
  }

  function chooseKind(kind: MarketplaceKind | null) {
    const allowed = new Set(deliveryOptionsFor(kind).map((option) => option.value))
    update({ kind, delivery: filters.delivery.filter((value) => allowed.has(value)) })
  }

  function toggleCategory(id: string) {
    const categoryIds = filters.categoryIds.includes(id) ? filters.categoryIds.filter((item) => item !== id) : [...filters.categoryIds, id]
    update({ categoryIds })
  }

  function applyPanel(patch: Partial<MarketplaceFilters>) {
    update(patch)
    setOpenPanel(null)
  }

  function reset() {
    setOpenPanel(null)
    setParams(new URLSearchParams())
  }

  const filtered = hasActiveFilters(filters)
  const locationCount = locationFilterCount(filters)
  const valueCount = valueFilterCount(filters)

  return (
    <>
      <section className="marketplace-banner">
        <div><span>DISCOVER YOUR NETWORK</span><h1>Find your next growth partner.</h1><p>Explore businesses ready to exchange skills, services, and value.</p><div><ShieldCheck size={14} aria-hidden="true" /> Every business here was reviewed by BFB</div></div>
        <div className="marketplace-banner-images">{bannerImages.slice(0, 3).map((business) => <img key={business.id} src={business.image} alt="" />)}</div>
      </section>
      <form className="market-search" role="search" onSubmit={submitSearch}>
        <Search size={20} aria-hidden="true" />
        <input value={searchText} onChange={(event) => setSearchText(event.target.value)} maxLength={200} placeholder="Search services, needs, or businesses..." aria-label="Search marketplace" />
        <button type="submit" className="button button-primary">Search</button>
      </form>
      <div className="market-tools">
        <div className="category-chips" role="group" aria-label="Categories">
          <button type="button" className={filters.categoryIds.length === 0 ? 'active' : ''} aria-pressed={filters.categoryIds.length === 0} onClick={() => update({ categoryIds: [] })}>All</button>
          {categories.map((category) => {
            const active = filters.categoryIds.includes(category.id)
            const count = counts?.get(category.id) ?? (counts ? 0 : null)
            return (
              <button type="button" key={category.id} className={active ? 'active' : ''} aria-pressed={active} onClick={() => toggleCategory(category.id)}>
                {category.name}{count !== null && <span className="chip-count"> {count}</span>}
              </button>
            )
          })}
        </div>
        <div className="market-tool-buttons">
          <div className="kind-tabs" role="group" aria-label="Listing type">
            {KIND_TABS.map((tab) => (
              <button type="button" key={tab.label} className={filters.kind === tab.value ? 'active' : ''} aria-pressed={filters.kind === tab.value} onClick={() => chooseKind(tab.value)}>
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" className={`filter-button ${locationCount ? 'filter-button-on' : ''}`} aria-expanded={openPanel === 'location'} onClick={() => setOpenPanel(openPanel === 'location' ? null : 'location')}>
            <MapPin size={16} aria-hidden="true" /> Location{locationCount ? ` (${locationCount})` : ''} <ChevronDown size={15} aria-hidden="true" />
          </button>
          <button type="button" className={`filter-button ${valueCount ? 'filter-button-on' : ''}`} aria-expanded={openPanel === 'value'} onClick={() => setOpenPanel(openPanel === 'value' ? null : 'value')}>
            <CircleDollarSign size={16} aria-hidden="true" /> Value{valueCount ? ` (${valueCount})` : ''} <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      {openPanel === 'location' && <LocationPanel key={filterKey} filters={filters} onApply={applyPanel} />}
      {openPanel === 'value' && <ValuePanel key={filterKey} filters={filters} onApply={applyPanel} />}

      {state.status === 'loading' && <LoadingState label="Loading listings…" />}

      {state.status === 'error' && state.error.code === 'email_not_verified' && (
        <EmptyState
          icon={MailCheck}
          title="Verify your email to browse the marketplace"
          description="Open the link we emailed you, then come back to this page."
          action={<ResendVerificationButton email={email} />}
        />
      )}
      {state.status === 'error' && state.error.code !== 'email_not_verified' && (
        state.error.status === 422 ? (
          <ErrorState title="These filters don’t work together" error={state.error} onRetry={reset} retryLabel="Reset filters" />
        ) : (
          <ErrorState title="We couldn’t load the marketplace" error={state.error} onRetry={retry} />
        )
      )}

      {state.status === 'ready' && (
        <>
          <div className="results-heading">
            <p aria-live="polite">
              {total !== null && total >= state.items.length ? (
                <><strong>{total} {total === 1 ? 'listing' : 'listings'}</strong> {filtered ? (total === 1 ? 'matches your search' : 'match your search') : 'available'}</>
              ) : (
                <>Showing <strong>{state.items.length} {state.items.length === 1 ? 'listing' : 'listings'}</strong></>
              )}
            </p>
            <span className="results-sort">{filters.q ? 'Most relevant first' : 'Newest first'}</span>
          </div>
          {state.items.length ? (
            <>
              <div className="business-grid">
                {state.items.map((listing) => {
                  const { business } = listing
                  const saved = isSaved(business.id, listing.saved)
                  return (
                    <MarketplaceCard
                      key={`${listing.kind}:${listing.id}`}
                      listing={listing}
                      action={<SaveButton name={business.display_name} saved={saved} pending={isPending(business.id)} onToggle={() => void toggle(business.id, business.display_name, saved)} />}
                    />
                  )
                })}
              </div>
              {state.nextCursor && (
                <div className="market-load-more">
                  {state.loadMoreError && <p role="alert">{state.loadMoreError.userMessage}</p>}
                  <button type="button" className="button button-secondary" onClick={() => void loadMore()} disabled={state.loadingMore}>
                    {state.loadingMore ? 'Loading…' : state.loadMoreError ? 'Try again' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          ) : filtered ? (
            <EmptyState
              icon={Search}
              title="No listings match your search"
              description="Try different words, or reset your filters to see everything."
              action={<button type="button" className="button button-primary" onClick={reset}>Reset filters</button>}
            />
          ) : (
            <EmptyState icon={Search} title="No offers or needs yet" description="Active offers and needs from approved businesses will appear here." />
          )}
        </>
      )}
    </>
  )
}
