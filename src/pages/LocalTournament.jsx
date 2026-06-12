
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, AVATAR_BASE, PLAYER_BASE } from '../lib/supabase'
import { Loader, Empty, RoleChip, Eyebrow, PtsPill } from '../components/Shared'

// ── DESIGN TOKENS (Local = Cyan) ─────────────────────────────────────────────
const C = {
  accent:       '#00f2ff',
  accentDim:    'rgba(0,242,255,0.08)',
  accentMid:    'rgba(0,242,255,0.16)',
  accentBorder: 'rgba(0,242,255,0.20)',
  accentBorderStrong: 'rgba(0,242,255,0.35)',
  accentGlow:   'rgba(0,242,255,0.20)',
}

const TABS = [
  { key: 'fixtures',    label: '📅 Fixtures' },
  { key: 'pointstable', label: '📊 Points Table' },
  { key: 'stats',       label: '🏏 Player Stats' },
  { key: 'fantasy',     label: '⭐ Fantasy' },
]

export default function LocalTournament({ user }) {
  const { id }            = useParams()
  const navigate          = useNavigate()
  const [sp]              = useSearchParams()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab]     = useState(sp.get('tab') || 'fixtures')
  const [loading, setLoading] = useState(true)
  const [matches, setMatches]       = useState([])
  const [teams, setTeams]           = useState({})
  const [pointsTable, setPointsTable] = useState([])
  const [playerStats, setPlayerStats] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [scorecard, setScorecard]   = useState(null)

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [t, m, lt, pt, ps, lb] = await Promise.all([
      supabase.from('local_tournaments').select('*').eq('id', id).single(),
      supabase.from('local_matches').select('*').order('match_date').order('match_time'),
      supabase.from('local_teams').select('*'),
      supabase.from('ppl_points_table').select('*, local_teams(name, short_name)').order('group_name').order('position'),
      supabase.from('v_ppl_player_overall_stats').select('*').order('fantasy_points', { ascending: false }).limit(80),
      supabase.from('ppl_overall_leaderboard').select('*').order('overall_rank').limit(100),
    ])
    setTournament(t.data)
    setMatches(m.data || [])
    const tm = {}; lt.data?.forEach(t => tm[t.id] = t); setTeams(tm)
    setPointsTable(pt.data || [])
    setPlayerStats(ps.data || [])
    setLeaderboard(lb.data || [])
    setLoading(false)
  }

  const fetchScorecard = async (match) => {
    setSelectedMatch(match); setScorecard(null)
    const [bat, bowl] = await Promise.all([
      supabase.from('ppl_batting_scorecard').select('*, local_players(name, photo_url)').eq('match_id', match.id),
      supabase.from('ppl_bowling_scorecard').select('*, local_players(name, photo_url)').eq('match_id', match.id),
    ])
    setScorecard({ batting: bat.data || [], bowling: bowl.data || [] })
  }

  if (loading) return <Loader />
  if (!tournament) return <div style={{ padding:40, textAlign:'center', color:'var(--text-faint)' }}>Tournament not found</div>

  const myEntry = leaderboard.find(r => r.user_id === user.id)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)' }}>
      {/* STICKY HEADER */}
      <header style={{ background:'rgba(2,6,23,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:500 }}>
        <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'0 16px', height:56, display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate('/')} style={{ width:36, height:36, borderRadius:'var(--btn-radius)', background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-card)', color:'var(--text-primary)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, textTransform:'uppercase', letterSpacing:'0.5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              🏏 {tournament.name}
            </div>
            <div style={{ color:'var(--text-faint)', fontSize:11 }}>{tournament.short_name||''} · {tournament.format||'T20'} · {tournament.status}</div>
          </div>
          {myEntry && (
            <div style={{ background:'var(--bg-card)', border:`1px solid ${C.accentBorder}`, padding:'6px 14px', borderRadius:10, textAlign:'center', flexShrink:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:900, color:C.accent, lineHeight:1 }}>{parseFloat(myEntry.total_points||0).toFixed(0)}</div>
              <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>Rank #{myEntry.overall_rank}</div>
            </div>
          )}
        </div>
        {/* TABS */}
        <div style={{ overflowX:'auto', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', padding:'0 16px', maxWidth:'var(--app-max)', margin:'0 auto' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding:'11px 16px', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap',
                color: tab===t.key ? C.accent : 'var(--text-faint)',
                borderBottom: tab===t.key ? `2px solid ${C.accent}` : '2px solid transparent',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.5px', textTransform:'uppercase',
                transition:'color 0.15s'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'20px 16px' }}>
        {tab==='fixtures'    && <FixturesTab matches={matches} teams={teams} selectedMatch={selectedMatch} scorecard={scorecard} onSelect={fetchScorecard} onBack={()=>{setSelectedMatch(null);setScorecard(null)}} />}
        {tab==='pointstable' && <PointsTableTab pointsTable={pointsTable} />}
        {tab==='stats'       && <PlayerStatsTab playerStats={playerStats} />}
        {tab==='fantasy'     && <FantasyTab leaderboard={leaderboard} userId={user.id} myEntry={myEntry} />}
      </div>
    </div>
  )
}

