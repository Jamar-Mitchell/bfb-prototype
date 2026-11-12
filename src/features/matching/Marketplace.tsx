import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, MapPin, Search, Sparkles } from 'lucide-react'

import { businesses } from '../../mocks/businesses'
import { BusinessCard } from './BusinessCard'

const categories = ['All', 'Marketing', 'Design', 'Photography', 'Business Services', 'Home Services']

export function Marketplace({ openBusiness }: { openBusiness: (id: number) => void }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [saved, setSaved] = useState<number[]>(() => JSON.parse(localStorage.getItem('bfb-saved') ?? '[]'))

  useEffect(() => localStorage.setItem('bfb-saved', JSON.stringify(saved)), [saved])

  const filtered = useMemo(() => businesses.filter((business) => {
    const matchesCategory = category === 'All' || business.category === category
    const haystack = [business.name, business.category, business.description, ...business.offers, ...business.needs].join(' ').toLowerCase()
    return matchesCategory && haystack.includes(search.toLowerCase())
  }), [category, search])

  return (
    <>
      <section className="marketplace-banner">
        <div><span>DISCOVER YOUR NETWORK</span><h1>Find your next growth partner.</h1><p>Explore businesses ready to exchange skills, services, and value.</p><div><Sparkles size={14} /> Personalized using your onboarding preferences</div></div>
        <div className="marketplace-banner-images">{businesses.slice(0, 3).map((business) => <img key={business.id} src={business.image} alt="" />)}</div>
      </section>
      <div className="market-search">
        <Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services, needs, or businesses..." aria-label="Search marketplace" />
        <button className="button button-primary">Search</button>
      </div>
      <div className="market-tools">
        <div className="category-chips">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <button className="filter-button"><MapPin size={16} /> Location <ChevronDown size={15} /></button>
      </div>
      <div className="results-heading"><p><strong>{filtered.length} businesses</strong> match your search</p><button>Best match <ChevronDown size={15} /></button></div>
      {filtered.length ? (
        <div className="business-grid">
          {filtered.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              saved={saved.includes(business.id)}
              onSave={() => setSaved((current) => current.includes(business.id) ? current.filter((id) => id !== business.id) : [...current, business.id])}
              onOpen={() => openBusiness(business.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state"><Search size={28} /><h2>No matches yet</h2><p>Try a different search or reset your category filter.</p><button className="button button-primary" onClick={() => { setSearch(''); setCategory('All') }}>Reset filters</button></div>
      )}
    </>
  )
}
