import { useState } from 'react'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import { demoExchanges, demoExchangeStatuses, type ExchangeStatus } from '../../mocks/exchanges'
import './ExchangesPage.css'

export function ExchangesPage() {
  const [tab, setTab] = useState('Active')
  const [statuses, setStatuses] = useState<Record<number, ExchangeStatus>>(demoExchangeStatuses)

  const exchanges = demoExchanges
  const visible = exchanges.filter((exchange) => exchange.type === tab)

  return (
    <>
      <div className="page-heading">
        <div><span>EXCHANGES</span><h1>Keep every trade moving.</h1><p>Review proposals, track deliverables, and complete active exchanges.</p></div>
        <button className="button button-primary"><Plus size={16} /> New proposal</button>
      </div>
      <div className="exchange-tabs">
        {['Incoming', 'Sent', 'Active', 'Completed'].map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item} <span>{exchanges.filter((exchange) => exchange.type === item).length}</span>
          </button>
        ))}
      </div>
      <div className="exchange-page-list">
        {visible.map((exchange) => (
          <article className="exchange-page-card" key={exchange.id}>
            <div className="exchange-card-business">
              <img src={exchange.business.image} alt="" />
              <Avatar business={exchange.business} />
              <div><span>{exchange.business.name}</span><strong>{exchange.title}</strong><small>Last updated 2 hours ago</small></div>
              <span className={`status ${statuses[exchange.id] === 'Completed' ? 'status-complete' : statuses[exchange.id] === 'Awaiting confirmation' ? 'status-awaiting' : 'status-progress'}`}>{statuses[exchange.id]}</span>
            </div>
            <div className="exchange-trade-summary">
              <div><small>NORTHSTAR PROVIDES</small><strong>{exchange.give}</strong></div>
              <div className="mini-swap"><ArrowRight size={14} /><ArrowLeft size={14} /></div>
              <div><small>YOU RECEIVE</small><strong>{exchange.receive}</strong></div>
              <div><small>AGREED VALUE</small><strong>{exchange.value}</strong></div>
              <div><small>TARGET</small><strong>{exchange.due}</strong></div>
            </div>
            <div className="exchange-card-actions">
              <button className="button button-secondary">View details</button>
              {tab === 'Incoming' && <><button className="button button-secondary" onClick={() => setStatuses({ ...statuses, [exchange.id]: 'Changes requested' })}>Request changes</button><button className="button button-primary" onClick={() => setStatuses({ ...statuses, [exchange.id]: 'In progress' })}>Accept proposal</button></>}
              {tab === 'Active' && <button className="button button-primary" onClick={() => setStatuses({ ...statuses, [exchange.id]: 'Awaiting confirmation' })}>Mark delivered</button>}
              {tab === 'Sent' && <button className="button button-primary">Send message</button>}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
