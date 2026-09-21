import { useState, useRef, useEffect } from 'react'
import { loadUser } from '../state'
import './AIChatbot.css'

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', content: 'Hi! I am your AdaptFit Personal Trainer. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const user = loadUser()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isOpen])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userId: user?.userId
        })
      })
      
      const data = await response.json()
      
      if (data.ok) {
        setMessages(prev => [...prev, { role: 'model', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'model', content: data.error || 'Something went wrong.' }])
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'model', content: 'Failed to connect to the trainer.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : 'closed'}`}>
      {!isOpen && (
        <button className="chatbot-toggle" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}
      
      {isOpen && (
        <div className="chatbot-window glass">
          <div className="chatbot-header">
            <h3>AI Personal Trainer</h3>
            <button className="chatbot-close ghostBtn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-bubble model loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chatbot-input" onSubmit={handleSend}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for advice..."
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
