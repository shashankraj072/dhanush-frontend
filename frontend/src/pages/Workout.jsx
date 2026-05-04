import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzePose, getPoseStatus, getRecommendations, logWorkout } from '../api'
import { loadUser } from '../state'

const EXERCISES = [
  { id: 'squat', label: 'Squats' },
  { id: 'sumo_squat', label: 'Sumo squats' },
  { id: 'pushup', label: 'Push-ups' },
  { id: 'lunge', label: 'Lunges' },
  { id: 'plank', label: 'Plank' },
  { id: 'bicep_curl', label: 'Bicep curl' },
  { id: 'hammer_curl', label: 'Hammer curl' },
  { id: 'pullup', label: 'Pull-ups' },
  { id: 'bench_press', label: 'Bench press' },
  { id: 'shoulder_press', label: 'Shoulder press' },
  { id: 'lateral_raise', label: 'Lateral raise' },
  { id: 'tricep_extension', label: 'Tricep extension' },
]

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
  const [debug, setDebug] = useState(null)
  const [err, setErr] = useState('')
  const [plan, setPlan] = useState(null)
  const [samples, setSamples] = useState([])
  const [durationMin, setDurationMin] = useState(5)
  const [saving, setSaving] = useState(false)
  const [poseAvailable, setPoseAvailable] = useState(true)
  const [poseMessage, setPoseMessage] = useState('')
  const [repState, setRepState] = useState({ count: 0, stage: 'up' })
  const repStateRef = useRef({ count: 0, stage: 'up' })
  const inFlightRef = useRef(false)

  const avgAccuracy = useMemo(() => {
    if (!samples.length) return 0
    return samples.reduce((a, b) => a + b, 0) / samples.length
  }, [samples])
  const accuracyPct = Math.round(avgAccuracy * 100)

  useEffect(() => {
    let cancelled = false
    async function loadPlan() {
      if (!user?.userId) return
      try {
        const res = await getRecommendations(user.userId)
        if (!cancelled) setPlan(res.plan)
      } catch {
        // ignore; workout can still run
      }
    }
    loadPlan()
    return () => {
      cancelled = true
    }
  }, [user?.userId])

  useEffect(() => {
    let cancelled = false
    async function checkPose() {
      try {
        const res = await getPoseStatus()
        if (cancelled) return
        setPoseAvailable(Boolean(res.available))
        setPoseMessage(res.message || '')
      } catch (e) {
        if (cancelled) return
        setPoseAvailable(false)
        setPoseMessage(e.message || 'Could not verify pose service')
      }
    }
    checkPose()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let stream
    async function startCam() {
      if (!running) return
      setErr('')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540 },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (e) {
        setErr(e.message || 'Failed to start camera')
        setRunning(false)
      }
    }
    startCam()
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [running])

  useEffect(() => {
    let timer = null
    async function tick() {
      if (inFlightRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      if (video.readyState < 2) return

      inFlightRef.current = true
      canvas.width = video.videoWidth || 960
      canvas.height = video.videoHeight || 540
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      try {
        const res = await analyzePose({
          imageBase64: dataUrl,
          exercise: exerciseId,
          repState: repStateRef.current,
        })
        setAlerts(res.alerts || [])
        setAccuracy(clamp01(Number(res.postureAccuracy || 0)))
        setSamples((s) => [...s.slice(-39), clamp01(Number(res.postureAccuracy || 0))])
        setDebug(res.debug || null)
        if (res.repState) {
          repStateRef.current = res.repState
          setRepState(res.repState)
        }
      } catch (e) {
        setErr(e.message || 'Pose analysis failed')
      } finally {
        inFlightRef.current = false
      }
    }

    if (running) {
      timer = setInterval(tick, 700) // keep it low-frequency for MVP
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [running, exerciseId])

  useEffect(() => {
    // Reset counter on exercise switch
    setRepState({ count: 0, stage: 'up' })
  }, [exerciseId])

  useEffect(() => {
    repStateRef.current = repState
  }, [repState])

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
          <h1 className="heroTitle">Workout + posture feedback</h1>
          <p className="muted">
            Webcam frames are analyzed by the Flask backend using MediaPipe BlazePose.
          </p>
        </div>
        <div className="workoutHero">
          <div className="counterOrb">
            <div className="counterLabel">Reps</div>
            <div className="counterValue">{repState?.count || 0}</div>
            <div className="counterSub">Stage: {repState?.stage || 'up'}</div>
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
                    <option key={ex.id} value={ex.id}>
                      {ex.label}
                    </option>
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
                disabled={!poseAvailable}
                onClick={() => setRunning((r) => !r)}
              >
                {running ? 'Stop camera' : 'Start camera'}
              </button>
            </div>

            {!poseAvailable ? (
              <div className="error">
                Pose engine unavailable: {poseMessage}
              </div>
            ) : null}

            <div className="videoWrap">
              <video ref={videoRef} playsInline muted className="video" />
              <canvas ref={canvasRef} className="canvasHidden" />
            </div>

            {err ? <div className="error">{err}</div> : null}
            <div className="pillRow">
              <span className="pill">
                Live accuracy: {(accuracy * 100).toFixed(0)}%
              </span>
              <span className="pill">
                Avg (last {samples.length}): {(avgAccuracy * 100).toFixed(0)}%
              </span>
              <span className="pill repPill">Reps: {repState?.count || 0}</span>
              <span className="pill">Stage: {repState?.stage || 'down'}</span>
            </div>

            <div className="alerts">
              <h2>Feedback</h2>
              <ul className="list">
                {(alerts || []).map((a, idx) => (
                  <li key={idx} className="listItem">
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="row">
              <button
                className="primaryBtn"
                disabled={saving}
                onClick={() => saveLog(true)}
              >
                {saving ? 'Saving…' : 'Mark completed'}
              </button>
              <button
                className="ghostBtn"
                disabled={saving}
                onClick={() => saveLog(false)}
              >
                Log as not completed
              </button>
              <button
                type="button"
                className="ghostBtn"
                onClick={() => {
                  const reset = { count: 0, stage: 'up' }
                  repStateRef.current = reset
                  setRepState(reset)
                }}
              >
                Reset reps
              </button>
            </div>
          </div>

          <div className="panel">
            <h2>Debug</h2>
            <p className="muted">
              Angles are approximate and used only for MVP posture alerts.
            </p>
            <pre className="codeBlock">
              {JSON.stringify({ exerciseId, debug }, null, 2)}
            </pre>
            <div className="muted">
              Tip: ensure your full body is visible and the room is well lit.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

