import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../lib/api/errors'
import { EmptyState, ErrorState, LoadingState, showToast, Toaster, useToastStore } from '.'

describe('feedback components', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    useToastStore.setState({ toasts: [] })
  })

  it('announces loading', () => {
    render(<LoadingState label="Loading matches…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading matches…')
  })

  it('renders an empty state with an action', () => {
    render(<EmptyState title="No offers yet" description="Add what your business can provide." action={<button type="button">Add offer</button>} />)
    expect(screen.getByRole('heading', { name: 'No offers yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add offer' })).toBeInTheDocument()
  })

  it('shows the user message and request ID for an API error and retries', () => {
    const onRetry = vi.fn()
    render(<ErrorState error={new ApiError({ code: 'forbidden', message: 'x', requestId: 'req-9' })} onRetry={onRetry} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('You do not have permission to do that.')
    expect(alert).toHaveTextContent('Reference: req-9')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows a success toast in a status region and dismisses it after a while', () => {
    vi.useFakeTimers()
    render(<Toaster />)

    act(() => {
      showToast('Profile saved')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Profile saved')

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByRole('status')).not.toHaveTextContent('Profile saved')
  })

  it('dismisses a toast on request', () => {
    render(<Toaster />)
    act(() => {
      showToast('Offer published')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Offer published')).not.toBeInTheDocument()
  })
})
