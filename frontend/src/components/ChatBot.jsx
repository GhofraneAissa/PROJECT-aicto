import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaRobot, FaTimes, FaPaperPlane, FaSpinner, FaProjectDiagram, FaBuilding, FaBook } from 'react-icons/fa'

const API = 'http://localhost:8000'

const entityIcon = { project: <FaProjectDiagram />, stakeholder: <FaBuilding />, resource: <FaBook /> }
const entityColor = { project: '#059669', stakeholder: '#2563eb', resource: '#f59e0b' }

function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am SARAI Assistant. Ask me about AI projects, stakeholders, and resources in the Arab region.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const resultsRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-10) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, results: data.results || [] }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process your request. Please try again.' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(!open)} aria-label="Chat">
        {open ? <FaTimes /> : <FaRobot />}
      </button>

      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <FaRobot size={20} />
            <span>SARAI Assistant</span>
          </div>

          <div className="chat-body" ref={resultsRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-bubble">{msg.content}</div>
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
                <div className="chat-bubble loading"><FaSpinner className="spin" /> Thinking...</div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chat-footer">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask about projects, stakeholders..."
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
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          border: none;
          font-size: 1.4rem;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .chat-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(37, 99, 235, 0.5);
        }
        .chat-window {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: 380px;
          height: 560px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: chatSlideUp 0.25s ease;
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 20px;
          background: #2563eb;
          color: white;
          font-weight: 700;
          font-size: 1rem;
        }
        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f8fafc;
        }
        .chat-msg { display: flex; flex-direction: column; max-width: 90%; }
        .chat-msg.user { align-self: flex-end; }
        .chat-msg.assistant { align-self: flex-start; }
        .chat-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 0.9rem;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .chat-msg.user .chat-bubble {
          background: #2563eb;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .chat-msg.assistant .chat-bubble {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
        }
        .chat-bubble.loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
        }
        .chat-bubble .spin { animation: chatSpin 0.6s linear infinite; }
        @keyframes chatSpin { to { transform: rotate(360deg); } }
        .chat-results {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .chat-result-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1.5px solid;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          color: #374151;
          background: white;
          transition: 0.2s;
        }
        .chat-result-chip:hover {
          background: #f1f5f9;
        }
        .chip-title {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chat-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #e2e8f0;
          background: white;
        }
        .chat-input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .chat-input:focus { border-color: #2563eb; }
        .chat-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: #2563eb;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
          flex-shrink: 0;
        }
        .chat-send:disabled { background: #cbd5e1; cursor: not-allowed; }
        .chat-send:hover:not(:disabled) { background: #1d4ed8; }

        @media (max-width: 480px) {
          .chat-window { width: calc(100vw - 32px); height: 60vh; bottom: 84px; right: 16px; }
        }
      `}</style>
    </>
  )
}

export default ChatBot