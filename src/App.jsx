import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Loader } from './components/Shared'
import Home from './pages/Home'
import Login from './pages/Login'
import GlobalTournament from './pages/GlobalTournament'
import LocalTournament from './pages/LocalTournament'
import Admin from './pages/Admin'

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

  if (loading) return <Loader text="Loading your cricket universe..." />

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
      <Route path="/t/:slug" element={user ? <GlobalTournament user={user} /> : <Navigate to="/login" />} />
      <Route path="/local/:id" element={user ? <LocalTournament user={user} /> : <Navigate to="/login" />} />
      <Route path="/admin" element={user ? <Admin user={user} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
