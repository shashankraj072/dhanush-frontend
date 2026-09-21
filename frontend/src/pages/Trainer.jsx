import { useState, useRef, useEffect } from 'react'
import { loadUser } from '../state'
import './Trainer.css'

export default function Trainer() {
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
  }, [messages])

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
      setMessages(prev => [...prev, { role: 'model', content: `Failed to connect: ${error.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="trainer-page fade-in">
      <div className="trainer-header">
        <h2>AI Chat</h2>
        <p>Ask anything about your fitness journey, diet, or workouts.</p>
      </div>
      
      <div className="trainer-chat glass">
        <div className="trainer-messages">
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
        
        <form className="trainer-input" onSubmit={handleSend}>
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
    </div>
  )
}
