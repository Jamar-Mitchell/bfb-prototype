import type { ReactNode } from 'react'

import { paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { Logo } from '../../components/ui/Logo'
import './auth.css'

interface AuthLayoutProps {
  kicker: string
  title: string
  intro: ReactNode
  children: ReactNode
}

/** Shared frame for the login and registration pages, matching the onboarding screens. */
export function AuthLayout({ kicker, title, intro, children }: AuthLayoutProps) {
  const go = useAppNavigate()

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Logo />
        <button type="button" className="text-button" onClick={() => go(paths.landing)}>Back to home</button>
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <span className="auth-kicker">{kicker}</span>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </section>
      </main>
    </div>
  )
}

export function AuthMessage({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <p className={`auth-message auth-message-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
