import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, AVATAR_BASE, TEAM_LOGO_BASE } from '../lib/supabase'
import { Skeleton, Eyebrow } from '../components/Shared'

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => parseFloat(n || 0).toLocaleString()
const BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public'

function Avatar({ url, name, size = 44 }) {
  const src = url ? `${AVATAR_BASE}${url}` : null
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-card-alt)', border: '2px solid var(--accent)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: size * 0.38, color: 'var(--accent)' }}>
      {src ? <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" /> : (name || '?')[0]?.toUpperCase()}
    </div>
  )
}

function StatCell({ label, value, color, sub }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-faint)', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--text-ghost)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch' }} />
}

function Card({ children, style, accent }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${accent ? 'var(--border-accent)' : 'var(--border-card)'}`, borderRadius: 'var(--card-radius)', overflow: 'hidden', position: 'relative', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', pointerEvents: 'none' }} />
      {children}
    </div>
  )
}

// ── LEAGUE MODAL ─────────────────────────────────────────────────────────────
function LeagueModal({ mode, onClose, userId, tournamentId, onDone }) {
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const handle = async () => {
    if (!val.trim()) return
    setLoading(true); setMsg(null)
    try {
      if (mode === 'create') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { data: league, error } = await supabase.from('leagues').insert([{ name: val.trim(), invite_code: code, owner_id: userId }]).select().single()
        if (error) throw error
        await supabase.from('league_members').insert([{ league_id: league.id, user_id: userId }])
        setMsg(`✅ League created! Code: ${code}`)
        setTimeout(() => { onDone(); onClose() }, 1500)
      } else {
        const { data: league } = await supabase.from('leagues').select('id').eq('invite_code', val.trim().toUpperCase()).maybeSingle()
        if (!league) throw new Error('Invalid code — double-check it')
        const { error } = await supabase.from('league_members').insert([{ league_id: league.id, user_id: userId }])
        if (error) throw new Error('Already in this league or join failed')
        setMsg('✅ Joined successfully!')
        setTimeout(() => { onDone(); onClose() }, 1200)
      }
    } catch (e) { setMsg('❌ ' + e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)', borderRadius: 'var(--card-radius)', padding: '28px 24px', width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: 20 }}>
          {mode === 'create' ? '🏆 Create League' : '🔑 Join League'}
        </div>
        <input
          value={val} onChange={e => setVal(e.target.value)}
          placeholder={mode === 'create' ? 'League name...' : 'Enter invite code...'}
          style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', padding: '12px 14px', borderRadius: 'var(--btn-radius)', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}
          onKeyDown={e => e.key === 'Enter' && handle()}
          autoFocus
        />
        {msg && <div style={{ fontSize: 13, color: msg.startsWith('✅') ? 'var(--accent)' : 'var(--red)', marginBottom: 12 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handle} disabled={loading || !val.trim()} style={{ flex: 1, padding: '12px', borderRadius: 'var(--btn-radius)', border: 'none', background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : mode === 'create' ? 'Create' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN HOME ─────────────────────────────────────────────────────────────────
export default function Home({ user }) {
  const navigate = useNavigate()
  const [dash, setDash] = useState(null)
  const [globalRank, setGlobalRank] = useState(null)
  const [privateRank, setPrivateRank] = useState(null)
  const [globalTop, setGlobalTop] = useState([])
  const [privateTop, setPrivateTop] = useState([])
  const [myLeague, setMyLeague] = useState(null)
  const [globalTournaments, setGlobalTournaments] = useState([])
  const [localTournaments, setLocalTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [leagueModal, setLeagueModal] = useState(null) // 'create' | 'join'
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'completed'
  const [profile, setProfile] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [dashRes, profileRes, globalRes, localRes] = await Promise.all([
      supabase.from('home_dashboard_view').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_profiles').select('full_name, team_name, team_photo_url, is_ppl_admin').eq('user_id', user.id).single(),
      supabase.from('global_tournaments').select('*').eq('is_visible', true).order('start_date', { ascending: false }),
      supabase.from('local_tournaments').select('*').order('start_date', { ascending: false }),
    ])
    setDash(dashRes.data)
    setProfile(profileRes.data)
    setGlobalTournaments(globalRes.data || [])
    setLocalTournaments(localRes.data || [])

    if (dashRes.data?.tournament_id) {
      fetchRanksAndLeague(dashRes.data.tournament_id)
    }
    setLoading(false)
  }

  const fetchRanksAndLeague = async (tid) => {
    const [glbRes, leagueMemberRes] = await Promise.all([
      supabase.from('leaderboard_view').select('rank, total_points').eq('user_id', user.id).eq('tournament_id', tid).maybeSingle(),
      supabase.from('league_members').select('league_id, leagues(id, name, invite_code)').eq('user_id', user.id).maybeSingle(),
    ])
    setGlobalRank(glbRes.data)

    if (leagueMemberRes.data?.leagues) {
      const league = leagueMemberRes.data.leagues
      setMyLeague(league)
      const [pvtRes, pvtTop, glbTop] = await Promise.all([
        supabase.from('private_league_leaderboard').select('rank_in_league, total_points').eq('user_id', user.id).eq('league_id', league.id).maybeSingle(),
        supabase.from('private_league_leaderboard').select('user_id, team_name, full_name, total_points, rank_in_league, team_photo_url').eq('league_id', league.id).order('rank_in_league').limit(3),
        supabase.from('leaderboard_view').select('user_id, team_name, full_name, total_points, rank').eq('tournament_id', tid).order('rank').limit(3),
      ])
      setPrivateRank(pvtRes.data)
      setPrivateTop(pvtTop.data || [])
      setGlobalTop(glbTop.data || [])
    } else {
      const { data: glbTop } = await supabase.from('leaderboard_view').select('user_id, team_name, full_name, total_points, rank').eq('tournament_id', tid).order('rank').limit(3)
      setGlobalTop(glbTop || [])
    }
  }

  // Derived
  const bestRank = Math.min(globalRank?.rank ?? Infinity, privateRank?.rank_in_league ?? Infinity)
  const displayRank = bestRank === Infinity ? 'Pre-Season' : `#${bestRank}`
  const liveTournaments = [...globalTournaments.filter(t => t.status !== 'completed'), ...localTournaments.filter(t => t.status !== 'completed')]
  const completedTournaments = [...globalTournaments.filter(t => t.status === 'completed'), ...localTournaments.filter(t => t.status === 'completed')]
  const nextMatch = dash?.upcoming_match

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-card-alt)' }} className="sk" />
        <div style={{ flex: 1 }}>
          <Skeleton height={12} radius={6} style={{ width: 100, marginBottom: 8 }} />
          <Skeleton height={18} radius={6} style={{ width: 160 }} />
        </div>
      </div>
      <Skeleton height={120} radius={18} style={{ marginBottom: 12 }} />
      <Skeleton height={180} radius={18} style={{ marginBottom: 12 }} />
      <Skeleton height={140} radius={18} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 32 }}>
      {/* STICKY HEADER */}
      <header style={{ background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 500 }}>
        <div style={{ maxWidth: 'var(--app-max)', margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulseGlow 2.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, letterSpacing: '0.5px', textTransform: 'uppercase' }}>CricExp</span>
          </div>
          <div style={{ flex: 1 }} />
          {profile?.is_ppl_admin && (
            <a href="/admin" style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>⚙️ Admin</a>
          )}
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-card)', color: 'var(--text-faint)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: 'var(--app-max)', margin: '0 auto', padding: '20px 16px' }}>

        {/* ── USER HERO CARD ── */}
        <Card accent style={{ marginBottom: 14 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)', borderRadius: 'var(--card-radius) var(--card-radius) 0 0' }} />
          <div style={{ padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Avatar url={profile?.team_photo_url} name={profile?.full_name} size={50} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>Welcome back</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Champion'}</div>
                {profile?.team_name && <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 1 }}>🏏 {profile.team_name}</div>}
              </div>
            </div>
            {/* Stats row */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--card-radius-sm)', border: '1px solid var(--border-subtle)', padding: '13px 8px' }}>
              <StatCell label="Total Points" value={fmt(dash?.total_points)} color="var(--text-primary)" />
              <Divider />
              <StatCell label="Best Rank" value={displayRank} color="var(--accent)" />
              <Divider />
              <StatCell label="Subs Left" value={dash?.subs_remaining === 999 ? '∞' : (dash?.subs_remaining ?? '—')} color={dash?.subs_remaining < 10 ? 'var(--red)' : 'var(--text-primary)'} />
              <Divider />
              <StatCell label="Match" value={dash?.current_match_number ? `M${dash.current_match_number}` : '—'} />
            </div>
          </div>
        </Card>

        {/* ── TOURNAMENT TABS ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[['live', '🔴 Live / Upcoming'], ['completed', '✅ Completed']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--btn-radius)', border: '1px solid', borderColor: activeTab === key ? 'var(--accent)' : 'var(--border-card)', background: activeTab === key ? 'rgba(154,224,0,0.12)' : 'var(--bg-card)', color: activeTab === key ? 'var(--accent)' : 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── TOURNAMENT CARDS ── */}
        {activeTab === 'live' && (
          <>
            {liveTournaments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-faint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏏</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>No live tournaments</div>
              </div>
            )}
            {liveTournaments.map(t => {
              const isLocal = !t.slug
              return <TournamentCard key={t.id} t={t} isLocal={isLocal} navigate={navigate} />
            })}
          </>
        )}
        {activeTab === 'completed' && (
          <>
            {completedTournaments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-faint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>No completed tournaments</div>
              </div>
            )}
            {completedTournaments.map(t => {
              const isLocal = !t.slug
              return <TournamentCard key={t.id} t={t} isLocal={isLocal} navigate={navigate} />
            })}
          </>
        )}

        {/* ── NEXT MATCH CARD (only if live tournament active) ── */}
        {activeTab === 'live' && nextMatch && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', padding: '3px 8px', borderRadius: 6 }}>NEXT MATCH</span>
                </div>
                {nextMatch.venue && <span style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>📍 {nextMatch.venue}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  {nextMatch.team_a_logo
                    ? <img src={`${TEAM_LOGO_BASE}${nextMatch.team_a_logo}`} style={{ width: 44, height: 44, objectFit: 'contain', margin: '0 auto 4px', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.1))' }} onError={e => e.target.style.display = 'none'} alt="" />
                    : <div style={{ fontSize: 28, marginBottom: 4 }}>🏏</div>
                  }
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16 }}>{nextMatch.team_a_code || 'TBA'}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--text-faint)', fontSize: 16 }}>VS</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  {nextMatch.team_b_logo
                    ? <img src={`${TEAM_LOGO_BASE}${nextMatch.team_b_logo}`} style={{ width: 44, height: 44, objectFit: 'contain', margin: '0 auto 4px', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.1))' }} onError={e => e.target.style.display = 'none'} alt="" />
                    : <div style={{ fontSize: 28, marginBottom: 4 }}>🏏</div>
                  }
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16 }}>{nextMatch.team_b_code || 'TBA'}</div>
                </div>
              </div>
              {nextMatch.actual_start_time && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: 14 }}>
                  🕐 {new Date(nextMatch.actual_start_time).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { const t = globalTournaments.find(t => t.tournament_id === dash?.tournament_id || t.id === dash?.tournament_id); if (t) navigate(`/t/${t.slug}?tab=pickteam`) }} style={{ flex: 1.3, padding: '12px', borderRadius: 'var(--btn-radius)', border: 'none', background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ✏️ Edit Team
                </button>
                <button onClick={() => { const t = globalTournaments.find(t => t.tournament_id === dash?.tournament_id || t.id === dash?.tournament_id); if (t) navigate(`/t/${t.slug}?tab=myteam`) }} style={{ flex: 1, padding: '12px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border-card)', background: 'var(--bg-card-alt)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}>
                  👁 View Team
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ── LEADERBOARD CARD ── */}
        {activeTab === 'live' && dash?.tournament_id && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ padding: '16px 16px 12px' }}>
              {/* Tabs: Global | My League */}
              <LeaderboardSection
                globalTop={globalTop}
                privateTop={privateTop}
                myLeague={myLeague}
                globalRank={globalRank}
                privateRank={privateRank}
                userId={user.id}
                tournamentId={dash.tournament_id}
                onLeagueModal={setLeagueModal}
                navigate={navigate}
                globalTournaments={globalTournaments}
              />
            </div>
          </Card>
        )}
      </div>

      {/* LEAGUE MODAL */}
      {leagueModal && (
        <LeagueModal
          mode={leagueModal}
          userId={user.id}
          tournamentId={dash?.tournament_id}
          onClose={() => setLeagueModal(null)}
          onDone={fetchAll}
        />
      )}
    </div>
  )
}

