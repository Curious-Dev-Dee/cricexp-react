import { useParams, useNavigate } from 'react-router-dom'

export default function GlobalTournament({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: 'white', fontFamily: 'sans-serif', padding: '32px 24px' }}>
      <button onClick={() => navigate('/')} style={{ background: '#2d2f3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '24px' }}>
        ← Back
      </button>
      <h1>🏆 Global Tournament: {slug}</h1>
      <p style={{ color: '#888' }}>Loading IPL data... (building this next)</p>
    </div>
  )
}