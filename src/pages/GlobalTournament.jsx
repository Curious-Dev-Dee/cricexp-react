import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LOGO_BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public/team-logos/'

export default function GlobalTournament({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab] = useState('points')
  const [pointsTable, setPointsTable] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [matches, setMatches] = useState([])
  const [myPoints, setMyPoints] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [slug])

  const fetchAll = async () => {
    setLoading(true)
    const { data: t } = await supabase
      .from('global_tournaments')
      .select('*')
      .eq('slug', slug)
      .single()
    setTournament(t)

    const [pts, lb, mx, my] = await Promise.all([
      supabase.from('ipl_points_table').select('*').order('position'),
      supabase.from('leaderboard_view').select('*').limit(50),
      supabase.from('matches').select('*').order('match_date', { ascending: false }).limit(20),
      supabase.from('user_tournament_points').select('*').eq('user_id', user.id).single()
    ])
    setPointsTable(pts.data || [])
    setLeaderboard(lb.data || [])
    setMatches(mx.data || [])
    setMyPoints(my.data)
    setLoading(false)
  }

  const nrrColor = (nrr) => {
    const n = parseFloat(nrr)
    if (n > 0) return '#22c55e'
    if (n < 0) return '#ef4444'
    return '#888'
  }

  const statusColor = { completed: '#6b7280', live: '#22c55e', upcoming: '#f59e0b', scheduled: '#6366f1' }

  const tabs = [
    { key: 'points', label: '🏏 Points Table' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'matches', label: '📅 Matches' },
    { key: 'my', label: '👤 My Team' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading tournament...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: 'white', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d2f3e', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/')} style={{ background: '#2d2f3e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>{tournament?.flag_emoji} {tournament?.name}</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
            {tournament?.season} • {tournament?.status?.toUpperCase()} • {tournament?.total_matches} matches
          </p>
        </div>
        {myPoints && (
          <div style={{ marginLeft: 'auto', background: '#2d2f3e', padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6366f1' }}>{myPoints.total_points}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>My Points</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d2f3e', display: 'flex', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: tab === t.key ? '#6366f1' : '#888', borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

        {/* POINTS TABLE */}
        {tab === 'points' && (
          <div>
            <h2 style={{ fontSize: '1rem', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>IPL 2026 Standings</h2>
            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px 40px 40px 40px 60px 70px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>#</span><span>Team</span><span style={{ textAlign: 'center' }}>P</span><span style={{ textAlign: 'center' }}>W</span><span style={{ textAlign: 'center' }}>L</span><span style={{ textAlign: 'center' }}>NR</span><span style={{ textAlign: 'center' }}>PTS</span><span style={{ textAlign: 'right' }}>NRR</span>
              </div>
              {pointsTable.map((row, i) => (
                <div key={row.team_id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px 40px 40px 40px 60px 70px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', background: i < 4 ? 'rgba(99,102,241,0.05)' : 'transparent', alignItems: 'center' }}>
                  <span style={{ color: i < 4 ? '#6366f1' : '#888', fontWeight: 600, fontSize: '13px' }}>{row.position}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={`${LOGO_BASE}${row.team_logo}`} alt={row.team_code} width={24} height={24} style={{ borderRadius: '50%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{row.team_code}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{row.team_name}</div>
                    </div>
                  </div>
                  <span style={{ textAlign: 'center', fontSize: '13px' }}>{row.played}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: '#22c55e' }}>{row.won}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: '#ef4444' }}>{row.lost}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: '#888' }}>{row.no_result}</span>
                  <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#6366f1' }}>{row.points}</span>
                  <span style={{ textAlign: 'right', fontSize: '12px', color: nrrColor(row.nrr) }}>{parseFloat(row.nrr) > 0 ? '+' : ''}{parseFloat(row.nrr).toFixed(3)}</span>
                </div>
              ))}
            </div>
            <p style={{ color: '#555', fontSize: '11px', marginTop: '12px' }}>🟣 Top 4 qualify for playoffs</p>
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div>
            <h2 style={{ fontSize: '1rem', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fantasy Leaderboard</h2>
            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                <span>Rank</span><span>Player</span><span style={{ textAlign: 'center' }}>Matches</span><span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {leaderboard.map((row, i) => {
                const isMe = row.user_id === user.id
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <div key={row.user_id || i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', background: isMe ? 'rgba(99,102,241,0.08)' : 'transparent', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>{medal || <span style={{ color: '#888', fontSize: '13px' }}>#{row.rank || i + 1}</span>}</span>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: isMe ? 700 : 400, color: isMe ? '#6366f1' : 'white' }}>
                        {row.username || row.display_name || row.email || 'User'}
                        {isMe && <span style={{ fontSize: '10px', color: '#6366f1', marginLeft: '6px' }}>YOU</span>}
                      </span>
                    </div>
                    <span style={{ textAlign: 'center', fontSize: '13px', color: '#888' }}>{row.matches_counted || '-'}</span>
                    <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{row.total_points}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MATCHES */}
        {tab === 'matches' && (
          <div>
            <h2 style={{ fontSize: '1rem', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Matches</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matches.map(m => (
                <div key={m.id} style={{ background: '#1a1d2e', border: '1px solid #2d2f3e', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>Match {m.match_number || ''} • {m.venue || ''}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#2d2f3e', color: statusColor[m.status] || '#888' }}>{m.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={`${LOGO_BASE}${m.team1_logo || m.team1_code?.toLowerCase() + '.png'}`} width={32} height={32} style={{ borderRadius: '50%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} alt="" />
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{m.team1_code || m.team1_name || m.team1}</span>
                    </div>
                    <span style={{ color: '#888', fontSize: '13px' }}>vs</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{m.team2_code || m.team2_name || m.team2}</span>
                      <img src={`${LOGO_BASE}${m.team2_logo || m.team2_code?.toLowerCase() + '.png'}`} width={32} height={32} style={{ borderRadius: '50%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} alt="" />
                    </div>
                  </div>
                  {m.result && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#888', textAlign: 'center' }}>{m.result}</p>}
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#555', textAlign: 'center' }}>
                    {m.match_date ? new Date(m.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MY TEAM */}
        {tab === 'my' && (
          <div>
            <h2 style={{ fontSize: '1rem', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>My Fantasy Team</h2>
            {myPoints ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Total Points', value: myPoints.total_points, color: '#6366f1' },
                  { label: 'Matches Counted', value: myPoints.matches_counted, color: '#22c55e' },
                  { label: 'Prediction Stars', value: myPoints.prediction_stars || 0, color: '#f59e0b' },
                  { label: 'Reward Subs', value: myPoints.reward_subs || 0, color: '#06b6d4' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#1a1d2e', border: '1px solid #2d2f3e', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏏</div>
                <p>No team data found for this tournament.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}