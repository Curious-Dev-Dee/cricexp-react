
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, AVATAR_BASE, PLAYER_BASE } from '../lib/supabase'
import { Loader, Skeleton, Empty, RoleChip, Eyebrow, PtsPill, Btn } from '../components/Shared'

// ── DESIGN TOKENS (Global = Electric Green) ─────────────────────────────────
const G = {
  accent:     '#9AE000',
  accentDim:  'rgba(154,224,0,0.09)',
  accentMid:  'rgba(154,224,0,0.18)',
  accentGlow: 'rgba(154,224,0,0.28)',
  accentBorder: 'rgba(154,224,0,0.20)',
  accentBorderStrong: 'rgba(154,224,0,0.35)',
}

const TABS_COMPLETED = [
  { key: 'leaderboard', label: '🏆 Leaderboard' },
  { key: 'leagues',     label: '🔒 Leagues' },
]
const TABS_ACTIVE = [
  { key: 'leaderboard', label: '🏆 Leaderboard' },
  { key: 'myteam',      label: '👤 My Team' },
  { key: 'nextmatch',   label: '🎯 Next Match' },
  { key: 'pickteam',    label: '✏️ Pick Team' },
  { key: 'subs',        label: '🔄 Transfers' },
  { key: 'scout',       label: '🔍 Scout' },
  { key: 'leagues',     label: '🔒 Leagues' },
]

