const FLY_BASE = 'https://alle-drops-quiz-app.fly.dev';

export default async function extension(root, api) {
  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-text>Loading your assessment history...</s-text>
    </s-section>
  `;

  let token;
  try {
    token = await api.sessionToken.get();
  } catch (err) {
    renderError(root, 'Could not authenticate. Please refresh the page.');
    return;
  }

  let assessments;
  try {
    const resp = await fetch(`${FLY_BASE}/api/me/assessments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    assessments = await resp.json();
  } catch (err) {
    renderError(root, 'Unable to load your assessment history.');
    return;
  }

  renderAssessments(root, assessments, api);
}

function renderAssessments(root, assessments, api) {
  if (!assessments.length) {
    root.innerHTML = `
      <s-section heading="Symptom Assessment History">
        <s-text>You haven't completed any symptom assessments yet.</s-text>
      </s-section>
    `;
    return;
  }

  const rows = assessments
    .map(
      (a) => `
        <s-stack direction="inline" gap="base">
          <s-text>${formatDate(a.completed_at)}</s-text>
          <s-button data-id="${a.id}">Download PDF</s-button>
        </s-stack>
      `
    )
    .join('<s-divider></s-divider>');

  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-stack direction="block" gap="base">
        ${rows}
      </s-stack>
    </s-section>
  `;

  root.querySelectorAll('s-button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => downloadPdf(btn.dataset.id, api));
  });
}

async function downloadPdf(id, api) {
  let token;
  try {
    token = await api.sessionToken.get();
  } catch {
    alert('Session expired. Please refresh the page.');
    return;
  }

  try {
    const resp = await fetch(`${FLY_BASE}/api/me/assessment/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Could not download PDF. Please try again.');
  }
}

function renderError(root, message) {
  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-banner status="critical">
        <s-text>${message}</s-text>
      </s-banner>
    </s-section>
  `;
}

function formatDate(dateString) {
  if (!dateString) return 'Date unavailable';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