// ── FIXTURES ──────────────────────────────────────────────────────────────────
function FixturesTab({ matches, teams, selectedMatch, scorecard, onSelect, onBack }) {
  if (selectedMatch) return <ScorecardView match={selectedMatch} scorecard={scorecard} teams={teams} onBack={onBack} />

  const grouped = {}
  matches.forEach(m => { const d = m.match_date||'TBD'; if (!grouped[d]) grouped[d]=[]; grouped[d].push(m) })

  return (
    <div>
      {Object.entries(grouped).map(([date, dayMatches]) => (
        <div key={date} style={{ marginBottom:24 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:12 }}>
            {date!=='TBD' ? new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',month:'short',day:'numeric'}) : 'TBD'}
          </div>
          {dayMatches.map(m => {
            const tA = teams[m.team_a_id]||{}; const tB = teams[m.team_b_id]||{}
            const winner = teams[m.winner_id]
            const isLive = m.status==='live'||m.status==='in_progress'
            const isDone = m.status==='completed'
            return (
              <div key={m.id}
                onClick={() => isDone && onSelect(m)}
                style={{ background:'var(--bg-card)', border:`1px solid ${isLive?'rgba(239,68,68,0.35)':isDone?C.accentBorder:'var(--border-card)'}`, borderRadius:'var(--card-radius)', overflow:'hidden', marginBottom:10, cursor:isDone?'pointer':'default', transition:'border-color 0.15s' }}
              >
                {/* Top accent bar */}
                <div style={{ height:2, background: isLive?'var(--red)':isDone?C.accent:'transparent' }} />
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                      M{m.match_number}{m.match_type?` · ${m.match_type.toUpperCase()}`:''}
                    </span>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {isLive && <span style={{ fontSize:10, padding:'3px 8px', borderRadius:'var(--pill-radius)', background:'rgba(239,68,68,0.12)', color:'var(--red)', fontFamily:'var(--font-display)', fontWeight:800 }}>🔴 LIVE</span>}
                      {!isLive && <StatusPill status={m.status} />}
                      {isDone && <span style={{ fontSize:11, color:C.accent, fontFamily:'var(--font-display)', fontWeight:700 }}>Scorecard →</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight: winner?.id===m.team_a_id?900:600, fontSize:16, color: winner?.id===m.team_a_id?C.accent:'var(--text-primary)' }}>
                        {tA.short_name||tA.name||'TBA'} {winner?.id===m.team_a_id&&'🏆'}
                      </div>
                    </div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, color:'var(--text-faint)' }}>VS</div>
                    <div style={{ flex:1, textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight: winner?.id===m.team_b_id?900:600, fontSize:16, color: winner?.id===m.team_b_id?C.accent:'var(--text-primary)' }}>
                        {winner?.id===m.team_b_id&&'🏆 '}{tB.short_name||tB.name||'TBA'}
                      </div>
                    </div>
                  </div>
                  {m.result_description && (
                    <div style={{ marginTop:10, fontSize:12, color:'var(--text-dim)', borderTop:'1px solid var(--border-subtle)', paddingTop:8 }}>{m.result_description}</div>
                  )}
                  {m.match_time && !isDone && <div style={{ marginTop:8, fontSize:11, color:'var(--text-faint)' }}>🕐 {m.match_time}</div>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      {matches.length===0 && <Empty icon="📅" title="No matches scheduled" text="Fixtures appear here once added" />}
    </div>
  )
}

// ── SCORECARD ─────────────────────────────────────────────────────────────────
function ScorecardView({ match, scorecard, teams, onBack }) {
  const tA = teams[match.team_a_id]||{}; const tB = teams[match.team_b_id]||{}; const winner = teams[match.winner_id]
  return (
    <div>
      <button onClick={onBack} style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', color:'var(--text-dim)', padding:'8px 14px', borderRadius:'var(--btn-radius)', fontSize:13, marginBottom:16, cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:700 }}>← Back</button>
      <div style={{ background:'var(--bg-card)', border:`1px solid ${C.accentBorder}`, borderRadius:'var(--card-radius)', overflow:'hidden', marginBottom:16 }}>
        <div style={{ height:2, background:C.accent }} />
        <div style={{ padding:'18px 20px' }}>
          <div style={{ textAlign:'center', marginBottom:12 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'1.5px' }}>Match {match.match_number}{match.match_type?` · ${match.match_type.toUpperCase()}`:''}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18 }}>{tA.short_name||tA.name}</div>
              {winner?.id===match.team_a_id && <div style={{ fontSize:11, color:C.accent, marginTop:2 }}>WINNER 🏆</div>}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'var(--text-faint)', fontSize:16 }}>VS</div>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18 }}>{tB.short_name||tB.name}</div>
              {winner?.id===match.team_b_id && <div style={{ fontSize:11, color:C.accent, marginTop:2 }}>WINNER 🏆</div>}
            </div>
          </div>
          {match.result_description && <div style={{ textAlign:'center', color:'var(--text-dim)', fontSize:13, marginTop:12 }}>{match.result_description}</div>}
        </div>
      </div>

      {!scorecard ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--text-faint)' }}>Loading scorecard…</div>
      ) : (
        <>
          {scorecard.batting.length>0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10, color:C.accent }}>🏏 Batting</div>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px', gap:6, padding:'9px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
                  {['Batter','R','B','4s','6s'].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', textAlign:i>0?'right':'left' }}>{h}</span>)}
                </div>
                {scorecard.batting.map((b,i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px', gap:6, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', alignItems:'center' }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:600 }}>{b.local_players?.name||b.player_name}</div>
                      {b.dismissal_desc && <div style={{ fontSize:11, color:'var(--text-faint)' }}>{b.dismissal_desc}</div>}
                    </div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:C.accent }}>{b.runs}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)' }}>{b.balls_faced}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-dim)' }}>{b.fours||0}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-dim)' }}>{b.sixes||0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {scorecard.bowling.length>0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10, color:C.accent }}>🎳 Bowling</div>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 50px', gap:6, padding:'9px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
                  {['Bowler','O','W','R','Eco'].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', textAlign:i>0?'right':'left' }}>{h}</span>)}
                </div>
                {scorecard.bowling.map((b,i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 50px', gap:6, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', alignItems:'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:600 }}>{b.local_players?.name||b.player_name}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)' }}>{b.overs}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:C.accent }}>{b.wickets}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)' }}>{b.runs_conceded}</div>
                    <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)' }}>{b.economy_rate||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {scorecard.batting.length===0 && scorecard.bowling.length===0 && <Empty icon="📋" title="No scorecard" text="Scorecard not available for this match" />}
        </>
      )}
    </div>
  )
}

