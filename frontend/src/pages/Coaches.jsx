import { useState, useRef, useEffect } from 'react'
import './Coaches.css'

const COACHES = [
  { id: 'c1', name: 'Coach Dhanush', specialty: 'Yoga & Flexibility', bio: 'Certified yoga instructor with 5 years experience.', phone: '918147007570' },
  { id: 'c2', name: 'Coach Dhanush', specialty: 'Strength Training', bio: 'Specializes in hypertrophy and powerlifting.', phone: '918147007570' },
  { id: 'c3', name: 'Coach Dhanush', specialty: 'Cardio & Endurance', bio: 'Marathon runner and endurance expert.', phone: '918147007570' }
]

export default function Coaches() {
  const [activeCall, setActiveCall] = useState(null)
  const jitsiContainerRef = useRef(null)

  useEffect(() => {
    if (activeCall?.roomName && jitsiContainerRef.current) {
      // Load Jitsi Meet External API script dynamically
      const script = document.createElement('script')
      script.src = "https://meet.jit.si/external_api.js"
      script.async = true
      script.onload = () => {
        const domain = "meet.jit.si"
        const options = {
          roomName: activeCall.roomName,
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

  if (activeCall?.id) {
    const coach = COACHES.find(c => c.id === activeCall.id)
    const waText = encodeURIComponent(`Hi Coach! I'm ready for my consultation. Please join my video room here: https://meet.jit.si/${activeCall.roomName}`)
    return (
      <div className="coaches-page fade-in">
        <div className="coaches-header">
          <h2>Live Session with {coach.name}</h2>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button className="back-btn" style={{ margin: 0 }} onClick={() => setActiveCall(null)}>
              End Call & Go Back
            </button>
            <a 
              className="start-call-btn" 
              style={{ margin: 0, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', width: 'auto' }}
              href={`https://wa.me/${coach.phone}?text=${waText}`}
              target="_blank"
              rel="noreferrer"
            >
              📱 Message Coach Link
            </a>
          </div>
        </div>
        <div className="video-call-container glass" ref={jitsiContainerRef} style={{ marginTop: '16px' }}>
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
              onClick={() => {
                const roomName = `AdaptFit-Consultation-${coach.id}-${Date.now()}`
                setActiveCall({ id: coach.id, roomName })
              }}
            >
              Start Video Call
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
