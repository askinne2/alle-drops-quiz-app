const FLY_BASE = 'https://alle-drops-quiz-app.fly.dev'

function el(tag, attrs, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v)
  for (const child of children) {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child))
    else if (child) node.appendChild(child)
  }
  return node
}

function formatDate(str) {
  if (!str) return 'Date unavailable'
  try {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return str }
}

shopify.extend('customer-account.profile.block.render', async () => {
  const section = el('s-section', { heading: 'Symptom Assessment History' },
    el('s-spinner', { 'accessibility-label': 'Loading assessments' })
  )
  document.body.appendChild(section)

  try {
    const token = await shopify.sessionToken.get()
    const resp = await fetch(`${FLY_BASE}/api/me/assessments`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    while (section.firstChild) section.removeChild(section.firstChild)

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()

    if (!data.length) {
      section.appendChild(el('s-text', {}, "You haven't completed any symptom assessments yet."))
      return
    }

    const stack = el('s-stack', { direction: 'block', gap: 'base' })
    for (const a of data) {
      const row = el('s-stack', { direction: 'inline', gap: 'base', 'align-items': 'center' },
        el('s-text', {}, formatDate(a.completed_at)),
        el('s-link', { href: `${FLY_BASE}/api/me/assessment/${a.id}/pdf?token=${encodeURIComponent(token)}` }, 'Download PDF')
      )
      for (const f of (a.files || [])) {
        row.appendChild(
          el('s-link', { href: `${FLY_BASE}/api/me/assessment/${a.id}/files/${f.id}?token=${encodeURIComponent(token)}` }, f.filename)
        )
      }
      stack.appendChild(row)
    }
    section.appendChild(stack)
  } catch {
    while (section.firstChild) section.removeChild(section.firstChild)
    section.appendChild(el('s-banner', { tone: 'critical' }, 'Unable to load your assessment history.'))
  }
})
