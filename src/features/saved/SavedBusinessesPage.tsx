import { useCallback, useEffect, useState } from 'react'
import { Bookmark, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { BusinessLogo } from '../businesses/BusinessLogo'
import { formatLocation, SERVICE_AREA_LABELS } from '../businesses/profileLabels'
import { SaveButton } from './SaveButton'
import { listSaved, type SavedBusiness } from './savedApi'
import { useSaveToggle } from './useSaveToggle'
import './SavedBusinessesPage.css'

const savedOn = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

type LoadState = { kind: 'loading' } | { kind: 'ready'; items: SavedBusiness[] } | { kind: 'error'; error: unknown }

/**
 * `/saved`: the businesses the active business has saved, shared by its whole team. Unsaving
 * keeps the card on the page, so it can be saved again; it is gone on the next visit.
 */
export function SavedBusinessesPage() {
  const business = useActiveBusiness()
  const go = useAppNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const { isSaved, isPending, toggle } = useSaveToggle(business.id)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    listSaved(business.id)
      .then((items) => {
        if (live) setState({ kind: 'ready', items })
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: 'error', error })
      })
    return () => {
      live = false
    }
  }, [business.id, reloadKey])

  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

  return (
    <>
      <div className="page-heading">
        <div>
          <span>SAVED BUSINESSES</span>
          <h1>Businesses you’re watching.</h1>
          <p>Your shortlist, shared with everyone on the {business.name} team.</p>
        </div>
      </div>
      {state.kind === 'loading' && <LoadingState label="Loading saved businesses…" />}
      {state.kind === 'error' && <ErrorState title="We couldn’t load your saved businesses" error={state.error} onRetry={retry} />}
      {state.kind === 'ready' && state.items.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="No saved businesses yet"
          description="Save businesses from the marketplace or their profile to keep them here."
          action={<button type="button" className="button button-primary button-small" onClick={() => go(paths.marketplace)}>Browse the marketplace</button>}
        />
      )}
      {state.kind === 'ready' && state.items.length > 0 && (
        <ul className="saved-list" aria-label="Saved businesses">
          {state.items.map(({ business: target, saved_at: savedAt }) => {
            const saved = isSaved(target.id, true)
            const location = formatLocation(target)
            return (
              <li key={target.id} className={`saved-card ${saved ? '' : 'saved-card-removed'}`}>
                <BusinessLogo business={target} />
                <div className="saved-card-body">
                  <h3>{target.display_name}</h3>
                  <p>
                    {location && <span><MapPin size={13} aria-hidden="true" /> {location}</span>}
                    {target.service_area && <span>{SERVICE_AREA_LABELS[target.service_area]}</span>}
                  </p>
                  <small>{saved ? `Saved ${savedOn.format(new Date(savedAt))}` : 'Removed from saved'}</small>
                </div>
                <div className="saved-card-actions">
                  <Link className="button button-secondary button-small" to={paths.publicBusiness(target.id)} aria-label={`View ${target.display_name}`}>View business</Link>
                  <SaveButton name={target.display_name} saved={saved} pending={isPending(target.id)} onToggle={() => void toggle(target.id, target.display_name, saved)} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