export default function GlobalTournament({ user }) {
  const { slug }             = useParams()
  const navigate             = useNavigate()
  const [sp]                 = useSearchParams()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab]        = useState(sp.get('tab') || 'leaderboard')
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState([])
  const [leagues, setLeagues]         = useState([])
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [leagueBoard, setLeagueBoard]       = useState([])
  const [myTeam, setMyTeam]           = useState(null)
  const [myTeamPlayers, setMyTeamPlayers]   = useState([])
  const [nextMatch, setNextMatch]     = useState(null)
  const [allPlayers, setAllPlayers]   = useState([])
  const [realTeams, setRealTeams]     = useState([])

  useEffect(() => { fetchTournament() }, [slug])

  const fetchTournament = async () => {
    const { data: t } = await supabase.from('global_tournaments').select('*').eq('slug', slug).single()
    setTournament(t)
    if (!t) { setLoading(false); return }
    await Promise.all([fetchLeaderboard(t), fetchLeagues(t), fetchMyTeam(t), fetchNextMatch(t)])
    setLoading(false)
  }

  const fetchLeaderboard = async (t) => {
    const tid = t.tournament_id || t.id
    const { data: pts } = await supabase.from('user_tournament_points')
      .select('user_id, total_points, matches_counted')
      .eq('tournament_id', tid).order('total_points', { ascending: false }).limit(300)
    if (!pts?.length) return setLeaderboard([])
    const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name, team_name, team_photo_url').in('user_id', pts.map(r => r.user_id))
    const pm = {}; profiles?.forEach(p => pm[p.user_id] = p)
    setLeaderboard(pts.map((r, i) => ({ ...r, rank: i + 1, ...pm[r.user_id] })))
  }

  const fetchLeagues = async (t) => {
    const { data: lm } = await supabase.from('league_members').select('league_id, leagues(id, name, invite_code)').eq('user_id', user.id)
    setLeagues(lm?.map(m => m.leagues).filter(Boolean) || [])
  }

  const fetchMyTeam = async (t) => {
    const tid = t.tournament_id || t.id
    let ft = null
    const r1 = await supabase.from('user_fantasy_teams').select('*').eq('tournament_id', tid).eq('user_id', user.id).maybeSingle()
    ft = r1.data
    if (!ft && tid !== t.id) {
      const r2 = await supabase.from('user_fantasy_teams').select('*').eq('tournament_id', t.id).eq('user_id', user.id).maybeSingle()
      ft = r2.data
    }
    if (!ft) return
    setMyTeam(ft)
    const { data: tp } = await supabase.from('user_fantasy_team_players').select('player_id, position').eq('user_fantasy_team_id', ft.id)
    if (tp?.length) {
      const pids = tp.map(p => p.player_id)
      const { data: players } = await supabase.from('players').select('id, name, role, credit, photo_url, real_team_id').in('id', pids)
      const { data: rts }     = await supabase.from('real_teams').select('id, name, short_code').eq('tournament_id', tid)
      const rtm = {}; rts?.forEach(r => rtm[r.id] = r)
      setMyTeamPlayers(tp.map(p => ({ ...p, ...players?.find(x => x.id === p.player_id), team: rtm[players?.find(x => x.id === p.player_id)?.real_team_id] })))
    }
  }

  const fetchNextMatch = async (t) => {
    const tid = t.tournament_id || t.id
    const { data: m } = await supabase.from('matches')
      .select('*, team_a:real_teams!team_a_id(name, short_code), team_b:real_teams!team_b_id(name, short_code)')
      .eq('tournament_id', tid).in('status', ['upcoming', 'live']).order('original_start_time').limit(1).maybeSingle()
    setNextMatch(m)
  }

  const fetchAllPlayers = async () => {
    if (allPlayers.length) return
    const tid = tournament.tournament_id || tournament.id
    const { data: players } = await supabase.from('players').select('*, real_teams(name, short_code)').eq('tournament_id', tid).eq('is_active', true).order('credit', { ascending: false })
    const { data: rts }     = await supabase.from('real_teams').select('*').eq('tournament_id', tid)
    setAllPlayers(players || [])
    setRealTeams(rts || [])
  }

  useEffect(() => {
    if ((tab === 'pickteam' || tab === 'subs' || tab === 'scout') && tournament) fetchAllPlayers()
  }, [tab, tournament])

  const loadLeagueBoard = async (lid) => {
    setSelectedLeague(lid); setLeagueBoard([])
    const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', lid)
    if (!members?.length) return
    const uids = members.map(m => m.user_id)
    const tid  = tournament.tournament_id || tournament.id
    const { data: pts } = await supabase.from('user_tournament_points').select('user_id, total_points').eq('tournament_id', tid).in('user_id', uids).order('total_points', { ascending: false })
    if (!pts?.length) return
    const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name, team_name, team_photo_url').in('user_id', uids)
    const pm = {}; profiles?.forEach(p => pm[p.user_id] = p)
    setLeagueBoard(pts.map((r, i) => ({ ...r, rank: i + 1, ...pm[r.user_id] })))
  }

  if (loading) return <Loader />
  if (!tournament) return <div style={{ padding:40, textAlign:'center', color:'var(--text-faint)' }}>Tournament not found</div>

  const isCompleted = tournament.status === 'completed'
  const tabs        = isCompleted ? TABS_COMPLETED : TABS_ACTIVE
  const config      = tournament.config || {}
  const myEntry     = leaderboard.find(r => r.user_id === user.id)
  const myRank      = myEntry ? leaderboard.indexOf(myEntry) + 1 : null
  const phase       = myTeam?.current_phase || 1
  const p2cfg       = config.phases?.find(p => p.phase === 2)
  const p4cfg       = config.phases?.find(p => p.phase === 4)
  const subsLeft2   = (p2cfg?.subs_allotted || 0) - (myTeam?.subs_used_phase2 || 0)
  const subsLeft4   = (p4cfg?.subs_allotted || 0) - (myTeam?.subs_used_phase4 || 0)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)' }}>
      {/* STICKY HEADER */}
      <header style={{ background:'rgba(2,6,23,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:500 }}>
        <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'0 16px', height:56, display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate('/')} style={{ width:36, height:36, borderRadius:'var(--btn-radius)', background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-card)', color:'var(--text-primary)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, textTransform:'uppercase', letterSpacing:'0.5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {tournament.flag_emoji || '🏆'} {tournament.name}
            </div>
            <div style={{ color:'var(--text-faint)', fontSize:11 }}>{tournament.season} · {tournament.status} · {tournament.total_matches} matches</div>
          </div>
          {myEntry && (
            <div style={{ background:'var(--bg-card)', border:`1px solid ${G.accentBorder}`, padding:'6px 14px', borderRadius:10, textAlign:'center', flexShrink:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:900, color:G.accent, lineHeight:1 }}>{parseFloat(myEntry.total_points).toLocaleString()}</div>
              <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>Rank #{myRank}</div>
            </div>
          )}
        </div>
        {/* TABS */}
        <div style={{ overflowX:'auto', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', padding:'0 16px', maxWidth:'var(--app-max)', margin:'0 auto' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding:'11px 16px', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap',
                color: tab === t.key ? G.accent : 'var(--text-faint)',
                borderBottom: tab === t.key ? `2px solid ${G.accent}` : '2px solid transparent',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.5px', textTransform:'uppercase',
                transition:'color 0.15s'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'20px 16px' }}>
        {tab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} userId={user.id} myRank={myRank} myEntry={myEntry} accent={G.accent} />}
        {tab === 'myteam'      && <MyTeamTab myTeam={myTeam} players={myTeamPlayers} phase={phase} subsLeft2={subsLeft2} subsLeft4={subsLeft4} config={config} accent={G.accent} />}
        {tab === 'nextmatch'   && <NextMatchTab nextMatch={nextMatch} myTeam={myTeam} config={config} subsLeft2={subsLeft2} subsLeft4={subsLeft4} phase={phase} accent={G.accent} />}
        {tab === 'pickteam'    && <PickTeamTab players={allPlayers} realTeams={realTeams} config={config} myTeam={myTeam} myTeamPlayers={myTeamPlayers} userId={user.id} tournament={tournament} onRefresh={() => fetchMyTeam(tournament)} accent={G.accent} />}
        {tab === 'subs'        && <SubsTab players={allPlayers} myTeam={myTeam} myTeamPlayers={myTeamPlayers} config={config} subsLeft2={subsLeft2} subsLeft4={subsLeft4} phase={phase} accent={G.accent} />}
        {tab === 'scout'       && <ScoutTab players={allPlayers} realTeams={realTeams} accent={G.accent} />}
        {tab === 'leagues'     && <LeaguesTab leagues={leagues} selectedLeague={selectedLeague} leagueBoard={leagueBoard} onSelect={loadLeagueBoard} userId={user.id} accent={G.accent} />}
      </div>
    </div>
  )
}

// ── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardTab({ leaderboard, userId, myRank, myEntry, accent }) {
  return (
    <div>
      {myEntry && (
        <div style={{ background:`rgba(154,224,0,0.06)`, border:`1px solid rgba(154,224,0,0.2)`, borderRadius:'var(--card-radius)', padding:'16px 20px', marginBottom:16, display:'flex', gap:24 }}>
          <StatCell label="Your Rank" value={`#${myRank}`} color={accent} />
          <StatCell label="Total Points" value={parseFloat(myEntry.total_points).toLocaleString()} color="var(--text-primary)" />
          <StatCell label="Matches" value={myEntry.matches_counted || '—'} />
        </div>
      )}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'48px 40px 1fr 90px', gap:8, padding:'10px 16px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
          {['Rank','','Player','Points'].map((h,i) => <span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.8px', textAlign: i===3 ? 'right' : 'left' }}>{h}</span>)}
        </div>
        {leaderboard.length === 0
          ? <Empty icon="📊" title="No data yet" text="Leaderboard updates after matches are processed" />
          : leaderboard.map((row, i) => (
            <div key={row.user_id} style={{ display:'grid', gridTemplateColumns:'48px 40px 1fr 90px', gap:8, padding:'11px 16px', borderBottom:'1px solid var(--border-subtle)', background: row.user_id===userId ? `rgba(154,224,0,0.04)` : 'transparent', alignItems:'center' }}>
              <div style={{ textAlign:'center' }}><RankMedal rank={i+1} /></div>
              <TeamAvatar url={row.team_photo_url} name={row.full_name} />
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight: row.user_id===userId ? 800 : 600, color: row.user_id===userId ? accent : 'var(--text-primary)' }}>
                  {row.full_name || 'User'}
                  {row.user_id===userId && <span style={{ marginLeft:6, fontSize:10, background:accent, color:'#000', padding:'1px 6px', borderRadius:4, fontWeight:900 }}>YOU</span>}
                </div>
                {row.team_name && <div style={{ fontSize:11, color:'var(--text-faint)' }}>{row.team_name}</div>}
              </div>
              <div style={{ textAlign:'right' }}><PtsPill pts={row.total_points} /></div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── MY TEAM ──────────────────────────────────────────────────────────────────
function MyTeamTab({ myTeam, players, phase, subsLeft2, subsLeft4, config, accent }) {
  if (!myTeam) return <Empty icon="✏️" title="No team yet" text="Go to Pick Team to build your fantasy XI" />
  const cap = players.find(p => p.player_id === myTeam.captain_id)
  const vc  = players.find(p => p.player_id === myTeam.vice_captain_id)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        <StatBox label="Phase" value={`Phase ${phase}`} accent={accent} />
        <StatBox label="P2 Subs Left" value={`${subsLeft2}`} accent={accent} color={subsLeft2>5?accent:'var(--red)'} />
        <StatBox label="P4 Subs Left" value={`${subsLeft4}`} accent={accent} color={subsLeft4>0?accent:'var(--text-faint)'} />
      </div>
      {(cap||vc) && (
        <div style={{ background:`rgba(154,224,0,0.06)`, border:`1px solid rgba(154,224,0,0.18)`, borderRadius:'var(--card-radius-sm)', padding:'12px 16px', marginBottom:16, display:'flex', gap:20 }}>
          {cap && <div><Eyebrow>Captain (2×)</Eyebrow><div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15 }}>{cap.name}</div></div>}
          {vc  && <div style={{ borderLeft:'1px solid var(--border)', paddingLeft:20 }}><Eyebrow>Vice Capt (1.5×)</Eyebrow><div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15 }}>{vc.name}</div></div>}
        </div>
      )}
      <PlayerList players={players} myTeam={myTeam} accent={accent} />
    </div>
  )
}

