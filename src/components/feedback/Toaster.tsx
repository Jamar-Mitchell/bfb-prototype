import { CircleCheck, X } from 'lucide-react'

import { useToastStore } from './toastStore'
import './feedback.css'

/** Renders success toasts. Mount once near the app root; the live region stays mounted so messages are announced. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <CircleCheck className="toast-icon" size={18} aria-hidden="true" />
          <span>{toast.message}</span>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
