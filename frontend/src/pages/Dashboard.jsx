import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProgress } from '../api'
import { loadUser } from '../state'

export default function Dashboard() {
  const user = loadUser()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const posturePct = Math.round(Number(data?.stats?.avgPostureAccuracy || 0) * 100)
  const completionPct = data?.stats?.totalLogs
    ? Math.round((Number(data?.stats?.completedWorkouts || 0) / Number(data?.stats?.totalLogs || 1)) * 100)
    : 0

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

