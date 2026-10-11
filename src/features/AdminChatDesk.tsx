import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, RefreshCw, Circle, CheckCheck } from 'lucide-react'
import { getSessionsForAdmin, sendAdminReply, type ChatSession } from './LiveChat'

type Props = {
  agentName: string
}

export default function AdminChatDesk({ agentName }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = () => setSessions(getSessionsForAdmin())

  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, 1500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active, sessions])

  const activeSession = sessions.find(s => s.id === active)
  const totalUnread = sessions.reduce((s, sess) => s + sess.unreadByAdmin, 0)

  const sendReply = () => {
    if (!reply.trim() || !active) return
    sendAdminReply(active, reply.trim(), agentName)
    setReply('')
    refresh()
  }

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="acd-shell">
      {/* Sidebar: session list */}
      <div className="acd-sidebar">
        <div className="acd-sidebar-head">
          <MessageSquare size={14} color="#00e5ff" />
          <strong>Live Chat Inbox</strong>
          {totalUnread > 0 && <span className="acd-unread-badge">{totalUnread}</span>}
          <button className="acd-refresh-btn" onClick={refresh} title="Refresh"><RefreshCw size={12} /></button>
        </div>

        {sessions.length === 0 && (
          <p className="acd-empty">No active chat sessions yet.</p>
        )}

        {sessions.map(sess => {
          const lastMsg = sess.messages[sess.messages.length - 1]
          return (
            <div
              key={sess.id}
              className={`acd-session-row ${active === sess.id ? 'acd-session-active' : ''}`}
              onClick={() => setActive(sess.id)}
            >
              <div className="acd-sess-avatar">{sess.userName.slice(0, 2).toUpperCase()}</div>
              <div className="acd-sess-info">
                <div className="acd-sess-name">
                  {sess.userName}
                  {sess.unreadByAdmin > 0 && <span className="acd-sess-unread">{sess.unreadByAdmin}</span>}
                </div>
                <div className="acd-sess-preview">
                  {lastMsg ? lastMsg.text.slice(0, 42) + (lastMsg.text.length > 42 ? '…' : '') : 'No messages yet'}
                </div>
                {lastMsg && <div className="acd-sess-time">{fmtTime(lastMsg.timestamp)}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main: active chat */}
      {activeSession ? (
        <div className="acd-main">
          {/* Chat top bar */}
          <div className="acd-chat-topbar">
            <div className="acd-chat-user">
              <div className="acd-chat-avatar">{activeSession.userName.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{activeSession.userName}</strong>
                <div className="acd-chat-email">{activeSession.userEmail}</div>
              </div>
            </div>
            <div className="acd-chat-status">
              <Circle size={7} fill="#00e676" color="#00e676" />
              <span>Connected · {fmtDate(activeSession.createdAt)}</span>
            </div>
          </div>

          <div className="acd-chat-body">
            {/* User context sidebar */}
            <div className="acd-context">
              <div className="acd-context-head">User Context</div>
              <div className="acd-context-row"><span>Balance</span><strong style={{ color: '#00e676' }}>${activeSession.userBalance.toLocaleString()}</strong></div>
              <div className="acd-context-row"><span>KYC</span><strong style={{
                color: activeSession.userKycStatus === 'verified' ? '#00e676'
                  : activeSession.userKycStatus === 'pending' ? '#f2b94b'
                  : '#f04452'
              }}>{activeSession.userKycStatus.toUpperCase()}</strong></div>
              <div className="acd-context-row"><span>Account</span><strong>{activeSession.userAccountType}</strong></div>
              <div className="acd-context-row"><span>Session</span><code style={{ fontSize: '10px', color: '#5aa7ff' }}>{activeSession.id.slice(0, 16)}…</code></div>
            </div>

            {/* Messages */}
            <div className="acd-messages">
              {activeSession.messages.length === 0 && (
                <p className="acd-no-msgs">No messages yet. Wait for the user to send a message.</p>
              )}
              {activeSession.messages.map(msg => (
                <div key={msg.id} className={`acd-bubble-wrap ${msg.sender === 'agent' ? 'acd-bubble-agent' : 'acd-bubble-user'}`}>
                  <div className="acd-bubble-name">{msg.senderName}</div>
                  <div className="acd-bubble">{msg.text}</div>
                  <div className="acd-bubble-time">
                    {fmtTime(msg.timestamp)}
                    {msg.sender === 'agent' && <CheckCheck size={11} color="#00e5ff" style={{ marginLeft: 4 }} />}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Reply input */}
          <div className="acd-reply-bar">
            <input
              className="acd-reply-input"
              placeholder={`Reply as ${agentName}…`}
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
            />
            <button className="acd-send-btn" onClick={sendReply} disabled={!reply.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="acd-placeholder">
          <MessageSquare size={36} color="#1a2538" />
          <p>Select a conversation to respond</p>
        </div>
      )}
    </div>
  )
}
