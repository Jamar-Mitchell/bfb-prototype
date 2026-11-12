import { useState } from 'react'
import { Check, CircleCheck, Pencil, Plus } from 'lucide-react'

import { useActiveBusinessId } from '../../lib/businesses/useActiveBusiness'
import { demoBusinessProfile } from '../../mocks/businessProfile'
import { PublicProfileLink } from './PublicProfileLink'
import './ProfileManagementPage.css'

export function ProfileManagementPage() {
  const businessId = useActiveBusinessId()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState(demoBusinessProfile)
  const update = (key: keyof typeof profile, value: string) => setProfile((current) => ({ ...current, [key]: value }))

  return (
    <>
      <div className="page-heading">
        <div><span>BUSINESS PROFILE</span><h1>Show partners what makes you valuable.</h1><p>A complete profile helps the right businesses find and trust you.</p></div>
        <div className="manage-profile-actions">
          <PublicProfileLink businessId={businessId} />
          <button className="button button-primary" onClick={() => { if (editing) setSaved(true); setEditing(!editing) }}>{editing ? <><Check size={16} /> Save changes</> : <><Pencil size={16} /> Edit profile</>}</button>
        </div>
      </div>
      {saved && <div className="inline-success"><CircleCheck size={17} /> Your business profile has been updated.</div>}
      <div className="manage-profile-layout">
        <section className="manage-profile-card">
          <div className="manage-cover">
            <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85" alt="Northstar Digital Studio office" />
            {editing && <button><Pencil size={15} /> Change cover</button>}
          </div>
          <div className="manage-profile-content">
            <div className="northstar-large">ND</div>
            <div className="form-grid">
              <label>Business name<input disabled={!editing} value={profile.name} onChange={(event) => update('name', event.target.value)} /></label>
              <label>Category<input disabled={!editing} value={profile.category} onChange={(event) => update('category', event.target.value)} /></label>
              <label>Location & availability<input disabled={!editing} value={profile.location} onChange={(event) => update('location', event.target.value)} /></label>
              <label>Website<input disabled={!editing} value={profile.website} onChange={(event) => update('website', event.target.value)} /></label>
              <label className="form-full">Business description<textarea disabled={!editing} value={profile.description} onChange={(event) => update('description', event.target.value)} /></label>
            </div>
          </div>
        </section>
        <aside className="profile-completion">
          <h2>Profile strength</h2>
          <div className="completion-score"><strong>75%</strong><span>Good foundation</span></div>
          <div className="completion-bar"><span /></div>
          <p>Complete these details to appear in more relevant searches.</p>
          <div className="completion-item done"><Check size={14} /> Business basics</div>
          <div className="completion-item done"><Check size={14} /> Services offered</div>
          <div className="completion-item"><Plus size={14} /> Add portfolio images</div>
          <div className="completion-item"><Plus size={14} /> Add another business need</div>
        </aside>
      </div>
    </>
  )
}
