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
            <div className="statsGrid compactStats">
              <div className="statCard">
                <div className="statLabel">Goal</div>
                <div className="statValue small">{data.plan.goal.replace('_', ' ')}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">Difficulty</div>
                <div className="statValue small">{data.plan.level}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">Calories</div>
                <div className="statValue small">{data.plan.estimatedCalories}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">Duration</div>
                <div className="statValue small">{data.plan.workoutMinutes} min</div>
              </div>
            </div>
            <div className="pillRow">
              <span className="pill">Goal: {data.plan.goal}</span>
              <span className="pill">Level: {data.plan.level}</span>
              {data.plan.focus && <span className="pill">Focus: {data.plan.focus}</span>}
              {data.plan.weeklyChallenge && <span className="pill">Challenge: {data.plan.weeklyChallenge}</span>}
              <span className="pill">
                Est. calories: {data.plan.estimatedCalories}
              </span>
              <span className="pill">Minutes: {data.plan.workoutMinutes}</span>
            </div>

            <div className="grid2">
              <div className="panel">
                <h2>Workout</h2>
                <ul className="list">
                  {data.plan.exercises.map((e) => (
                    <li key={e.id} className="listItem">
                      <div className="listTitle">{e.name}</div>
                      <div className="muted">
                        {e.sets} sets · {e.reps}
                      </div>
                      <div className="muted">{e.notes}</div>
                    </li>
                  ))}
                </ul>
                <div className="row">
                  <Link className="primaryBtn" to="/workout">
                    Start workout (webcam)
                  </Link>
                  <Link className="ghostBtn" to="/dashboard">
                    View dashboard
                  </Link>
                </div>
              </div>

              <div className="panel">
                <h2>Meal suggestions</h2>
                <div className="muted">
                  Rule-based for your goal (MVP).
                </div>
                <ul className="list">
                  {data.meals.rules.map((r, idx) => (
                    <li key={idx} className="listItem">
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="subTitle">Examples</div>
                <ul className="list">
                  {data.meals.meals.map((m) => (
                    <li key={m.name} className="listItem">
                      <div className="listTitle">{m.name}</div>
                      <div className="muted">{m.details}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

