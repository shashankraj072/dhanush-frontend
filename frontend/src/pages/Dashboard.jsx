import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProgress, logWater } from '../api'
import { loadUser } from '../state'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const user = loadUser()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [loggingWater, setLoggingWater] = useState(false)
  const posturePct = Math.round(Number(data?.stats?.avgPostureAccuracy || 0) * 100)
  const completionPct = data?.stats?.totalLogs
    ? Math.round((Number(data?.stats?.completedWorkouts || 0) / Number(data?.stats?.totalLogs || 1)) * 100)
    : 0
    
  const fetchProgress = async (isSilent = false) => {
    if (!user?.userId) return
    if (!isSilent) setLoading(true)
    setErr('')
    try {
      const res = await getProgress(user.userId)
      setData(res)
    } catch (e) {
      setErr(e.message || 'Failed to load dashboard')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  const handleLogWater = async () => {
    if (loggingWater) return
    setLoggingWater(true)
    try {
      await logWater(user.userId, 250)
      await fetchProgress(true) // refresh silently
    } catch (e) {
      setErr(e.message || 'Failed to log water')
    } finally {
      setLoggingWater(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!user?.userId) return
      setLoading(true)
      setErr('')
      try {
        const res = await getProgress(user.userId)
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [user?.userId])

  if (!user?.userId) {
    return (
      <section className="card">
        <h1>No profile</h1>
        <p className="muted">
          Create a profile first in <Link to="/profile">Profile</Link>.
        </p>
      </section>
    )
  }

  return (
    <section className="card pageEnter">
      <div className="cardHeader">
        <h1 className="heroTitle">Progress dashboard</h1>
        <p className="muted">
          Shows your latest workout logs (max 50).
        </p>
      </div>

      {loading ? <p>Loading…</p> : null}
      {err ? <div className="error">{err}</div> : null}

      {data?.stats ? (
        <>
          {data.stats.streak > 0 && (
            <div className="streakBanner animate-up">
              🔥 {data.stats.streak} Day Workout Streak! Keep it up!
            </div>
          )}
          
          <div className="statsGrid">
            <div className="statCard animate-up delay-1">
              <div className="statLabel">Completion rate</div>
              <div className="statValue">{completionPct}%</div>
              <div className="progressRing" style={{ '--p': `${completionPct}%` }}>
                <span>{completionPct}%</span>
              </div>
            </div>
            <div className="statCard animate-up delay-2">
              <div className="statLabel">Posture quality</div>
              <div className="statValue">{posturePct}%</div>
              <div className="progressRing" style={{ '--p': `${posturePct}%` }}>
                <span>{posturePct}%</span>
              </div>
            </div>
            <div className="statCard animate-up delay-3">
              <div className="statLabel">Calories burned</div>
              <div className="statValue">{data.stats.estimatedCaloriesBurned}</div>
              <div className="muted">Estimated total from completed workouts</div>
            </div>
            <div className="statCard animate-up delay-4">
              <div className="statLabel">Sessions completed</div>
              <div className="statValue">{data.stats.completedWorkouts}</div>
              <div className="muted">Out of {data.stats.totalLogs} logged entries</div>
            </div>
          </div>

          <div className="pillRow animate-up delay-4">
            <span className="pill">Logs: {data.stats.totalLogs}</span>
            <span className="pill">Completed: {data.stats.completedWorkouts}</span>
            <span className="pill">
              Calories burned: {data.stats.estimatedCaloriesBurned}
            </span>
            <span className="pill">
              Avg posture: {(Number(data.stats.avgPostureAccuracy) * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="grid2 animate-up delay-3" style={{ marginBottom: '2rem' }}>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <h2>Water Tracker</h2>
              <div style={{ fontSize: '2rem' }}>💧 {data.stats.todayWaterMl} / 2000 ml</div>
              <div className="progressTrack" style={{ width: '100%', height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (data.stats.todayWaterMl / 2000) * 100)}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }} />
              </div>
              <button className="primaryBtn" onClick={handleLogWater} disabled={loggingWater}>
                {loggingWater ? '...' : '+ 250ml Glass'}
              </button>
            </div>
            
            <div className="panel">
              <h2>Weight Progress</h2>
              <div style={{ width: '100%', height: '200px', marginTop: '1rem' }}>
                {data.stats.weightHistory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.stats.weightHistory.map(w => ({ ...w, date: new Date(w.timestamp).toLocaleDateString() }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="#aaa" />
                      <YAxis stroke="#aaa" domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="muted" style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    No weight history yet. Add weight in profile.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Exercise</th>
                  <th>Completed</th>
                  <th>Minutes</th>
                  <th>Cals</th>
                  <th>Posture</th>
                </tr>
              </thead>
              <tbody>
                {(data.logs || []).map((l, idx) => (
                  <tr key={idx}>
                    <td className="muted">
                      {l.createdAtMs ? new Date(l.createdAtMs).toLocaleString() : '-'}
                    </td>
                    <td>{l.exerciseId || '-'}</td>
                    <td>{l.completed ? 'Yes' : 'No'}</td>
                    <td>{l.durationMinutes || 0}</td>
                    <td>{l.estimatedCalories || 0}</td>
                    <td>{((l.postureAccuracy || 0) * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="row">
        <Link className="primaryBtn" to="/plan">
          Back to plan
        </Link>
        <Link className="ghostBtn" to="/workout">
          Start workout
        </Link>
      </div>
    </section>
  )
}

