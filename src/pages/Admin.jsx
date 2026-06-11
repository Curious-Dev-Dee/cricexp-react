import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NavBar, Tabs, Card, Loader } from '../components/Shared'

const TABS = [
  { key: 'process', label: '⚙️ Process Match' },
  { key: 'delay', label: '🌧️ Delay / Abandon' },
  { key: 'config', label: '🔧 Tournament Config' },
]

export default function Admin({ user }) {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(null)
  const [tab, setTab] = useState('process')

  useEffect(() => {
    supabase.from('user_profiles').select('is_ppl_admin').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (!data?.is_ppl_admin) navigate('/')
        else setIsAdmin(true)
      })
  }, [])

  if (isAdmin === null) return <Loader text="Checking admin access..." />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar back backTo="/" title="⚙️ CricExp Admin" subtitle="Match processing & tournament management" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} accent="var(--red)" />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'process' && <ProcessTab />}
        {tab === 'delay' && <DelayTab />}
        {tab === 'config' && <ConfigTab />}
      </div>
    </div>
  )
}

// ── PROCESS MATCH TAB ────────────────────────────────────────────────────────
function ProcessTab() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [scoreboardJson, setScoreboardJson] = useState('')
  const [analysis, setAnalysis] = useState(null) // { matched, missing, rows }
  const [winner, setWinner] = useState('')
  const [pom, setPom] = useState('')
  const [status, setStatus] = useState({ msg: '', type: '' })
  const [analyzing, setAnalyzing] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => { loadTournaments() }, [])
  useEffect(() => { if (selectedTournament) loadMatches(selectedTournament) }, [selectedTournament])

  const loadTournaments = async () => {
    const { data } = await supabase.from('global_tournaments').select('id, name, slug, tournament_id, status').order('start_date', { ascending: false })
    setTournaments(data || [])
    if (data?.length) setSelectedTournament(data[0])
  }

  const loadMatches = async (t) => {
    const tid = t.tournament_id || t.id
    const nowIso = new Date().toISOString()
    const { data } = await supabase.from('matches')
      .select('id, tournament_id, match_number, status, points_processed, actual_start_time, team_a_id, team_b_id, team_a:real_teams!team_a_id(short_code, name), team_b:real_teams!team_b_id(short_code, name)')
      .eq('tournament_id', tid)
      .lte('actual_start_time', nowIso)
      .order('actual_start_time', { ascending: false })
      .limit(30)
    setMatches(data || [])
    setSelectedMatch(null)
    setAnalysis(null)
    setWinner(''); setPom('')
  }

  const normalizeName = (v) => String(v || '').toLowerCase()
    .replace(/\(c\s*&\s*wk\)/g, '').replace(/\(wk\)/g, '').replace(/\(c\)/g, '')
    .replace(/&/g, '').replace(/\s+/g, ' ').trim()

  const analyzeScoreboard = async () => {
    if (!selectedMatch) return setStatus({ msg: 'Select a match first', type: 'error' })
    setAnalyzing(true)
    setAnalysis(null)
    try {
      let parsed
      try { parsed = JSON.parse(scoreboardJson) } catch { throw new Error('Invalid JSON') }

      // Support multiple formats
      let rows = []
      if (parsed?.data?.scorecard) rows = flattenScorecard(parsed.data.scorecard)
      else if (Array.isArray(parsed)) rows = parsed
      else if (Array.isArray(parsed?.scoreboard)) rows = parsed.scoreboard
      else throw new Error('Unrecognised format. Need array, {scoreboard:[]}, or {data:{scorecard:[]}}')

      if (rows.length === 0) throw new Error('Scoreboard is empty')

      // Load players for this tournament
      const tid = selectedTournament.tournament_id || selectedTournament.id
      const { data: players } = await supabase.from('players').select('id, name').eq('tournament_id', tid).eq('is_active', true)

      const lookup = new Map(players.map(p => [normalizeName(p.name), p]))
      const matched = [], missing = [], seen = new Set()

      rows.forEach(row => {
        const key = normalizeName(row.player_name)
        const p = lookup.get(key)
        if (!p) { if (!missing.includes(row.player_name?.trim())) missing.push(row.player_name?.trim()) }
        else if (!seen.has(p.id)) { seen.add(p.id); matched.push(p) }
      })

      setAnalysis({ matched, missing, rows, playersCount: players.length })
      if (missing.length > 0) setStatus({ msg: `${missing.length} name(s) not matched — fix JSON and re-analyze`, type: 'error' })
      else setStatus({ msg: '✅ All names matched! Select winner and POM to continue.', type: 'success' })
    } catch (e) {
      setStatus({ msg: e.message, type: 'error' })
    }
    setAnalyzing(false)
  }

  const process = async () => {
    if (!winner) return setStatus({ msg: 'Select a winner', type: 'error' })
    const isAbandoned = winner === 'abandoned'
    if (!isAbandoned && !pom) return setStatus({ msg: 'Select Player of the Match', type: 'error' })
    if (!isAbandoned && analysis?.missing?.length > 0) return setStatus({ msg: 'Fix name mismatches before processing', type: 'error' })

    setProcessing(true)
    setStatus({ msg: 'Processing…', type: 'loading' })
    try {
      const body = isAbandoned
        ? { match_id: selectedMatch.id, tournament_id: selectedMatch.tournament_id, scoreboard: [], pom_id: null, winner_id: 'abandoned' }
        : { match_id: selectedMatch.id, tournament_id: selectedMatch.tournament_id, scoreboard: analysis.rows, pom_id: pom, winner_id: winner }

      const { data, error } = await supabase.functions.invoke('process_match_points', { body })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setStatus({ msg: isAbandoned ? '✅ Match marked abandoned — no fantasy impact' : '✅ Points processed! Leaderboard updated.', type: 'success' })
      setScoreboardJson(''); setAnalysis(null); setWinner(''); setPom('')
      await loadMatches(selectedTournament)
    } catch (e) {
      let msg = e.message
      if (e.context?.json) { try { const b = await e.context.json(); msg = b.error || msg } catch {} }
      setStatus({ msg, type: 'error' })
    }
    setProcessing(false)
  }

  const canConfirm = winner === 'abandoned'
    ? !!selectedMatch
    : (analysis && analysis.missing.length === 0 && winner && pom)

  return (
    <div>
      <StatusBar status={status} />

      {/* Tournament selector */}
      <Section title="1. Select Tournament">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tournaments.map(t => (
            <button key={t.id} onClick={() => setSelectedTournament(t)} style={{
              padding: '8px 18px', borderRadius: 20, border: '1px solid',
              borderColor: selectedTournament?.id === t.id ? 'var(--accent)' : 'var(--border)',
              background: selectedTournament?.id === t.id ? 'rgba(99,102,241,0.15)' : 'var(--bg3)',
              color: selectedTournament?.id === t.id ? 'var(--accent)' : 'var(--text2)', fontSize: 13, fontWeight: selectedTournament?.id === t.id ? 700 : 400
            }}>{t.name}</button>
          ))}
        </div>
      </Section>

      {/* Match selector */}
      <Section title="2. Select Match">
        {matches.length === 0
          ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>No matches available yet for this tournament (matches past their start time appear here)</p>
          : <select value={selectedMatch?.id || ''} onChange={e => { const m = matches.find(x => x.id === e.target.value); setSelectedMatch(m); setAnalysis(null); setWinner(''); setPom('') }} style={selectStyle}>
              <option value="">— Choose Match —</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  M#{m.match_number}: {m.team_a?.short_code} vs {m.team_b?.short_code} [{m.status.toUpperCase()} | {m.points_processed ? '✅ DONE' : '⏳ PENDING'}]
                </option>
              ))}
            </select>
        }
      </Section>

      {/* Scoreboard JSON */}
      <Section title="3. Scorecard JSON">
        <textarea
          value={scoreboardJson}
          onChange={e => { setScoreboardJson(e.target.value); setAnalysis(null) }}
          placeholder={'Paste scorecard JSON here...\nSupports: raw array, {scoreboard:[]}, or {data:{scorecard:[]}} (API format)'}
          style={{ ...inputStyle, height: 160, fontFamily: 'var(--mono)', fontSize: 12 }}
        />
        <button onClick={analyzeScoreboard} disabled={analyzing || !selectedMatch} style={{ ...btnStyle, marginTop: 8 }}>
          {analyzing ? 'Analyzing…' : '🔍 Analyze & Check Names'}
        </button>
      </Section>

      {/* Analysis report */}
      {analysis && (
        <Section title="Analysis Report">
          <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
            <Chip label="Rows" value={analysis.rows.length} />
            <Chip label="Matched" value={analysis.matched.length} color="var(--green)" />
            <Chip label="Missing" value={analysis.missing.length} color={analysis.missing.length > 0 ? 'var(--red)' : 'var(--green)'} />
          </div>

          {analysis.missing.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 8, fontSize: 13 }}>❌ Names not found in DB:</div>
              {analysis.missing.map((n, i) => <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>• {n}</div>)}
            </div>
          )}

          {analysis.missing.length === 0 && (
            <>
              {/* Winner */}
              <label style={labelStyle}>4. Match Winner</label>
              <select value={winner} onChange={e => setWinner(e.target.value)} style={selectStyle}>
                <option value="">— Choose Winner —</option>
                {selectedMatch && <>
                  <option value={selectedMatch.team_a_id}>{selectedMatch.team_a?.name || selectedMatch.team_a?.short_code}</option>
                  <option value={selectedMatch.team_b_id}>{selectedMatch.team_b?.name || selectedMatch.team_b?.short_code}</option>
                </>}
                <option value="abandoned">Abandoned Before First Ball</option>
              </select>

              {/* POM */}
              {winner && winner !== 'abandoned' && (
                <>
                  <label style={labelStyle}>5. Player of the Match (+20 pts)</label>
                  <select value={pom} onChange={e => setPom(e.target.value)} style={selectStyle}>
                    <option value="">— Choose POM —</option>
                    {[...analysis.matched].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
        </Section>
      )}

      {/* Winner for abandoned (no scoreboard needed) */}
      {!analysis && selectedMatch && (
        <Section title="Mark Abandoned (no scoreboard)">
          <select value={winner} onChange={e => setWinner(e.target.value)} style={selectStyle}>
            <option value="">— Optional: mark abandoned without scoreboard —</option>
            <option value="abandoned">Abandoned Before First Ball</option>
          </select>
        </Section>
      )}

      {/* Confirm button */}
      {canConfirm && (
        <button onClick={process} disabled={processing} style={{ ...btnStyle, background: 'var(--green)', fontSize: 15, padding: '14px', marginTop: 8 }}>
          {processing ? '⏳ Processing…' : '✅ Confirm & Process Points'}
        </button>
      )}
    </div>
  )
}

// ── DELAY / ABANDON TAB ──────────────────────────────────────────────────────
function DelayTab() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTid, setSelectedTid] = useState('')
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [newTime, setNewTime] = useState('')
  const [status, setStatus] = useState({ msg: 'Select a tournament and match to begin.', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('global_tournaments').select('id, name, tournament_id').order('start_date', { ascending: false })
      .then(({ data }) => { setTournaments(data || []); if (data?.length) setSelectedTid(data[0].id) })
  }, [])

  useEffect(() => { if (selectedTid) loadMatches() }, [selectedTid])

  const loadMatches = async () => {
    const t = tournaments.find(x => x.id === selectedTid)
    if (!t) return
    const tid = t.tournament_id || t.id
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const { data } = await supabase.from('matches')
      .select('id, tournament_id, match_number, status, actual_start_time, team_a:real_teams!team_a_id(short_code), team_b:real_teams!team_b_id(short_code)')
      .eq('tournament_id', tid)
      .in('status', ['upcoming', 'locked'])
      .gt('actual_start_time', yesterday.toISOString())
      .order('actual_start_time').limit(20)
    setMatches(data || [])
    setSelectedMatch(null)
  }

  const addMinutes = (mins) => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + mins)
    const offset = now.getTimezoneOffset() * 60000
    setNewTime(new Date(now - offset).toISOString().slice(0, 16))
  }

  const handleReset = async () => {
    if (!selectedMatch || !newTime) return setStatus({ msg: 'Select match and new time', type: 'error' })
    if (!confirm(`Reset M#${selectedMatch.match_number} to ${new Date(newTime).toLocaleString()}?\n\nThis will:\n• Set status → UPCOMING\n• Update start time\n• Delete locked fantasy snapshot for this match`)) return
    setLoading(true); setStatus({ msg: 'Processing…', type: 'loading' })
    const { error } = await supabase.rpc('reset_delayed_match', { target_match_id: selectedMatch.id, new_start_time: new Date(newTime).toISOString() })
    if (error) setStatus({ msg: error.message, type: 'error' })
    else { setStatus({ msg: '✅ Match reset! Editing is open again for all users.', type: 'success' }); await loadMatches() }
    setLoading(false)
  }

  const handleAbandon = async () => {
    if (!selectedMatch) return setStatus({ msg: 'Select a match first', type: 'error' })
    if (!confirm(`Mark M#${selectedMatch.match_number} as ABANDONED before first ball?\n\nNo fantasy points will be awarded.`)) return
    setLoading(true); setStatus({ msg: 'Processing…', type: 'loading' })
    const t = tournaments.find(x => x.id === selectedTid)
    const { data, error } = await supabase.functions.invoke('process_match_points', {
      body: { match_id: selectedMatch.id, tournament_id: selectedMatch.tournament_id, scoreboard: [], pom_id: null, winner_id: 'abandoned' }
    })
    if (error || data?.error) setStatus({ msg: error?.message || data?.error, type: 'error' })
    else { setStatus({ msg: '✅ Match marked abandoned. No fantasy impact.', type: 'success' }); await loadMatches() }
    setLoading(false)
  }

  return (
    <div>
      <StatusBar status={status} />

      <Section title="Tournament">
        <select value={selectedTid} onChange={e => setSelectedTid(e.target.value)} style={selectStyle}>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Section>

      <Section title="Match">
        {matches.length === 0
          ? <p style={{ color: 'var(--text2)', fontSize: 13 }}>No upcoming/locked matches found</p>
          : <select value={selectedMatch?.id || ''} onChange={e => setSelectedMatch(matches.find(m => m.id === e.target.value) || null)} style={selectStyle}>
              <option value="">— Choose Match —</option>
              {matches.map(m => <option key={m.id} value={m.id}>M#{m.match_number}: {m.team_a?.short_code} vs {m.team_b?.short_code} [{m.status.toUpperCase()}]</option>)}
            </select>
        }
      </Section>

      {selectedMatch && (
        <>
          <Section title="Rain Delay — Reschedule">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[15, 30, 60, 120].map(m => (
                <button key={m} onClick={() => addMinutes(m)} style={{ ...btnStyle, flex: 1, padding: '8px', fontSize: 12, background: 'var(--bg3)' }}>
                  +{m >= 60 ? `${m / 60}h` : `${m}m`}
                </button>
              ))}
            </div>
            <input type="datetime-local" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <button onClick={handleReset} disabled={loading || !newTime} style={{ ...btnStyle, background: 'var(--amber)' }}>
              🔄 Reset & Reopen Editing
            </button>
          </Section>

          <Section title="Abandon Match">
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
              Use this if the match was abandoned <strong>before the first ball</strong>. No fantasy points will be given to anyone.
            </div>
            <button onClick={handleAbandon} disabled={loading} style={{ ...btnStyle, background: 'var(--red)' }}>
              ❌ Mark Abandoned Before First Ball
            </button>
          </Section>
        </>
      )}
    </div>
  )
}

