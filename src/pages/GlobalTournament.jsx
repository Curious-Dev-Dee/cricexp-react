
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, AVATAR_BASE, PLAYER_BASE, TEAM_LOGO_BASE } from '../lib/supabase'
import { Loader, Empty, RoleChip, PtsPill } from '../components/Shared'

// ── DESIGN TOKENS (Global = Electric Green — reads from CSS vars) ────────────
const G = {
  accent:             'var(--accent)',
  accentDim:          'var(--accent-dim)',
  accentMid:          'var(--accent-mid)',
  accentGlow:         'var(--accent-glow)',
  accentBorder:       'var(--border-accent)',
  accentBorderStrong: 'var(--border-accent-strong)',
}

const fmt = (n) => parseFloat(n || 0).toLocaleString()

export default function GlobalTournament({ user }) {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const [sp]        = useSearchParams()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading]       = useState(true)

  // Data
  const [myPoints, setMyPoints]         = useState(null)  // user_tournament_points row
  const [globalRank, setGlobalRank]     = useState(null)  // leaderboard_view row
  const [privateRank, setPrivateRank]   = useState(null)
  const [myLeague, setMyLeague]         = useState(null)
  const [nextMatch, setNextMatch]       = useState(null)
  const [myTeam, setMyTeam]             = useState(null)
  const [globalTop, setGlobalTop]       = useState([])
  const [privateTop, setPrivateTop]     = useState([])
  const [leagueTab, setLeagueTab]       = useState('global')
  const [leagueModal, setLeagueModal]   = useState(null)
  const [subsLeft, setSubsLeft]         = useState(null)

  useEffect(() => { fetchAll() }, [slug])

  const fetchAll = async () => {
    setLoading(true)
    const { data: t } = await supabase.from('global_tournaments').select('*').eq('slug', slug).single()
    if (!t) { setLoading(false); return }
    setTournament(t)
    const tid = t.tournament_id || t.id

    const [dashRes, matchRes, teamRes, leagueRes, lbRes] = await Promise.all([
      supabase.from('home_dashboard_view').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('matches')
        .select('*, team_a:real_teams!team_a_id(name, short_code, photo_name), team_b:real_teams!team_b_id(name, short_code, photo_name)')
        .eq('tournament_id', tid).in('status', ['upcoming', 'live']).order('original_start_time').limit(1).maybeSingle(),
      supabase.from('user_fantasy_teams').select('*, user_fantasy_team_players(player_id)').eq('tournament_id', tid).eq('user_id', user.id).maybeSingle(),
      supabase.from('league_members').select('league_id, leagues(id, name, invite_code)').eq('user_id', user.id).maybeSingle(),
      supabase.from('leaderboard_view').select('rank, total_points, team_name').eq('user_id', user.id).eq('tournament_id', tid).maybeSingle(),
    ])

    setNextMatch(matchRes.data)
    setMyTeam(teamRes.data)
    setGlobalRank(lbRes.data)

    // Subs from dashboard or team
    if (dashRes.data?.tournament_id === tid) {
      setSubsLeft(dashRes.data.subs_remaining)
    } else if (teamRes.data) {
      const config = t.config || {}
      const p2 = config.phases?.find(p => p.phase === 2)?.subs_allotted || 0
      const p4 = config.phases?.find(p => p.phase === 4)?.subs_allotted || 0
      setSubsLeft((p2 - (teamRes.data.subs_used_phase2 || 0)) + (p4 - (teamRes.data.subs_used_phase4 || 0)))
    }

    // Points
    const { data: pts } = await supabase.from('user_tournament_points').select('total_points, matches_counted').eq('user_id', user.id).eq('tournament_id', tid).maybeSingle()
    setMyPoints(pts)

    // Global top 3
    const { data: glbTop } = await supabase.from('leaderboard_view').select('user_id, team_name, full_name, total_points, rank').eq('tournament_id', tid).order('rank').limit(3)
    setGlobalTop(glbTop || [])

    // League
    if (leagueRes.data?.leagues) {
      const league = leagueRes.data.leagues
      setMyLeague(league)
      const [pvtRankRes, pvtTop] = await Promise.all([
        supabase.from('private_league_leaderboard').select('rank_in_league, total_points').eq('user_id', user.id).eq('league_id', league.id).maybeSingle(),
        supabase.from('private_league_leaderboard').select('user_id, team_name, full_name, total_points, rank_in_league').eq('league_id', league.id).order('rank_in_league').limit(3),
      ])
      setPrivateRank(pvtRankRes.data)
      setPrivateTop(pvtTop.data || [])
    }

    setLoading(false)
  }

  if (loading) return <Loader />
  if (!tournament) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Tournament not found</div>

  const isCompleted = tournament.status === 'completed'
  const bestRank    = Math.min(globalRank?.rank ?? Infinity, privateRank?.rank_in_league ?? Infinity)
  const displayRank = bestRank === Infinity ? 'Pre-Season' : `#${bestRank}`
  const tid         = tournament.tournament_id || tournament.id

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 40 }}>

      {/* STICKY HEADER */}
      <header style={{ background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 500 }}>
        <div style={{ maxWidth: 'var(--app-max)', margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/')} style={{ width: 36, height: 36, borderRadius: 'var(--btn-radius)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tournament.flag_emoji || '🏆'} {tournament.name}
            </div>
            <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{tournament.season} · {tournament.format || 'T20'} · {tournament.total_matches} matches</div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 'var(--app-max)', margin: '0 auto', padding: '16px 16px' }}>

        {/* ── USER STATS CARD ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 'var(--card-radius)', overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)', borderRadius: 'var(--card-radius) var(--card-radius) 0 0' }} />
          <div style={{ padding: '16px 18px 14px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-faint)', marginBottom: 12 }}>Your Fantasy</div>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--card-radius-sm)', border: '1px solid var(--border-subtle)', padding: '13px 8px' }}>
              <StatCell label="Total Points"  value={fmt(myPoints?.total_points || 0)} color="var(--text-primary)" />
              <Div />
              <StatCell label="Best Rank"     value={displayRank}   color="var(--accent)" />
              <Div />
              <StatCell label="Subs Left"     value={subsLeft === 999 ? '∞' : (subsLeft ?? '—')} color={subsLeft < 10 ? 'var(--red)' : 'var(--text-primary)'} />
              <Div />
              <StatCell label="Matches"       value={myPoints?.matches_counted ?? '—'} />
            </div>
          </div>
        </div>

        {/* ── NEXT MATCH CARD ── */}
        {!isCompleted && nextMatch && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--card-radius)', overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: 2, background: nextMatch.status === 'live' ? 'var(--red)' : 'var(--accent)' }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', padding: '3px 8px', borderRadius: 6 }}>
                  {nextMatch.status === 'live' ? '🔴 LIVE' : `MATCH #${nextMatch.match_number}`}
                </span>
                {nextMatch.venue && <span style={{ fontSize: 11, color: 'var(--text-faint)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {nextMatch.venue}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <TeamSide team={nextMatch.team_a} />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--text-faint)', fontSize: 18, flexShrink: 0 }}>VS</div>
                <TeamSide team={nextMatch.team_b} />
              </div>
              {nextMatch.original_start_time && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: 14 }}>
                  🕐 {new Date(nextMatch.original_start_time).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <a href="/team-builder" style={{ flex: 1.3, padding: '13px', borderRadius: 'var(--btn-radius)', border: 'none', background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✏️ Edit Team
                </a>
                <a href="/team-view" style={{ flex: 1, padding: '13px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border-card)', background: 'var(--bg-card-alt)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  👁 View Team
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD CARD ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--card-radius)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '16px 16px 14px' }}>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-card-alt)', borderRadius: 'var(--card-radius-sm)', padding: 3, gap: 3, marginBottom: 16 }}>
              {[['global', '🌍 Overall'], ['private', myLeague ? `🔒 ${myLeague.name}` : '🔒 My League']].map(([k, l]) => (
                <button key={k} onClick={() => setLeagueTab(k)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: leagueTab === k ? 'var(--bg-card)' : 'transparent', color: leagueTab === k ? 'var(--text-primary)' : 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', boxShadow: leagueTab === k ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* GLOBAL TAB */}
            {leagueTab === 'global' && (
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
                {globalTop.length === 0
                  ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-faint)', fontSize: 13, fontFamily: 'var(--font-body)' }}>Rankings appear after Match 1</div>
                  : globalTop.map((row, i) => <LeaderRow key={row.user_id} row={row} rank={row.rank} i={i} userId={user.id} />)
                }
                <a href="/leaderboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: '11px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', textDecoration: 'none', cursor: 'pointer' }}>
                  Full Leaderboard →
                </a>
              </>
            )}

            {/* PRIVATE LEAGUE TAB */}
            {leagueTab === 'private' && (
              <>
                {!myLeague ? (
                  <div style={{ textAlign: 'center', padding: '20px 16px' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>No Private League</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16 }}>Battle your friends for bragging rights!</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setLeagueModal('create')} style={{ flex: 1, padding: '11px', borderRadius: 'var(--btn-radius)', border: 'none', background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Create</button>
                      <button onClick={() => setLeagueModal('join')} style={{ flex: 1, padding: '11px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>Join</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>{myLeague.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                          Code: <strong style={{ color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(myLeague.invite_code)}>{myLeague.invite_code} 📋</strong>
                        </div>
                      </div>
                      {privateRank && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--rank-color)' }}>#{privateRank.rank_in_league}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Your Rank</div>
                        </div>
                      )}
                    </div>
                    {privateTop.map((row, i) => <LeaderRow key={row.user_id} row={row} rank={row.rank_in_league} i={i} userId={user.id} />)}
                    <a href={`/leaderboard?league_id=${myLeague.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: '11px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', textDecoration: 'none' }}>
                      Full League Leaderboard →
                    </a>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── COMPLETED TOURNAMENT — show leaderboard only ── */}
        {isCompleted && (
          <CompletedLeaderboard tid={tid} userId={user.id} />
        )}

      </div>

      {/* LEAGUE MODAL */}
      {leagueModal && (
        <LeagueModal mode={leagueModal} userId={user.id} onClose={() => setLeagueModal(null)} onDone={fetchAll} />
      )}
    </div>
  )
}

// ── COMPLETED LEADERBOARD ─────────────────────────────────────────────────────
function CompletedLeaderboard({ tid, userId }) {
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('leaderboard_view').select('user_id, team_name, full_name, total_points, rank').eq('tournament_id', tid).order('rank').limit(50)
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [tid])

  const myEntry = rows.find(r => r.user_id === userId)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--card-radius)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.3px' }}>🏆 Final Leaderboard</div>
      </div>
      {myEntry && (
        <div style={{ padding: '12px 16px', background: 'rgba(154,224,0,0.05)', borderBottom: '1px solid var(--border-accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-dim)' }}>Your Final Rank</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--accent)' }}>#{myEntry.rank}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{fmt(myEntry.total_points)} pts</span>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: '8px 0' }}>
        {loading
          ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-faint)' }}>Loading...</div>
          : rows.length === 0
          ? <Empty icon="📊" title="No data" text="Leaderboard not available" />
          : rows.map((row, i) => <LeaderRow key={row.user_id} row={row} rank={row.rank} i={i} userId={userId} />)
        }
      </div>
    </div>
  )
}

// ── LEAGUE MODAL ──────────────────────────────────────────────────────────────
function LeagueModal({ mode, onClose, userId, onDone }) {
  const [val, setVal]       = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState(null)

  const handle = async () => {
    if (!val.trim()) return
    setLoading(true); setMsg(null)
    try {
      if (mode === 'create') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { data: league, error } = await supabase.from('leagues').insert([{ name: val.trim(), invite_code: code, owner_id: userId }]).select().single()
        if (error) throw error
        await supabase.from('league_members').insert([{ league_id: league.id, user_id: userId }])
        setMsg(`✅ Created! Code: ${code}`)
        setTimeout(() => { onDone(); onClose() }, 1500)
      } else {
        const { data: league } = await supabase.from('leagues').select('id').eq('invite_code', val.trim().toUpperCase()).maybeSingle()
        if (!league) throw new Error('Invalid code')
        const { error } = await supabase.from('league_members').insert([{ league_id: league.id, user_id: userId }])
        if (error) throw new Error('Already in this league or join failed')
        setMsg('✅ Joined!')
        setTimeout(() => { onDone(); onClose() }, 1200)
      }
    } catch (e) { setMsg('❌ ' + e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)', borderRadius: 'var(--card-radius)', padding: '28px 24px', width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 20 }}>
          {mode === 'create' ? '🏆 Create League' : '🔑 Join League'}
        </div>
        <input value={val} onChange={e => setVal(e.target.value)} placeholder={mode === 'create' ? 'League name...' : 'Enter invite code...'} autoFocus
          style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', padding: '12px 14px', borderRadius: 'var(--btn-radius)', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}
          onKeyDown={e => e.key === 'Enter' && handle()} />
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

// ── HELPERS ───────────────────────────────────────────────────────────────────
function TeamSide({ team }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      {team?.photo_name
        ? <img src={`${TEAM_LOGO_BASE}${team.photo_name}`} alt={team.short_code} style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 6px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.1))' }} onError={e => e.target.style.display = 'none'} />
        : <div style={{ fontSize: 32, marginBottom: 6 }}>🏏</div>
      }
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16 }}>{team?.short_code || 'TBA'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{team?.name}</div>
    </div>
  )
}

function StatCell({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-faint)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Div() {
  return <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch', margin: '0 4px' }} />
}

function LeaderRow({ row, rank, i, userId }) {
  const isMe    = row.user_id === userId
  const medals  = ['🥇', '🥈', '🥉']
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
        {fmt(row.total_points)} pts
      </span>
    </div>
  )
}