import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home({ user }) {
  const [globalTournaments, setGlobalTournaments] = useState([])
  const [localTournaments, setLocalTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { fetchTournaments() }, [])

  const fetchTournaments = async () => {
    const [global, local] = await Promise.all([
      supabase.from('global_tournaments').select('*').order('start_date', { ascending: false }),
      supabase.from('local_tournaments').select('*').order('start_date', { ascending: false })
    ])
    setGlobalTournaments(global.data || [])
    setLocalTournaments(local.data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const statusBadge = (status) => {
    const colors = { active: '#22c55e', upcoming: '#f59e0b', completed: '#6b7280' }
    return (
      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#2d2f3e', color: colors[status] || '#6b7280' }}>
        {status}
      </span>
    )
  }

  const TournamentCard = ({ t, type }) => (
    <div style={{ background: '#1a1d2e', border: '1px solid #2d2f3e', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}
      onClick={() => type === 'global' ? navigate(`/t/${t.slug}`) : navigate(`/local/${t.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.8rem' }}>{t.flag_emoji || (type === 'local' ? '🏏' : '🏆')}</span>
        {statusBadge(t.status)}
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{t.name}</h3>
      <p style={{ color: '#888', fontSize: '13px', margin: '0 0 4px' }}>
        {t.season} • {t.format || 'T20'} • {type === 'local' ? '📍 Local' : '🌍 Premier'}
      </p>
      <p style={{ color: '#555', fontSize: '12px', margin: '0 0 16px' }}>
        {t.start_date} → {t.end_date}
      </p>
      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => type === 'global' ? navigate(`/t/${t.slug}`) : navigate(`/local/${t.id}`)}
          style={{ flex: 1, background: '#2d2f3e', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          View
        </button>
        {t.has_fantasy && (
          <button
            onClick={() => type === 'global' ? navigate(`/t/${t.slug}/fantasy`) : navigate(`/local/${t.id}/fantasy`)}
            style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Fantasy
          </button>
        )}
        {t.has_live_scoring && type === 'local' && (
          <button
            onClick={() => navigate(`/local/${t.id}/live`)}
            style={{ flex: 1, background: '#059669', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Live
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1a1d2e', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d2f3e' }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>🏏 CricExp</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '14px' }}>{user.user_metadata?.full_name || user.email}</span>
          <button onClick={handleLogout} style={{ background: '#2d2f3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        {loading ? <p style={{ color: '#888' }}>Loading tournaments...</p> : (
          <>
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '1rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>🌍 Premier Leagues</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {globalTournaments.map(t => <TournamentCard key={t.id} t={t} type="global" />)}
              </div>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>📍 Local Tournaments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {localTournaments.map(t => <TournamentCard key={t.id} t={t} type="local" />)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}