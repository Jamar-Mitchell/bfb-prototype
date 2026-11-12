import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
}

interface ToastState {
  toasts: Toast[]
  showToast: (message: string) => number
  dismissToast: (id: number) => void
}

export const TOAST_DURATION_MS = 4000

let nextId = 1

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  showToast: (message) => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, message }] })
    setTimeout(() => get().dismissToast(id), TOAST_DURATION_MS)
    return id
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))

/** Show a short success message. Callable from anywhere, including outside React. */
export function showToast(message: string): number {
  return useToastStore.getState().showToast(message)
}
