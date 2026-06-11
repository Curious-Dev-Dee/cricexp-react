import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, AVATAR_BASE, PLAYER_BASE } from '../lib/supabase'
import { NavBar, Tabs, Card, Medal, Avatar, Empty, RoleChip, Badge, Loader } from '../components/Shared'

const TABS = [
  { key: 'fixtures', label: '📅 Fixtures' },
  { key: 'pointstable', label: '📊 Points Table' },
  { key: 'stats', label: '🏏 Player Stats' },
  { key: 'fantasy', label: '⭐ Fantasy' },
]

export default function LocalTournament({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab] = useState(searchParams.get('tab') || 'fixtures')
  const [loading, setLoading] = useState(true)

  // Data
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [players, setPlayers] = useState({})
  const [pointsTable, setPointsTable] = useState([])
  const [playerStats, setPlayerStats] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [scorecard, setScorecard] = useState(null)

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
    setSelectedMatch(match)
    setScorecard(null)
    const [bat, bowl, field] = await Promise.all([
      supabase.from('ppl_batting_scorecard').select('*, local_players(name, photo_url)').eq('match_id', match.id),
      supabase.from('ppl_bowling_scorecard').select('*, local_players(name, photo_url)').eq('match_id', match.id),
      supabase.from('ppl_fielding_stats').select('*, local_players(name, photo_url)').eq('match_id', match.id),
    ])
    setScorecard({ batting: bat.data || [], bowling: bowl.data || [], fielding: field.data || [] })
  }

  if (loading) return <Loader />
  if (!tournament) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Tournament not found</div>

  const myEntry = leaderboard.find(r => r.user_id === user.id) || leaderboard.find(r => r.full_name === user.user_metadata?.full_name)

  // Group matches
  const groupMatches = matches.filter(m => m.match_type === 'group' || m.match_type === 'league' || (!m.match_type || m.match_type === 'normal'))
  const knockoutMatches = matches.filter(m => ['knockout', 'semi', 'semifinal', 'final', 'playoff'].includes(m.match_type))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar
        back backTo="/"
        title={`🏏 ${tournament.name}`}
        subtitle={`${tournament.short_name || ''} · ${tournament.format || 'T20'} · ${tournament.status}`}
        badge={myEntry ? { value: parseFloat(myEntry.total_points || 0).toFixed(0), label: `Rank #${myEntry.overall_rank}`, color: 'var(--amber)' } : null}
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} accent="var(--amber)" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>

        {/* FIXTURES */}
        {tab === 'fixtures' && (
          <FixturesTab matches={matches} teams={teams} selectedMatch={selectedMatch} scorecard={scorecard} onSelectMatch={fetchScorecard} onClearMatch={() => { setSelectedMatch(null); setScorecard(null) }} />
        )}

        {/* POINTS TABLE */}
        {tab === 'pointstable' && (
          <PointsTableTab pointsTable={pointsTable} />
        )}

        {/* PLAYER STATS */}
        {tab === 'stats' && (
          <PlayerStatsTab playerStats={playerStats} />
        )}

        {/* FANTASY */}
        {tab === 'fantasy' && (
          <FantasyTab leaderboard={leaderboard} userId={user.id} myEntry={myEntry} />
        )}
      </div>
    </div>
  )
}

