import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NavBar, Badge, Loader } from '../components/Shared'

export default function Home({ user }) {
  const [global, setGlobal] = useState([])
  const [local, setLocal] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [g, l, p] = await Promise.all([
      supabase.from('global_tournaments').select('*').eq('is_visible', true).order('start_date', { ascending: false }),
      supabase.from('local_tournaments').select('*').order('start_date', { ascending: false }),
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
    ])
    setGlobal(g.data || [])
    setLocal(l.data || [])
    setProfile(p.data)
    setLoading(false)
  }

  if (loading) return <Loader />

  const allTournaments = [
    ...global.map(t => ({ ...t, kind: 'global' })),
    ...local.map(t => ({ ...t, kind: 'local' }))
  ]

  const upcoming = allTournaments.filter(t => t.status === 'upcoming')
  const ongoing = allTournaments.filter(t => t.status === 'active' || t.status === 'live')
  const completed = allTournaments.filter(t => t.status === 'completed')

  const Section = ({ title, items }) => {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{items.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {items.map(t => <TournamentCard key={t.id} t={t} navigate={navigate} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar user={user} onLogout={() => supabase.auth.signOut()} />

      {/* Hero greeting */}
      <div style={{ background: 'linear-gradient(135deg, var(--bg2) 0%, var(--bg) 100%)', borderBottom: '1px solid var(--border)', padding: '24px 16px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Welcome back,</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{profile?.full_name || user.user_metadata?.full_name || 'Champion'} 👋</div>
          {profile?.team_name && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>🏏 {profile.team_name}</div>}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px' }}>
        <Section title="🔴 Ongoing" items={ongoing} />
        <Section title="🔜 Upcoming" items={upcoming} />
        <Section title="✅ Completed" items={completed} />
        {allTournaments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏏</div>
            <div style={{ fontWeight: 600 }}>No tournaments yet</div>
          </div>
        )}
      </div>
    </div>
  )
}

function TournamentCard({ t, navigate }) {
  const isLocal = t.kind === 'local'
  const dest = isLocal ? `/local/${t.id}` : `/t/${t.slug}`
  const accentColor = isLocal ? 'var(--amber)' : 'var(--accent)'

  return (
    <div
      onClick={() => navigate(dest)}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
        padding: 20, cursor: 'pointer', transition: 'border-color 0.15s, transform 0.1s',
        position: 'relative', overflow: 'hidden'
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Top glow accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accentColor}, transparent)`, opacity: 0.5 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 32 }}>{t.flag_emoji || (isLocal ? '🏏' : '🏆')}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Badge status={t.status} />
          <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 4 }}>
            {isLocal ? '📍 Local' : '🌍 Global'}
          </span>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>{t.name}</div>
      <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 12 }}>
        {t.season} · {t.format || 'T20'} · {t.total_matches} matches
      </div>
      <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 16, fontFamily: 'var(--mono)' }}>
        {t.start_date} → {t.end_date}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          View
        </button>
        {t.has_fantasy && (
          <button
            onClick={e => { e.stopPropagation(); navigate(isLocal ? `/local/${t.id}?tab=fantasy` : `/t/${t.slug}?tab=fantasy`) }}
            style={{ flex: 1, background: accentColor === 'var(--amber)' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${accentColor}`, color: accentColor, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}
          >
            ⭐ Fantasy
          </button>
        )}
      </div>
    </div>
  )
}
