import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, AVATAR_BASE, PLAYER_BASE } from '../lib/supabase'
import { NavBar, Tabs, Card, Medal, Avatar, Empty, RoleChip, Loader } from '../components/Shared'

const TABS_COMPLETED = [
  { key: 'leaderboard', label: '🏆 Leaderboard' },
  { key: 'leagues', label: '🔒 Leagues' },
]
const TABS_ACTIVE = [
  { key: 'leaderboard', label: '🏆 Leaderboard' },
  { key: 'myteam', label: '👤 My Team' },
  { key: 'nextmatch', label: '🎯 Next Match' },
  { key: 'pickteam', label: '✏️ Pick Team' },
  { key: 'subs', label: '🔄 Transfers' },
  { key: 'scout', label: '🔍 Scout' },
  { key: 'leagues', label: '🔒 Leagues' },
]

export default function GlobalTournament({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab] = useState(searchParams.get('tab') || 'leaderboard')
  const [loading, setLoading] = useState(true)

  // Data per tab
  const [leaderboard, setLeaderboard] = useState([])
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [leagueBoard, setLeagueBoard] = useState([])
  const [myTeam, setMyTeam] = useState(null)
  const [myTeamPlayers, setMyTeamPlayers] = useState([])
  const [nextMatch, setNextMatch] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [realTeams, setRealTeams] = useState([])

  useEffect(() => { fetchTournament() }, [slug])

  const fetchTournament = async () => {
    const { data: t } = await supabase.from('global_tournaments').select('*').eq('slug', slug).single()
    setTournament(t)
    if (!t) { setLoading(false); return }
    // t.tournament_id is the FK used by matches/players/teams/points
    // t.id is the global_tournaments PK (only used for user_fantasy_teams)
    await Promise.all([fetchLeaderboard(t), fetchLeagues(t), fetchMyTeam(t), fetchNextMatch(t)])
    setLoading(false)
  }

  const fetchLeaderboard = async (t) => {
    const tid = t.tournament_id || t.id
    const { data: pts } = await supabase.from('user_tournament_points')
      .select('user_id, total_points, matches_counted, previous_rank')
      .eq('tournament_id', tid).order('total_points', { ascending: false }).limit(300)
    if (!pts?.length) return setLeaderboard([])
    const ids = pts.map(r => r.user_id)
    const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name, team_name, team_photo_url').in('user_id', ids)
    const pm = {}; profiles?.forEach(p => pm[p.user_id] = p)
    setLeaderboard(pts.map((r, i) => ({ ...r, rank: i + 1, ...pm[r.user_id] })))
  }

  const fetchLeagues = async (t) => {
    const { data: lm } = await supabase.from('league_members').select('league_id, leagues(id, name, invite_code)').eq('user_id', user.id)
    setLeagues(lm?.map(m => m.leagues).filter(Boolean) || [])
  }

  const fetchMyTeam = async (t) => {
    const tid = t.tournament_id || t.id
    // Try inner tournament_id first (used by ICC), fall back to global_tournaments.id (used by IPL)
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
      const { data: rts } = await supabase.from('real_teams').select('id, name, short_code').eq('tournament_id', t.tournament_id || t.id)
      const rtm = {}; rts?.forEach(r => rtm[r.id] = r)
      setMyTeamPlayers(tp.map(tp => ({ ...tp, ...players?.find(p => p.id === tp.player_id), team: rtm[players?.find(p => p.id === tp.player_id)?.real_team_id] })))
    }
  }

  const fetchNextMatch = async (t) => {
    const { data: m } = await supabase.from('matches').select('*, team_a:real_teams!matches_team_a_id_fkey(name, short_code), team_b:real_teams!matches_team_b_id_fkey(name, short_code)')
      .eq('tournament_id', t.tournament_id || t.id).in('status', ['upcoming', 'live']).order('original_start_time').limit(1).maybeSingle()
    setNextMatch(m)
  }

  const fetchAllPlayers = async () => {
    if (allPlayers.length) return
    const { data: players } = await supabase.from('players').select('*, real_teams(name, short_code)').eq('tournament_id', tournament.tournament_id || tournament.id).eq('is_active', true).order('credit', { ascending: false })
    const { data: rts } = await supabase.from('real_teams').select('*').eq('tournament_id', tournament.tournament_id || tournament.id)
    setAllPlayers(players || [])
    setRealTeams(rts || [])
  }

  useEffect(() => {
    if ((tab === 'pickteam' || tab === 'subs' || tab === 'scout') && tournament) fetchAllPlayers()
  }, [tab, tournament])

  const loadLeagueBoard = async (lid) => {
    setSelectedLeague(lid)
    setLeagueBoard([])
    const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', lid)
    if (!members?.length) return
    const uids = members.map(m => m.user_id)
    const { data: pts } = await supabase.from('user_tournament_points').select('user_id, total_points').eq('tournament_id', tournament.tournament_id || tournament.id).in('user_id', uids).order('total_points', { ascending: false })
    if (!pts?.length) return
    const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name, team_name, team_photo_url').in('user_id', uids)
    const pm = {}; profiles?.forEach(p => pm[p.user_id] = p)
    setLeagueBoard(pts.map((r, i) => ({ ...r, rank: i + 1, ...pm[r.user_id] })))
  }

  if (loading) return <Loader />
  if (!tournament) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Tournament not found</div>

  const isCompleted = tournament.status === 'completed'
  const tabs = isCompleted ? TABS_COMPLETED : TABS_ACTIVE
  const myEntry = leaderboard.find(r => r.user_id === user.id)
  const myRank = myEntry ? leaderboard.indexOf(myEntry) + 1 : null
  const config = tournament.config || {}

  // Phase info
  const phase = myTeam?.current_phase || 1
  const subsPhase2 = config.phases?.find(p => p.phase === 2)?.subs_allotted || 0
  const subsPhase4 = config.phases?.find(p => p.phase === 4)?.subs_allotted || 0
  const subsUsed2 = myTeam?.subs_used_phase2 || 0
  const subsUsed4 = myTeam?.subs_used_phase4 || 0
  const subsLeft2 = subsPhase2 - subsUsed2
  const subsLeft4 = subsPhase4 - subsUsed4

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar
        back
        backTo="/"
        title={`${tournament.flag_emoji || '🏆'} ${tournament.name}`}
        subtitle={`${tournament.season} · ${tournament.status} · ${tournament.total_matches} matches`}
        badge={myEntry ? { value: parseFloat(myEntry.total_points).toLocaleString(), label: `Rank #${myRank}`, color: 'var(--accent)' } : null}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} userId={user.id} myRank={myRank} myEntry={myEntry} />
        )}

        {/* MY TEAM */}
        {tab === 'myteam' && (
          <MyTeamTab myTeam={myTeam} players={myTeamPlayers} userId={user.id} phase={phase} subsLeft2={subsLeft2} subsLeft4={subsLeft4} config={config} />
        )}

        {/* NEXT MATCH */}
        {tab === 'nextmatch' && (
          <NextMatchTab nextMatch={nextMatch} myTeam={myTeam} config={config} subsLeft2={subsLeft2} subsLeft4={subsLeft4} phase={phase} />
        )}

        {/* PICK TEAM */}
        {tab === 'pickteam' && (
          <PickTeamTab players={allPlayers} realTeams={realTeams} config={config} myTeam={myTeam} myTeamPlayers={myTeamPlayers} userId={user.id} tournament={tournament} onRefresh={() => fetchMyTeam(tournament)} />
        )}

        {/* TRANSFERS */}
        {tab === 'subs' && (
          <SubsTab players={allPlayers} realTeams={realTeams} myTeam={myTeam} myTeamPlayers={myTeamPlayers} config={config} subsLeft2={subsLeft2} subsLeft4={subsLeft4} phase={phase} />
        )}

        {/* SCOUT */}
        {tab === 'scout' && (
          <ScoutTab players={allPlayers} realTeams={realTeams} />
        )}

        {/* LEAGUES */}
        {tab === 'leagues' && (
          <LeaguesTab leagues={leagues} selectedLeague={selectedLeague} leagueBoard={leagueBoard} onSelect={loadLeagueBoard} userId={user.id} tournament={tournament} />
        )}
      </div>
    </div>
  )
}

