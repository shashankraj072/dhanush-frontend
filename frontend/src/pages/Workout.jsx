import { useEffect, useRef, useState, useMemo } from 'react'
import { getRecommendations, logWorkout } from '../api'
import { loadUser } from '../state'
import * as mpPose from '@mediapipe/pose'
import * as mpCam from '@mediapipe/camera_utils'
import * as mpDraw from '@mediapipe/drawing_utils'

const { Pose, POSE_CONNECTIONS } = mpPose
const { Camera } = mpCam
const { drawConnectors, drawLandmarks } = mpDraw

const EXERCISES = [
  { id: 'squat', label: 'Squats' },
  { id: 'pushup', label: 'Push-ups' },
  { id: 'lunge', label: 'Lunges' },
  { id: 'plank', label: 'Plank' },
  { id: 'bicep_curl', label: 'Bicep curl' },
]

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180.0) / Math.PI)
  if (angle > 180.0) {
    angle = 360 - angle
  }
  return angle
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}

export default function Workout() {
  const user = loadUser()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const [exerciseId, setExerciseId] = useState('squat')
  const [running, setRunning] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [accuracy, setAccuracy] = useState(0)
  const [err, setErr] = useState('')
  const [plan, setPlan] = useState(null)
  const [samples, setSamples] = useState([])
  const [durationMin, setDurationMin] = useState(5)
  const [saving, setSaving] = useState(false)
  
  const [repState, setRepState] = useState({ count: 0, stage: 'up' })
  const repStateRef = useRef({ count: 0, stage: 'up' })
  const lastSpokenRef = useRef({})

  function speakFeedback(text, isRep = false) {
    try {
      if (!window.speechSynthesis) return
      const now = Date.now()
      const lastSpoken = lastSpokenRef.current[text] || 0
      
      // Wait 3 seconds before repeating the same posture warning. Reps are spoken immediately.
      if (isRep || now - lastSpoken > 3000) {
        // Clear the queue if it's a new rep to ensure instant counting
        if (isRep) window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.1
        window.speechSynthesis.speak(utterance)
        lastSpokenRef.current[text] = now
      }
    } catch (e) {
      console.warn("TTS Error: ", e)
    }
  }

  const avgAccuracy = useMemo(() => {
    if (!samples.length) return 0
    return samples.reduce((a, b) => a + b, 0) / samples.length
  }, [samples])
  
  const accuracyPct = Math.round(avgAccuracy * 100) || 0

  useEffect(() => {
    let cancelled = false
    async function loadPlan() {
      if (!user?.userId) return
      try {
        const res = await getRecommendations(user.userId)
        if (!cancelled) setPlan(res.plan)
      } catch {
        // ignore
      }
    }
    loadPlan()
    return () => { cancelled = true }
  }, [user?.userId])

  useEffect(() => {
    let pose = null
    let camera = null

    async function startMediaPipe() {
      if (!running) {
        try { window.speechSynthesis?.cancel() } catch(e) {}
        return
      }
      setErr('')
      speakFeedback("AI Tracking started. Please stand in frame.", false)
      
      const videoElement = videoRef.current
      const canvasElement = canvasRef.current
      if (!videoElement || !canvasElement) return
      
      const canvasCtx = canvasElement.getContext('2d')

      try {
        // Safe access for Vite production build interop
        const PoseClass = window.Pose || window.pose?.Pose || Pose
        pose = new PoseClass({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          }
        })
      } catch(e) {
        setErr('Failed to load AI Model: ' + e.message)
        return
      }

      pose.setOptions({
        modelComplexity: 0, // Lower complexity to fix GPU precision failures on some devices
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      pose.onResults((results) => {
        try {
          canvasCtx.save()
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
          
          // Debug: draw the exact image MediaPipe saw to prove if it is black or not
          if (results.image) {
             canvasCtx.globalAlpha = 0.3;
             canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
             canvasCtx.globalAlpha = 1.0;
          }

          if (results.poseLandmarks) {
            const SafeConnections = window.POSE_CONNECTIONS || window.pose?.POSE_CONNECTIONS || POSE_CONNECTIONS
            const safeDrawConnectors = window.drawConnectors || drawConnectors
            const safeDrawLandmarks = window.drawLandmarks || drawLandmarks
            
            safeDrawConnectors(canvasCtx, results.poseLandmarks, SafeConnections, { color: '#00FF00', lineWidth: 4 })
            safeDrawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 })
            
          // Rep counting logic
          let feedback = []
          let currAccuracy = 1.0
          const landmarks = results.poseLandmarks
          
          const hip = landmarks[23]
          const knee = landmarks[25]
          const ankle = landmarks[27]
          const shoulder = landmarks[11]
          const elbow = landmarks[13]
          const wrist = landmarks[15]
          
          // Always print angles if joints are visible, to prove AI is working
          if (hip && knee && ankle && hip.visibility > 0.2) {
             feedback.push(`Squat Angle: ${Math.round(calculateAngle(hip, knee, ankle))}°`)
          }
          if (shoulder && elbow && wrist && shoulder.visibility > 0.2) {
             feedback.push(`Curl Angle: ${Math.round(calculateAngle(shoulder, elbow, wrist))}°`)
          }
          
          if (exerciseId === 'squat' || exerciseId === 'squats') {
            if (hip && knee && ankle && hip.visibility > 0.2) {
              const angle = calculateAngle(hip, knee, ankle)
              let stage = repStateRef.current.stage
              let count = repStateRef.current.count
              
              if (angle > 140) {
                stage = 'up'
              }
              if (angle < 100 && stage === 'up') {
                stage = 'down'
                count += 1
                feedback.push("Good depth!")
                speakFeedback(count.toString(), true)
              }
              if (angle < 60) {
                const msg = "Going too low, protect your knees!"
                feedback.push(msg)
                speakFeedback(msg)
                currAccuracy = 0.8
              }
              if (stage === 'down' && angle > 100 && angle < 140) {
                const msg = "Push all the way up!"
                feedback.push(msg)
                speakFeedback(msg)
              }
              
              repStateRef.current = { count, stage }
              setRepState({ count, stage })
            } else {
               const msg = "Please stand further back for squats."
               feedback.push(msg)
               speakFeedback(msg)
               currAccuracy = 0.5
            }
          } else if (exerciseId === 'bicep_curl') {
            if (shoulder && elbow && wrist && shoulder.visibility > 0.2 && elbow.visibility > 0.2 && wrist.visibility > 0.2) {
              const angle = calculateAngle(shoulder, elbow, wrist)
              let stage = repStateRef.current.stage
              let count = repStateRef.current.count
              
              if (angle > 140) {
                stage = 'down'
              }
              if (angle < 70 && stage === 'down') {
                stage = 'up'
                count += 1
                speakFeedback(count.toString(), true)
              }
              
              repStateRef.current = { count, stage }
              setRepState({ count, stage })
            } else {
               const msg = "Left arm not fully visible."
               feedback.push(msg)
               speakFeedback(msg)
               currAccuracy = 0.5
            }
          } else {
            feedback.push("Rep counting not available for this exercise yet.")
            currAccuracy = 0.9
          }
          
          setAlerts(feedback)
          setAccuracy(currAccuracy)
          setSamples((s) => [...s.slice(-39), currAccuracy])
        } else {
          setAlerts(["No person detected"])
          setAccuracy(0)
        }
        canvasCtx.restore()
        } catch (e) {
          console.warn("onResults error:", e)
          setErr('AI Error: ' + e.message)
        }
      })

      try {
        setErr('Starting MediaPipe Camera...')
        // We use @mediapipe/camera_utils because it has robust internal workarounds for browser video frame extraction bugs!
        const CameraClass = window.Camera || window.camera_utils?.Camera || (await import('@mediapipe/camera_utils')).Camera
        
        camera = new CameraClass(videoElement, {
          onFrame: async () => {
            if (!running) return
            try {
              await pose.send({ image: videoElement })
              setErr('')
            } catch (e) {
              console.warn(e)
            }
          },
          width: 640,
          height: 480
        })
        camera.start()
      } catch (e) {
        setErr('Camera Utils Error: ' + e.message)
      }
    }

    startMediaPipe()

    return () => {
      if (camera) camera.stop()
      if (canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d')
         ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
      if (pose) pose.close()
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, [running, exerciseId])

  useEffect(() => {
    setRepState({ count: 0, stage: 'up' })
    repStateRef.current = { count: 0, stage: 'up' }
  }, [exerciseId])

  if (!user?.userId) {
    return (
      <section className="card">
        <h1>No profile</h1>
        <p className="muted">Create a profile first.</p>
      </section>
    )
  }

  async function saveLog(completed) {
    setSaving(true)
    setErr('')
    try {
      const estimatedCalories = plan?.estimatedCalories || 0
      await logWorkout({
        userId: user.userId,
        exerciseId,
        completed,
        durationMinutes: Number(durationMin) || 0,
        estimatedCalories,
        postureAccuracy: avgAccuracy || accuracy || 0,
      })
      setSamples([])
    } catch (e) {
      setErr(e.message || 'Failed to save workout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="stack">
      <div className="card pageEnter">
        <div className="cardHeader">
          <h1 className="heroTitle">Workout + AI Pose Tracker</h1>
          <p className="muted">
            Powered by MediaPipe directly in your browser. Fast, private, and zero latency!
          </p>
        </div>
        <div className="workoutHero">
          <div className="counterOrb">
            <div className="counterLabel">Reps</div>
            <div className="counterValue">{repState.count}</div>
            <div className="counterSub">Stage: {repState.stage}</div>
          </div>
          <div className="counterOrb">
            <div className="counterLabel">Posture</div>
            <div className="counterValue">{accuracyPct}%</div>
            <div className="counterSub">avg accuracy</div>
          </div>
        </div>

        <div className="grid2">
          <div className="panel">
            <div className="rowWrap controlsBar">
              <label className="inlineField">
                <span className="label">Exercise</span>
                <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
                  {EXERCISES.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.label}</option>
                  ))}
                </select>
              </label>
              <label className="inlineField">
                <span className="label">Duration (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                />
              </label>
              <button
                className="primaryBtn"
                onClick={() => setRunning((r) => !r)}
              >
                {running ? 'Stop camera' : 'Start AI Tracking'}
              </button>
            </div>

            <div className="videoWrap" style={{ position: 'relative', width: '100%', maxWidth: '640px', height: '480px', backgroundColor: '#222', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Force the raw video to be completely visible to the browser to bypass any battery saving blocks, but hide it behind the canvas */}
              <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} width="640" height="480" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, transform: 'scaleX(-1)' }} />
              
              {!running && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  Click "Start AI Tracking" to begin
                </div>
              )}
            </div>

            {err ? <div className="error" style={{ marginTop: '1rem' }}>{err}</div> : null}

            <div className="alerts" style={{ marginTop: '1rem' }}>
              <h2>Feedback</h2>
              <ul className="list">
                {alerts.length === 0 ? <li className="listItem muted">No active feedback</li> : null}
                {alerts.map((a, idx) => (
                  <li key={idx} className="listItem" style={{ color: '#00FF00', fontWeight: 'bold' }}>{a}</li>
                ))}
              </ul>
            </div>

            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="primaryBtn" disabled={saving} onClick={() => saveLog(true)}>
                {saving ? 'Saving…' : 'Mark completed'}
              </button>
              <button className="ghostBtn" disabled={saving} onClick={() => saveLog(false)}>
                Log as not completed
              </button>
              <button type="button" className="ghostBtn" onClick={() => {
                setRepState({ count: 0, stage: 'up' })
                repStateRef.current = { count: 0, stage: 'up' }
              }}>
                Reset reps
              </button>
            </div>
          </div>
          
          <div className="panel">
             <h2>Instructions</h2>
             <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', lineHeight: '1.6' }}>
                <li>Ensure your full body is visible in the camera frame.</li>
                <li>Keep the room well-lit for accurate tracking.</li>
                <li>Stand about 6 feet away from the camera.</li>
             </ul>
             
             <h3 style={{ marginTop: '2rem' }}>How it works</h3>
             <p className="muted" style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
                This AI Pose Tracker runs 100% locally in your browser using Google MediaPipe. 
                Your video is never sent to a server. We track 33 3D body landmarks to calculate joint angles and count repetitions automatically.
             </p>
          </div>
        </div>
      </div>
    </section>
  )
}
