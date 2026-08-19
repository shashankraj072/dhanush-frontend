import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecommendations } from '../api'
import { loadUser } from '../state'

export default function Plan() {
  const user = loadUser()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!user?.userId) return
      setLoading(true)
      setErr('')
      try {
        const res = await getRecommendations(user.userId)
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load plan')
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
    <section className="stack">
      <div className="card pageEnter">
        <div className="cardHeader">
          <h1 className="heroTitle">Your plan</h1>
          <p className="muted">
            Adapted using your completion history .
          </p>
        </div>
        {loading ? <p>Loading…</p> : null}
        {err ? <div className="error">{err}</div> : null}
        {data?.plan ? (
          <>
            <div className="grid2">
              <div className="statCard animate-up delay-1">
                <div className="statLabel" style={{fontSize: '11px', textTransform:'uppercase'}}>Goal</div>
                <div className="statValue" style={{fontSize: '22px'}}>
                  {data.plan.goal.replace('_', ' ')}
                </div>
              </div>
              <div className="statCard animate-up delay-2">
                <div className="statLabel" style={{fontSize: '11px', textTransform:'uppercase'}}>Difficulty</div>
                <div className="statValue" style={{fontSize: '22px'}}>
                  {data.plan.level}
                </div>
              </div>
              <div className="statCard animate-up delay-3">
                <div className="statLabel" style={{fontSize: '11px', textTransform:'uppercase'}}>Calories</div>
                <div className="statValue" style={{fontSize: '22px'}}>
                  {data.plan.estimatedCalories}
                </div>
              </div>
              <div className="statCard animate-up delay-4">
                <div className="statLabel" style={{fontSize: '11px', textTransform:'uppercase'}}>Duration</div>
                <div className="statValue" style={{fontSize: '22px'}}>
                  {data.plan.workoutMinutes} Min
                </div>
              </div>
            </div>

            <div className="pillRow animate-up delay-4">
              <span className="pill">Goal: {data.plan.goal}</span>
              <span className="pill">Level: {data.plan.level}</span>
              {data.plan.focus && <span className="pill">Focus: {data.plan.focus}</span>}
              {data.plan.weeklyChallenge && <span className="pill">Challenge: {data.plan.weeklyChallenge}</span>}
              <span className="pill">Est. calories: {data.plan.estimatedCalories}</span>
              <span className="pill">Minutes: {data.plan.workoutMinutes}</span>
            </div>

            <div className="grid2" style={{marginTop: '20px', alignItems: 'start'}}>
              {/* Workouts */}
              <div className="card animate-up delay-2" style={{padding: '24px'}}>
                <h2 style={{fontSize: '20px', marginBottom: '16px'}}>Workout</h2>
                <div className="stack">
                  {data.plan.exercises.map((e) => (
                    <div key={e.id} className="statCard" style={{textAlign: 'left', padding: '16px'}}>
                      <div style={{fontWeight: 600, color: 'var(--text-h)', marginBottom: '4px'}}>{e.name}</div>
                      <div style={{fontSize: '13px', color: 'var(--text)', marginBottom: '8px'}}>{e.sets} sets · {e.reps}</div>
                      <div style={{fontSize: '14px', color: 'var(--text-h)'}}>{e.notes}</div>
                    </div>
                  ))}
                  <div style={{display:'flex', gap: '10px', marginTop: '10px'}}>
                    <Link to="/workout" className="button" style={{flex: 1, justifyContent:'center'}}>Start workout (webcam)</Link>
                    <Link to="/dashboard" className="button button-outline">View dashboard</Link>
                  </div>
                </div>
              </div>

              {/* Meals */}
              <div className="card animate-up delay-3" style={{padding: '24px'}}>
                <h2 style={{fontSize: '20px', marginBottom: '16px'}}>Meal suggestions</h2>
                <p className="muted" style={{marginBottom: '16px'}}>Rule-based for your goal (MVP).</p>
                
                <div className="stack" style={{gap: '12px'}}>
                  {data.meals.rules.map((r, idx) => (
                    <div key={idx} className="statCard" style={{textAlign: 'left', padding: '12px 16px', fontSize: '14px'}}>
                      {r}
                    </div>
                  ))}
                </div>

                <h3 style={{fontSize: '16px', marginTop: '24px', marginBottom: '12px', color: 'var(--text-h)'}}>Examples</h3>
                <div className="stack" style={{gap: '12px'}}>
                  {data.meals.meals.map((m) => (
                    <div key={m.name} className="statCard" style={{textAlign: 'left', padding: '12px 16px'}}>
                      <div style={{fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-h)', marginBottom: '4px'}}>
                        {m.name}
                      </div>
                      <div style={{fontSize: '14px', color: 'var(--text)'}}>
                        {m.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

