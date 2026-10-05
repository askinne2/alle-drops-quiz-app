import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const APP_BASE = 'https://alle-drops-quiz-app-502519175239.us-east1.run.app';
const LEDGER_REFRESH_MS = 10 * 60 * 1000;

function formatDate(str) {
  if (!str) return 'Date unavailable';
  try {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return str;
  }
}

function QuizHistory() {
  const [status, setStatus] = useState('loading');
  const [assessments, setAssessments] = useState([]);

  // The ledger returns server-signed download links (pdf_url, files[].url) that expire after
  // 15 minutes, so re-fetch every 10 minutes to keep the hrefs fresh. The session token is only
  // ever sent as a header, never placed in a link.
  useEffect(() => {
    let cancelled = false;
    let loaded = false;

    async function load() {
      try {
        const t = await shopify.sessionToken.get();
        const resp = await fetch(`${APP_BASE}/api/me/assessments`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (cancelled) return;
        loaded = true;
        setAssessments(data);
        setStatus('done');
      } catch {
        // Keep showing the last good list on a failed background refresh.
        if (!cancelled && !loaded) setStatus('error');
      }
    }

    load();
    const timer = setInterval(load, LEDGER_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (status === 'loading') {
    return (
      <s-section heading="Symptom Assessment History">
        <s-spinner accessibility-label="Loading assessments" />
      </s-section>
    );
  }

  if (status === 'error') {
    return (
      <s-section heading="Symptom Assessment History">
        <s-banner tone="critical">Unable to load your assessment history.</s-banner>
      </s-section>
    );
  }

  if (!assessments.length) {
    return (
      <s-section heading="Symptom Assessment History">
        <s-text>You haven't completed any symptom assessments yet.</s-text>
      </s-section>
    );
  }

  return (
    <s-section heading="Symptom Assessment History">
      <s-stack direction="block" gap="base">
        {assessments.map(a => (
          <s-stack key={a.id} direction="inline" gap="base" align-items="center">
            <s-text>{formatDate(a.completed_at)}</s-text>
            <s-link href={a.pdf_url}>
              Download PDF
            </s-link>
            {(a.files || []).map(f => (
              <s-link
                key={f.id}
                href={f.url}
              >
                {f.filename}
              </s-link>
            ))}
          </s-stack>
        ))}
      </s-stack>
    </s-section>
  );
}

export default () => {
  render(<QuizHistory />, document.body);
};
