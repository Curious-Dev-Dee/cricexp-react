// ── SHARED UI COMPONENTS — CricExp Design System ────────────────────────────

const S = {
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--card-radius)',
    border: '1px solid var(--border-card)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardInner: {
    background: 'var(--bg-card-alt)',
    borderRadius: 'var(--card-radius-sm)',
    border: '1px solid var(--border)',
  }
}

// Top-edge highlight on cards (depth effect)
const CardHighlight = () => (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
    pointerEvents: 'none'
  }} />
)

export const Card = ({ children, style, accent, topBar }) => (
  <div style={{
    ...S.card,
    ...(accent ? { borderColor: 'var(--border-accent)', background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(154,224,0,0.02) 100%)' } : {}),
    ...style
  }}>
    <CardHighlight />
    {topBar && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'var(--accent)', borderRadius:'var(--card-radius) var(--card-radius) 0 0' }} />}
    {children}
  </div>
)

export const Loader = ({ text = 'Loading...' }) => (
  <div style={{ minHeight:'100vh', background:'var(--bg-page)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
    <div style={{ width:36, height:36, border:'3px solid var(--border-card)', borderTopColor:'var(--accent)', borderRadius:'50%' }} className="spin" />
    <p style={{ color:'var(--text-faint)', fontFamily:'var(--font-body)', fontSize:13, margin:0 }}>{text}</p>
  </div>
)

export const NavBar = ({ user, onLogout, back, backTo, title, subtitle, badge }) => (
  <nav style={{
    background: 'rgba(2,6,23,0.95)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    borderBottom: '1px solid var(--border)', position:'sticky', top:0, zIndex:500,
    minHeight: 56
  }}>
    <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'0 16px', height:56, display:'flex', alignItems:'center', gap:12 }}>
      {back && (
        <a href={backTo || '/'} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:36, height:36, borderRadius:'var(--btn-radius)',
          background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-card)',
          color:'var(--text-primary)', fontSize:16, transition:'all var(--dur-fast) var(--ease-out)',
          flexShrink:0
        }}>←</a>
      )}
      {!back && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', animation:'pulseGlow 2.5s ease-in-out infinite' }} />
          <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, letterSpacing:'0.5px', color:'var(--text-primary)', textTransform:'uppercase' }}>
            CricExp
          </span>
        </div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        {title && <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, textTransform:'uppercase', letterSpacing:'0.5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>}
        {subtitle && <div style={{ color:'var(--text-faint)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{subtitle}</div>}
      </div>
      {badge && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', padding:'6px 14px', borderRadius:10, textAlign:'center', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:900, color: badge.color || 'var(--accent)', lineHeight:1 }}>{badge.value}</div>
          <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>{badge.label}</div>
        </div>
      )}
      {user && !back && (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-dim)', border:'1px solid var(--border-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--accent)', flexShrink:0, fontFamily:'var(--font-display)' }}>
            {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
          </div>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-card)', color:'var(--text-faint)', padding:'6px 12px', borderRadius:8, fontSize:12, fontFamily:'var(--font-body)' }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  </nav>
)

export const Tabs = ({ tabs, active, onChange, accent = 'var(--accent)' }) => (
  <div style={{ background:'rgba(2,6,23,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)', overflowX:'auto', position:'sticky', top:56, zIndex:400 }}>
    <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', padding:'0 16px', display:'flex', gap:0 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding:'13px 18px', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap',
          color: active === t.key ? accent : 'var(--text-faint)',
          borderBottom: active === t.key ? `2px solid ${accent}` : '2px solid transparent',
          fontFamily: 'var(--font-display)', fontWeight:700, fontSize:13, letterSpacing:'0.3px',
          textTransform:'uppercase', transition:'all var(--dur-fast) var(--ease-out)'
        }}>{t.label}</button>
      ))}
    </div>
  </div>
)

export const Badge = ({ status }) => {
  const map = {
    active:    { bg:'rgba(154,224,0,0.12)',  color:'#9AE000',  label:'Active' },
    upcoming:  { bg:'rgba(245,158,11,0.12)', color:'#f59e0b',  label:'Upcoming' },
    completed: { bg:'rgba(255,255,255,0.05)',color:'#64748b',  label:'Completed' },
    live:      { bg:'rgba(239,68,68,0.12)',  color:'#ef4444',  label:'🔴 Live' },
    locked:    { bg:'rgba(255,255,255,0.05)',color:'#64748b',  label:'Locked' },
  }
  const s = map[status] || map.upcoming
  return (
    <span style={{ fontSize:10, padding:'3px 9px', borderRadius:'var(--pill-radius)', background:s.bg, color:s.color, fontFamily:'var(--font-display)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px' }}>
      {s.label}
    </span>
  )
}

