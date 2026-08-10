import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const FLY_BASE = 'https://alle-drops-quiz-app.fly.dev';

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
  const [token, setToken] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const t = await shopify.sessionToken.get();
        const resp = await fetch(`${FLY_BASE}/api/me/assessments`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setToken(t);
        setAssessments(data);
        setStatus('done');
      } catch {
        setStatus('error');
      }
    })();
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
            <s-link href={`${FLY_BASE}/api/me/assessment/${a.id}/pdf?token=${encodeURIComponent(token)}`}>
              Download PDF
            </s-link>
            {(a.files || []).map(f => (
              <s-link
                key={f.id}
                href={`${FLY_BASE}/api/me/assessment/${a.id}/files/${f.id}?token=${encodeURIComponent(token)}`}
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
