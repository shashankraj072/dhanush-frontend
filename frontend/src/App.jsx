import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Plan from './pages/Plan'
import Profile from './pages/Profile'
import Workout from './pages/Workout'
import { loadUser } from './state'

function App() {
  const user = loadUser()

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={user?.userId ? '/plan' : '/profile'} replace />}
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