// ── POINTS TABLE ──────────────────────────────────────────────────────────────
function PointsTableTab({ pointsTable }) {
  const groups = {}
  pointsTable.forEach(r => { const g = r.group_name||'Main'; if (!groups[g]) groups[g]=[]; groups[g].push(r) })
  const qualMap = { qualified:C.accent, eliminated:'var(--red)', in_contention:'var(--gold)' }
  const qualEmoji = { qualified:'✅', eliminated:'❌', in_contention:'🟡' }

  return (
    <div>
      {Object.entries(groups).map(([group, rows]) => (
        <div key={group} style={{ marginBottom:24 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, color:C.accent }}>Group {group}</div>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'24px 1fr 28px 28px 28px 28px 54px 48px', gap:5, padding:'10px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
              {['#','Team','P','W','L','NR','NRR','Pts'].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.3px', textAlign:i>1?'center':i===6||i===7?'right':'left' }}>{h}</span>)}
            </div>
            {rows.map((r,i) => (
              <div key={r.id} style={{ display:'grid', gridTemplateColumns:'24px 1fr 28px 28px 28px 28px 54px 48px', gap:5, padding:'11px 14px', borderBottom:'1px solid var(--border-subtle)', background: r.qualification_status==='qualified'?`rgba(0,242,255,0.04)`:'transparent', alignItems:'center' }}>
                <div style={{ fontSize:12, color: qualMap[r.qualification_status]||'var(--text-faint)', textAlign:'center' }}>{qualEmoji[r.qualification_status]||i+1}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight: r.qualification_status==='qualified'?800:500, fontSize:13 }}>{r.local_teams?.name||'Team'}</div>
                <div style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-dim)' }}>{r.played}</div>
                <div style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:12, color:'var(--accent)' }}>{r.won}</div>
                <div style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:12, color:'var(--red)' }}>{r.lost}</div>
                <div style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-faint)' }}>{r.no_result||0}</div>
                <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color: parseFloat(r.nrr||0)>=0?'var(--accent)':'var(--red)', fontWeight:700 }}>{parseFloat(r.nrr||0).toFixed(3)}</div>
                <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:C.accent }}>{r.points}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:8 }}>
            {[['✅','Qualified'],['🟡','In Contention'],['❌','Eliminated']].map(([e,l])=><span key={l} style={{ fontSize:11, color:'var(--text-faint)' }}>{e} {l}</span>)}
          </div>
        </div>
      ))}
      {pointsTable.length===0 && <Empty icon="📊" title="No standings yet" text="Points table updates after matches are played" />}
    </div>
  )
}

