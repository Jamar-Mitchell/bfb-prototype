import { LogOut } from 'lucide-react'

import { logout } from '../../lib/auth/session'
import './LogoutButton.css'

/** Icon button for the sidebar account row. The route guard then sends the user to login. */
export function LogoutButton() {
  return (
    <button type="button" className="account-logout" onClick={() => void logout()} aria-label="Log out" title="Log out">
      <LogOut size={16} aria-hidden="true" />
    </button>
  )
}
