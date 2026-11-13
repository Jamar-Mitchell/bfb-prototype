import { ArrowRight, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { describePartyDetailsMissing } from '../businesses/partyDetails'
import './ProposalReview.css'

/**
 * Why sending or accepting was refused with `party_details_missing`, and where to fix it: the
 * profile's "Legal details for agreements" section.
 */
export function PartyDetailsPrompt({ action, missing }: { action: 'send' | 'accept'; missing: readonly string[] }) {
  return (
    <div className="proposal-party-prompt" role="alert">
      <Scale size={17} aria-hidden="true" />
      <div>
        <strong>Add your legal details first</strong>
        <p>
          Your agreement names your business by its legal details, and {action === 'send' ? 'sending a proposal counts as accepting it' : 'accepting is the step before the agreement'}.
          Still needed: {describePartyDetailsMissing(missing)}. {action === 'send' ? 'Your draft is saved and nothing was sent.' : 'Nothing was accepted yet.'}
        </p>
        <Link className="proposal-party-link" to={paths.profileLegalDetails}>
          Add legal details <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
