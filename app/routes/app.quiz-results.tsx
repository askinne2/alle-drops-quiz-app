import type { CSSProperties } from 'react'
import type { HeadersFunction, LoaderFunctionArgs } from 'react-router'
import { useLoaderData, useSearchParams, useNavigate, useFetcher } from 'react-router'
import { useState, useEffect, useCallback } from 'react'
import { authenticate } from '../shopify.server'
import { boundary } from '@shopify/shopify-app-react-router/server'
import { listAdminSubmissions } from '../lib/submissions'
import type { AdminSubmissionsPage, SubmissionFullRow } from '../lib/submissions'

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
                <DetailField label="ID" value={detailRow.id} />
                <DetailField label="Profile" value={detailRow.symptom_profile_id} />
                <DetailField label="Date" value={new Date(detailRow.created_at).toLocaleString()} />
                <DetailField label="Name" value={detailRow.patient_name} />
                <DetailField label="DOB" value={formatDate(detailRow.patient_dob)} />
                <DetailField label="Email" value={detailRow.patient_email} />
                <DetailField label="Phone" value={detailRow.patient_phone} />
                <DetailField label="State" value={capitalize(detailRow.patient_state)} />
                <DetailField label="Score" value={String(detailRow.quiz_score)} />
                <DetailField label="Bracket" value={detailRow.score_bracket} />
                {detailRow.consent_version && (
                  <DetailField
                    label="Consent"
                    value={`${detailRow.consent_version} — ${formatDate(detailRow.consent_accepted_at)}`}
                  />
                )}
                <div style={{ marginTop: '1rem' }}>
                  <span style={fieldLabelStyle}>Symptom Responses</span>
                  <div style={{ marginTop: '0.35rem' }}>
                    {Object.entries(detailRow.answers_json ?? {}).map(([key, val]) => {
                      const displayKey = capitalize(key.replace(/_/g, ' '))
                      const displayVal = Array.isArray(val)
                        ? val.join(', ')
                        : val !== null && typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val ?? '—')
                      return <DetailField key={key} label={displayKey} value={displayVal} />
                    })}
                  </div>
                </div>
                {((detailRow.personal_history_json?.length ?? 0) > 0 || (detailRow.family_history_json?.length ?? 0) > 0) && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={fieldLabelStyle}>Medical History</span>
                    {(detailRow.personal_history_json?.length ?? 0) > 0 && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Personal:</span>
                        <ul style={{ margin: '0.2rem 0 0.5rem 1.2rem', padding: 0, fontSize: '0.9rem' }}>
                          {detailRow.personal_history_json!.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {(detailRow.family_history_json?.length ?? 0) > 0 && (
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Family:</span>
                        <ul style={{ margin: '0.2rem 0 0 1.2rem', padding: 0, fontSize: '0.9rem' }}>
                          {detailRow.family_history_json!.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {pdfError && (
                  <div style={{ color: '#c00', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {pdfError}
                  </div>
                )}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleDownloadPdf(detailRow.id)}
                    style={{ ...btnStyle, background: '#0070f3' }}
                  >
                    Download PDF
                  </button>
                  <button onClick={closeDetail} style={btnStyle}>Close</button>
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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
      <span style={fieldLabelStyle}>{label}:</span>
      <span>{value}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const filterLabelStyle: CSSProperties = { display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '0.25rem', fontWeight: 600 }
const fieldLabelStyle: CSSProperties = { fontWeight: 600, minWidth: '72px', color: '#444', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.03em' }
const selectStyle: CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }
const inputStyle: CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thStyle: CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', background: '#f5f5f5', border: '1px solid #ddd', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }
const tdStyle: CSSProperties = { padding: '0.6rem 0.75rem', border: '1px solid #e5e5e5', fontSize: '0.9rem' }
const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalStyle: CSSProperties = { background: 'white', borderRadius: '8px', padding: '1.5rem', width: '600px', maxWidth: '90vw', maxHeight: '82vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }
const btnStyle: CSSProperties = { padding: '0.45rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
const closeBtnStyle: CSSProperties = { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666', lineHeight: 1, padding: '0.25rem' }

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs)
}