// ── LEADERBOARD TAB ─────────────────────────────────────────────────────────
function LeaderboardTab({ leaderboard, userId, myRank, myEntry }) {
  return (
    <div>
      {myEntry && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 24 }}>
          <Stat label="Your Rank" value={`#${myRank}`} color="var(--accent)" />
          <Stat label="Total Points" value={parseFloat(myEntry.total_points).toLocaleString()} color="var(--green)" />
          <Stat label="Matches" value={myEntry.matches_counted || '—'} />
        </div>
      )}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '48px 40px 1fr 80px', gap: 8, padding: '10px 16px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span>Rank</span><span></span><span>Player</span><span style={{ textAlign: 'right' }}>Points</span>
        </div>
        {leaderboard.length === 0
          ? <Empty icon="📊" title="No data yet" text="Leaderboard will appear after matches are processed" />
          : leaderboard.map((row, i) => (
            <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '48px 40px 1fr 80px', gap: 8, padding: '11px 16px', borderTop: '1px solid var(--border)', background: row.user_id === userId ? 'rgba(99,102,241,0.05)' : 'transparent', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}><Medal rank={i + 1} /></div>
              <Avatar url={row.team_photo_url} name={row.full_name} size={32} base={AVATAR_BASE} />
              <div>
                <div style={{ fontSize: 13, fontWeight: row.user_id === userId ? 700 : 500, color: row.user_id === userId ? 'var(--accent)' : 'var(--text)' }}>
                  {row.full_name || 'User'}
                  {row.user_id === userId && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>YOU</span>}
                </div>
                {row.team_name && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{row.team_name}</div>}
              </div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 14 }}>
                {parseFloat(row.total_points || 0).toLocaleString()}
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  )
}

