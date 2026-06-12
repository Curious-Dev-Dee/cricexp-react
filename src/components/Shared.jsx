import { Link } from 'react-router-dom'

const shellStyle = {
  maxWidth: 'var(--app-max)',
  margin: '0 auto',
  padding: '0 18px',
}

const topHighlight = {
  content: "''",
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 18%)',
  pointerEvents: 'none',
}

export const Card = ({ children, style, accent, topBar, ...props }) => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--card-radius)',
      border: `1px solid ${accent ? 'var(--border-accent)' : 'var(--border-card)'}`,
      background: accent
        ? 'linear-gradient(180deg, rgba(16,29,50,0.96), rgba(9,18,31,0.96))'
        : 'linear-gradient(180deg, rgba(13,24,42,0.94), rgba(9,18,31,0.94))',
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}
    {...props}
  >
    <div style={topHighlight} />
    {topBar && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent ? 'var(--accent)' : 'linear-gradient(90deg, var(--accent), var(--cyan))',
        }}
      />
    )}
    {children}
  </div>
)

export const Loader = ({ text = 'Loading CricExp...' }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background:
        'radial-gradient(circle at top right, rgba(184,255,69,0.08), transparent 25%), radial-gradient(circle at top left, rgba(55,232,255,0.08), transparent 28%), linear-gradient(180deg, #071321 0%, #06111f 100%)',
    }}
  >
    <div
      style={{
        width: 'min(420px, 100%)',
        padding: '28px 24px',
        borderRadius: 'var(--card-radius)',
        border: '1px solid var(--border-card)',
        background: 'linear-gradient(180deg, rgba(13,24,42,0.95), rgba(9,18,31,0.95))',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div className="accent-dot" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, textTransform: 'uppercase' }}>
          CricExp
        </span>
      </div>
      <div
        style={{
          width: 42,
          height: 42,
          margin: '0 auto 12px',
          border: '3px solid var(--border-card)',
          borderTopColor: 'var(--accent)',
          borderRadius: '999px',
        }}
        className="spin"
      />
      <p style={{ color: 'var(--text-dim)', margin: 0 }}>{text}</p>
    </div>
  </div>
)

export const NavBar = ({ user, onLogout, back, backTo, title, subtitle, badge, accent = 'var(--accent)', actions }) => (
  <nav
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 700,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      background: 'rgba(6,17,31,0.78)',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <div
      style={{
        ...shellStyle,
        height: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {back ? (
        <Link
          to={backTo || '/'}
          style={{
            width: 42,
            height: 42,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 14,
            border: '1px solid var(--border-card)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
          aria-label="Go back"
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
        </Link>
      ) : (
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div className="accent-dot" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, textTransform: 'uppercase' }}>CricExp</span>
        </Link>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 24,
                lineHeight: 0.96,
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  color: 'var(--text-faint)',
                  fontSize: 12,
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Season-long fantasy leagues and local live scoring
          </div>
        )}
      </div>

      {badge && (
        <div
          style={{
            padding: '9px 14px',
            borderRadius: 16,
            border: '1px solid var(--border-card)',
            background: 'rgba(255,255,255,0.04)',
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, lineHeight: 1, color: badge.color || accent }}>
            {badge.value}
          </div>
          <div style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 2 }}>{badge.label}</div>
        </div>
      )}

      {actions}

      {user && !back && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Avatar
            name={user.user_metadata?.full_name || user.email}
            size={38}
            style={{
              background: 'linear-gradient(180deg, rgba(184,255,69,0.16), rgba(184,255,69,0.08))',
              border: '1px solid var(--border-accent)',
              color: 'var(--accent-strong)',
            }}
          />
          <button
            onClick={onLogout}
            style={{
              padding: '10px 14px',
              borderRadius: 14,
              border: '1px solid var(--border-card)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-dim)',
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  </nav>
)

export const Tabs = ({ tabs, active, onChange, accent = 'var(--accent)' }) => (
  <div
    style={{
      position: 'sticky',
      top: 72,
      zIndex: 650,
      backdropFilter: 'blur(16px)',
      background: 'rgba(6,17,31,0.8)',
      borderBottom: '1px solid var(--border)',
      overflowX: 'auto',
    }}
  >
    <div style={{ ...shellStyle, display: 'flex', gap: 10, paddingTop: 12, paddingBottom: 12 }}>
      {tabs.map((tab) => {
        const isActive = active === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '11px 16px',
              borderRadius: 14,
              border: `1px solid ${isActive ? accent : 'var(--border)'}`,
              background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              color: isActive ? accent : 'var(--text-faint)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  </div>
)

export const Badge = ({ status }) => {
  const map = {
    active: { bg: 'rgba(184,255,69,0.14)', color: 'var(--accent-strong)', label: 'Active' },
    upcoming: { bg: 'rgba(255,154,77,0.14)', color: 'var(--orange)', label: 'Upcoming' },
    completed: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-faint)', label: 'Completed' },
    live: { bg: 'rgba(255,93,115,0.14)', color: 'var(--red)', label: 'Live' },
    locked: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-faint)', label: 'Locked' },
  }
  const tone = map[status] || map.upcoming
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        borderRadius: 'var(--pill-radius)',
        background: tone.bg,
        color: tone.color,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {status === 'live' && <span style={{ width: 7, height: 7, borderRadius: '999px', background: 'currentColor' }} />}
      {tone.label}
    </span>
  )
}

export const Medal = ({ rank }) => {
  const palette = {
    1: { bg: 'rgba(255,204,102,0.16)', color: 'var(--gold)' },
    2: { bg: 'rgba(139,199,255,0.16)', color: 'var(--rank-color)' },
    3: { bg: 'rgba(255,255,255,0.12)', color: 'var(--text-primary)' },
  }
  const tone = palette[rank]
  return (
    <span
      style={{
        minWidth: 30,
        height: 30,
        display: 'inline-grid',
        placeItems: 'center',
        borderRadius: 999,
        background: tone?.bg || 'rgba(255,255,255,0.06)',
        color: tone?.color || 'var(--text-faint)',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 14,
      }}
    >
      {rank <= 3 ? rank : `#${rank}`}
    </span>
  )
}

export const Avatar = ({ url, name, size = 36, base, style }) => {
  const src = url ? (base ? `${base}${url}` : url) : null
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.36,
        fontWeight: 800,
        color: 'var(--text-faint)',
        border: '1px solid var(--border-card)',
        fontFamily: 'var(--font-display)',
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
          alt=""
        />
      ) : (
        (name || '?')[0]?.toUpperCase()
      )}
    </div>
  )
}