// ── PLAYER STATS ──────────────────────────────────────────────────────────────
function PlayerStatsTab({ playerStats }) {
  const [sortBy, setSortBy]         = useState('fantasy')
  const [filterRole, setFilterRole] = useState('all')

  const sorted = [...playerStats]
    .filter(p => filterRole==='all'||p.role===filterRole)
    .sort((a,b) => {
      if (sortBy==='fantasy') return parseFloat(b.fantasy_points||0)-parseFloat(a.fantasy_points||0)
      if (sortBy==='runs')    return parseInt(b.runs||0)-parseInt(a.runs||0)
      if (sortBy==='wickets') return parseInt(b.wickets||0)-parseInt(a.wickets||0)
      return 0
    })

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        {['all','BAT','BOWL','AR','WK'].map(r=>(
          <button key={r} onClick={()=>setFilterRole(r)} style={{ padding:'7px 14px', borderRadius:'var(--pill-radius)', border:'1px solid', borderColor:filterRole===r?C.accent:'var(--border)', background:filterRole===r?C.accentDim:'var(--bg-card)', color:filterRole===r?C.accent:'var(--text-faint)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, cursor:'pointer', textTransform:'uppercase' }}>{r}</button>
        ))}
        <div style={{ flex:1 }} />
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', color:'var(--text-primary)', padding:'8px 10px', borderRadius:'var(--btn-radius)', fontSize:12, fontFamily:'var(--font-body)', outline:'none' }}>
          <option value="fantasy">Fantasy Pts</option>
          <option value="runs">Runs</option>
          <option value="wickets">Wickets</option>
        </select>
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'32px 32px 1fr 60px 44px 44px', gap:6, padding:'10px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
          {['#','','Player','Pts','Runs','Wkts'].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.3px', textAlign:i>2?'right':'left' }}>{h}</span>)}
        </div>
        {sorted.map((p,i) => (
          <div key={p.id||i} style={{ display:'grid', gridTemplateColumns:'32px 32px 1fr 60px 44px 44px', gap:6, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', alignItems:'center' }}>
            <RankMedal rank={i+1} />
            <PlayerPhoto url={p.photo_url} name={p.name} size={28} />
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:600 }}>{p.name}</div>
              <div style={{ fontSize:11, display:'flex', gap:4, marginTop:1 }}>
                <RoleChip role={p.role} />
                <span style={{ color:'var(--text-faint)' }}>{p.team_name}</span>
              </div>
            </div>
            <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:C.accent }}>{parseFloat(p.fantasy_points||0).toFixed(0)}</div>
            <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--rank-color)' }}>{p.runs||0}</div>
            <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--accent)' }}>{p.wickets||0}</div>
          </div>
        ))}
        {sorted.length===0 && <Empty icon="🏏" title="No stats yet" text="Player stats appear after matches are scored" />}
      </div>
    </div>
  )
}