// ── FIXTURES ──────────────────────────────────────────────────────────────────
function FixturesTab({ matches, teams, selectedMatch, scorecard, onSelectMatch, onClearMatch }) {
  if (selectedMatch) {
    return <ScorecardView match={selectedMatch} scorecard={scorecard} teams={teams} onBack={onClearMatch} />
  }

  const grouped = {}
  matches.forEach(m => {
    const d = m.match_date || 'TBD'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(m)
  })

  return (
    <div>
      {Object.entries(grouped).map(([date, dayMatches]) => (
        <div key={date} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700, fontFamily: 'var(--mono)' }}>
            {date !== 'TBD' ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }) : 'TBD'}
          </div>
          {dayMatches.map(m => {
            const tA = teams[m.team_a_id] || {}
            const tB = teams[m.team_b_id] || {}
            const winner = teams[m.winner_id]
            const isLive = m.status === 'live' || m.status === 'in_progress'
            const isDone = m.status === 'completed'
            return (
              <div key={m.id} onClick={() => isDone && onSelectMatch(m)} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '14px 18px', marginBottom: 10, cursor: isDone ? 'pointer' : 'default',
                transition: 'border-color 0.15s',
                borderColor: isLive ? 'var(--red)' : 'var(--border)'
              }}
                onMouseOver={e => isDone && (e.currentTarget.style.borderColor = 'var(--amber)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = isLive ? 'var(--red)' : 'var(--border)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>M{m.match_number} {m.match_type ? `· ${m.match_type.toUpperCase()}` : ''}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isLive && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: 'var(--red)', fontWeight: 700 }}>🔴 LIVE</span>}
                    {!isLive && <Badge status={m.status} />}
                    {isDone && <span style={{ fontSize: 11, color: 'var(--amber)' }}>Tap for scorecard →</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: winner?.id === m.team_a_id ? 700 : 400, fontSize: 14, color: winner?.id === m.team_a_id ? 'var(--green)' : 'var(--text)' }}>
                      {tA.short_name || tA.name || 'TBA'}
                      {winner?.id === m.team_a_id && ' 🏆'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{tA.name}</div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>vs</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontWeight: winner?.id === m.team_b_id ? 700 : 400, fontSize: 14, color: winner?.id === m.team_b_id ? 'var(--green)' : 'var(--text)' }}>
                      {tB.short_name || tB.name || 'TBA'}
                      {winner?.id === m.team_b_id && ' 🏆'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{tB.name}</div>
                  </div>
                </div>
                {m.result_description && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {m.result_description}
                  </div>
                )}
                {m.match_time && !isDone && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>🕐 {m.match_time}</div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {matches.length === 0 && <Empty icon="📅" title="No matches scheduled" text="Fixtures will appear here once added" />}
    </div>
  )
}