// ── TOURNAMENT CONFIG TAB ────────────────────────────────────────────────────
function ConfigTab() {
  const [tournaments, setTournaments] = useState([])
  const [selected, setSelected] = useState(null)
  const [configJson, setConfigJson] = useState('')
  const [status, setStatus] = useState({ msg: '', type: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('global_tournaments').select('id, name, slug, status, config').order('start_date', { ascending: false })
      .then(({ data }) => { setTournaments(data || []); if (data?.length) selectTournament(data[0]) })
  }, [])

  const selectTournament = (t) => {
    setSelected(t)
    setConfigJson(JSON.stringify(t.config || {}, null, 2))
    setStatus({ msg: '', type: '' })
  }

  const save = async () => {
    try {
      JSON.parse(configJson) // validate
    } catch { return setStatus({ msg: 'Invalid JSON', type: 'error' }) }
    setSaving(true)
    const { error } = await supabase.from('global_tournaments').update({ config: JSON.parse(configJson) }).eq('id', selected.id)
    if (error) setStatus({ msg: error.message, type: 'error' })
    else { setStatus({ msg: '✅ Config saved!', type: 'success' }); }
    setSaving(false)
  }

  return (
    <div>
      <StatusBar status={status} />
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
        ⚠️ Edit carefully. Config controls team size, credits, phase rules, overseas limits, and format. Changes take effect immediately for all users.
      </div>

      <Section title="Tournament">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {tournaments.map(t => (
            <button key={t.id} onClick={() => selectTournament(t)} style={{
              padding: '8px 18px', borderRadius: 20, border: '1px solid',
              borderColor: selected?.id === t.id ? 'var(--amber)' : 'var(--border)',
              background: selected?.id === t.id ? 'rgba(245,158,11,0.15)' : 'var(--bg3)',
              color: selected?.id === t.id ? 'var(--amber)' : 'var(--text2)', fontSize: 13
            }}>{t.name}</button>
          ))}
        </div>
        {selected && (
          <>
            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
              slug: {selected.slug} · status: {selected.status}
            </div>

            {/* Quick reference */}
            {selected.config && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <QuickStat label="Format" value={selected.config.format} />
                <QuickStat label="Team Size" value={selected.config.team_size} />
                <QuickStat label="Max Credits" value={selected.config.max_credits} />
                <QuickStat label="Overseas" value={selected.config.max_overseas ?? 'None'} />
                <QuickStat label="Uncapped Rule" value={selected.config.has_uncapped_rule ? 'Yes' : 'No'} />
                <QuickStat label="Phases" value={selected.config.phases?.length} />
              </div>
            )}

            <textarea
              value={configJson}
              onChange={e => setConfigJson(e.target.value)}
              style={{ ...inputStyle, height: 340, fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <button onClick={save} disabled={saving} style={{ ...btnStyle, background: 'var(--accent)', marginTop: 8 }}>
              {saving ? 'Saving…' : '💾 Save Config'}
            </button>
          </>
        )}
      </Section>

      {/* Add new tournament guide */}
      <Section title="Adding a New Tournament">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <div>1. Insert row in <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>global_tournaments</code> with unique <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>slug</code></div>
          <div>2. Insert row in <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>tournaments</code> table and link via <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>tournament_id</code></div>
          <div>3. Add teams to <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>real_teams</code>, players to <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>players</code>, matches to <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>matches</code></div>
          <div>4. Set <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>is_visible = true</code> when ready — home page picks it up automatically</div>
          <div>5. Update the lock edge function config for the new tournament's phase numbers</div>
        </div>
      </Section>
    </div>
  )
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
const selectStyle = { background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, width: '100%', outline: 'none' }
const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, width: '100%', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }
const btnStyle = { background: 'var(--accent)', color: 'white', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }
const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6, marginTop: 16 }

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