// ── TOURNAMENT CARD ───────────────────────────────────────────────────────────
function TournamentCard({ t, isLocal, navigate }) {
  const accent = isLocal ? 'var(--cyan)' : 'var(--accent)'
  const accentDim = isLocal ? 'rgba(0,242,255,0.08)' : 'rgba(154,224,0,0.09)'
  const accentBorder = isLocal ? 'rgba(0,242,255,0.20)' : 'var(--border-accent)'
  const dest = isLocal ? `/local/${t.id}` : `/t/${t.slug}`
  const statusColors = { active: 'var(--accent)', upcoming: 'var(--gold)', live: 'var(--red)', completed: 'var(--text-faint)' }

  return (
    <div onClick={() => navigate(dest)} style={{ background: 'var(--bg-card)', border: `1px solid ${accentBorder}`, borderRadius: 'var(--card-radius)', overflow: 'hidden', marginBottom: 12, cursor: 'pointer', position: 'relative' }}>
      <div style={{ height: 2, background: accent }} />
      <div style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{t.flag_emoji || (isLocal ? '🏏' : '🏆')}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{t.season} · {t.format || 'T20'} · {t.total_matches} matches</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 'var(--pill-radius)', background: `${statusColors[t.status]}20`, color: statusColors[t.status] || 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.status}</span>
            <span style={{ fontSize: 10, color: 'var(--text-ghost)', background: 'var(--bg-card-alt)', padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{isLocal ? '📍 Local' : '🌍 Global'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '8px 12px', background: accentDim, border: `1px solid ${accentBorder}`, borderRadius: 'var(--btn-radius)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px', color: accent, textAlign: 'center', cursor: 'pointer' }}>
            View →
          </div>
          {t.has_fantasy && (
            <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card-alt)', border: '1px solid var(--border-card)', borderRadius: 'var(--btn-radius)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-dim)', textAlign: 'center', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); navigate(isLocal ? `/local/${t.id}?tab=fantasy` : `/t/${t.slug}?tab=fantasy`) }}>
              ⭐ Fantasy
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── LEADERBOARD SECTION ───────────────────────────────────────────────────────
function LeaderboardSection({ globalTop, privateTop, myLeague, globalRank, privateRank, userId, tournamentId, onLeagueModal, navigate, globalTournaments }) {
  const [tab, setTab] = useState('global')

  const tourney = globalTournaments.find(t => t.tournament_id === tournamentId || t.id === tournamentId)

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Leaderboard</div>
        {tourney && (
          <button onClick={() => navigate(`/t/${tourney.slug}?tab=leaderboard`)} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            View All →
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'var(--bg-card-alt)', borderRadius: 'var(--card-radius-sm)', padding: 3, gap: 3, marginBottom: 14 }}>
        {[['global', '🌍 Overall'], ['private', myLeague ? `🔒 ${myLeague.name}` : '🔒 My League']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: tab === k ? 'var(--bg-card)' : 'transparent', color: tab === k ? 'var(--text-primary)' : 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', boxShadow: tab === k ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Global leaderboard preview */}
      {tab === 'global' && (
        <>
          {globalRank && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(154,224,0,0.06)', border: '1px solid var(--border-accent)', borderRadius: 'var(--card-radius-sm)', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-dim)' }}>Your Global Rank</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--accent)' }}>#{globalRank.rank}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{fmt(globalRank.total_points)} pts</span>
              </div>
            </div>
          )}
          {globalTop.map((row, i) => <LeaderRow key={row.user_id} row={row} rank={row.rank} i={i} userId={userId} />)}
          {globalTop.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-faint)', fontSize: 13 }}>Rankings appear after Match 1</div>}
        </>
      )}

      {/* Private league tab */}
      {tab === 'private' && (
        <>
          {!myLeague ? (
            <div style={{ textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>No Private League</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16 }}>Battle your friends for bragging rights!</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => onLeagueModal('create')} style={{ flex: 1, padding: '11px', borderRadius: 'var(--btn-radius)', border: 'none', background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Create</button>
                <button onClick={() => onLeagueModal('join')} style={{ flex: 1, padding: '11px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Join</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>{myLeague.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Code: <strong style={{ color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(myLeague.invite_code)}>{myLeague.invite_code} 📋</strong></div>
                </div>
                {privateRank && <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--rank-color)' }}>#{privateRank.rank_in_league}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Your Rank</div>
                </div>}
              </div>
              {privateTop.map((row, i) => <LeaderRow key={row.user_id} row={row} rank={row.rank_in_league} i={i} userId={userId} />)}
            </>
          )}
        </>
      )}
    </div>
  )
}

function LeaderRow({ row, rank, i, userId }) {
  const isMe = row.user_id === userId
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--card-radius-sm)', background: isMe ? 'rgba(154,224,0,0.04)' : 'transparent', border: isMe ? '1px solid var(--border-accent)' : '1px solid transparent', marginBottom: 4 }}>
      <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 12, color: 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 700, flexShrink: 0 }}>
        {i < 3 ? medals[i] : `#${rank}`}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: isMe ? 800 : 600, color: isMe ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.team_name || row.full_name || 'User'}
          {isMe && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--accent)', color: '#000', padding: '1px 5px', borderRadius: 4, fontWeight: 900 }}>YOU</span>}
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: parseFloat(row.total_points) > 0 ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0 }}>
        {parseFloat(row.total_points || 0).toLocaleString()} pts
      </span>
    </div>
  )
}