export const Medal = ({ rank }) => {
  if (rank === 1) return <span style={{ fontSize:20 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize:20 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize:20 }}>🥉</span>
  return <span style={{ color:'var(--text-faint)', fontSize:12, fontWeight:700, fontFamily:'var(--font-display)' }}>#{rank}</span>
}

export const Avatar = ({ url, name, size = 36, base }) => {
  const src = url ? (base ? `${base}${url}` : url) : null
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--bg-card-alt)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'var(--text-faint)', border:'1px solid var(--border-card)', fontFamily:'var(--font-display)' }}>
      {src
        ? <img src={src} width={size} height={size} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none' }} alt="" />
        : (name || '?')[0]?.toUpperCase()
      }
    </div>
  )
}

export const Empty = ({ icon, title, text }) => (
  <div style={{ padding:'48px 24px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
    <div style={{ fontSize:36, opacity:0.5 }}>{icon}</div>
    <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.3px', color:'var(--text-dim)' }}>{title}</div>
    <div style={{ color:'var(--text-faint)', fontSize:13, lineHeight:1.6, maxWidth:240 }}>{text}</div>
  </div>
)

export const RoleChip = ({ role }) => {
  const colors = { BAT:'var(--rank-color)', BOWL:'var(--accent)', AR:'var(--gold)', WK:'var(--cyan)' }
  const bgs = { BAT:'rgba(124,196,255,0.1)', BOWL:'rgba(154,224,0,0.1)', AR:'rgba(245,158,11,0.1)', WK:'rgba(0,242,255,0.1)' }
  return (
    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:bgs[role]||'rgba(255,255,255,0.05)', color:colors[role]||'var(--text-faint)', fontFamily:'var(--font-display)', fontWeight:800, letterSpacing:'0.5px' }}>
      {role}
    </span>
  )
}

export const Eyebrow = ({ children }) => (
  <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text-faint)', marginBottom:4 }}>
    {children}
  </div>
)

export const PtsPill = ({ pts }) => {
  const has = pts && parseFloat(pts) > 0
  return (
    <span style={{
      background: has ? 'var(--pts-active-bg)' : 'var(--pts-muted-bg)',
      color: has ? 'var(--pts-active-color)' : 'var(--pts-muted-color)',
      padding:'4px 10px', borderRadius:'var(--pill-radius)',
      fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, whiteSpace:'nowrap'
    }}>
      {parseFloat(pts||0).toLocaleString()} pts
    </span>
  )
}

export const Btn = ({ children, onClick, disabled, variant='primary', style: extra, size='md' }) => {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    fontFamily:'var(--font-display)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px',
    border:'none', cursor: disabled ? 'not-allowed' : 'pointer', borderRadius:'var(--btn-radius)',
    transition:'all var(--dur-fast) var(--ease-out)', whiteSpace:'nowrap',
    opacity: disabled ? 0.45 : 1,
    fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
    padding: size === 'sm' ? '7px 14px' : size === 'lg' ? '14px 24px' : '10px 18px',
  }
  const variants = {
    primary:   { background:'var(--accent)', color:'#000' },
    secondary: { background:'rgba(255,255,255,0.06)', color:'var(--text-primary)', border:'1px solid var(--border-card)' },
    ghost:     { background:'transparent', color:'var(--text-dim)', border:'1px solid var(--border)' },
    danger:    { background:'var(--red-dim)', color:'var(--red)', border:'1px solid rgba(239,68,68,0.3)' },
    success:   { background:'rgba(154,224,0,0.15)', color:'var(--accent)', border:'1px solid var(--border-accent)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...(variants[variant]||variants.primary), ...extra }}>
      {children}
    </button>
  )
}

export const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background:'var(--bg-card-alt)', border:'1px solid var(--border)', borderRadius:'var(--card-radius-sm)', padding:'12px 16px', textAlign:'center' }}>
    <Eyebrow>{label}</Eyebrow>
    <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:900, color: color||'var(--text-primary)', lineHeight:1, marginTop:4 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>{sub}</div>}
  </div>
)

export const Skeleton = ({ height=60, radius=12, style:extra }) => (
  <div style={{
    height, borderRadius:radius,
    background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-alt) 50%, var(--bg-card) 75%)',
    backgroundSize:'200% 100%', animation:'shimmer 1.6s infinite linear',
    ...extra
  }} />
)

export const SectionHeader = ({ eyebrow, title, action }) => (
  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
    <div>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.3px', color:'var(--text-primary)' }}>{title}</div>
    </div>
    {action}
  </div>
)
