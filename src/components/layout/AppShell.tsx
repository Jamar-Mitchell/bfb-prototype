import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Compass,
  Handshake,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Plus,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'

import { businessPathPrefix, paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { EmailVerificationBanner } from '../../features/auth/EmailVerificationBanner'
import { LogoutButton } from '../../features/auth/LogoutButton'
import { BusinessSwitcher } from '../../features/businesses/BusinessSwitcher'
import { Logo } from '../ui/Logo'

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const go = useAppNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = [
    { id: paths.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    { id: paths.marketplace, label: 'Marketplace', icon: Compass },
    { id: paths.exchanges, label: 'Exchanges', icon: Handshake, count: '3' },
    { id: paths.messages, label: 'Messages', icon: MessageCircle, unread: true },
  ]
  const manageItems = [
    { id: paths.profile, label: 'Business profile', icon: Building2 },
    { id: paths.listings, label: 'Offers & needs', icon: BriefcaseBusiness },
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head"><Logo /><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
        <nav className="side-nav">
          <span className="side-label">Workspace</span>
          {navItems.map(({ id, label, icon: Icon, count, unread }) => (
            <button key={id} className={pathname === id || (id === paths.marketplace && pathname.startsWith(businessPathPrefix)) ? 'active' : ''} onClick={() => { go(id); setMobileOpen(false) }}>
              <Icon size={19} /> {label} {count && <span className="nav-count">{count}</span>} {unread && <span className="message-dot" />}
            </button>
          ))}
          <span className="side-label side-label-second">Manage</span>
          {manageItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={pathname === id ? 'active' : ''} onClick={() => { go(id); setMobileOpen(false) }}>
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-growth">
          <div className="growth-icon"><TrendingUp size={19} /></div>
          <strong>Complete your profile</strong>
          <span>Stand out to more potential partners.</span>
          <div className="progress"><span /></div>
          <small>75% complete</small>
        </div>
        <div className="account-row">
          <BusinessSwitcher onNavigate={() => setMobileOpen(false)} />
          <LogoutButton />
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="topbar-search"><Search size={18} /><input aria-label="Search BFB" placeholder="Search BFB..." /><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><button className="icon-button"><Bell size={19} /><span className="notification-dot" /></button><button className="button button-primary button-small" onClick={() => go(paths.listings)}><Plus size={16} /> New listing</button></div>
        </header>
        <main className="app-content"><EmailVerificationBanner />{children}</main>
      </div>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
    </div>
  )
}