export const Empty = ({ icon, title, text }) => (
  <div
    style={{
      padding: '52px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 12,
    }}
  >
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: 20,
        border: '1px solid var(--border-card)',
        background: 'rgba(255,255,255,0.04)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 26,
        color: 'var(--text-faint)',
      }}
    >
      {icon || '—'}
    </div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, textTransform: 'uppercase' }}>{title}</div>
    <div style={{ color: 'var(--text-dim)', maxWidth: 320, lineHeight: 1.7 }}>{text}</div>
  </div>
)

export const RoleChip = ({ role }) => {
  const colors = {
    BAT: { bg: 'rgba(139,199,255,0.14)', color: 'var(--rank-color)' },
    BOWL: { bg: 'rgba(184,255,69,0.14)', color: 'var(--accent-strong)' },
    AR: { bg: 'rgba(255,204,102,0.14)', color: 'var(--gold)' },
    WK: { bg: 'rgba(55,232,255,0.14)', color: 'var(--cyan-strong)' },
  }
  const tone = colors[role] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: 8,
        background: tone.bg,
        color: tone.color,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '0.08em',
      }}
    >
      {role}
    </span>
  )
}

export const Eyebrow = ({ children, style }) => (
  <div
    style={{
      color: 'var(--text-faint)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      marginBottom: 6,
      ...style,
    }}
  >
    {children}
  </div>
)

export const PtsPill = ({ pts }) => {
  const total = parseFloat(pts || 0)
  const active = total > 0
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        borderRadius: 'var(--pill-radius)',
        background: active ? 'var(--pts-active-bg)' : 'var(--pts-muted-bg)',
        color: active ? 'var(--pts-active-color)' : 'var(--pts-muted-color)',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 14,
        whiteSpace: 'nowrap',
      }}
    >
      {total.toLocaleString()} pts
    </span>
  )
}

export const Btn = ({
  children,
  onClick,
  disabled,
  variant = 'primary',
  style,
  size = 'md',
  type = 'button',
  fullWidth = false,
  ...props
}) => {
  const sizeMap = {
    sm: { fontSize: 12, padding: '8px 13px' },
    md: { fontSize: 13, padding: '11px 16px' },
    lg: { fontSize: 15, padding: '14px 20px' },
  }
  const variants = {
    primary: { background: 'var(--accent)', color: '#07111c', border: '1px solid transparent' },
    secondary: { background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' },
    ghost: { background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)' },
    danger: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,93,115,0.34)' },
    success: { background: 'rgba(184,255,69,0.14)', color: 'var(--accent-strong)', border: '1px solid var(--border-accent)' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: fullWidth ? '100%' : 'auto',
        borderRadius: 'var(--btn-radius)',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        transition: `transform var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...sizeMap[size],
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export const StatBox = ({ label, value, color, sub, style }) => (
  <div
    style={{
      borderRadius: 'var(--card-radius-sm)',
      border: '1px solid var(--border-card)',
      background: 'rgba(255,255,255,0.04)',
      padding: '14px 16px',
      ...style,
    }}
  >
    <Eyebrow style={{ marginBottom: 8 }}>{label}</Eyebrow>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, lineHeight: 0.95, color: color || 'var(--text-primary)' }}>
      {value}
    </div>
    {sub && <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 8 }}>{sub}</div>}
  </div>
)

export const Skeleton = ({ height = 60, radius = 12, style }) => (
  <div
    style={{
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(19,33,55,0.95) 25%, rgba(29,46,73,0.96) 50%, rgba(19,33,55,0.95) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s infinite linear',
      ...style,
    }}
  />
)

export const SectionHeader = ({ eyebrow, title, subtitle, action }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 16,
      flexWrap: 'wrap',
    }}
  >
    <div>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, lineHeight: 0.96, textTransform: 'uppercase' }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
)
