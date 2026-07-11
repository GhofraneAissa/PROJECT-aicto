import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  FaRobot, FaTimes, FaPaperPlane, FaSpinner, FaProjectDiagram,
  FaBuilding, FaBook, FaPlus, FaTrash, FaChevronDown, FaChevronUp,
  FaFile, FaImage, FaPaperclip, FaExclamationTriangle,
} from 'react-icons/fa'
import { API_BASE } from '../config'
const API = API_BASE
const entityIcon = { project: <FaProjectDiagram />, stakeholder: <FaBuilding />, resource: <FaBook /> }
const entityColor = { project: '#059669', stakeholder: '#2563eb', resource: '#f59e0b' }
const LS_KEY = 'sarai_active_session'

function getToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
}

function authHeaders() {
  const t = getToken()
  return t ? { 'Authorization': `Bearer ${t}` } : {}
}

let sessionsCache = []

function ChatBot() {
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const [activeSid, setActiveSid] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [attachPreview, setAttachPreview] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const endRef = useRef(null)
  const msgCache = useRef({})

  const { t } = useTranslation()

  const scrollDown = () => endRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollDown() }, [messages])

  const loadSessions = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/chat/sessions`, { headers: { ...authHeaders() } })
      const data = await r.json()
      sessionsCache = data
      setSessions(data)
    } catch { /* ignore */ }
  }, [])

  const switchSession = useCallback(async (sid) => {
    setActiveSid(sid)
    localStorage.setItem(LS_KEY, sid)

    if (msgCache.current[sid]) {
      setMessages(msgCache.current[sid])
      return
    }

    try {
      const r = await fetch(`${API}/api/chat/sessions/${sid}`, { headers: { ...authHeaders() } })
      const data = await r.json()
      const msgs = (data.messages || []).map(m => {
        let parsedAttachments = null
        if (m.attachments) {
          try { parsedAttachments = JSON.parse(m.attachments) } catch { parsedAttachments = null }
        }
        return {
          role: m.role,
          content: m.content,
          attachments: parsedAttachments,
          timeMs: null,
          provider: null,
        }
      })
      msgCache.current[sid] = msgs
      setMessages(msgs)
    } catch {
      setMessages([])
    }
  }, [])

  const createSession = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({}),
      })
      const data = await r.json()
      sessionsCache.unshift(data)
      setSessions([...sessionsCache])
      await switchSession(data.session_id)
      setShowSessions(false)
    } catch { /* ignore */ }
  }, [switchSession])

  const deleteSession = useCallback(async (sid, e) => {
    e.stopPropagation()
    try {
      await fetch(`${API}/api/chat/sessions/${sid}`, { method: 'DELETE', headers: { ...authHeaders() } })
      sessionsCache = sessionsCache.filter(s => s.session_id !== sid)
      setSessions([...sessionsCache])
      delete msgCache.current[sid]
      if (activeSid === sid) {
        const next = sessionsCache[0]
        if (next) await switchSession(next.session_id)
        else await createSession()
      }
    } catch { /* ignore */ }
  }, [activeSid, switchSession, createSession])

  const loadChat = useCallback(async () => {
    await loadSessions()
    const saved = localStorage.getItem(LS_KEY)
    const exists = sessionsCache.find(s => s.session_id === saved)
    if (exists) {
      await switchSession(saved)
    } else if (sessionsCache.length > 0) {
      await switchSession(sessionsCache[0].session_id)
    } else {
      await createSession()
    }
  }, [loadSessions, switchSession, createSession])

  useEffect(() => {
    if (!open) return
    const init = async () => {
      try { await loadChat() } catch (e) { console.error(e) }
    }
    init()
  }, [open])

  const sendMessage = async () => {
    if (!input.trim() || loading || !activeSid) return
    const userMsg = input.trim()
    const attachments = attachPreview.length > 0 ? [...attachPreview] : null
    setInput('')
    setAttachPreview([])
    setMessages(prev => [...prev, { role: 'user', content: userMsg, attachments }])
    setLoading(true)

    const isGreeting = /^(hi|hello|hey|salut|bonjour|hiii|helloo|salam)$/i.test(userMsg.trim())
    if (isGreeting) {
      const newMsg = { role: 'assistant', content: t('chatbot.greeting'), provider: 'local', timeMs: 0, results: [] }
      setMessages(prev => [...prev, newMsg])
      msgCache.current[activeSid] = [...(msgCache.current[activeSid] || []), { role: 'user', content: userMsg, attachments }, newMsg]
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API}/api/chat/sessions/${activeSid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message: userMsg,
          session_id: activeSid,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          attachments,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Error ${res.status}`)
      }
      const data = await res.json()
      const newMsg = { role: 'assistant', content: data.reply, provider: data.provider, timeMs: data.time_ms, results: data.results || [] }
      setMessages(prev => [...prev, newMsg])
      msgCache.current[activeSid] = [...(msgCache.current[activeSid] || []), { role: 'user', content: userMsg, attachments }, newMsg]
      await loadSessions()
    } catch (err) {
      const errorMsg = err.message?.includes('401')
        ? t('chatbot.loginRequired')
        : t('chatbot.genericError')
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, provider: 'error', timeMs: 0, results: [] }])
    }
    setLoading(false)
  }

  const handleFilePick = async (e) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const uploaded = []
    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f)
      try {
        const r = await fetch(`${API}/api/chat/upload`, { method: 'POST', headers: { ...authHeaders() }, body: fd })
        const data = await r.json()
        uploaded.push(data)
      } catch { /* ignore */ }
    }
    setAttachPreview(prev => [...prev, ...uploaded])
    setUploading(false)
    e.target.value = ''
  }

  const removeAttach = (idx) => setAttachPreview(prev => prev.filter((_, i) => i !== idx))

  const attachLabel = (a) => {
    if (a.is_image) return <><FaImage /> {a.original_name}</>
    if (a.has_text) return <><FaFile style={{color:'#059669'}} /> {a.original_name} <span className="chat-doc-read">{t('chat.readLabel')}</span></>
    return <><FaFile /> {a.original_name}</>
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const activeSession = sessions.find(s => s.session_id === activeSid)

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(!open)} aria-label={t('chat.chatLabel')}>
        {open ? <FaTimes /> : <FaRobot />}
      </button>

      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <FaRobot size={20} />
            <span className="chat-header-title">{activeSession?.title || t('chat.assistantTitle')}</span>
            <div className="chat-header-actions">
              <button className="chat-hdr-btn" onClick={() => setShowSessions(!showSessions)} title={t('chat.sessions')}>
                {showSessions ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              <button className="chat-hdr-btn" onClick={createSession} title={t('chat.newChat')}><FaPlus /></button>
            </div>
          </div>

          {showSessions && (
            <div className="chat-sessions">
              {sessions.slice(0, 20).map(s => (
                <div
                  key={s.session_id}
                  className={`chat-session-item ${s.session_id === activeSid ? 'active' : ''}`}
                  onClick={() => { switchSession(s.session_id); setShowSessions(false) }}
                >
                  <span className="chat-session-title">{s.title}</span>
                  <span className="chat-session-meta">{t('chat.messageCount', { count: s.message_count })}</span>
                  <button className="chat-session-del" onClick={(e) => deleteSession(s.session_id, e)}><FaTrash size={10} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="chat-body">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-bubble">
                  {msg.attachments?.length > 0 && (
                    <div className="chat-attach-previews">
                      {msg.attachments.map((a, j) => (
                        a.is_image
                          ? <img key={j} src={`${API}${a.url}`} alt="" className="chat-attach-img" />
                          : <div key={j} className="chat-attach-file"><FaFile /> {a.original_name}</div>
                      ))}
                    </div>
                  )}
                  <div>{msg.content}</div>
                  {msg.provider && msg.provider !== 'template' && (
                    <div className="chat-badge">{msg.provider === 'groq' ? t('chat.providerAi') : t('chat.providerOllama')} · {msg.timeMs}{t('chat.milliseconds')}</div>
                  )}
                </div>
                {msg.results?.length > 0 && (
                  <div className="chat-results">
                    {msg.results.slice(0, 4).map((r, j) => (
                      <Link key={j} to={r.url} className="chat-result-chip" style={{ borderColor: entityColor[r.type] || '#6b7280' }}>
                        <span style={{ color: entityColor[r.type] || '#6b7280' }}>{entityIcon[r.type] || null}</span>
                        <span className="chip-title">{r.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-bubble loading"><FaSpinner className="spin" /> {t('chat.thinking')}</div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {attachPreview.length > 0 && (
            <div className="chat-attach-bar">
              {attachPreview.map((a, i) => (
                <span key={i} className="chat-attach-chip">
                  {attachLabel(a)}
                  <button onClick={() => removeAttach(i)}><FaTimes size={10} /></button>
                </span>
              ))}
            </div>
          )}

          <div className="chat-footer">
            <button className="chat-attach-btn" onClick={() => fileRef.current?.click()} disabled={loading || uploading}>
              {uploading ? <FaSpinner className="spin" /> : <FaPaperclip />}
            </button>
            <input ref={fileRef} type="file" hidden multiple onChange={handleFilePick} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.csv,.ppt,.pptx,.zip" />
            <input
              type="text"
              className="chat-input"
              placeholder={t('chat.inputPlaceholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .chat-fab {
          position: fixed; bottom: 24px; right: 24px;
          width: 56px; height: 56px; border-radius: 50%;
          background: #2563eb; color: white; border: none;
          font-size: 1.4rem; cursor: pointer;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
          transition: all 0.3s;
        }
        .chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(37,99,235,0.5); }
        .chat-window {
          position: fixed; bottom: 92px; right: 24px;
          width: 400px; height: 580px;
          background: white; border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          z-index: 9998; display: flex; flex-direction: column; overflow: hidden;
          animation: chatSlideUp 0.25s ease;
        }
        @keyframes chatSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .chat-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; background: #2563eb; color: white; font-weight: 700;
          flex-shrink: 0;
        }
        .chat-header-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.95rem; }
        .chat-header-actions { display: flex; gap: 4px; }
        .chat-hdr-btn {
          background: rgba(255,255,255,0.15); border: none; color: white;
          width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; transition: 0.2s;
        }
        .chat-hdr-btn:hover { background: rgba(255,255,255,0.3); }
        .chat-sessions {
          max-height: 180px; overflow-y: auto; border-bottom: 1px solid #e2e8f0;
          background: #f8fafc; flex-shrink: 0;
        }
        .chat-session-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; cursor: pointer; font-size: 0.8rem;
          border-left: 3px solid transparent; transition: 0.15s;
        }
        .chat-session-item:hover { background: #e2e8f0; }
        .chat-session-item.active { border-left-color: #2563eb; background: #dbeafe; font-weight: 600; }
        .chat-session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chat-session-meta { color: #94a3b8; font-size: 0.7rem; flex-shrink: 0; }
        .chat-session-del {
          background: none; border: none; color: #94a3b8; cursor: pointer;
          padding: 2px; flex-shrink: 0; opacity: 0; transition: 0.15s;
        }
        .chat-session-item:hover .chat-session-del { opacity: 1; }
        .chat-session-del:hover { color: #ef4444; }
        .chat-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#f8fafc; }
        .chat-msg { display:flex; flex-direction:column; max-width:92%; }
        .chat-msg.user { align-self:flex-end; }
        .chat-msg.assistant { align-self:flex-start; }
        .chat-bubble {
          padding:10px 14px; border-radius:14px; font-size:0.88rem; line-height:1.5; white-space:pre-wrap;
        }
        .chat-msg.user .chat-bubble { background:#2563eb; color:white; border-bottom-right-radius:4px; }
        .chat-msg.assistant .chat-bubble { background:white; color:#1e293b; border:1px solid #e2e8f0; border-bottom-left-radius:4px; }
        .chat-bubble.loading { display:flex; align-items:center; gap:8px; color:#94a3b8; }
        .chat-badge { margin-top:4px; font-size:0.62rem; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:3px; }
        .chat-attach-previews { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
        .chat-attach-img { width:100%; max-height:180px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0; }
        .chat-attach-file { display:flex; align-items:center; gap:4px; font-size:0.75rem; padding:4px 8px; background:#f1f5f9; border-radius:6px; }
        .chat-results { display:flex; flex-wrap:wrap; gap:5px; margin-top:4px; }
        .chat-result-chip {
          display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px;
          border:1.5px solid; font-size:0.72rem; font-weight:600; text-decoration:none;
          color:#374151; background:white; transition:0.2s;
        }
        .chat-result-chip:hover { background:#f1f5f9; }
        .chip-title { max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .chat-attach-bar {
          display:flex; gap:4px; padding:6px 14px; background:#f8fafc;
          border-top:1px solid #e2e8f0; flex-wrap:wrap; flex-shrink:0;
        }
        .chat-attach-chip {
          display:flex; align-items:center; gap:4px; font-size:0.72rem;
          background:#dbeafe; color:#1e40af; padding:3px 8px; border-radius:6px;
        }
        .chat-doc-read { font-size:0.65rem; color:#059669; font-weight:600; margin-left:2px; }
        .chat-attach-chip button {
          background:none; border:none; cursor:pointer; color:#1e40af; padding:0; margin-left:2px;
        }
        .chat-footer { display:flex; align-items:center; gap:6px; padding:10px 14px; border-top:1px solid #e2e8f0; background:white; flex-shrink:0; }
        .chat-attach-btn {
          width:34px; height:34px; border-radius:50%; border:1px solid #e2e8f0;
          background:white; color:#64748b; cursor:pointer; display:flex;
          align-items:center; justify-content:center; flex-shrink:0; transition:0.15s;
        }
        .chat-attach-btn:hover { background:#f1f5f9; color:#2563eb; }
        .chat-input { flex:1; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; font-size:0.88rem; outline:none; }
        .chat-input:focus { border-color:#2563eb; }
        .chat-send {
          width:36px; height:36px; border-radius:50%; border:none;
          background:#2563eb; color:white; cursor:pointer; display:flex;
          align-items:center; justify-content:center; flex-shrink:0; transition:0.2s;
        }
        .chat-send:disabled { background:#cbd5e1; cursor:not-allowed; }
        .chat-send:hover:not(:disabled) { background:#1d4ed8; }
        .spin { animation:chatSpin 0.6s linear infinite; }
        @keyframes chatSpin { to { transform:rotate(360deg); } }
        @media(max-width:480px) {
          .chat-window { width:calc(100vw - 32px); height:65vh; bottom:84px; right:16px; }
        }
      `}</style>
    </>
  )
}

export default ChatBot