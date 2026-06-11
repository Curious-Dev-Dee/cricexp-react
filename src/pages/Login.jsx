import { supabase } from '../lib/supabase'

export default function Login() {
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(154,224,0,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ marginBottom:48, textAlign:'center', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--accent)', animation:'pulseGlow 2.5s ease-in-out infinite' }} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:900, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-primary)' }}>
            CricExp
          </span>
        </div>
        <div style={{ color:'var(--text-faint)', fontSize:13, fontFamily:'var(--font-body)', letterSpacing:'0.5px' }}>
          Fantasy Cricket · Season Long · Local & Global
        </div>
      </div>

      {/* Card */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--card-radius)', padding:'36px 32px', width:'100%', maxWidth:380, textAlign:'center', position:'relative', zIndex:1, boxShadow:'var(--shadow-lg)' }}>
        {/* Top highlight */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)' }} />
        {/* Accent top bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--accent)', borderRadius:'var(--card-radius) var(--card-radius) 0 0' }} />

        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Welcome Back</div>
        <div style={{ color:'var(--text-faint)', fontSize:13, marginBottom:28 }}>Sign in to manage your fantasy teams</div>

        <button onClick={handleGoogle} style={{
          width:'100%', padding:'13px 20px', borderRadius:'var(--btn-radius)',
          border:'1px solid var(--border-card)', background:'rgba(255,255,255,0.04)',
          color:'var(--text-primary)', fontSize:14, fontFamily:'var(--font-body)', fontWeight:600,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          cursor:'pointer', transition:'all var(--dur-fast) var(--ease-out)'
        }}
          onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='var(--border-accent)' }}
          onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='var(--border-card)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div style={{ marginTop:28, color:'var(--text-ghost)', fontSize:12, textAlign:'center', position:'relative', zIndex:1 }}>
        By continuing you agree to CricExp's terms of service
      </div>
    </div>
  )
}
