import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AVATAR_BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public/avatars/'

export default function GlobalTournament({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [tab, setTab] = useState('leaderboard')
  const [leaderboard, setLeaderboard] = useState([])
  const [leagues, setLeagues] = useState([])
  const [privateLeaderboard, setPrivateLeaderboard] = useState([])
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [slug])

  const fetchAll = async () => {
    setLoading(true)

    const { data: t } = await supabase
      .from('global_tournaments').select('*').eq('slug', slug).single()
    setTournament(t)

    // Global leaderboard — join user_profiles for name
    const { data: lb } = await supabase
      .from('user_tournament_points')
      .select('user_id, total_points, matches_counted, prediction_stars, user_profiles(full_name, team_name, avatar_url)')
      .eq('tournament_id', t?.id)
      .order('total_points', { ascending: false })
      .limit(100)
    setLeaderboard(lb || [])

    // Private leagues user is in
    const { data: lm } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name, code)')
      .eq('user_id', user.id)
    setLeagues(lm?.map(m => m.leagues).filter(Boolean) || [])

    setLoading(false)
  }

  const loadLeagueLeaderboard = async (leagueId) => {
    setSelectedLeague(leagueId)
    const { data } = await supabase
      .from('private_league_leaderboard')
      .select('*')
      .eq('league_id', leagueId)
      .order('rank_in_league')
    setPrivateLeaderboard(data || [])
  }

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
  const rankChange = (curr, prev) => {
    if (!prev) return null
    if (curr < prev) return <span style={{ color: '#22c55e', fontSize: '11px' }}>▲{prev - curr}</span>
    if (curr > prev) return <span style={{ color: '#ef4444', fontSize: '11px' }}>▼{curr - prev}</span>
    return <span style={{ color: '#888', fontSize: '11px' }}>–</span>
  }

  const LeaderboardRow = ({ row, index, isMe, rankField = 'rank', pointsField = 'total_points', prevRankField }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '50px 48px 1fr 90px',
      gap: '8px', padding: '12px 16px',
      borderTop: index > 0 ? '1px solid #2d2f3e' : 'none',
      background: isMe ? 'rgba(99,102,241,0.08)' : 'transparent',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        {medal(index) ? (
          <span style={{ fontSize: '20px' }}>{medal(index)}</span>
        ) : (
          <span style={{ color: '#888', fontSize: '13px', fontWeight: 600 }}>#{row[rankField] || index + 1}</span>
        )}
        {prevRankField && rankChange(row[rankField] || index + 1, row[prevRankField])}
      </div>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2d2f3e', overflow: 'hidden', flexShrink: 0 }}>
        {(row.avatar_url || row.team_photo_url) && (
          <img
            src={`${AVATAR_BASE}${row.avatar_url || row.team_photo_url}`}
            width={36} height={36}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => e.target.style.display = 'none'}
            alt=""
          />
        )}
      </div>
      <div>
        <div style={{
          fontSize: '13px', fontWeight: isMe ? 700 : 500,
          color: isMe ? '#6366f1' : 'white'
        }}>
          {row.full_name || row.user_profiles?.full_name || 'User'}
          {isMe && <span style={{ fontSize: '10px', background: '#6366f1', color: 'white', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>YOU</span>}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>
          {row.team_name || row.user_profiles?.team_name || ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 700, color: '#22c55e' }}>
        {parseFloat(row[pointsField] || 0).toLocaleString()}
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  const myGlobalRank = leaderboard.findIndex(r => r.user_id === user.id)
  const myEntry = leaderboard[myGlobalRank]

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
            <h1 style={{ margin: 0, fontSize: '1.1rem' }}>{tournament?.flag_emoji} {tournament?.name}</h1>
            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
              {tournament?.season} • Season Completed • {tournament?.total_matches} Matches
            </p>
          </div>
          {myEntry && (
            <div style={{ background: '#2d2f3e', padding: '8px 16px', borderRadius: '8px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>
                {parseFloat(myEntry.total_points).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Rank #{myGlobalRank + 1}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d2f3e' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex' }}>
          {[
            { key: 'leaderboard', label: '🏆 Global Leaderboard' },
            { key: 'leagues', label: '🔒 Private Leagues' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.key ? '#6366f1' : '#888',
                borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: '13px', fontFamily: 'sans-serif', transition: 'all 0.2s'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

        {/* GLOBAL LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div>
            {myEntry && (
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Your Rank</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#6366f1' }}>#{myGlobalRank + 1}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Total Points</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22c55e' }}>{parseFloat(myEntry.total_points).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Matches</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{myEntry.matches_counted}</div>
                </div>
              </div>
            )}

            <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 48px 1fr 90px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Rank</span><span></span><span>Player</span><span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#555' }}>No leaderboard data yet.</div>
              ) : (
                leaderboard.map((row, i) => (
                  <LeaderboardRow
                    key={row.user_id}
                    row={{ ...row, ...row.user_profiles, avatar_url: row.user_profiles?.avatar_url }}
                    index={i}
                    isMe={row.user_id === user.id}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* PRIVATE LEAGUES */}
        {tab === 'leagues' && (
          <div>
            {leagues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
                <p>You're not in any private leagues for this tournament.</p>
              </div>
            ) : (
              <div>
                {/* League Selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {leagues.map(league => (
                    <button key={league.id}
                      onClick={() => loadLeagueLeaderboard(league.id)}
                      style={{
                        padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: 'none', fontFamily: 'sans-serif',
                        background: selectedLeague === league.id ? '#6366f1' : '#2d2f3e',
                        color: 'white', transition: 'background 0.2s'
                      }}>
                      {league.name}
                    </button>
                  ))}
                </div>

                {/* League Table */}
                {selectedLeague && (
                  <div style={{ background: '#1a1d2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d2f3e' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 48px 1fr 90px', gap: '8px', padding: '10px 16px', background: '#2d2f3e', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <span>Rank</span><span></span><span>Player</span><span style={{ textAlign: 'right' }}>Points</span>
                    </div>
                    {privateLeaderboard.length === 0 ? (
                      <div style={{ padding: '48px', textAlign: 'center', color: '#555' }}>No data for this league.</div>
                    ) : (
                      privateLeaderboard.map((row, i) => (
                        <LeaderboardRow
                          key={row.user_id}
                          row={row}
                          index={i}
                          isMe={row.user_id === user.id}
                          rankField="rank_in_league"
                        />
                      ))
                    )}
                  </div>
                )}

                {!selectedLeague && (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#555', fontSize: '14px' }}>
                    ☝️ Select a league above to see its leaderboard
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}