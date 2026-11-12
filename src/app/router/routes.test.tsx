import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const cases: Array<{ path: string; heading: RegExp; shell: boolean }> = [
  { path: '/', heading: /Exchange what your business does best/, shell: false },
  { path: '/onboarding', heading: /Turn what your business does best into what it needs next/, shell: false },
  { path: '/dashboard', heading: /Good evening, Alex/, shell: true },
  { path: '/marketplace', heading: /Find your next growth partner/, shell: true },
  { path: '/business/3', heading: /^Good Ground Creative$/, shell: true },
  { path: '/business/99', heading: /^Peachtree Growth Co\.$/, shell: true },
  { path: '/exchanges', heading: /Keep every trade moving/, shell: true },
  { path: '/messages', heading: /Business conversations/, shell: true },
  { path: '/profile', heading: /Show partners what makes you valuable/, shell: true },
  { path: '/listings', heading: /Manage what you trade/, shell: true },
  { path: '/not-a-page', heading: /Exchange what your business does best/, shell: false },
]

describe('route table', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it.each(cases)('renders $path', ({ path, heading, shell }) => {
    const { container } = renderAt(path)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(container.querySelector('.app-shell') !== null).toBe(shell)
  })

  it('highlights Marketplace in the sidebar on a business profile', () => {
    renderAt('/business/2')

    expect(screen.getByRole('button', { name: 'Marketplace' })).toHaveClass('active')
  })

  it('navigates between app screens from the sidebar', () => {
    renderAt('/dashboard')

    fireEvent.click(screen.getByRole('button', { name: /Exchanges/ }))

    expect(screen.getByRole('heading', { level: 1, name: /Keep every trade moving/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exchanges/ })).toHaveClass('active')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('opens a business profile from the marketplace', () => {
    renderAt('/marketplace')

    fireEvent.click(screen.getAllByRole('button', { name: 'View business' })[1])

    expect(screen.getByRole('heading', { level: 1, name: /^Frame & Field Studio$/ })).toBeInTheDocument()
  })
})
