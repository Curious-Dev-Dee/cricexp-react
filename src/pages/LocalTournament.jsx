import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AVATAR_BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public/avatars/'
const PLAYER_BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public/player-photos/'

export default function LocalTournament({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab] = useState('matches')
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [pointsTable, setPointsTable] = useState([])
  const [playerStats, setPlayerStats] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsTab, setStatsTab] = useState('bat')

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [t, mx, tm, pts, ps, lb] = await Promise.all([
      supabase.from('local_tournaments').select('*').eq('id', id).single(),
      supabase.from('local_matches')
        .select('*, team_a:local_teams!team_a_id(id,name,short_name,logo_url), team_b:local_teams!team_b_id(id,name,short_name,logo_url), winner:local_teams!winner_id(id,name,short_name), mom:local_players!mom_player_id(id,name)')
        .eq('tournament_id' in {} ? 'tournament_id' : 'id', id) // fallback
        .order('match_number'),
      supabase.from('local_teams').select('*'),
      supabase.from('ppl_points_table').select('*').order('position'),
      supabase.from('v_ppl_player_overall_stats').select('*').order('fantasy_points', { ascending: false }).limit(50),
      supabase.from('ppl_overall_leaderboard').select('*').order('overall_rank').limit(100),
    ])
    setTournament(t.data)
    // Filter matches by tournament
    const allMatches = mx.data || []
    setMatches(allMatches)
    setTeams(tm.data || [])
    setPointsTable(pts.data || [])
    setPlayerStats(ps.data || [])
    setLeaderboard(lb.data || [])
    setLoading(false)
  }

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
  const roleColor = { BAT: '#3b82f6', BOWL: '#22c55e', AR: '#f59e0b', WK: '#a855f7' }

  const nrrColor = (nrr) => {
    const n = parseFloat(nrr)
    return n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#888'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading tournament...</p>
    </div>
  )

  const myLbEntry = leaderboard.find(r => r.user_id === user.id)

  const tabs = [
    { key: 'matches', label: '📅 Results' },
    { key: 'points', label: '📊 Points Table' },
    { key: 'stats', label: '🏏 Player Stats' },
    { key: 'fantasy', label: '⭐ Fantasy' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: 'white', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d2f3e', padding: '16px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')}
            style={{ background: '#2d2f3e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '1.1rem' }}>🏏 {tournament?.name}</h1>
            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
              {tournament?.format} • Completed • {tournament?.start_date} → {tournament?.end_date}
            </p>
          </div>
          {myLbEntry && (
            <div style={{ background: '#2d2f3e', padding: '8px 16px', borderRadius: '8px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                {parseFloat(myLbEntry.total_points).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>Fantasy Pts</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d2f3e' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.key ? '#f59e0b' : '#888',
                borderBottom: tab === t.key ? '2px solid #f59e0b' : '2px solid transparent',
                fontSize: '13px', whiteSpace: 'nowrap', fontFamily: 'sans-serif', transition: 'all 0.2s'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

        {/* MATCH RESULTS */}
        {tab === 'matches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
                <p>No matches found.</p>
              </div>
            ) : (
              matches.map(m => {
                const isCompleted = m.status === 'completed'
                const teamA = m.team_a
                const teamB = m.team_b
                const winner = m.winner
                return (
                  <div key={m.id} style={{ background: '#1a1d2e', border: '1px solid #2d2f3e', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', color: '#666' }}>
                      <span>Match {m.match_number} {m.group_name ? `• ${m.group_name}` : ''}</span>
                      <span style={{ color: isCompleted ? '#22c55e' : '#f59e0b' }}>{m.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: winner?.id === teamA?.id ? 700 : 400, fontSize: '15px', color: winner?.id === teamA?.id ? '#22c55e' : 'white' }}>
                          {teamA?.short_name || 'TBA'}
                          {winner?.id === teamA?.id && <span style={{ fontSize: '14px', marginLeft: '4px' }}>✓</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{teamA?.name}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '4px 12px', background: '#2d2f3e', borderRadius: '6px', fontSize: '12px', color: '#888' }}>
                        {isCompleted ? 'FT' : 'vs'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: winner?.id === teamB?.id ? 700 : 400, fontSize: '15px', color: winner?.id === teamB?.id ? '#22c55e' : 'white' }}>
                          {winner?.id === teamB?.id && <span style={{ fontSize: '14px', marginRight: '4px' }}>✓</span>}
                          {teamB?.short_name || 'TBA'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{teamB?.name}</div>
                      </div>
                    </div>
                    {m.result_description && (
                      <div style={{ marginTop: '10px', padding: '8px 12px', background: '#0f1117', borderRadius: '6px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                        {m.result_description}
                      </div>
                    )}
                    {m.mom && (
                      <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: '#f59e0b' }}>
                        🌟 MOM: {m.mom.name}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* POINTS TABLE */}
        {tab === 'points' && (
          <div>
            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 36px 36px 36px 36px 54px 70px', gap: '6px', padding: '10px 14px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>#</span><span>Team</span>
                <span style={{ textAlign: 'center' }}>P</span>
                <span style={{ textAlign: 'center' }}>W</span>
                <span style={{ textAlign: 'center' }}>L</span>
                <span style={{ textAlign: 'center' }}>NR</span>
                <span style={{ textAlign: 'center' }}>PTS</span>
                <span style={{ textAlign: 'right' }}>NRR</span>
              </div>
              {pointsTable.map((row, i) => (
                <div key={row.team_id || i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 36px 36px 36px 36px 54px 70px', gap: '6px', padding: '12px 14px', borderTop: '1px solid #2d2f3e', background: i < 2 ? 'rgba(245,158,11,0.05)' : 'transparent', alignItems: 'center' }}>
                  <span style={{ color: i < 2 ? '#f59e0b' : '#888', fontWeight: 600, fontSize: '13px' }}>{row.position || i + 1}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{row.team_short_name || row.team_name}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px' }}>{row.played || row.matches_played}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: '#22c55e' }}>{row.won}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: '#ef4444' }}>{row.lost}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: '#888' }}>{row.no_result || 0}</span>
                  <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{row.points}</span>
                  <span style={{ textAlign: 'right', fontSize: '12px', color: nrrColor(row.nrr) }}>
                    {parseFloat(row.nrr || 0) > 0 ? '+' : ''}{parseFloat(row.nrr || 0).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
            {pointsTable.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>No standings data.</div>
            )}
          </div>
        )}

        {/* PLAYER STATS */}
        {tab === 'stats' && (
          <div>
            {/* Sub tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { key: 'bat', label: '🏏 Batting' },
                { key: 'bowl', label: '🎳 Bowling' },
                { key: 'fantasy', label: '⭐ Fantasy Pts' },
              ].map(s => (
                <button key={s.key} onClick={() => setStatsTab(s.key)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: 'none', fontFamily: 'sans-serif',
                    background: statsTab === s.key ? '#f59e0b' : '#2d2f3e',
                    color: statsTab === s.key ? '#0f1117' : 'white', fontWeight: statsTab === s.key ? 700 : 400
                  }}>
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              {/* Batting */}
              {statsTab === 'bat' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px 60px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    <span>#</span><span>Player</span><span style={{ textAlign: 'right' }}>Runs</span><span style={{ textAlign: 'right' }}>SR</span><span style={{ textAlign: 'right' }}>4s/6s</span>
                  </div>
                  {[...playerStats].sort((a, b) => b.runs - a.runs).map((p, i) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px 60px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '13px' }}>{i + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden', flexShrink: 0 }}>
                          {p.photo_url && <img src={`${PLAYER_BASE}${p.photo_url}`} width={28} height={28} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: '11px' }}>
                            <span style={{ color: roleColor[p.role] || '#888' }}>{p.role}</span>
                            <span style={{ color: '#555', marginLeft: '6px' }}>{p.team_name}</span>
                          </div>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>{p.runs}</span>
                      <span style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>-</span>
                      <span style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>-</span>
                    </div>
                  ))}
                </>
              )}

              {/* Bowling */}
              {statsTab === 'bowl' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    <span>#</span><span>Player</span><span style={{ textAlign: 'right' }}>Wkts</span><span style={{ textAlign: 'right' }}>Fielding</span>
                  </div>
                  {[...playerStats].sort((a, b) => b.wickets - a.wickets).map((p, i) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '13px' }}>{i + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden', flexShrink: 0 }}>
                          {p.photo_url && <img src={`${PLAYER_BASE}${p.photo_url}`} width={28} height={28} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: '11px' }}>
                            <span style={{ color: roleColor[p.role] || '#888' }}>{p.role}</span>
                            <span style={{ color: '#555', marginLeft: '6px' }}>{p.team_name}</span>
                          </div>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{p.wickets}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>{p.fielding}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Fantasy Points */}
              {statsTab === 'fantasy' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 80px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    <span>#</span><span>Player</span><span style={{ textAlign: 'right' }}>Pts</span><span style={{ textAlign: 'right' }}>Runs</span><span style={{ textAlign: 'right' }}>Wkts</span>
                  </div>
                  {playerStats.map((p, i) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 80px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>{medal(i) || <span style={{ color: '#888', fontSize: '13px' }}>{i + 1}</span>}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden', flexShrink: 0 }}>
                          {p.photo_url && <img src={`${PLAYER_BASE}${p.photo_url}`} width={28} height={28} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: '11px' }}>
                            <span style={{ color: roleColor[p.role] || '#888' }}>{p.role}</span>
                            <span style={{ color: '#555', marginLeft: '6px' }}>{p.team_name}</span>
                          </div>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{parseFloat(p.fantasy_points).toFixed(0)}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#3b82f6' }}>{p.runs}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#22c55e' }}>{p.wickets}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* FANTASY LEADERBOARD */}
        {tab === 'fantasy' && (
          <div>
            {myLbEntry && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Your Rank</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b' }}>#{myLbEntry.overall_rank}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#888' }}>Team</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{myLbEntry.team_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#888' }}>Total</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22c55e' }}>{parseFloat(myLbEntry.total_points).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 48px 1fr 70px 70px 80px', gap: '6px', padding: '10px 14px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                <span>Rank</span><span></span><span>Player</span>
                <span style={{ textAlign: 'right' }}>A</span>
                <span style={{ textAlign: 'right' }}>B</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {leaderboard.map((row, i) => {
                const isMe = row.user_id === user.id
                return (
                  <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '50px 48px 1fr 70px 70px 80px', gap: '6px', padding: '12px 14px', borderTop: i > 0 ? '1px solid #2d2f3e' : 'none', background: isMe ? 'rgba(245,158,11,0.08)' : 'transparent', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      {medal(i) ? <span style={{ fontSize: '18px' }}>{medal(i)}</span> : <span style={{ color: '#888', fontSize: '13px', fontWeight: 600 }}>#{row.overall_rank}</span>}
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden' }}>
                      {row.team_photo_url && <img src={`${AVATAR_BASE}${row.team_photo_url}`} width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: isMe ? 700 : 500, color: isMe ? '#f59e0b' : 'white' }}>
                        {row.full_name}
                        {isMe && <span style={{ fontSize: '10px', background: '#f59e0b', color: '#0f1117', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>YOU</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{row.team_name}</div>
                    </div>
                    <span style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>{parseFloat(row.group_a_points || 0).toFixed(0)}</span>
                    <span style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>{parseFloat(row.group_b_points || 0).toFixed(0)}</span>
                    <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{parseFloat(row.total_points).toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}