import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  /** `error` for a failed action that did not stop the page, such as a save that was undone. */
  tone?: 'success' | 'error'
}

interface ToastState {
  toasts: Toast[]
  showToast: (message: string, tone?: Toast['tone']) => number
  dismissToast: (id: number) => void
}

export const TOAST_DURATION_MS = 4000

let nextId = 1

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  showToast: (message, tone = 'success') => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, message, tone }] })
    setTimeout(() => get().dismissToast(id), TOAST_DURATION_MS)
    return id
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))

/** Show a short success message. Callable from anywhere, including outside React. */
export function showToast(message: string): number {
  return useToastStore.getState().showToast(message)
}

/** Show a short message about an action that failed and was undone. */
export function showErrorToast(message: string): number {
  return useToastStore.getState().showToast(message, 'error')
}