// ── NEXT MATCH ───────────────────────────────────────────────────────────────
function NextMatchTab({ nextMatch, myTeam, config, subsLeft2, subsLeft4, phase, accent }) {
  const [now] = useState(new Date())
  if (!nextMatch) return <Empty icon="📅" title="No upcoming matches" text="All matches have been played" />
  const lockTime = nextMatch.locked_at ? new Date(nextMatch.locked_at) : nextMatch.original_start_time ? new Date(nextMatch.original_start_time) : null
  const isLocked = lockTime && now > lockTime
  return (
    <div>
      <div style={{ background:'var(--bg-card)', border:`1px solid ${isLocked ? 'rgba(239,68,68,0.3)' : 'rgba(154,224,0,0.2)'}`, borderRadius:'var(--card-radius)', overflow:'hidden', marginBottom:16 }}>
        {/* Top bar */}
        <div style={{ height:3, background: isLocked ? 'var(--red)' : accent }} />
        <div style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'1.5px' }}>Match #{nextMatch.match_number}</span>
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:'var(--pill-radius)', background: nextMatch.status==='live' ? 'rgba(239,68,68,0.12)' : 'var(--bg-card-alt)', color: nextMatch.status==='live' ? 'var(--red)' : 'var(--text-faint)', fontFamily:'var(--font-display)', fontWeight:700 }}>
              {nextMatch.status === 'live' ? '🔴 LIVE' : nextMatch.status?.toUpperCase()}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:20 }}>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:28, marginBottom:4 }}>🏏</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18 }}>{nextMatch.team_a?.short_code || 'TBA'}</div>
              <div style={{ fontSize:11, color:'var(--text-faint)' }}>{nextMatch.team_a?.name}</div>
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--text-faint)' }}>VS</div>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:28, marginBottom:4 }}>🏏</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18 }}>{nextMatch.team_b?.short_code || 'TBA'}</div>
              <div style={{ fontSize:11, color:'var(--text-faint)' }}>{nextMatch.team_b?.name}</div>
            </div>
          </div>
          {nextMatch.venue && <div style={{ textAlign:'center', color:'var(--text-faint)', fontSize:12, marginBottom:6 }}>📍 {nextMatch.venue}</div>}
          {nextMatch.original_start_time && <div style={{ textAlign:'center', color:'var(--text-faint)', fontSize:12 }}>🕐 {new Date(nextMatch.original_start_time).toLocaleString()}</div>}
        </div>
        <div style={{ borderTop:'1px solid var(--border)', padding:'13px 20px', background: isLocked ? 'rgba(239,68,68,0.05)' : 'rgba(154,224,0,0.03)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>{isLocked ? '🔒' : '🔓'}</span>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color: isLocked ? 'var(--red)' : accent }}>{isLocked ? 'Team locked' : 'Team editable'}</div>
            {lockTime && <div style={{ fontSize:11, color:'var(--text-faint)' }}>Deadline: {lockTime.toLocaleString()}</div>}
          </div>
        </div>
      </div>
      {myTeam && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', padding:'18px 20px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>Your Fantasy Status</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14 }}>
            <StatBox label="Phase" value={`Phase ${phase}`} accent={accent} />
            <StatBox label="P2 Subs Left" value={`${subsLeft2}`} accent={accent} color={subsLeft2>0?accent:'var(--red)'} />
          </div>
          <div style={{ background:'var(--bg-card-alt)', borderRadius:'var(--card-radius-sm)', padding:'12px 14px', fontSize:12, color:'var(--text-faint)', lineHeight:1.7 }}>
            📋 <strong style={{ color:'var(--text-dim)' }}>Sub Rules:</strong> Free pick before Match 1 · {p2cfg(config)} subs in group stage · Free XI for knockouts · {p4cfg(config)} subs in knockouts
          </div>
        </div>
      )}
    </div>
  )
  function p2cfg(c) { return c.phases?.find(p=>p.phase===2)?.subs_allotted || '—' }
  function p4cfg(c) { return c.phases?.find(p=>p.phase===4)?.subs_allotted || '—' }
}

