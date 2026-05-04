import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clearUser, loadUser } from '../state'

export default function Layout({ children }) {
  const nav = useNavigate()
  const user = loadUser()

  return (
    <div className="appShell">
      <header className="topBar">
        <Link to="/" className="brand">
          AdaptFit MVP
        </Link>
        <nav className="nav">
          <NavLink to="/plan">
            <span className="navIcon">🧠</span>
            <span>Plan</span>
          </NavLink>
          <NavLink to="/workout">
            <span className="navIcon">🏋️</span>
            <span>Workout</span>
          </NavLink>
          <NavLink to="/dashboard">
            <span className="navIcon">📈</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/profile">
            <span className="navIcon">👤</span>
            <span>Profile</span>
          </NavLink>
        </nav>
        <div className="userPill">
          <span className="userId">{user?.userId || 'no user'}</span>
          <button
            className="ghostBtn"
            onClick={() => {
              clearUser()
              nav('/profile')
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className="footer">
        MVP: workouts + meals + webcam posture (4 exercises)
      </footer>
    </div>
  )
}

