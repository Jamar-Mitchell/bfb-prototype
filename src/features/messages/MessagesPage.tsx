import { useState } from 'react'
import { Paperclip, Search, Send } from 'lucide-react'

import { Avatar } from '../../components/ui/Avatar'
import { demoConversations } from '../../mocks/conversations'
import './MessagesPage.css'

export function MessagesPage() {
  const [selected, setSelected] = useState(0)
  const [draft, setDraft] = useState('')
  const [sentMessages, setSentMessages] = useState<string[]>([])
  const conversations = demoConversations
  const active = conversations[selected]
  const sendMessage = () => {
    if (!draft.trim()) return
    setSentMessages((current) => [...current, draft.trim()])
    setDraft('')
  }

  return (
    <>
      <div className="page-heading messages-heading">
        <div><span>MESSAGES</span><h1>Business conversations.</h1><p>Keep proposal details and exchange communication in one place.</p></div>
      </div>
      <div className="messages-layout">
        <aside className="conversation-list">
          <div className="conversation-search"><Search size={16} /><input placeholder="Search conversations..." aria-label="Search conversations" /></div>
          {conversations.map((conversation, index) => (
            <button key={conversation.business.id} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}>
              <Avatar business={conversation.business} />
              <span><strong>{conversation.business.name}</strong><small>{conversation.preview}</small></span>
              <em>{conversation.time}</em>
              {conversation.unread > 0 && <b>{conversation.unread}</b>}
            </button>
          ))}
        </aside>
        <section className="message-panel">
          <header className="message-panel-head">
            <Avatar business={active.business} />
            <div><strong>{active.business.name}</strong><span>Usually replies within a day</span></div>
            <button className="button button-secondary button-small">View exchange</button>
          </header>
          <div className="message-thread">
            <div className="thread-date">TODAY</div>
            <div className="message incoming"><p>Hi Alex! We reviewed the latest website direction and the overall structure looks great.</p><span>10:14 AM</span></div>
            <div className="message outgoing"><p>Great to hear. I’ve also added the updated services section and mobile navigation.</p><span>10:28 AM</span></div>
            <div className="message incoming"><p>{active.preview} Can we confirm the remaining deliverables before Friday?</p><span>11:02 AM</span></div>
            {sentMessages.map((message, index) => <div className="message outgoing" key={`${message}-${index}`}><p>{message}</p><span>Now</span></div>)}
          </div>
          <div className="message-composer">
            <button className="icon-button"><Paperclip size={18} /></button>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} placeholder="Write a message..." aria-label="Write a message" />
            <button className="button button-primary" onClick={sendMessage}><Send size={16} /> Send</button>
          </div>
        </section>
      </div>
    </>
  )
}
