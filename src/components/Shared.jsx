// Shared UI components

export const Loader = ({ text = 'Loading...' }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
    <div style={{ width: 36, height: 36, border: '3px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} className="spin" />
    <p style={{ color: 'var(--text2)', margin: 0 }}>{text}</p>
  </div>
)

export const NavBar = ({ user, onLogout, back, backTo, title, subtitle, badge }) => (
  <nav style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && (
        <a href={backTo || '/'} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '6px 12px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </a>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
        {subtitle && <div style={{ color: 'var(--text2)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        {!title && <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>🏏 CricExp</span>}
      </div>
      {badge && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 10, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: badge.color || 'var(--accent)' }}>{badge.value}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{badge.label}</div>
        </div>
      )}
      {user && !back && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
          </div>
          <button onClick={onLogout} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  </nav>
)

export const Tabs = ({ tabs, active, onChange, accent = 'var(--accent)' }) => (
  <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px', display: 'flex', gap: 0 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '13px 18px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          color: active === t.key ? accent : 'var(--text2)',
          borderBottom: active === t.key ? `2px solid ${accent}` : '2px solid transparent',
          fontSize: 13, fontWeight: active === t.key ? 600 : 400,
          transition: 'all 0.15s'
        }}>{t.label}</button>
      ))}
    </div>
  </div>
)

export const Card = ({ children, style }) => (
  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', ...style }}>
    {children}
  </div>
)

export const Badge = ({ status }) => {
  const colors = { active: 'var(--green)', upcoming: 'var(--amber)', completed: 'var(--text3)', live: 'var(--red)' }
  const bg = { active: 'rgba(34,197,94,0.1)', upcoming: 'rgba(245,158,11,0.1)', completed: 'rgba(61,66,96,0.3)', live: 'rgba(239,68,68,0.1)' }
  return (
    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: bg[status] || 'var(--bg3)', color: colors[status] || 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {status === 'live' ? '🔴 LIVE' : status}
    </span>
  )
}

export const Medal = ({ rank }) => {
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>
  return <span style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)' }}>#{rank}</span>
}

export const Avatar = ({ url, name, size = 36, base }) => {
  const src = url ? (base ? `${base}${url}` : url) : null
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: 'var(--text2)', border: '1px solid var(--border)' }}>
      {src
        ? <img src={src} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} alt="" />
        : (name || '?')[0]?.toUpperCase()
      }
    </div>
  )
}

export const Empty = ({ icon, title, text }) => (
  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
    <div style={{ color: 'var(--text2)', fontSize: 13 }}>{text}</div>
  </div>
)

export const RoleChip = ({ role }) => {
  const colors = { BAT: 'var(--blue)', BOWL: 'var(--green)', AR: 'var(--amber)', WK: 'var(--purple)' }
  return <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.3)', color: colors[role] || 'var(--text2)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{role}</span>
}
