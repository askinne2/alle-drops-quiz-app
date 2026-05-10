import type { CSSProperties } from 'react'
import type { HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData, useSearchParams, useNavigate, useFetcher } from 'react-router'
import { useState, useEffect, useCallback } from 'react'
import { authenticate } from '../shopify.server'
import { boundary } from '@shopify/shopify-app-react-router/server'
import { listAdminSubmissions } from '../lib/submissions'
import type { AdminSubmissionsPage, SubmissionFullRow } from '../lib/submissions'
import { capitalize, formatDate, formatAnswerValue } from '../lib/format'

declare global {
  interface Window {
    shopify: { idToken: () => Promise<string> }
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request)

  const url = new URL(request.url)
  const state = url.searchParams.get('state') || null
  const score_bracket = url.searchParams.get('score_bracket') || null
  const from = url.searchParams.get('from') || null
  const to = url.searchParams.get('to') || null
  const q = url.searchParams.get('q') || null
  const cursor = url.searchParams.get('cursor') || null

  let page: AdminSubmissionsPage
  try {
    page = await listAdminSubmissions({ state, score_bracket, from, to, q, cursor, limit: 50 })
    console.log(`[admin] quiz-results loader count=${page.rows.length}`)
  } catch {
    page = { rows: [], hasNextPage: false, cursor: null }
  }

  return { page, filters: { state, score_bracket, from, to, q, cursor } }
}