// ── FANTASY LEADERBOARD ───────────────────────────────────────────────────────
function FantasyTab({ leaderboard, userId, myEntry }) {
  return (
    <div>
      {myEntry && (
        <div style={{ background:C.accentDim, border:`1px solid ${C.accentBorder}`, borderRadius:'var(--card-radius)', padding:'16px 20px', marginBottom:16, display:'flex', gap:24, flexWrap:'wrap' }}>
          <StatCell label="Your Rank" value={`#${myEntry.overall_rank}`} color={C.accent} />
          <StatCell label="Total Points" value={parseFloat(myEntry.total_points||0).toLocaleString()} color="var(--text-primary)" />
          {myEntry.group_a_points!=null && <StatCell label="Group A" value={parseFloat(myEntry.group_a_points||0).toFixed(0)} />}
          {myEntry.group_b_points!=null && <StatCell label="Group B" value={parseFloat(myEntry.group_b_points||0).toFixed(0)} />}
        </div>
      )}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'40px 32px 1fr 60px 60px 80px', gap:6, padding:'10px 14px', background:'var(--bg-card-alt)', borderBottom:'1px solid var(--border)' }}>
          {['Rank','','Player','Grp A','Grp B','Total'].map((h,i)=><span key={i} style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.3px', textAlign:i>2?'right':'left' }}>{h}</span>)}
        </div>
        {leaderboard.length===0
          ? <Empty icon="⭐" title="No fantasy data" text="Leaderboard appears after Phase 1 closes" />
          : leaderboard.map((row,i) => {
            const isMe = row.user_id===userId
            return (
              <div key={row.user_id} style={{ display:'grid', gridTemplateColumns:'40px 32px 1fr 60px 60px 80px', gap:6, padding:'11px 14px', borderBottom:'1px solid var(--border-subtle)', background:isMe?C.accentDim:'transparent', alignItems:'center' }}>
                <div style={{ textAlign:'center' }}><RankMedal rank={row.overall_rank} /></div>
                <TeamAvatar url={row.team_photo_url} name={row.full_name} size={28} />
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:isMe?800:600, color:isMe?C.accent:'var(--text-primary)' }}>
                    {row.full_name||'User'}
                    {isMe && <span style={{ marginLeft:5, fontSize:10, background:C.accent, color:'#000', padding:'1px 5px', borderRadius:4, fontWeight:900 }}>YOU</span>}
                  </div>
                  {row.team_name && <div style={{ fontSize:11, color:'var(--text-faint)' }}>{row.team_name}</div>}
                </div>
                <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-dim)', fontWeight:600 }}>{parseFloat(row.group_a_points||0).toFixed(0)}</div>
                <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-dim)', fontWeight:600 }}>{parseFloat(row.group_b_points||0).toFixed(0)}</div>
                <div style={{ textAlign:'right', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:C.accent }}>{parseFloat(row.total_points||0).toLocaleString()}</div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = { upcoming:['rgba(245,158,11,0.12)','var(--gold)','Upcoming'], completed:['rgba(255,255,255,0.05)','var(--text-faint)','Done'], live:['rgba(239,68,68,0.12)','var(--red)','Live'], abandoned:['rgba(255,255,255,0.05)','var(--text-faint)','Abandoned'] }
  const [bg,color,label] = map[status]||map.upcoming
  return <span style={{ fontSize:10, padding:'3px 8px', borderRadius:'var(--pill-radius)', background:bg, color, fontFamily:'var(--font-display)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
}

function StatCell({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-faint)', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, color:color||'var(--text-primary)', lineHeight:1 }}>{value}</div>
    </div>
  )
}

function RankMedal({ rank }) {
  if (rank===1) return <span style={{ fontSize:18, flexShrink:0 }}>🥇</span>
  if (rank===2) return <span style={{ fontSize:18, flexShrink:0 }}>🥈</span>
  if (rank===3) return <span style={{ fontSize:18, flexShrink:0 }}>🥉</span>
  return <span style={{ color:'var(--text-faint)', fontSize:11, fontWeight:700, fontFamily:'var(--font-display)', flexShrink:0, textAlign:'center', display:'block' }}>#{rank}</span>
}

function TeamAvatar({ url, name, size=32 }) {
  const src = url ? (url.startsWith('http')?url:`${AVATAR_BASE}${url}`) : null
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--bg-card-alt)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'var(--text-faint)', border:'1px solid var(--border-card)', fontFamily:'var(--font-display)' }}>
      {src ? <img src={src} width={size} height={size} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} alt="" /> : (name||'?')[0]?.toUpperCase()}
    </div>
  )
}

function PlayerPhoto({ url, name, size=28 }) {
  const src = url ? (url.startsWith('http')?url:`${PLAYER_BASE}${url}`) : null
  return (
    <div style={{ width:size, height:size, borderRadius:6, background:'var(--bg-card-alt)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'var(--text-faint)', border:'1px solid var(--border)', fontFamily:'var(--font-display)' }}>
      {src ? <img src={src} width={size} height={size} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} alt="" /> : (name||'?')[0]?.toUpperCase()}
    </div>
  )
}
