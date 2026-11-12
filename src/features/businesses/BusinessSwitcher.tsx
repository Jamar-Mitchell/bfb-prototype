import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { switchBusiness } from '../../lib/businesses/activeBusiness'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { useSessionStore, type SessionBusiness } from '../../stores/session'
import { businessInitials, ROLE_LABELS } from './businessDisplay'
import './BusinessSwitcher.css'

/** Sidebar account row button: shows the active business and opens a menu to switch or create one. */
export function BusinessSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const active = useActiveBusiness()
  const memberships = useSessionStore((state) => state.memberships) ?? [active]
  const go = useAppNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const choose = (business: SessionBusiness) => {
    switchBusiness(business.id)
    close()
    onNavigate?.()
  }

  const createAnother = () => {
    close(false)
    onNavigate?.()
    go(paths.createBusiness)
  }

  return (
    <div className="business-switcher" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="business-switcher-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${active.name}, ${ROLE_LABELS[active.role]}. Switch business`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">{businessInitials(active.name)}</span>
        <span className="business-switcher-text">
          <strong>{active.name}</strong>
          <span>{ROLE_LABELS[active.role]}</span>
        </span>
        <ChevronsUpDown size={15} className="business-switcher-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="business-menu" id={menuId} role="menu" aria-label="Your businesses" ref={menuRef} onKeyDown={onMenuKeyDown}>
          <span className="business-menu-label" aria-hidden="true">Your businesses</span>
          {memberships.map((business) => {
            const isActive = business.id === active.id
            return (
              <button
                key={business.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                tabIndex={-1}
                className="business-menu-item"
                onClick={() => choose(business)}
              >
                <span className="account-avatar business-menu-avatar" aria-hidden="true">{businessInitials(business.name)}</span>
                <span className="business-menu-text">
                  <strong>{business.name}</strong>
                  <span>{ROLE_LABELS[business.role]}</span>
                </span>
                {isActive ? <Check size={15} className="business-menu-check" aria-hidden="true" /> : null}
              </button>
            )
          })}
          <div className="business-menu-divider" role="separator" />
          <button type="button" role="menuitem" tabIndex={-1} className="business-menu-item business-menu-create" onClick={createAnother}>
            <span className="business-menu-create-icon" aria-hidden="true"><Plus size={15} /></span>
            Create another business
          </button>
        </div>
      ) : null}
    </div>
  )
}
