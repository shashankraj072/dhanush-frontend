import { useState, useRef, useEffect } from 'react'
import './Coaches.css'

const COACHES = [
  { id: 'c1', name: 'Coach Sarah', specialty: 'Yoga & Flexibility', bio: 'Certified yoga instructor with 5 years experience.' },
  { id: 'c2', name: 'Coach Mike', specialty: 'Strength Training', bio: 'Specializes in hypertrophy and powerlifting.' },
  { id: 'c3', name: 'Coach David', specialty: 'Cardio & Endurance', bio: 'Marathon runner and endurance expert.' }
]

export default function Coaches() {
  const [activeCall, setActiveCall] = useState(null)
  const jitsiContainerRef = useRef(null)

  useEffect(() => {
    if (activeCall && jitsiContainerRef.current) {
      // Load Jitsi Meet External API script dynamically
      const script = document.createElement('script')
      script.src = "https://meet.jit.si/external_api.js"
      script.async = true
      script.onload = () => {
        const domain = "meet.jit.si"
        const options = {
          roomName: `AdaptFit-Consultation-${activeCall}-${Date.now()}`,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          configOverwrite: { 
            startWithAudioMuted: false, 
            startWithVideoMuted: false 
          }
        }
        const api = new window.JitsiMeetExternalAPI(domain, options)
        
        api.addEventListener('videoConferenceLeft', () => {
          setActiveCall(null)
        })
      }
      document.body.appendChild(script)

      return () => {
        jitsiContainerRef.current.innerHTML = ''
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [activeCall])

  if (activeCall) {
    const coach = COACHES.find(c => c.id === activeCall)
    return (
      <div className="coaches-page fade-in">
        <div className="coaches-header">
          <h2>Live Session with {coach.name}</h2>
          <button className="back-btn" onClick={() => setActiveCall(null)}>
            End Call & Go Back
          </button>
        </div>
        <div className="video-call-container glass" ref={jitsiContainerRef}>
          {/* Jitsi iframe will be injected here */}
        </div>
      </div>
    )
  }

  return (
    <div className="coaches-page fade-in">
      <div className="coaches-header">
        <h2>Human Coaches</h2>
        <p>Book a live 1-on-1 video consultation with our expert personal trainers.</p>
      </div>

      <div className="coaches-grid">
        {COACHES.map(coach => (
          <div key={coach.id} className="coach-card glass">
            <div className="coach-avatar">
              🧑‍🏫
            </div>
            <div className="coach-info">
              <h3>{coach.name}</h3>
              <span className="specialty">{coach.specialty}</span>
              <p>{coach.bio}</p>
            </div>
            <button 
              className="start-call-btn"
              onClick={() => setActiveCall(coach.id)}
            >
              Start Video Call
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
