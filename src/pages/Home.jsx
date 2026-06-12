import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Card, Eyebrow, NavBar, SectionHeader, Skeleton } from '../components/Shared'

export default function Home({ user }) {
  const [global, setGlobal] = useState([])
  const [local, setLocal] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [g, l, p] = await Promise.all([
      supabase.from('global_tournaments').select('*').eq('is_visible', true).order('start_date', { ascending: false }),
      supabase.from('local_tournaments').select('*').order('start_date', { ascending: false }),
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    ])

    setGlobal(g.data || [])
    setLocal(l.data || [])
    setProfile(p.data)
    setLoading(false)
  }

  const stats = useMemo(() => {
    const all = [...global.map((item) => ({ ...item, kind: 'global' })), ...local.map((item) => ({ ...item, kind: 'local' }))]
    return {
      active: all.filter((item) => item.status === 'active' || item.status === 'live').length,
      upcoming: all.filter((item) => item.status === 'upcoming').length,
      completed: all.filter((item) => item.status === 'completed').length,
      fantasyReady: all.filter((item) => item.has_fantasy).length,
    }
  }, [global, local])

  const activeGlobal = global.filter((item) => item.status === 'active' || item.status === 'live')
  const activeLocal = local.filter((item) => item.status === 'active' || item.status === 'live')
  const nextGlobal = global.filter((item) => item.status !== 'completed')
  const nextLocal = local.filter((item) => item.status !== 'completed')

  return (
    <div style={{ minHeight: '100vh' }}>
      <NavBar user={user} onLogout={() => supabase.auth.signOut()} />

      {profile?.is_ppl_admin && (
        <div style={{ borderBottom: '1px solid rgba(255,93,115,0.16)', background: 'rgba(255,93,115,0.08)' }}>
          <div className="shell" style={{ paddingTop: 10, paddingBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--red)', fontWeight: 700 }}>Admin tools are enabled on this account.</div>
            <Btn variant="danger" size="sm" onClick={() => navigate('/admin')}>
              Open admin panel
            </Btn>
          </div>
        </div>
      )}

      <section className="hero-shell">
        <div className="hero-grid">
          <Card accent topBar style={{ padding: 0 }}>
            <div style={{ padding: '30px clamp(20px, 3vw, 34px)', display: 'grid', gap: 22 }}>
              <div>
                <Eyebrow>Season headquarters</Eyebrow>
                <div className="headline-lg">
                  {loading ? 'Loading your next move...' : `Welcome back, ${profile?.full_name || user.user_metadata?.full_name || 'Manager'}`}
                </div>
                <p style={{ color: 'var(--text-dim)', maxWidth: 720, marginTop: 12, lineHeight: 1.8 }}>
                  Track season-long fantasy tournaments, monitor your local league ecosystem, and jump straight into the next decision that matters.
                </p>
              </div>

              {loading ? (
                <div className="metric-grid">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} height={102} radius={18} />
                  ))}
                </div>
              ) : (
                <div className="metric-grid">
                  <InsightCard label="Live now" value={stats.active} accent="var(--accent)" text="Tournaments currently in motion" />
                  <InsightCard label="Coming next" value={stats.upcoming} accent="var(--orange)" text="Upcoming competitions to prep for" />
                  <InsightCard label="Fantasy ready" value={stats.fantasyReady} accent="var(--cyan)" text="Tournaments with season gameplay" />
                  <InsightCard label="Completed" value={stats.completed} accent="var(--text-primary)" text="Past seasons with archived standings" />
                </div>
              )}

              <div className="chip-row">
                <span className="chip">
                  <span className="accent-dot" style={{ width: 6, height: 6, boxShadow: 'none' }} />
                  Global fantasy manager
                </span>
                <span className="chip">
                  <span className="cyan-dot" style={{ width: 6, height: 6, boxShadow: 'none' }} />
                  Local live-scoring engine
                </span>
                {profile?.team_name && <span className="chip">{profile.team_name}</span>}
              </div>
            </div>
          </Card>

          <Card topBar style={{ padding: 0 }}>
            <div style={{ padding: '28px 24px', display: 'grid', gap: 18 }}>
              <div>
                <Eyebrow>Continue your season</Eyebrow>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, lineHeight: 0.96, textTransform: 'uppercase' }}>
                  What should you open next?
                </div>
              </div>

              <QuickLink
                title="Global fantasy tournaments"
                text={activeGlobal.length ? `${activeGlobal.length} active right now` : `${nextGlobal.length} available to track`}
                accent="var(--accent)"
                onClick={() => {
                  const target = activeGlobal[0] || nextGlobal[0]
                  if (target) navigate(`/t/${target.slug}`)
                }}
                disabled={!nextGlobal.length}
              />

              <QuickLink
                title="Local league control rooms"
                text={activeLocal.length ? `${activeLocal.length} active live-scoring tournament${activeLocal.length > 1 ? 's' : ''}` : `${nextLocal.length} leagues available`}
                accent="var(--cyan)"
                onClick={() => {
                  const target = activeLocal[0] || nextLocal[0]
                  if (target) navigate(`/local/${target.id}`)
                }}
                disabled={!nextLocal.length}
              />

              <QuickLink
                title="Fantasy leaderboards"
                text="Jump straight into standings and season points"
                accent="var(--gold)"
                onClick={() => {
                  const target = activeGlobal[0] || nextGlobal.find((item) => item.has_fantasy)
                  if (target) navigate(`/t/${target.slug}?tab=leaderboard`)
                }}
                disabled={!nextGlobal.some((item) => item.has_fantasy)}
              />
            </div>
          </Card>
        </div>
      </section>

      <div className="page-content">
        {loading ? (
          <div className="split-cards">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} height={240} radius={22} />
            ))}
          </div>
        ) : (
          <div className="section-stack">
            <TournamentSection
              eyebrow="Global fantasy"
              title="Season-long competitions"
              subtitle="Premier leagues and ICC tournaments where users manage their squad over the whole campaign."
              items={global}
              kind="global"
              navigate={navigate}
            />

            <TournamentSection
              eyebrow="Local leagues"
              title="Live scoring and stats hubs"
              subtitle="Fixtures, scorecards, points table, NRR, player stats, and season-long fantasy for partnered tournaments."
              items={local}
              kind="local"
              navigate={navigate}
            />

            {!global.length && !local.length && (
              <Card style={{ padding: 0 }}>
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Eyebrow>No tournaments yet</Eyebrow>
                  <div className="headline-lg" style={{ fontSize: 30 }}>
                    Your dashboard will fill up as events go live.
                  </div>
                  <p style={{ color: 'var(--text-dim)', marginTop: 12 }}>Add tournaments in Supabase and CricExp will automatically surface them here.</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TournamentSection({ eyebrow, title, subtitle, items, kind, navigate }) {
  if (!items.length) return null

  const active = items.filter((item) => item.status === 'active' || item.status === 'live')
  const upcoming = items.filter((item) => item.status === 'upcoming')
  const completed = items.filter((item) => item.status === 'completed')

  return (
    <section>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={
          <div className="chip-row">
            <span className="chip">{active.length} active</span>
            <span className="chip">{upcoming.length} upcoming</span>
            <span className="chip">{completed.length} completed</span>
          </div>
        }
      />

      <div className="split-cards">
        {items.map((item) => (
          <TournamentCard key={item.id} item={item} kind={kind} navigate={navigate} />
        ))}
      </div>
    </section>
  )
}

function TournamentCard({ item, kind, navigate }) {
  const isLocal = kind === 'local'
  const accent = isLocal ? 'var(--cyan)' : 'var(--accent)'
  const actionPath = isLocal ? `/local/${item.id}` : `/t/${item.slug}`
  const fantasyPath = isLocal ? `/local/${item.id}?tab=fantasy` : `/t/${item.slug}?tab=leaderboard`
  const totalMatches = item.total_matches || item.match_count || '—'

  return (
    <Card
      topBar
      style={{ cursor: 'pointer', height: '100%' }}
      onClick={() => navigate(actionPath)}
    >
      <div style={{ padding: 22, display: 'grid', gap: 18, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <Eyebrow>{isLocal ? 'Local tournament' : 'Global fantasy event'}</Eyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, lineHeight: 0.95, textTransform: 'uppercase' }}>
              {item.name}
            </div>
          </div>
          <Badge status={item.status} />
        </div>

        <div className="chip-row">
          <span className="chip">{item.season || item.short_name || 'Season'}</span>
          <span className="chip">{item.format || 'T20'}</span>
          <span className="chip">{totalMatches} matches</span>
        </div>

        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <MiniMeta label="Starts" value={item.start_date || 'TBD'} accent={accent} />
          <MiniMeta label="Ends" value={item.end_date || 'TBD'} accent={accent} />
        </div>

        <p style={{ color: 'var(--text-dim)', lineHeight: 1.75, flex: 1 }}>
          {isLocal
            ? 'Live fixtures, scorecards, points tables, player stats, and local fantasy standings built for serious tournament operations.'
            : 'Manager-style season-long fantasy for marquee cricket events, with rankings, transfers, and deeper tournament context.'}
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', flexWrap: 'wrap' }}>
          <Btn variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(actionPath) }}>
            Open tournament
          </Btn>
          {item.has_fantasy && (
            <Btn
              variant="success"
              onClick={(event) => {
                event.stopPropagation()
                navigate(fantasyPath)
              }}
              style={{ color: accent, borderColor: isLocal ? 'var(--cyan-mid)' : 'var(--border-accent)' }}
            >
              Open fantasy
            </Btn>
          )}
        </div>
      </div>
    </Card>
  )
}

function InsightCard({ label, value, accent, text }) {
  return (
    <div style={{ borderRadius: 'var(--card-radius-sm)', border: '1px solid var(--border-card)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, lineHeight: 0.95, color: accent }}>{value}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

function MiniMeta({ label, value, accent }) {
  return (
    <div style={{ borderRadius: 'var(--card-radius-sm)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
      <div className="kicker" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, lineHeight: 1, color: accent }}>{value}</div>
    </div>
  )
}

function QuickLink({ title, text, accent, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '16px 18px',
        borderRadius: 'var(--card-radius-sm)',
        border: `1px solid ${disabled ? 'var(--border-subtle)' : 'var(--border-card)'}`,
        background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
        color: disabled ? 'var(--text-faint)' : 'var(--text-primary)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: accent }}>→</div>
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6, lineHeight: 1.65 }}>{text}</div>
    </button>
  )
}
