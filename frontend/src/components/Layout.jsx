import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clearUser, loadUser } from '../state'

export default function Layout({ children }) {
  const nav = useNavigate()
  const user = loadUser()
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className="appShell">
      <header className="topBar">
        <Link to="/" className="brand">
          AdaptFit
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
          <NavLink to="/trainer">
            <span className="navIcon">💬</span>
            <span>Chat</span>
          </NavLink>
          <NavLink to="/coaches">
            <span className="navIcon">💪</span>
            <span>Personal Trainer</span>
          </NavLink>
          <NavLink to="/profile">
            <span className="navIcon">👤</span>
            <span>Profile</span>
          </NavLink>
        </nav>
        <div className="userPill">
          <button 
            className="ghostBtn" 
            onClick={toggleTheme} 
            title="Toggle theme" 
            style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
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

