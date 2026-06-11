import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import GlobalTournament from './pages/GlobalTournament'
import LocalTournament from './pages/LocalTournament'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} className="spin" />
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
      <Route path="/t/:slug" element={user ? <GlobalTournament user={user} /> : <Navigate to="/login" />} />
      <Route path="/local/:id" element={user ? <LocalTournament user={user} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