// ── MY TEAM TAB ──────────────────────────────────────────────────────────────
function MyTeamTab({ myTeam, players, phase, subsLeft2, subsLeft4, config }) {
  if (!myTeam) return <Empty icon="✏️" title="No team yet" text="Go to Pick Team to create your fantasy XI" />
  const cap = players.find(p => p.player_id === myTeam.captain_id)
  const vc = players.find(p => p.player_id === myTeam.vice_captain_id)

  return (
    <div>
      {/* Phase + subs summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <InfoBox label="Current Phase" value={`Phase ${phase}`} />
        <InfoBox label="Transfers Used (P2)" value={`${myTeam.subs_used_phase2 || 0} / ${config.phases?.find(p => p.phase === 2)?.subs_allotted || '—'}`} color="var(--amber)" />
        <InfoBox label="Remaining (P4)" value={`${subsLeft4} left`} color="var(--green)" />
      </div>

      {cap && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Captain (2x)</div>
            <div style={{ fontWeight: 700 }}>{cap.name}</div>
          </div>
          {vc && (
            <>
              <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Vice Captain (1.5x)</div>
                <div style={{ fontWeight: 700 }}>{vc.name}</div>
              </div>
            </>
          )}
        </div>
      )}

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px', gap: 8, padding: '10px 16px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
          <span></span><span>Player</span><span style={{ textAlign: 'right' }}>Role</span><span style={{ textAlign: 'right' }}>Credits</span>
        </div>
        {players.map(p => {
          const isCap = p.player_id === myTeam.captain_id
          const isVC = p.player_id === myTeam.vice_captain_id
          return (
            <div key={p.player_id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              <Avatar url={p.photo_url} name={p.name} size={32} base={PLAYER_BASE} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {p.name}
                  {isCap && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>C</span>}
                  {isVC && <span style={{ fontSize: 10, background: 'var(--text3)', color: 'white', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>VC</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.team?.short_code || p.team?.name || ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}><RoleChip role={p.role} /></div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{p.credit}</div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ── NEXT MATCH TAB ──────────────────────────────────────────────────────────
function NextMatchTab({ nextMatch, myTeam, config, subsLeft2, subsLeft4, phase }) {
  if (!nextMatch) return <Empty icon="📅" title="No upcoming matches" text="All matches have been played or none scheduled" />
  const lockTime = nextMatch.locked_at ? new Date(nextMatch.locked_at) : nextMatch.original_start_time ? new Date(nextMatch.original_start_time) : null
  const now = new Date()
  const isLocked = lockTime && now > lockTime

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Next Match · #{nextMatch.match_number}</span>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: nextMatch.status === 'live' ? 'rgba(239,68,68,0.15)' : 'var(--bg3)', color: nextMatch.status === 'live' ? 'var(--red)' : 'var(--text2)' }}>
              {nextMatch.status === 'live' ? '🔴 LIVE' : nextMatch.status}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🏏</div>
              <div style={{ fontWeight: 700 }}>{nextMatch.team_a?.name || 'TBA'}</div>
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>{nextMatch.team_a?.short_code}</div>
            </div>
            <div style={{ color: 'var(--text2)', fontWeight: 700, fontSize: 18 }}>vs</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🏏</div>
              <div style={{ fontWeight: 700 }}>{nextMatch.team_b?.name || 'TBA'}</div>
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>{nextMatch.team_b?.short_code}</div>
            </div>
          </div>

          {nextMatch.venue && <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, marginBottom: 8 }}>📍 {nextMatch.venue}</div>}
          {nextMatch.original_start_time && (
            <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
              🕐 {new Date(nextMatch.original_start_time).toLocaleString()}
            </div>
          )}
        </div>

        {/* Lock status */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: isLocked ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>{isLocked ? '🔒' : '🔓'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: isLocked ? 'var(--red)' : 'var(--green)' }}>
                {isLocked ? 'Team locked' : 'Team editable'}
              </div>
              {lockTime && <div style={{ fontSize: 11, color: 'var(--text2)' }}>Deadline: {lockTime.toLocaleString()}</div>}
            </div>
          </div>
        </div>
      </Card>

      {/* My fantasy status for this match */}
      {myTeam && (
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Your Fantasy Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <InfoBox label="Current Phase" value={`Phase ${phase}`} />
              <InfoBox label="Transfers Left (P2)" value={`${subsLeft2}`} color={subsLeft2 > 0 ? 'var(--green)' : 'var(--red)'} />
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              📋 <strong>Substitution Rules:</strong> You can make unlimited free transfers before Match 1. 
              After Match 1, each transfer costs a point from your Phase 2 budget ({config.phases?.find(p => p.phase === 2)?.subs_allotted || '—'} total). 
              A fresh free pick opens for the knockout stage.
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── PICK TEAM TAB ────────────────────────────────────────────────────────────
function PickTeamTab({ players, realTeams, config, myTeam, myTeamPlayers, userId, tournament, onRefresh }) {
  const [selected, setSelected] = useState(new Set(myTeamPlayers.map(p => p.player_id)))
  const [captain, setCaptain] = useState(myTeam?.captain_id || null)
  const [vc, setVc] = useState(myTeam?.vice_captain_id || null)
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const maxSize = config.team_size || 11
  const maxCredits = config.max_credits || 100
  const minWk = config.min_wk || 1; const minBat = config.min_bat || 3; const minBowl = config.min_bowl || 3; const minAr = config.min_ar || 1

  const selPlayers = players.filter(p => selected.has(p.id))
  const usedCredits = selPlayers.reduce((s, p) => s + parseFloat(p.credit || 0), 0)
  const counts = { WK: 0, BAT: 0, BOWL: 0, AR: 0 }
  selPlayers.forEach(p => counts[p.role] = (counts[p.role] || 0) + 1)

  const toggle = (p) => {
    const ns = new Set(selected)
    if (ns.has(p.id)) { ns.delete(p.id); if (captain === p.id) setCaptain(null); if (vc === p.id) setVc(null) }
    else if (ns.size < maxSize) {
      const newCreds = usedCredits + parseFloat(p.credit || 0)
      if (newCreds > maxCredits) return setMsg(`Not enough credits (need ${parseFloat(p.credit)}, have ${(maxCredits - usedCredits).toFixed(1)})`)
      ns.add(p.id)
    }
    setSelected(ns); setMsg(null)
  }

  const valid = selected.size === maxSize && captain && vc && captain !== vc
    && counts.WK >= minWk && counts.BAT >= minBat && counts.BOWL >= minBowl && counts.AR >= minAr

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      // upsert fantasy team
      const { data: ft, error: fte } = await supabase.from('user_fantasy_teams').upsert({
        user_id: userId, tournament_id: tournament.tournament_id || tournament.id, captain_id: captain, vice_captain_id: vc,
        total_credits: usedCredits, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,tournament_id' }).select().single()
      if (fte) throw fte

      // delete old, insert new players
      await supabase.from('user_fantasy_team_players').delete().eq('user_fantasy_team_id', ft.id)
      await supabase.from('user_fantasy_team_players').insert([...selected].map(pid => ({ user_fantasy_team_id: ft.id, player_id: pid, position: null })))
      setMsg('✅ Team saved!'); onRefresh()
    } catch (e) { setMsg('❌ Error: ' + e.message) }
    setSaving(false)
  }

  const filtered = players.filter(p => (filterTeam === 'all' || p.real_team_id === filterTeam) && (filterRole === 'all' || p.role === filterRole))

  return (
    <div>
      {/* Summary bar */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Stat label="Players" value={`${selected.size}/${maxSize}`} color={selected.size === maxSize ? 'var(--green)' : 'var(--text)'} />
            <Stat label="Credits" value={`${usedCredits.toFixed(1)}/${maxCredits}`} color={usedCredits > maxCredits ? 'var(--red)' : 'var(--green)'} />
            <Stat label="WK" value={`${counts.WK}/${minWk}`} />
            <Stat label="BAT" value={`${counts.BAT}/${minBat}`} />
            <Stat label="BOWL" value={`${counts.BOWL}/${minBowl}`} />
            <Stat label="AR" value={`${counts.AR}/${minAr}`} />
          </div>
          {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
        </div>
        <button onClick={save} disabled={!valid || saving} style={{
          padding: '10px 22px', borderRadius: 10, border: 'none',
          background: valid ? 'var(--accent)' : 'var(--bg3)', color: valid ? 'white' : 'var(--text3)',
          fontWeight: 700, fontSize: 13, flexShrink: 0
        }}>
          {saving ? 'Saving…' : '💾 Save Team'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', borderRadius: 8, fontSize: 13 }}>
          <option value="all">All Teams</option>
          {realTeams.map(rt => <option key={rt.id} value={rt.id}>{rt.short_code || rt.name}</option>)}
        </select>
        {['all', 'BAT', 'BOWL', 'AR', 'WK'].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', borderColor: filterRole === r ? 'var(--accent)' : 'var(--border)', background: filterRole === r ? 'rgba(99,102,241,0.15)' : 'var(--bg2)', color: filterRole === r ? 'var(--accent)' : 'var(--text2)', fontSize: 12 }}>
            {r}
          </button>
        ))}
      </div>

      {/* C/VC hint */}
      {selected.size > 0 && (
        <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 14, fontSize: 12, color: 'var(--text2)' }}>
          Tap player name to select: <strong style={{ color: 'var(--accent)' }}>C (2x)</strong> or <strong style={{ color: 'var(--text2)' }}>VC (1.5x)</strong>. Currently: 
          <strong style={{ color: 'var(--accent)', marginLeft: 6 }}>{players.find(p => p.id === captain)?.name || 'None'}</strong> (C) / 
          <strong style={{ color: 'var(--text2)', marginLeft: 6 }}>{players.find(p => p.id === vc)?.name || 'None'}</strong> (VC)
        </div>
      )}

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 60px 50px', gap: 8, padding: '10px 14px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
          <span></span><span>Player</span><span>Role</span><span style={{ textAlign: 'right' }}>Credits</span><span style={{ textAlign: 'right' }}>Pick</span>
        </div>
        {filtered.map(p => {
          const isSel = selected.has(p.id)
          const isCap = captain === p.id
          const isVC = vc === p.id
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 60px 50px', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: isSel ? 'rgba(99,102,241,0.05)' : 'transparent', alignItems: 'center' }}>
              <Avatar url={p.photo_url} name={p.name} size={28} base={PLAYER_BASE} />
              <div>
                <button onClick={() => {
                  if (!isSel) return
                  if (captain !== p.id && vc !== p.id) setCaptain(p.id)
                  else if (captain === p.id) { setCaptain(vc); setVc(p.id) }
                  else setVc(p.id)
                }} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: isSel ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {p.name}
                    {isCap && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', padding: '1px 5px', borderRadius: 4, marginLeft: 5 }}>C</span>}
                    {isVC && <span style={{ fontSize: 10, background: 'var(--bg3)', color: 'var(--text2)', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>VC</span>}
                  </div>
                </button>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.real_teams?.short_code || p.real_teams?.name}</div>
              </div>
              <div><RoleChip role={p.role} /></div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{p.credit}</div>
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => toggle(p)} style={{
                  width: 28, height: 28, borderRadius: 6, border: `2px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSel ? 'var(--accent)' : 'var(--bg3)', color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {isSel ? '✓' : '+'}
                </button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ── TRANSFERS TAB ────────────────────────────────────────────────────────────
function SubsTab({ players, realTeams, myTeam, myTeamPlayers, config, subsLeft2, subsLeft4, phase }) {
  if (!myTeam) return <Empty icon="📝" title="Create your team first" text="Go to Pick Team to set up your fantasy XI" />

  const phaseInfo = {
    1: 'Phase 1: Free pick — unlimited changes before the first match.',
    2: `Phase 2: Group Stage — each transfer uses one sub. ${subsLeft2} remaining.`,
    3: 'Phase 3: Free pick for knockout stage — build a fresh team of 11.',
    4: `Phase 4: Knockout Stage — transfers available. ${subsLeft4} remaining.`,
  }

  return (
    <div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 Substitution Rules</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
          <div>• <strong>Phase 1:</strong> Before Match 1 — unlimited free changes</div>
          <div>• <strong>Phase 2:</strong> Group Stage — {config.phases?.find(p => p.phase === 2)?.subs_allotted || '—'} total transfers</div>
          <div>• <strong>Phase 3:</strong> After group stage — fresh free pick of 11</div>
          <div>• <strong>Phase 4:</strong> Knockout Stage — {config.phases?.find(p => p.phase === 4)?.subs_allotted || '—'} total transfers</div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>Current: {phaseInfo[phase]}</div>
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <Stat label="Phase 2 Subs Left" value={`${subsLeft2}`} color={subsLeft2 > 5 ? 'var(--green)' : 'var(--red)'} />
          <Stat label="Phase 4 Subs Left" value={`${subsLeft4}`} color={subsLeft4 > 0 ? 'var(--green)' : 'var(--text3)'} />
          <Stat label="Reward Subs" value={myTeam.reward_subs || 0} color="var(--purple)" />
        </div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Your current XI</div>
      <Card>
        {myTeamPlayers.map((p, i) => (
          <div key={p.player_id} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <Avatar url={p.photo_url} name={p.name} size={32} base={PLAYER_BASE} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {p.name}
                {p.player_id === myTeam.captain_id && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', padding: '1px 5px', borderRadius: 4, marginLeft: 5 }}>C</span>}
                {p.player_id === myTeam.vice_captain_id && <span style={{ fontSize: 10, background: 'var(--bg3)', color: 'var(--text2)', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>VC</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.team?.short_code || ''}</div>
            </div>
            <RoleChip role={p.role} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', width: 32, textAlign: 'right' }}>{p.credit}</div>
          </div>
        ))}
      </Card>
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
        ℹ️ To make transfers, go to the Pick Team tab and save your updated XI. Each change during Phase 2/4 counts as one transfer.
      </div>
    </div>
  )
}

// ── SCOUT TAB ─────────────────────────────────────────────────────────────────
function ScoutTab({ players, realTeams }) {
  const [sortBy, setSortBy] = useState('credit')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [search, setSearch] = useState('')

  const sorted = [...players]
    .filter(p => (filterTeam === 'all' || p.real_team_id === filterTeam) && (filterRole === 'all' || p.role === filterRole) && (!search || p.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => parseFloat(b[sortBy] || 0) - parseFloat(a[sortBy] || 0))

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player..." style={{ flex: 1, minWidth: 160, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none' }} />
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}>
          <option value="all">All Teams</option>
          {realTeams.map(rt => <option key={rt.id} value={rt.id}>{rt.short_code}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}>
          <option value="all">All Roles</option>
          {['BAT', 'BOWL', 'AR', 'WK'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}>
          <option value="credit">Sort: Credits</option>
        </select>
      </div>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 60px', gap: 8, padding: '10px 14px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
          <span></span><span>Player</span><span>Role</span><span style={{ textAlign: 'right' }}>Credits</span>
        </div>
        {sorted.slice(0, 80).map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 60px', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <Avatar url={p.photo_url} name={p.name} size={28} base={PLAYER_BASE} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.real_teams?.short_code || p.real_teams?.name}</div>
            </div>
            <div><RoleChip role={p.role} /></div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{p.credit}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── LEAGUES TAB ──────────────────────────────────────────────────────────────
function LeaguesTab({ leagues, selectedLeague, leagueBoard, onSelect, userId, tournament }) {
  return (
    <div>
      {leagues.length === 0 ? (
        <Empty icon="🔒" title="No private leagues" text="Join a league with an invite code to compete with friends" />
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {leagues.map(l => (
              <button key={l.id} onClick={() => onSelect(l.id)} style={{
                padding: '8px 18px', borderRadius: 20, border: '1px solid',
                borderColor: selectedLeague === l.id ? 'var(--accent)' : 'var(--border)',
                background: selectedLeague === l.id ? 'rgba(99,102,241,0.15)' : 'var(--bg2)',
                color: selectedLeague === l.id ? 'var(--accent)' : 'var(--text2)', fontSize: 13, fontWeight: selectedLeague === l.id ? 600 : 400
              }}>
                {l.name}
              </button>
            ))}
          </div>

          {selectedLeague && (
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 40px 1fr 80px', gap: 8, padding: '10px 16px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
                <span>Rank</span><span></span><span>Player</span><span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {leagueBoard.length === 0
                ? <Empty icon="📊" title="No data" text="No points recorded for this league yet" />
                : leagueBoard.map((row, i) => (
                  <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '48px 40px 1fr 80px', gap: 8, padding: '11px 16px', borderTop: '1px solid var(--border)', background: row.user_id === userId ? 'rgba(99,102,241,0.05)' : 'transparent', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}><Medal rank={i + 1} /></div>
                    <Avatar url={row.team_photo_url} name={row.full_name} size={32} base={AVATAR_BASE} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: row.user_id === userId ? 700 : 500, color: row.user_id === userId ? 'var(--accent)' : 'var(--text)' }}>
                        {row.full_name}
                        {row.user_id === userId && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', padding: '1px 5px', borderRadius: 4, marginLeft: 5 }}>YOU</span>}
                      </div>
                      {row.team_name && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{row.team_name}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 14 }}>
                      {parseFloat(row.total_points || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              }
            </Card>
          )}

          {!selectedLeague && <Empty icon="👆" title="Select a league" text="Pick a league above to see its leaderboard" />}
        </div>
      )}
    </div>
  )
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}

function InfoBox({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}