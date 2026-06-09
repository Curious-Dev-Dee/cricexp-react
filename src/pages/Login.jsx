import { supabase } from '../lib/supabase'

export default function Login() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>🏏 CricExp</h1>
      <p style={{ color: '#888', marginBottom: '32px' }}>Fantasy Cricket Platform</p>
      <button
        onClick={handleGoogleLogin}
        style={{
          background: 'white',
          color: '#111',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <img src="https://www.google.com/favicon.ico" width="18" height="18" />
        Continue with Google
      </button>
    </div>
  )
}