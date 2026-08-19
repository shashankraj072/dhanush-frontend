import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveProfile } from '../api'
import { loadUser, saveUser } from '../state'

function defaultUserId() {
  return `user_${Math.random().toString(16).slice(2, 8)}`
}

export default function Profile() {
  const nav = useNavigate()
  const existing = loadUser()

  const [userId, setUserId] = useState(existing?.userId || defaultUserId())
  const [name, setName] = useState(existing?.name || '')
  const [age, setAge] = useState(existing?.age || 25)
  const [gender, setGender] = useState(existing?.gender || 'unspecified')
  const [goal, setGoal] = useState(existing?.goal || 'weight_loss')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const canSave = useMemo(() => {
    return String(userId).trim().length > 2 && Number(age) >= 10
  }, [userId, age])

  async function onSave(e) {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      const payload = {
        userId: String(userId).trim(),
        name: String(name).trim(),
        age: Number(age),
        gender,
        goal,
      }
      const res = await saveProfile(payload)
      saveUser(res.profile)
      nav('/plan')
    } catch (e2) {
      setErr(e2.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card pageEnter">
      <div className="cardHeader">
        <h1 className="heroTitle">Profile setup</h1>
        <p className="muted">Create a profile to get a personalized plan.</p>
      </div>
      <div className="featureStrip">
        <div className="featureItem">Smart workout adaptation</div>
        <div className="featureItem">Live posture feedback</div>
        <div className="featureItem">Goal-based meals</div>
      </div>

      <form className="form" onSubmit={onSave}>
        <div className="grid2 animate-up delay-1">
          <label>
            <div className="label">User ID</div>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </label>
          <label>
            <div className="label">Name (optional)</div>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>

        <div className="grid3 animate-up delay-2">
          <label>
            <div className="label">Age</div>
            <input
              type="number"
              value={age}
              min={10}
              max={100}
              onChange={(e) => setAge(e.target.value)}
            />
          </label>
          <label>
            <div className="label">Gender</div>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="unspecified">Unspecified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <div className="label">Goal</div>
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="weight_loss">Weight loss</option>
              <option value="muscle_gain">Muscle gain</option>
              <option value="endurance">Endurance</option>
            </select>
          </label>
        </div>

        {err ? <div className="error">{err}</div> : null}

        <div className="row">
          <button className="primaryBtn" disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            className="ghostBtn"
            onClick={() => setUserId(defaultUserId())}
          >
            Generate new ID
          </button>
        </div>
      </form>
    </section>
  )
}

