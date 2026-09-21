import { useState } from 'react'
import './Coaches.css'

const COACHES = [
  { id: 'c1', name: 'Coach Dhanush', specialty: 'Yoga & Flexibility', bio: 'Certified yoga instructor with 5 years experience.', phone: '918147007570' },
  { id: 'c2', name: 'Coach Dhanush', specialty: 'Strength Training', bio: 'Specializes in hypertrophy and powerlifting.', phone: '918147007570' },
  { id: 'c3', name: 'Coach Dhanush', specialty: 'Cardio & Endurance', bio: 'Marathon runner and endurance expert.', phone: '918147007570' }
]

export default function Coaches() {
  const [activeCall, setActiveCall] = useState(null)

  if (activeCall?.id) {
    const coach = COACHES.find(c => c.id === activeCall.id)
    const waText = encodeURIComponent(`Hi Coach! I'm ready for my consultation. Please join my video room here: [PASTE YOUR GOOGLE MEET LINK HERE]`)
    
    return (
      <div className="coaches-page fade-in">
        <div className="coaches-header">
          <h2>Live Session with {coach.name}</h2>
          <button className="back-btn" onClick={() => setActiveCall(null)}>
            Go Back
          </button>
        </div>
        
        <div className="video-call-container glass" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.8rem', margin: 0 }}>Google Meet Connection</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px' }}>
            To ensure the highest quality connection that bypasses all network blocks, we use Google Meet for coaching sessions.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '600px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>Step 1</span>
              <a 
                href="https://meet.google.com/new" 
                target="_blank" 
                rel="noreferrer"
                className="start-call-btn"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                📹 Create Google Meet Room
              </a>
              <span style={{ color: 'var(--text-muted)' }}>(Copy the meeting link it gives you!)</span>
            </div>
            
            <div style={{ width: '100%', height: '1px', background: 'var(--border)' }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#25D366' }}>Step 2</span>
              <a 
                href={`https://wa.me/${coach.phone}?text=${waText}`} 
                target="_blank" 
                rel="noreferrer"
                className="start-call-btn"
                style={{ textDecoration: 'none', display: 'inline-block', background: '#25D366' }}
              >
                📱 Message Link to Coach Dhanush
              </a>
              <span style={{ color: 'var(--text-muted)' }}>(Paste the Google Meet link in the WhatsApp chat)</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="coaches-page fade-in">
      <div className="coaches-header">
        <h2>Personal Trainer</h2>
        <p>Book a live 1-on-1 video consultation with our expert personal trainers.</p>
      </div>

      <div className="single-coach-profile">
        <div className="coach-images-row">
          <img src="/coach.jpg" alt="Coach Dhanush" className="coach-main-photo" />
          <img src="/certificate.png" alt="Certificate" className="coach-certificate-img" />
        </div>

        <div className="coach-bio-section">
          <h3>Coach Dhanush H V</h3>
          <p>
            Dhanush is a certified fitness expert with years of experience helping clients achieve their weight loss, muscle gain, and endurance goals. 
            He holds a prestigious certification from the Karnataka Fitness Academy and specializes in creating tailored, science-backed workout routines.
          </p>
        </div>

        <div className="coach-card glass" style={{ maxWidth: '400px', margin: '0 auto', marginTop: '30px' }}>
          <div className="coach-avatar">
            <img src="/coach.jpg" alt="Coach Dhanush" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="coach-info">
            <h3>Coach Dhanush</h3>
            <span className="specialty">💪 Strength, 🏃 Cardio, 🧘 Yoga</span>
          </div>
          <button 
            className="start-call-btn"
            onClick={() => setActiveCall({ id: 'c1' })}
          >
            Start Video Call
          </button>
        </div>
      </div>
    </div>
  )
}
