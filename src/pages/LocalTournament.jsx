import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AVATAR_BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public/avatars/'
const PLAYER_BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public/player-photos/'

export default function LocalTournament({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab] = useState('stats')
  const [statsTab, setStatsTab] = useState('fantasy')
  const [playerStats, setPlayerStats] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [t, ps, lb] = await Promise.all([
      supabase.from('local_tournaments').select('*').eq('id', id).single(),
      supabase.from('v_ppl_player_overall_stats').select('*').order('fantasy_points', { ascending: false }).limit(60),
      supabase.from('ppl_overall_leaderboard').select('*').order('overall_rank').limit(100),
    ])
    setTournament(t.data)
    setPlayerStats(ps.data || [])
    setLeaderboard(lb.data || [])
    setLoading(false)
  }

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
  const roleColor = { BAT: '#3b82f6', BOWL: '#22c55e', AR: '#f59e0b', WK: '#a855f7' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  const myEntry = leaderboard.find(r => r.user_id === user.id)

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
              {tournament?.short_name} • {tournament?.format} • {tournament?.status}
            </p>
          </div>
          {myEntry && (
            <div style={{ background: '#2d2f3e', padding: '8px 16px', borderRadius: '8px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                {parseFloat(myEntry.total_points).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>Rank #{myEntry.overall_rank}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d2f3e' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex' }}>
          {[
            { key: 'stats', label: '🏏 Player Stats' },
            { key: 'fantasy', label: '⭐ Fantasy Leaderboard' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.key ? '#f59e0b' : '#888',
                borderBottom: tab === t.key ? '2px solid #f59e0b' : '2px solid transparent',
                fontSize: '13px', fontFamily: 'sans-serif', transition: 'all 0.2s'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

        {/* PLAYER STATS */}
        {tab === 'stats' && (
          <div>
            {/* Sub tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { key: 'fantasy', label: '⭐ Fantasy Pts' },
                { key: 'bat', label: '🏏 Batting' },
                { key: 'bowl', label: '🎳 Bowling' },
              ].map(s => (
                <button key={s.key} onClick={() => setStatsTab(s.key)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
                    cursor: 'pointer', border: 'none', fontFamily: 'sans-serif',
                    background: statsTab === s.key ? '#f59e0b' : '#2d2f3e',
                    color: statsTab === s.key ? '#0f1117' : 'white',
                    fontWeight: statsTab === s.key ? 700 : 400
                  }}>
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>

              {/* Fantasy Points */}
              {statsTab === 'fantasy' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 1fr 70px 60px 60px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    <span>#</span><span></span><span>Player</span>
                    <span style={{ textAlign: 'right' }}>Fantasy</span>
                    <span style={{ textAlign: 'right' }}>Runs</span>
                    <span style={{ textAlign: 'right' }}>Wkts</span>
                  </div>
                  {playerStats.map((p, i) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '44px 44px 1fr 70px 60px 60px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        {medal(i) ? <span style={{ fontSize: '18px' }}>{medal(i)}</span> : <span style={{ color: '#888', fontSize: '12px' }}>{i + 1}</span>}
                      </div>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden', flexShrink: 0 }}>
                        {p.photo_url && <img src={`${PLAYER_BASE}${p.photo_url}`} width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: roleColor[p.role] || '#888' }}>{p.role}</span>
                          <span style={{ color: '#555', marginLeft: '6px' }}>{p.team_name}</span>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{parseFloat(p.fantasy_points).toFixed(0)}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#3b82f6' }}>{p.runs}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#22c55e' }}>{p.wickets}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Batting */}
              {statsTab === 'bat' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 1fr 70px 60px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    <span>#</span><span></span><span>Player</span>
                    <span style={{ textAlign: 'right' }}>Runs</span>
                    <span style={{ textAlign: 'right' }}>Fielding</span>
                  </div>
                  {[...playerStats].sort((a, b) => b.runs - a.runs).map((p, i) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '44px 44px 1fr 70px 60px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>{i + 1}</span>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden' }}>
                        {p.photo_url && <img src={`${PLAYER_BASE}${p.photo_url}`} width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: roleColor[p.role] || '#888' }}>{p.role}</span>
                          <span style={{ color: '#555', marginLeft: '6px' }}>{p.team_name}</span>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>{p.runs}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>{p.fielding}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Bowling */}
              {statsTab === 'bowl' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 1fr 70px 60px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                    <span>#</span><span></span><span>Player</span>
                    <span style={{ textAlign: 'right' }}>Wickets</span>
                    <span style={{ textAlign: 'right' }}>Fielding</span>
                  </div>
                  {[...playerStats].sort((a, b) => b.wickets - a.wickets).map((p, i) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '44px 44px 1fr 70px 60px', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2d2f3e', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>{i + 1}</span>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden' }}>
                        {p.photo_url && <img src={`${PLAYER_BASE}${p.photo_url}`} width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: roleColor[p.role] || '#888' }}>{p.role}</span>
                          <span style={{ color: '#555', marginLeft: '6px' }}>{p.team_name}</span>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{p.wickets}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>{p.fielding}</span>
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
            {myEntry && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Your Rank</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>#{myEntry.overall_rank}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Team</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{myEntry.team_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Total</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{parseFloat(myEntry.total_points).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 44px 1fr 65px 65px 80px', gap: '6px', padding: '10px 14px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                <span>Rank</span><span></span><span>Player</span>
                <span style={{ textAlign: 'right' }}>Grp A</span>
                <span style={{ textAlign: 'right' }}>Grp B</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {leaderboard.map((row, i) => {
                const isMe = row.user_id === user.id
                return (
                  <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '50px 44px 1fr 65px 65px 80px', gap: '6px', padding: '12px 14px', borderTop: i > 0 ? '1px solid #2d2f3e' : 'none', background: isMe ? 'rgba(245,158,11,0.08)' : 'transparent', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      {medal(i) ? <span style={{ fontSize: '18px' }}>{medal(i)}</span> : <span style={{ color: '#888', fontSize: '12px', fontWeight: 600 }}>#{row.overall_rank}</span>}
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden' }}>
                      {row.team_photo_url && <img src={`${AVATAR_BASE}${row.team_photo_url}`} width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} alt="" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: isMe ? 700 : 500, color: isMe ? '#f59e0b' : 'white' }}>
                        {row.full_name}
                        {isMe && <span style={{ fontSize: '10px', background: '#f59e0b', color: '#0f1117', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>YOU</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#555' }}>{row.team_name}</div>
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