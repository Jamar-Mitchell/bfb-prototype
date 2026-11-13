import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Compass,
  Handshake,
  LayoutDashboard,
  Link2,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

import { businessPathPrefix, paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { EmailVerificationBanner } from '../../features/auth/EmailVerificationBanner'
import { LogoutButton } from '../../features/auth/LogoutButton'
import { BusinessSwitcher } from '../../features/businesses/BusinessSwitcher'
import { ProfileProgressCard } from '../../features/businesses/ProfileProgressCard'
import { ProfileStatusBanner } from '../../features/businesses/ProfileStatusBanner'
import { useLoadWaitingMatches, useWaitingMatches } from '../../features/matching/waitingMatches'
import { isPlatformStaff, useSessionStore } from '../../stores/session'
import { Toaster } from '../feedback'
import { Logo } from '../ui/Logo'

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const go = useAppNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  // Platform staff see the admin area; they may have no business of their own.
  const staff = useSessionStore((state) => isPlatformStaff(state.user))
  const hasBusiness = useSessionStore((state) => state.activeBusiness !== null)
  const activeBusinessId = useSessionStore((state) => state.activeBusiness?.id ?? null)
  useLoadWaitingMatches(activeBusinessId)
  const { count: waitingMatches } = useWaitingMatches(activeBusinessId)
  const navItems: Array<{ id: string; label: string; icon: typeof LayoutDashboard; count?: string; countLabel?: string; unread?: boolean; prefix?: string }> = [
    { id: paths.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    { id: paths.marketplace, label: 'Marketplace', icon: Compass },
    {
      id: paths.matches,
      label: 'Matches',
      icon: Sparkles,
      prefix: `${paths.matches}/`,
      count: waitingMatches ? String(waitingMatches) : undefined,
      countLabel: waitingMatches ? `${waitingMatches} waiting on you` : undefined,
    },
    { id: paths.saved, label: 'Saved businesses', icon: Bookmark },
    { id: paths.exchanges, label: 'Exchanges', icon: Handshake, count: '3' },
    { id: paths.messages, label: 'Messages', icon: MessageCircle, unread: true },
  ]
  const manageItems = [
    { id: paths.profile, label: 'Business profile', icon: Building2 },
    { id: paths.listings, label: 'Offers & needs', icon: BriefcaseBusiness },
    { id: paths.team, label: 'Team', icon: Users },
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head"><Logo /><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
        <nav className="side-nav">
          <span className="side-label">Workspace</span>
          {navItems.map(({ id, label, icon: Icon, count, countLabel, unread, prefix }) => (
            <button key={id} className={pathname === id || (prefix && pathname.startsWith(prefix)) || (id === paths.marketplace && pathname.startsWith(businessPathPrefix)) ? 'active' : ''} onClick={() => { go(id); setMobileOpen(false) }}>
              <Icon size={19} /> {label} {count && <span className="nav-count" aria-label={countLabel}>{count}</span>} {unread && <span className="message-dot" />}
            </button>
          ))}
          <span className="side-label side-label-second">Manage</span>
          {manageItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={pathname === id ? 'active' : ''} onClick={() => { go(id); setMobileOpen(false) }}>
              <Icon size={19} /> {label}
            </button>
          ))}
          {staff && (
            <>
              <span className="side-label side-label-second">Admin</span>
              <button className={pathname === paths.admin || pathname.startsWith(`${paths.admin}/businesses/`) ? 'active' : ''} onClick={() => { go(paths.admin); setMobileOpen(false) }}>
                <ShieldCheck size={19} /> Review queue
              </button>
              <button className={pathname === paths.adminMatches || pathname.startsWith(`${paths.adminMatches}/`) ? 'active' : ''} onClick={() => { go(paths.adminMatches); setMobileOpen(false) }}>
                <Link2 size={19} /> Matches
              </button>
            </>
          )}
        </nav>
        {hasBusiness ? (
          <ProfileProgressCard onOpen={() => { go(paths.profile); setMobileOpen(false) }} />
        ) : (
          <div className="sidebar-growth-spacer" />
        )}
        <div className="account-row">
          {hasBusiness ? (
            <BusinessSwitcher onNavigate={() => setMobileOpen(false)} />
          ) : (
            <button type="button" className="button button-secondary button-small shell-create-business" onClick={() => { go(paths.createBusiness); setMobileOpen(false) }}>
              <Plus size={16} /> Create a business
            </button>
          )}
          <LogoutButton />
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="topbar-search"><Search size={18} /><input aria-label="Search BFB" placeholder="Search BFB..." /><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><button className="icon-button"><Bell size={19} /><span className="notification-dot" /></button><button className="button button-primary button-small" onClick={() => go(paths.listings)}><Plus size={16} /> New listing</button></div>
        </header>
        <main className="app-content"><EmailVerificationBanner />{hasBusiness ? <ProfileStatusBanner openProfile={pathname === paths.profile ? undefined : () => go(paths.profile)} /> : null}{children}</main>
      </div>
      <Toaster />
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
    </div>
  )
}