// ── PICK TEAM ────────────────────────────────────────────────────────────────
function PickTeamTab({ players, realTeams, config, myTeam, myTeamPlayers, userId, tournament, onRefresh, accent }) {
  const [selected, setSelected] = useState(new Set(myTeamPlayers.map(p => p.player_id)))
  const [captain, setCaptain]   = useState(myTeam?.captain_id || null)
  const [vc, setVc]             = useState(myTeam?.vice_captain_id || null)
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  const maxSize = config.team_size || 11; const maxCred = config.max_credits || 100
  const minWk = config.min_wk||1; const minBat = config.min_bat||3; const minBowl = config.min_bowl||3; const minAr = config.min_ar||1

  const selP    = players.filter(p => selected.has(p.id))
  const usedC   = selP.reduce((s,p) => s + parseFloat(p.credit||0), 0)
  const counts  = { WK:0, BAT:0, BOWL:0, AR:0 }
  selP.forEach(p => counts[p.role] = (counts[p.role]||0)+1)

  const toggle = (p) => {
    const ns = new Set(selected)
    if (ns.has(p.id)) { ns.delete(p.id); if (captain===p.id) setCaptain(null); if (vc===p.id) setVc(null) }
    else if (ns.size < maxSize) {
      if (usedC + parseFloat(p.credit||0) > maxCred) return setMsg(`Not enough credits`)
      ns.add(p.id)
    }
    setSelected(ns); setMsg(null)
  }

  const valid = selected.size===maxSize && captain && vc && captain!==vc && counts.WK>=minWk && counts.BAT>=minBat && counts.BOWL>=minBowl && counts.AR>=minAr

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      const tid = tournament.tournament_id || tournament.id
      const { data: ft, error: fte } = await supabase.from('user_fantasy_teams').upsert({ user_id: userId, tournament_id: tid, captain_id: captain, vice_captain_id: vc, total_credits: usedC, updated_at: new Date().toISOString() }, { onConflict: 'user_id,tournament_id' }).select().single()
      if (fte) throw fte
      await supabase.from('user_fantasy_team_players').delete().eq('user_fantasy_team_id', ft.id)
      await supabase.from('user_fantasy_team_players').insert([...selected].map(pid => ({ user_fantasy_team_id: ft.id, player_id: pid, position: null })))
      setMsg('✅ Team saved!'); onRefresh()
    } catch (e) { setMsg('❌ ' + e.message) }
    setSaving(false)
  }

  const filtered = players.filter(p => (filterTeam==='all'||p.real_team_id===filterTeam) && (filterRole==='all'||p.role===filterRole))

  return (
    <div>
      {/* Summary bar */}
      <div style={{ background:'var(--bg-card)', border:`1px solid ${G.accentBorder}`, borderRadius:'var(--card-radius)', padding:'14px 18px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom: msg ? 8 : 0 }}>
          <MiniStat label="Players" value={`${selected.size}/${maxSize}`} color={selected.size===maxSize?accent:'var(--text-primary)'} />
          <MiniStat label="Credits" value={`${usedC.toFixed(1)}/${maxCred}`} color={usedC>maxCred?'var(--red)':accent} />
          <MiniStat label="WK" value={`${counts.WK}/${minWk}`} />
          <MiniStat label="BAT" value={`${counts.BAT}/${minBat}`} />
          <MiniStat label="BOWL" value={`${counts.BOWL}/${minBowl}`} />
          <MiniStat label="AR" value={`${counts.AR}/${minAr}`} />
        </div>
        {msg && <div style={{ fontSize:12, color: msg.startsWith('✅')?accent:'var(--red)', marginTop:6 }}>{msg}</div>}
      </div>

      {/* Save + filters row */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)} style={selStyle}>
          <option value="all">All Teams</option>
          {realTeams.map(rt=><option key={rt.id} value={rt.id}>{rt.short_code||rt.name}</option>)}
        </select>
        {['all','BAT','BOWL','AR','WK'].map(r=>(
          <button key={r} onClick={()=>setFilterRole(r)} style={{ padding:'7px 14px', borderRadius:'var(--pill-radius)', border:'1px solid', borderColor:filterRole===r?accent:'var(--border)', background:filterRole===r?`rgba(154,224,0,0.12)`:'var(--bg-card)', color:filterRole===r?accent:'var(--text-faint)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, cursor:'pointer', textTransform:'uppercase' }}>{r}</button>
        ))}
        <button onClick={save} disabled={!valid||saving} style={{ marginLeft:'auto', background:valid?accent:'var(--bg-card-alt)', color:valid?'#000':'var(--text-faint)', border:'none', padding:'9px 20px', borderRadius:'var(--btn-radius)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, textTransform:'uppercase', cursor:valid?'pointer':'not-allowed', letterSpacing:'0.5px' }}>
          {saving?'Saving…':'💾 Save'}
        </button>
      </div>

      {/* C/VC hint */}
      {selected.size>0 && (
        <div style={{ padding:'9px 14px', background:'var(--bg-card-alt)', borderRadius:'var(--card-radius-sm)', marginBottom:12, fontSize:12, color:'var(--text-faint)' }}>
          Tap player name to cycle: <strong style={{ color:accent }}>C (2×)</strong> → <strong style={{ color:'var(--text-dim)' }}>VC (1.5×)</strong> → clear · C: <strong style={{ color:accent }}>{players.find(p=>p.id===captain)?.name||'None'}</strong> · VC: <strong style={{ color:'var(--text-dim)' }}>{players.find(p=>p.id===vc)?.name||'None'}</strong>
        </div>
      )}

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 50px 55px 36px', gap:8, padding:'10px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
          {['','Player','Role','CR',''].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.5px', textAlign: i===3?'right':'left' }}>{h}</span>)}
        </div>
        {filtered.map(p => {
          const isSel = selected.has(p.id); const isCap = captain===p.id; const isVC = vc===p.id
          return (
            <div key={p.id} style={{ display:'grid', gridTemplateColumns:'32px 1fr 50px 55px 36px', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', background:isSel?`rgba(154,224,0,0.03)`:'transparent', alignItems:'center' }}>
              <PlayerPhoto url={p.photo_url} name={p.name} size={28} />
              <div>
                <button onClick={() => {
                  if (!isSel) return
                  if (!isCap && !isVC) setCaptain(p.id)
                  else if (isCap) { setCaptain(vc); setVc(p.id) }
                  else setVc(null)
                }} style={{ background:'none', border:'none', padding:0, color:'inherit', textAlign:'left', cursor:isSel?'pointer':'default', width:'100%' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:isSel?700:500 }}>
                    {p.name}
                    {isCap && <span style={{ marginLeft:5, fontSize:10, background:accent, color:'#000', padding:'1px 5px', borderRadius:4, fontWeight:900 }}>C</span>}
                    {isVC  && <span style={{ marginLeft:4, fontSize:10, background:'var(--bg-card-alt)', color:'var(--text-dim)', padding:'1px 5px', borderRadius:4, fontWeight:700, border:'1px solid var(--border)' }}>VC</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-faint)' }}>{p.real_teams?.short_code||p.real_teams?.name}</div>
                </button>
              </div>
              <div><RoleChip role={p.role} /></div>
              <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)', fontWeight:700 }}>{p.credit}</div>
              <div style={{ textAlign:'right' }}>
                <button onClick={()=>toggle(p)} style={{ width:28, height:28, borderRadius:6, border:`2px solid ${isSel?accent:'var(--border)'}`, background:isSel?`rgba(154,224,0,0.15)`:'var(--bg-card-alt)', color:isSel?accent:'var(--text-faint)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  {isSel?'✓':'+'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TRANSFERS ────────────────────────────────────────────────────────────────
function SubsTab({ myTeam, myTeamPlayers, config, subsLeft2, subsLeft4, phase, accent }) {
  if (!myTeam) return <Empty icon="📝" title="Create your team first" text="Go to Pick Team to set up your XI" />
  const phaseInfo = {
    1: 'Phase 1 — Free pick before Match 1. Unlimited changes.',
    2: `Phase 2 — Group Stage. ${subsLeft2} transfer${subsLeft2!==1?'s':''} remaining.`,
    3: 'Phase 3 — Free pick for knockouts. Build a fresh XI.',
    4: `Phase 4 — Knockouts. ${subsLeft4} transfer${subsLeft4!==1?'s':''} remaining.`,
  }
  return (
    <div>
      <div style={{ background:'var(--bg-card)', border:`1px solid ${G.accentBorder}`, borderRadius:'var(--card-radius)', padding:'18px 20px', marginBottom:16 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, textTransform:'uppercase', letterSpacing:'0.5px', color:accent, marginBottom:14 }}>📋 Substitution Rules</div>
        {[1,2,3,4].map(ph => {
          const cfg = config.phases?.find(p=>p.phase===ph)
          return (
            <div key={ph} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10, paddingBottom:10, borderBottom: ph<4?'1px solid var(--border-subtle)':'none' }}>
              <div style={{ width:24, height:24, borderRadius:6, background: phase===ph?`rgba(154,224,0,0.15)`:'var(--bg-card-alt)', border:`1px solid ${phase===ph?G.accentBorder:'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'var(--font-display)', fontWeight:900, fontSize:11, color:phase===ph?accent:'var(--text-faint)' }}>{ph}</div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color: phase===ph?accent:'var(--text-dim)' }}>{cfg?.name || `Phase ${ph}`}</div>
                <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:2 }}>{cfg?.is_free ? 'Free unlimited changes' : `${cfg?.subs_allotted||'—'} transfers total`} · Matches {cfg?.match_start}–{cfg?.match_end}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ background:`rgba(154,224,0,0.05)`, border:`1px solid rgba(154,224,0,0.15)`, borderRadius:'var(--card-radius-sm)', padding:'12px 16px', marginBottom:16 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:accent, marginBottom:8 }}>{phaseInfo[phase]}</div>
        <div style={{ display:'flex', gap:16 }}>
          <MiniStat label="P2 Subs Left" value={`${subsLeft2}`} color={subsLeft2>5?accent:'var(--red)'} />
          <MiniStat label="P4 Subs Left" value={`${subsLeft4}`} color={subsLeft4>0?accent:'var(--text-faint)'} />
          <MiniStat label="Reward Subs" value={myTeam.reward_subs||0} color="var(--cyan)" />
        </div>
      </div>
      <PlayerList players={myTeamPlayers} myTeam={myTeam} accent={accent} />
    </div>
  )
}

// ── SCOUT ────────────────────────────────────────────────────────────────────
function ScoutTab({ players, realTeams, accent }) {
  const [sortBy, setSortBy]         = useState('credit')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [search, setSearch]         = useState('')

  const sorted = [...players]
    .filter(p => (filterTeam==='all'||p.real_team_id===filterTeam) && (filterRole==='all'||p.role===filterRole) && (!search||p.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => parseFloat(b[sortBy]||0)-parseFloat(a[sortBy]||0))

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player…" style={{ flex:1, minWidth:140, background:'var(--bg-card)', border:'1px solid var(--border-card)', color:'var(--text-primary)', padding:'9px 12px', borderRadius:'var(--btn-radius)', fontSize:13, outline:'none', fontFamily:'var(--font-body)' }} />
        <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)} style={selStyle}>
          <option value="all">All Teams</option>
          {realTeams.map(rt=><option key={rt.id} value={rt.id}>{rt.short_code}</option>)}
        </select>
        {['all','BAT','BOWL','AR','WK'].map(r=>(
          <button key={r} onClick={()=>setFilterRole(r)} style={{ padding:'7px 12px', borderRadius:'var(--pill-radius)', border:'1px solid', borderColor:filterRole===r?accent:'var(--border)', background:filterRole===r?`rgba(154,224,0,0.12)`:'var(--bg-card)', color:filterRole===r?accent:'var(--text-faint)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, cursor:'pointer' }}>{r}</button>
        ))}
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 50px 55px', gap:8, padding:'10px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
          {['','Player','Role','CR'].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:i===3?'right':'left' }}>{h}</span>)}
        </div>
        {sorted.slice(0,80).map(p => (
          <div key={p.id} style={{ display:'grid', gridTemplateColumns:'32px 1fr 50px 55px', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', alignItems:'center' }}>
            <PlayerPhoto url={p.photo_url} name={p.name} size={28} />
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>{p.name}</div>
              <div style={{ fontSize:11, color:'var(--text-faint)' }}>{p.real_teams?.short_code||p.real_teams?.name}</div>
            </div>
            <div><RoleChip role={p.role} /></div>
            <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)', fontWeight:700 }}>{p.credit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── LEAGUES ──────────────────────────────────────────────────────────────────
function LeaguesTab({ leagues, selectedLeague, leagueBoard, onSelect, userId, accent }) {
  if (!leagues.length) return <Empty icon="🔒" title="No private leagues" text="Join a league with an invite code to compete with friends" />
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {leagues.map(l => (
          <button key={l.id} onClick={()=>onSelect(l.id)} style={{ padding:'8px 18px', borderRadius:'var(--pill-radius)', border:'1px solid', borderColor:selectedLeague===l.id?accent:'var(--border)', background:selectedLeague===l.id?`rgba(154,224,0,0.12)`:'var(--bg-card)', color:selectedLeague===l.id?accent:'var(--text-faint)', fontFamily:'var(--font-display)', fontWeight:selectedLeague===l.id?800:600, fontSize:13, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.3px' }}>
            {l.name}
          </button>
        ))}
      </div>
      {selectedLeague ? (
        leagueBoard.length === 0
          ? <Empty icon="📊" title="No data" text="No points recorded for this league yet" />
          : <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
              {leagueBoard.map((row, i) => (
                <div key={row.user_id} style={{ display:'flex', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border-subtle)', background: row.user_id===userId?`rgba(154,224,0,0.04)`:'transparent', alignItems:'center' }}>
                  <RankMedal rank={i+1} />
                  <TeamAvatar url={row.team_photo_url} name={row.full_name} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight: row.user_id===userId?800:600, color: row.user_id===userId?accent:'var(--text-primary)', fontSize:14 }}>
                      {row.full_name}
                      {row.user_id===userId && <span style={{ marginLeft:6, fontSize:10, background:accent, color:'#000', padding:'1px 5px', borderRadius:4, fontWeight:900 }}>YOU</span>}
                    </div>
                    {row.team_name && <div style={{ fontSize:11, color:'var(--text-faint)' }}>{row.team_name}</div>}
                  </div>
                  <PtsPill pts={row.total_points} />
                </div>
              ))}
            </div>
      ) : <Empty icon="👆" title="Select a league" text="Pick a league above to see its leaderboard" />}
    </div>
  )
}

// ── SHARED HELPERS ───────────────────────────────────────────────────────────
function PlayerList({ players, myTeam, accent }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 50px 55px', gap:8, padding:'10px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
        {['','Player','Role','CR'].map((h,i) => <span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:i===3?'right':'left' }}>{h}</span>)}
      </div>
      {players.map((p,i) => {
        const isCap = p.player_id===myTeam?.captain_id; const isVC = p.player_id===myTeam?.vice_captain_id
        return (
          <div key={p.player_id||i} style={{ display:'grid', gridTemplateColumns:'32px 1fr 50px 55px', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', alignItems:'center' }}>
            <PlayerPhoto url={p.photo_url} name={p.name} size={28} />
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>
                {p.name}
                {isCap && <span style={{ marginLeft:5, fontSize:10, background:accent, color:'#000', padding:'1px 5px', borderRadius:4, fontWeight:900 }}>C</span>}
                {isVC  && <span style={{ marginLeft:4, fontSize:10, background:'var(--bg-card-alt)', color:'var(--text-dim)', padding:'1px 5px', borderRadius:4, fontWeight:700, border:'1px solid var(--border)' }}>VC</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--text-faint)' }}>{p.team?.short_code||p.team?.name||''}</div>
            </div>
            <div><RoleChip role={p.role} /></div>
            <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)', fontWeight:700 }}>{p.credit}</div>
          </div>
        )
      })}
    </div>
  )
}

function StatCell({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-faint)', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, color: color||'var(--text-primary)', lineHeight:1 }}>{value}</div>
    </div>
  )
}

function StatBox({ label, value, accent, color }) {
  return (
    <div style={{ background:'var(--bg-card-alt)', border:'1px solid var(--border)', borderRadius:'var(--card-radius-sm)', padding:'12px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-faint)', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, color: color||accent||'var(--text-primary)', lineHeight:1 }}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-body)', fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-faint)', marginBottom:3 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:900, color: color||'var(--text-primary)', lineHeight:1 }}>{value}</div>
    </div>
  )
}

function RankMedal({ rank }) {
  if (rank===1) return <span style={{ fontSize:20, flexShrink:0 }}>🥇</span>
  if (rank===2) return <span style={{ fontSize:20, flexShrink:0 }}>🥈</span>
  if (rank===3) return <span style={{ fontSize:20, flexShrink:0 }}>🥉</span>
  return <span style={{ color:'var(--text-faint)', fontSize:12, fontWeight:700, fontFamily:'var(--font-display)', flexShrink:0, width:20, textAlign:'center' }}>#{rank}</span>
}

function TeamAvatar({ url, name, size=34 }) {
  const src = url ? (url.startsWith('http') ? url : `${AVATAR_BASE}${url}`) : null
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--bg-card-alt)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.4, fontWeight:800, color:'var(--text-faint)', border:'1px solid var(--border-card)', fontFamily:'var(--font-display)' }}>
      {src ? <img src={src} width={size} height={size} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} alt="" /> : (name||'?')[0]?.toUpperCase()}
    </div>
  )
}

function PlayerPhoto({ url, name, size=32 }) {
  const src = url ? (url.startsWith('http') ? url : `${PLAYER_BASE}${url}`) : null
  return (
    <div style={{ width:size, height:size, borderRadius:6, background:'var(--bg-card-alt)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'var(--text-faint)', border:'1px solid var(--border)', fontFamily:'var(--font-display)' }}>
      {src ? <img src={src} width={size} height={size} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} alt="" /> : (name||'?')[0]?.toUpperCase()}
    </div>
  )
}

const selStyle = { background:'var(--bg-card)', border:'1px solid var(--border-card)', color:'var(--text-primary)', padding:'8px 10px', borderRadius:'var(--btn-radius)', fontSize:13, fontFamily:'var(--font-body)', outline:'none' }