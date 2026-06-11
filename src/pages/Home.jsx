import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NavBar, Badge, Card, Eyebrow, Skeleton } from '../components/Shared'

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

  const all = [
    ...( global.map(t => ({ ...t, kind:'global' })) ),
    ...( local.map(t => ({ ...t, kind:'local' })) )
  ]
  const ongoing   = all.filter(t => t.status === 'active' || t.status === 'live')
  const upcoming  = all.filter(t => t.status === 'upcoming')
  const completed = all.filter(t => t.status === 'completed')

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)' }}>
      <NavBar user={user} onLogout={() => supabase.auth.signOut()} />

      {/* Admin strip */}
      {profile?.is_ppl_admin && (
        <div style={{ background:'rgba(239,68,68,0.06)', borderBottom:'1px solid rgba(239,68,68,0.15)', padding:'8px 16px' }}>
          <div style={{ maxWidth:'var(--app-max)', margin:'0 auto' }}>
            <a href="/admin" style={{ fontSize:12, color:'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.5px', display:'inline-flex', alignItems:'center', gap:6, textTransform:'uppercase' }}>
              ⚙️ Admin Panel →
            </a>
          </div>
        </div>
      )}

      {/* Hero greeting */}
      <div style={{ background:'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-page) 100%)', borderBottom:'1px solid var(--border)', padding:'28px 16px 24px' }}>
        <div style={{ maxWidth:'var(--app-max)', margin:'0 auto' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Skeleton height={14} radius={6} style={{ width:100 }} />
              <Skeleton height={28} radius={8} style={{ width:220 }} />
            </div>
          ) : (
            <>
              <Eyebrow>Welcome back</Eyebrow>
              <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.5px', lineHeight:1.1 }}>
                {profile?.full_name || user.user_metadata?.full_name || 'Champion'}
              </div>
              {profile?.team_name && (
                <div style={{ color:'var(--accent)', fontSize:13, marginTop:4, fontFamily:'var(--font-body)', fontWeight:600 }}>
                  🏏 {profile.team_name}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'28px 16px' }}>
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
            {[1,2,3].map(i => <Skeleton key={i} height={220} radius={18} />)}
          </div>
        ) : (
          <>
            <TournamentSection title="🔴 Ongoing" items={ongoing} navigate={navigate} />
            <TournamentSection title="🔜 Upcoming" items={upcoming} navigate={navigate} />
            <TournamentSection title="✅ Completed" items={completed} navigate={navigate} />
            {all.length === 0 && (
              <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--text-faint)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏏</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, textTransform:'uppercase' }}>No tournaments yet</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TournamentSection({ title, items, navigate }) {
  if (!items.length) return null
  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'1.5px' }}>{title}</span>
        <div style={{ flex:1, height:1, background:'var(--border)' }} />
        <span style={{ fontFamily:'var(--font-display)', fontSize:11, color:'var(--text-ghost)', fontWeight:700 }}>{items.length}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
        {items.map(t => <TournamentCard key={t.id} t={t} navigate={navigate} />)}
      </div>
    </div>
  )
}

function TournamentCard({ t, navigate }) {
  const isLocal  = t.kind === 'local'
  const dest     = isLocal ? `/local/${t.id}` : `/t/${t.slug}`
  const accentC  = isLocal ? 'var(--gold)' : 'var(--accent)'
  const accentBg = isLocal ? 'rgba(245,158,11,0.12)' : 'rgba(154,224,0,0.12)'
  const [hov, setHov] = useState(false)

  return (
    <Card style={{ cursor:'pointer', transition:'border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)', borderColor: hov ? accentC : 'var(--border-card)', transform: hov ? 'translateY(-2px)' : 'none', boxShadow: hov ? `0 8px 24px rgba(0,0,0,0.4)` : 'none' }}
      onClick={() => navigate(dest)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Accent top bar on hover */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:accentC, opacity: hov ? 1 : 0, transition:'opacity var(--dur-fast) var(--ease-out)', borderRadius:'var(--card-radius) var(--card-radius) 0 0' }} />

      <div style={{ padding:'20px 20px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <span style={{ fontSize:36 }}>{t.flag_emoji || (isLocal ? '🏏' : '🏆')}</span>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <Badge status={t.status} />
            <span style={{ fontSize:10, color:'var(--text-ghost)', background:'var(--bg-card-alt)', padding:'2px 8px', borderRadius:4, fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase' }}>
              {isLocal ? '📍 Local' : '🌍 Global'}
            </span>
          </div>
        </div>

        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:4, lineHeight:1.2 }}>{t.name}</div>
        <div style={{ color:'var(--text-dim)', fontSize:12, marginBottom:12, fontFamily:'var(--font-body)' }}>
          {t.season} · {t.format || 'T20'} · {t.total_matches} matches
        </div>
        <div style={{ color:'var(--text-ghost)', fontSize:11, marginBottom:16, fontFamily:'var(--font-display)', fontWeight:600, letterSpacing:'0.3px' }}>
          {t.start_date} → {t.end_date}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button
            style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-card)', color:'var(--text-primary)', padding:'9px', borderRadius:'var(--btn-radius)', fontSize:12, fontFamily:'var(--font-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.3px', cursor:'pointer' }}
          >
            View
          </button>
          {t.has_fantasy && (
            <button
              onClick={e => { e.stopPropagation(); navigate(isLocal ? `/local/${t.id}?tab=fantasy` : `/t/${t.slug}?tab=fantasy`) }}
              style={{ flex:1, background: accentBg, border:`1px solid ${accentC}`, color: accentC, padding:'9px', borderRadius:'var(--btn-radius)', fontSize:12, fontFamily:'var(--font-display)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.3px', cursor:'pointer' }}
            >
              ⭐ Fantasy
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