export default function QuizResultsPage() {
  const { page, filters } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const detailFetcher = useFetcher<unknown>()

  const [searchInput, setSearchInput] = useState(filters.q ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Debounce search input → navigate with updated URL params
  useEffect(() => {
    if (searchInput === (filters.q ?? '')) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (searchInput) { params.set('q', searchInput) } else { params.delete('q') }
      params.delete('cursor')
      navigate(`/app/quiz-results?${params.toString()}`, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) { params.set(key, value) } else { params.delete(key) }
      params.delete('cursor')
      navigate(`/app/quiz-results?${params.toString()}`)
    },
    [searchParams, navigate]
  )

  const openDetail = useCallback(
    (id: string) => {
      setSelectedId(id)
      setPdfError(null)
      detailFetcher.load(`/api/admin/submission/${id}`)
    },
    [detailFetcher]
  )

  const closeDetail = useCallback(() => {
    setSelectedId(null)
    setPdfError(null)
  }, [])

  const handleDownloadPdf = useCallback(async (id: string) => {
    try {
      const token = await window.shopify.idToken()
      const res = await fetch(`/api/admin/assessment/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setPdfError(`Download failed (${res.status})`); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `assessment-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setPdfError('Download failed — please try again')
    }
  }, [])

  const detailRow = detailFetcher.data as SubmissionFullRow | undefined

  return (
    <s-page heading="Quiz Results">
      {/* Filter bar */}
      <s-section>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FilterField label="State">
            <select
              value={filters.state ?? ''}
              onChange={e => handleFilterChange('state', e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              <option value="tennessee">Tennessee</option>
              <option value="texas">Texas</option>
            </select>
          </FilterField>
          <FilterField label="Score Bracket">
            <select
              value={filters.score_bracket ?? ''}
              onChange={e => handleFilterChange('score_bracket', e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              <option value="0-2">0–2 Low</option>
              <option value="3-6">3–6 Moderate</option>
              <option value="7+">7+ High</option>
            </select>
          </FilterField>
          <FilterField label="From">
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={e => handleFilterChange('from', e.target.value)}
              style={inputStyle}
            />
          </FilterField>
          <FilterField label="To">
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={e => handleFilterChange('to', e.target.value)}
              style={inputStyle}
            />
          </FilterField>
          <FilterField label="Search">
            <input
              type="text"
              placeholder="Name, email, or profile ID"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ ...inputStyle, width: '220px' }}
            />
          </FilterField>
        </div>
      </s-section>

      {/* Results table */}
      <s-section>
        {page.rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No submissions found.
          </div>
        ) : (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Date', 'Name', 'Email', 'State', 'Bracket', 'Score'].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.rows.map(row => (
                  <SubmissionRow
                    key={row.id}
                    row={row}
                    onClick={() => openDetail(row.id)}
                  />
                ))}
              </tbody>
            </table>
            {page.hasNextPage && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams)
                    params.set('cursor', page.cursor!)
                    navigate(`/app/quiz-results?${params.toString()}`)
                  }}
                  style={btnStyle}
                >
                  Load next page →
                </button>
              </div>
            )}
          </>
        )}
      </s-section>

      {/* Detail modal */}
      {selectedId && (
        <div style={overlayStyle} onClick={closeDetail}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Assessment Detail</h2>
              <button onClick={closeDetail} style={closeBtnStyle} aria-label="Close">✕</button>
            </div>

            {detailFetcher.state === 'loading' && (
              <div style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Loading…</div>
            )}

            {detailFetcher.state !== 'loading' && detailRow && (
              <>
                <div style={scoreBannerStyle(detailRow.score_bracket)}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '0.2rem' }}>Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{detailRow.quiz_score}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid currentColor', opacity: 0.2, alignSelf: 'stretch' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '0.25rem' }}>Bracket</div>
                    <BracketBadge bracket={detailRow.score_bracket} />
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>{new Date(detailRow.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    {detailRow.consent_version && (
                      <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.15rem' }}>Consent: {detailRow.consent_version}</div>
                    )}
                  </div>
                </div>

                <SectionHeader>Patient Information</SectionHeader>
                <div style={infoGridStyle}>
                  <InfoCell label="Name" value={detailRow.patient_name} />
                  <InfoCell label="Date of Birth" value={formatDate(detailRow.patient_dob)} />
                  <InfoCell label="Email" value={detailRow.patient_email} />
                  <InfoCell label="Phone" value={detailRow.patient_phone} />
                  <InfoCell label="State" value={capitalize(detailRow.patient_state)} />
                </div>

                <SectionHeader>Symptom Responses</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {Object.entries(detailRow.answers_json ?? {}).map(([key, val]) => (
                    <div key={key} style={answerRowStyle}>
                      <span style={{ fontSize: '0.875rem', color: '#374151' }}>{capitalize(key.replace(/_/g, ' '))}</span>
                      <SeverityPill value={formatAnswerValue(val)} />
                    </div>
                  ))}
                </div>

                {((detailRow.personal_history_json?.length ?? 0) > 0 || (detailRow.family_history_json?.length ?? 0) > 0) && (
                  <>
                    <SectionHeader>Medical History</SectionHeader>
                    <HistoryTagList label="Personal" items={detailRow.personal_history_json} />
                    <HistoryTagList label="Family" items={detailRow.family_history_json} />
                  </>
                )}

                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600 }}>ID</span> {detailRow.id}<br />
                    <span style={{ fontWeight: 600 }}>Profile</span> {detailRow.symptom_profile_id}
                  </div>
                </div>

                {pdfError && (
                  <div style={{ color: '#dc2626', marginTop: '0.75rem', fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: '5px' }}>
                    {pdfError}
                  </div>
                )}

                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleDownloadPdf(detailRow.id)}
                    style={pdfBtnStyle}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download PDF
                  </button>
                  <button onClick={closeDetail} style={closeBtnSecStyle}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </s-page>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={filterLabelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SubmissionRow({
  row,
  onClick,
}: {
  row: import('../lib/submissions').AdminSubmissionListRow
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onClick={onClick}
      style={{ background: hovered ? '#f0f4ff' : 'white', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={tdStyle}>{new Date(row.created_at).toLocaleDateString()}</td>
      <td style={tdStyle}>{row.patient_name}</td>
      <td style={tdStyle}>{row.patient_email}</td>
      <td style={tdStyle}>{capitalize(row.patient_state)}</td>
      <td style={tdStyle}>{row.score_bracket}</td>
      <td style={tdStyle}>{row.quiz_score}</td>
    </tr>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: '1.1rem 0 0.5rem', paddingBottom: '0.3rem', borderBottom: '1px solid #e5e7eb' }}>
      {children}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function HistoryTagList({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!items?.length) return null
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {items.map((item, i) => <span key={i} style={historyTagStyle}>{item}</span>)}
      </div>
    </div>
  )
}

const BRACKET_BADGE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  '0-2': { bg: '#dcfce7', color: '#15803d', label: '0–2 Low' },
  '3-6': { bg: '#fef9c3', color: '#a16207', label: '3–6 Moderate' },
  '7+':  { bg: '#fee2e2', color: '#b91c1c', label: '7+ High' },
}

function BracketBadge({ bracket }: { bracket: string }) {
  const t = BRACKET_BADGE_COLORS[bracket] ?? { bg: '#f3f4f6', color: '#374151', label: bracket }
  return (
    <span style={{ background: t.bg, color: t.color, fontWeight: 700, fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '999px', letterSpacing: '0.02em' }}>
      {t.label}
    </span>
  )
}

const SEVERITY_LOW  = new Set(['never', 'no', 'none', 'rarely'])
const SEVERITY_MED  = new Set(['sometimes', 'occasionally', 'mild', 'moderate'])
const SEVERITY_HIGH = new Set(['often', 'daily', 'always', 'severe', 'yes'])

function SeverityPill({ value }: { value: string }) {
  const v = value.toLowerCase()
  let bg = '#f3f4f6', color = '#374151'
  if (SEVERITY_LOW.has(v))       { bg = '#dcfce7'; color = '#15803d' }
  else if (SEVERITY_MED.has(v))  { bg = '#fef9c3'; color = '#a16207' }
  else if (SEVERITY_HIGH.has(v)) { bg = '#fee2e2'; color = '#b91c1c' }
  return (
    <span style={{ background: bg, color, fontSize: '0.78rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
      {value}
    </span>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const filterLabelStyle: CSSProperties = { display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '0.25rem', fontWeight: 600 }
const answerRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', borderRadius: '5px', background: '#f8f9fa' }
const selectStyle: CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }
const inputStyle: CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thStyle: CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', background: '#f5f5f5', border: '1px solid #ddd', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }
const tdStyle: CSSProperties = { padding: '0.6rem 0.75rem', border: '1px solid #e5e5e5', fontSize: '0.9rem' }
const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalStyle: CSSProperties = { background: 'white', borderRadius: '10px', padding: '1.5rem', width: '660px', maxWidth: '92vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }
const btnStyle: CSSProperties = { padding: '0.45rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
const closeBtnStyle: CSSProperties = { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: '0.25rem', transition: 'color 150ms' }
const pdfBtnStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1.1rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }
const closeBtnSecStyle: CSSProperties = { padding: '0.5rem 1.1rem', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }
const infoGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }
const historyTagStyle: CSSProperties = { background: '#eff6ff', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 500, padding: '0.2rem 0.65rem', borderRadius: '999px', border: '1px solid #bfdbfe' }

const BRACKET_BANNER_COLORS: Record<string, { bg: string; color: string }> = {
  '0-2': { bg: '#f0fdf4', color: '#14532d' },
  '3-6': { bg: '#fefce8', color: '#713f12' },
  '7+':  { bg: '#fff1f2', color: '#881337' },
}

function scoreBannerStyle(bracket: string): CSSProperties {
  const t = BRACKET_BANNER_COLORS[bracket] ?? { bg: '#f8fafc', color: '#1e293b' }
  return { display: 'flex', alignItems: 'center', gap: '1.25rem', background: t.bg, color: t.color, borderRadius: '8px', padding: '0.9rem 1.1rem', marginBottom: '0.25rem' }
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs)
}