// ── SCORECARD ─────────────────────────────────────────────────────────────────
function ScorecardView({ match, scorecard, teams, onBack }) {
  const tA = teams[match.team_a_id] || {}
  const tB = teams[match.team_b_id] || {}
  const winner = teams[match.winner_id]

  return (
    <div>
      <button onClick={onBack} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
        ← Back to Fixtures
      </button>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
              Match {match.match_number} · {match.match_type?.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{tA.short_name || tA.name}</div>
              {winner?.id === match.team_a_id && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>WINNER 🏆</div>}
            </div>
            <div style={{ color: 'var(--text3)', fontWeight: 700 }}>vs</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{tB.short_name || tB.name}</div>
              {winner?.id === match.team_b_id && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>WINNER 🏆</div>}
            </div>
          </div>
          {match.result_description && <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, marginTop: 10 }}>{match.result_description}</div>}
        </div>
      </Card>

      {!scorecard ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Loading scorecard…</div>
      ) : (
        <>
          {/* Batting */}
          {scorecard.batting.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>🏏 Batting</div>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 50px', gap: 6, padding: '8px 14px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
                  <span>Batter</span><span style={{ textAlign: 'right' }}>R</span><span style={{ textAlign: 'right' }}>B</span><span style={{ textAlign: 'right' }}>4s</span><span style={{ textAlign: 'right' }}>6s</span>
                </div>
                {scorecard.batting.map((b, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 50px', gap: 6, padding: '9px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.local_players?.name || b.player_name}</div>
                      {b.dismissal_desc && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.dismissal_desc}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)' }}>{b.runs}</div>
                    <div style={{ textAlign: 'right', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{b.balls_faced}</div>
                    <div style={{ textAlign: 'right', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{b.fours || 0}</div>
                    <div style={{ textAlign: 'right', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{b.sixes || 0}</div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Bowling */}
          {scorecard.bowling.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>🎳 Bowling</div>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 50px', gap: 6, padding: '8px 14px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
                  <span>Bowler</span><span style={{ textAlign: 'right' }}>O</span><span style={{ textAlign: 'right' }}>W</span><span style={{ textAlign: 'right' }}>R</span><span style={{ textAlign: 'right' }}>Eco</span>
                </div>
                {scorecard.bowling.map((b, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 50px', gap: 6, padding: '9px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{b.local_players?.name || b.player_name}</div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{b.overs}</div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{b.wickets}</div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{b.runs_conceded}</div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{b.economy_rate || '—'}</div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {scorecard.batting.length === 0 && scorecard.bowling.length === 0 && (
            <Empty icon="📋" title="No scorecard data" text="Detailed scorecard not available for this match" />
          )}
        </>
      )}
    </div>
  )
}

// ── POINTS TABLE ─────────────────────────────────────────────────────────────
function PointsTableTab({ pointsTable }) {
  const groups = {}
  pointsTable.forEach(r => { const g = r.group_name || 'Main'; if (!groups[g]) groups[g] = []; groups[g].push(r) })

  const qualColors = { qualified: 'var(--green)', eliminated: 'var(--red)', in_contention: 'var(--amber)' }
  const qualLabels = { qualified: '✅', eliminated: '❌', in_contention: '🟡' }

  return (
    <div>
      {Object.entries(groups).map(([group, rows]) => (
        <div key={group} style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--amber)' }}>Group {group}</div>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 30px 30px 30px 30px 50px 50px', gap: 6, padding: '10px 14px', background: 'var(--bg3)', fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>P</span><span style={{ textAlign: 'center' }}>W</span><span style={{ textAlign: 'center' }}>L</span><span style={{ textAlign: 'center' }}>NR</span><span style={{ textAlign: 'right' }}>NRR</span><span style={{ textAlign: 'right' }}>Pts</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 30px 30px 30px 30px 50px 50px', gap: 6, padding: '11px 14px', borderTop: '1px solid var(--border)', alignItems: 'center', background: r.qualification_status === 'qualified' ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                <div style={{ fontSize: 12, color: qualColors[r.qualification_status] || 'var(--text3)', textAlign: 'center' }}>
                  {qualLabels[r.qualification_status] || (i + 1)}
                </div>
                <div style={{ fontWeight: r.qualification_status === 'qualified' ? 700 : 400 }}>{r.local_teams?.name || 'Team'}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{r.played}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>{r.won}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>{r.lost}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>{r.no_result || 0}</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: parseFloat(r.nrr || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {parseFloat(r.nrr || 0).toFixed(3)}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{r.points}</div>
              </div>
            ))}
          </Card>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>✅ Qualified</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>🟡 In Contention</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>❌ Eliminated</span>
          </div>
        </div>
      ))}
      {pointsTable.length === 0 && <Empty icon="📊" title="No standings yet" text="Points table will update after matches are played" />}
    </div>
  )
}

// ── PLAYER STATS ─────────────────────────────────────────────────────────────
function PlayerStatsTab({ playerStats }) {
  const [sortBy, setSortBy] = useState('fantasy')
  const [filterRole, setFilterRole] = useState('all')

  const sorted = [...playerStats]
    .filter(p => filterRole === 'all' || p.role === filterRole)
    .sort((a, b) => {
      if (sortBy === 'fantasy') return parseFloat(b.fantasy_points || 0) - parseFloat(a.fantasy_points || 0)
      if (sortBy === 'runs') return parseInt(b.runs || 0) - parseInt(a.runs || 0)
      if (sortBy === 'wickets') return parseInt(b.wickets || 0) - parseInt(a.wickets || 0)
      return 0
    })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'BAT', 'BOWL', 'AR', 'WK'].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid', borderColor: filterRole === r ? 'var(--amber)' : 'var(--border)', background: filterRole === r ? 'rgba(245,158,11,0.15)' : 'var(--bg2)', color: filterRole === r ? 'var(--amber)' : 'var(--text2)', fontSize: 12 }}>
            {r}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', borderRadius: 8, fontSize: 12 }}>
          <option value="fantasy">Fantasy Pts</option>
          <option value="runs">Runs</option>
          <option value="wickets">Wickets</option>
        </select>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 36px 1fr 55px 45px 45px', gap: 6, padding: '10px 14px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
          <span>#</span><span></span><span>Player</span>
          <span style={{ textAlign: 'right' }}>Pts</span>
          <span style={{ textAlign: 'right' }}>Runs</span>
          <span style={{ textAlign: 'right' }}>Wkts</span>
        </div>
        {sorted.map((p, i) => (
          <div key={p.id || i} style={{ display: 'grid', gridTemplateColumns: '32px 36px 1fr 55px 45px 45px', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}><Medal rank={i + 1} /></div>
            <Avatar url={p.photo_url} name={p.name} size={28} base={PLAYER_BASE} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                <RoleChip role={p.role} />
                <span style={{ color: 'var(--text3)' }}>{p.team_name}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{parseFloat(p.fantasy_points || 0).toFixed(0)}</div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--blue)' }}>{p.runs || 0}</div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>{p.wickets || 0}</div>
          </div>
        ))}
        {sorted.length === 0 && <Empty icon="🏏" title="No stats yet" text="Player stats appear after matches are scored" />}
      </Card>
    </div>
  )
}

// ── FANTASY LEADERBOARD ───────────────────────────────────────────────────────
function FantasyTab({ leaderboard, userId, myEntry }) {
  return (
    <div>
      {myEntry && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 24 }}>
          <StatBox label="Your Rank" value={`#${myEntry.overall_rank}`} color="var(--amber)" />
          <StatBox label="Total Points" value={parseFloat(myEntry.total_points || 0).toLocaleString()} color="var(--green)" />
          {myEntry.group_a_points != null && <StatBox label="Group A" value={parseFloat(myEntry.group_a_points || 0).toFixed(0)} />}
          {myEntry.group_b_points != null && <StatBox label="Group B" value={parseFloat(myEntry.group_b_points || 0).toFixed(0)} />}
        </div>
      )}

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '48px 40px 1fr 65px 65px 80px', gap: 6, padding: '10px 14px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>
          <span>Rank</span><span></span><span>Player</span>
          <span style={{ textAlign: 'right' }}>Grp A</span>
          <span style={{ textAlign: 'right' }}>Grp B</span>
          <span style={{ textAlign: 'right' }}>Total</span>
        </div>
        {leaderboard.length === 0
          ? <Empty icon="⭐" title="No fantasy data" text="Leaderboard will appear after Phase 1 closes" />
          : leaderboard.map((row, i) => {
            // profile fields are directly on row from view
            const isMe = row.user_id === userId
            return (
              <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '48px 40px 1fr 65px 65px 80px', gap: 6, padding: '11px 14px', borderTop: '1px solid var(--border)', background: isMe ? 'rgba(245,158,11,0.05)' : 'transparent', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}><Medal rank={row.overall_rank} /></div>
                <Avatar url={row.team_photo_url} name={row.full_name} size={32} base={AVATAR_BASE} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--amber)' : 'var(--text)' }}>
                    {row.full_name || 'User'}
                    {isMe && <span style={{ fontSize: 10, background: 'var(--amber)', color: '#0f0f0f', padding: '1px 5px', borderRadius: 4, marginLeft: 5, fontWeight: 700 }}>YOU</span>}
                  </div>
                  {row.team_name && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{row.team_name}</div>}
                </div>
                <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{parseFloat(row.group_a_points || 0).toFixed(0)}</span>
                <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{parseFloat(row.group_b_points || 0).toFixed(0)}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{parseFloat(row.total_points || 0).toLocaleString()}</span>
              </div>
            )
          })
        }
      </Card>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}