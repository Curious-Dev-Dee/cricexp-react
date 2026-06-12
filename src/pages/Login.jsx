import { supabase } from '../lib/supabase'
import { Btn, Card, Eyebrow } from '../components/Shared'

const pillars = [
  'Draft a season-long XI, not a one-match team',
  'Track live local scoreboards, tables, NRR and scorecards',
  'Compete across IPL, BBL, CPL and ICC events with manager-style control',
]

const features = [
  { label: 'Season formats', value: 'IPL · BBL · CPL · ICC' },
  { label: 'Fantasy control', value: 'Captains · transfers · phases' },
  { label: 'Local leagues', value: 'Live scoring · tables · stats' },
]

export default function Login() {
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div className="hero-grid" style={{ width: 'min(1180px, 100%)', padding: 0 }}>
        <Card accent topBar style={{ padding: 0 }}>
          <div style={{ padding: '32px clamp(22px, 4vw, 40px)', display: 'grid', gap: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div className="accent-dot" style={{ animation: 'pulseGlow 2.4s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, textTransform: 'uppercase' }}>CricExp</span>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Eyebrow>Fantasy cricket, built for the full season</Eyebrow>
              <div className="headline-xl">Manage tournaments like a cricket captain, not a casual picker.</div>
              <p style={{ color: 'var(--text-dim)', maxWidth: 620, fontSize: 16, lineHeight: 1.75 }}>
                CricExp is for serious fans who want season-long fantasy competition for the world&apos;s top premier leagues and a live data
                engine for local cricket tournaments.
              </p>
            </div>

            <div className="chip-row">
              <span className="chip">
                <span className="accent-dot" style={{ width: 6, height: 6, boxShadow: 'none' }} />
                Team building
              </span>
              <span className="chip">
                <span className="accent-dot" style={{ width: 6, height: 6, boxShadow: 'none' }} />
                Transfers by phase
              </span>
              <span className="chip">
                <span className="cyan-dot" style={{ width: 6, height: 6, boxShadow: 'none' }} />
                Ball-by-ball local coverage
              </span>
            </div>

            <div className="split-cards">
              {pillars.map((item) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 'var(--card-radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '16px 18px',
                    color: 'var(--text-dim)',
                    lineHeight: 1.7,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="metric-grid">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  style={{
                    borderRadius: 'var(--card-radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '14px 16px',
                  }}
                >
                  <div className="kicker" style={{ marginBottom: 8 }}>
                    {feature.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{feature.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card topBar style={{ padding: 0 }}>
          <div style={{ padding: '28px clamp(20px, 3vw, 32px)', display: 'grid', gap: 22 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <Eyebrow>Enter CricExp</Eyebrow>
              <div className="headline-lg">Sign in to run your season.</div>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                Pick your XI, monitor deadlines, track leaderboards, and follow every local league story from one control room.
              </p>
            </div>

            <div
              style={{
                borderRadius: 'var(--card-radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'rgba(255,255,255,0.03)',
                padding: 16,
                display: 'grid',
                gap: 12,
              }}
            >
              <div className="kicker">What you unlock</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <InfoRow title="Season HQ" text="All your global and local tournaments in one place." />
                <InfoRow title="Manager tools" text="Transfers, captaincy calls, player scouting and private leagues." />
                <InfoRow title="Live local data" text="Fixtures, points table, NRR, scorecards and tournament stats." />
              </div>
            </div>

            <Btn
              onClick={handleGoogle}
              size="lg"
              fullWidth
              style={{ justifyContent: 'center', gap: 12 }}
            >
              <GoogleMark />
              Continue with Google
            </Btn>

            <p style={{ color: 'var(--text-faint)', fontSize: 12, lineHeight: 1.7 }}>
              By continuing, you enter CricExp with your Google account and return to the live season dashboard after authentication.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ title, text }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start' }}>
      <div className="accent-dot" style={{ width: 9, height: 9, marginTop: 6, boxShadow: '0 0 0 5px rgba(184,255,69,0.08)' }} />
      <div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.65 }}>{text}</div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
