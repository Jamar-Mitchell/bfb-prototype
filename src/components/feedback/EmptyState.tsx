import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import './feedback.css'

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  /** Usually a button or link that helps the user fill the empty space. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={['feedback-state', 'feedback-empty', className].filter(Boolean).join(' ')}>
      <div className="feedback-icon"><Icon size={22} aria-hidden="true" /></div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="feedback-action">{action}</div> : null}
    </div>
  )
}