function StatusBar({ status }) {
  if (!status.msg) return null
  const colors = { error: 'rgba(239,68,68,0.1)', success: 'rgba(34,197,94,0.1)', loading: 'rgba(59,130,246,0.1)', '': 'var(--bg3)' }
  const textColors = { error: 'var(--red)', success: 'var(--green)', loading: 'var(--blue)', '': 'var(--text2)' }
  return (
    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: colors[status.type], border: `1px solid ${textColors[status.type]}`, color: textColors[status.type], fontSize: 13, fontWeight: 500 }}>
      {status.msg}
    </div>
  )
}

function Chip({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}

function QuickStat({ label, value }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>
      <span style={{ color: 'var(--text2)' }}>{label}: </span>
      <span style={{ fontWeight: 700, fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  )
}

function flattenScorecard(scorecard) {
  const playerStats = new Map()
  const get = (name) => {
    if (!playerStats.has(name)) playerStats.set(name, { player_name: name, runs: 0, balls: 0, fours: 0, sixes: 0, is_out: false, wickets: 0, overs: 0, runs_conceded: 0, maidens: 0, catches: 0, stumpings: 0, runouts_direct: 0, runouts_assisted: 0 })
    return playerStats.get(name)
  }
  scorecard.forEach(inning => {
    inning.batting?.forEach(b => { const p = get(b.batsman.name); p.runs = b.r || 0; p.balls = b.b || 0; p.fours = b['4s'] || 0; p.sixes = b['6s'] || 0; p.is_out = b['dismissal-text'] !== 'not out' })
    inning.bowling?.forEach(b => { const p = get(b.bowler.name); p.wickets = b.w; p.overs = b.o; p.runs_conceded = b.r; p.maidens = b.m })
    inning.catching?.forEach(c => { const p = get(c.catcher.name); p.catches = c.catch; p.stumpings = c.stumped; p.runouts_direct = c.runout })
  })
  return Array.from(playerStats.values())
}
