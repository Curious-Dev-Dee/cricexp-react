import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home({ user }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from('global_tournaments')
      .select('*')
      .order('created_at', { ascending: false })
    setTournaments(data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const getStatusColor = (status) => {
    if (status === 'active') return '#22c55e'
    if (status === 'upcoming') return '#f59e0b'
    return '#6b7280'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1d2e', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d2f3e' }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>🏏 CricExp</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '14px' }}>
            {user.user_metadata?.full_name || user.email}
          </span>
          <button onClick={handleLogout} style={{ background: '#2d2f3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Tournaments</h2>
        <p style={{ color: '#888', marginBottom: '24px', fontSize: '14px' }}>All fantasy cricket tournaments</p>

        {loading ? (
          <p style={{ color: '#888' }}>Loading...</p>
        ) : tournaments.length === 0 ? (
          <p style={{ color: '#888' }}>No tournaments yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {tournaments.map(t => (
              <div key={t.id} style={{ background: '#1a1d2e', border: '1px solid #2d2f3e', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{t.flag_emoji || '🏆'}</span>
                  <span style={{ fontSize: '12px', background: '#2d2f3e', padding: '4px 10px', borderRadius: '20px', color: getStatusColor(t.status) }}>
                    {t.status}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{t.name}</h3>
                <p style={{ color: '#888', fontSize: '13px', margin: '0 0 16px' }}>{t.season} • {t.format}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ flex: 1, background: '#2d2f3e', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    View
                  </button>
                  {t.has_fantasy && (
                    <button style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      Fantasy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}