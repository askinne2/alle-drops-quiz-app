/**
 * Quiz History Block - Customer Account Profile Extension
 * Displays customer's quiz history in their account profile page
 * Uses Shopify's global shopify object (no imports needed for Customer Account Extensions)
 */

// Extension entry point - Shopify calls this function with the root element
export default async function extension(root) {
  // Initial loading state
  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      <s-text>Loading your assessment history...</s-text>
    </s-section>
  `;
  
  try {
    // Fetch customer metafields using Shopify's global query function
    // Note: The response structure may be { data: { customer: ... } } or { customer: ... }
    const response = await shopify.query(`
      query {
        customer {
          metafields(namespace: "alledrops", first: 10) {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    `);
    
    console.log('Quiz History - Raw API response:', JSON.stringify(response, null, 2));
    
    // Handle different response structures
    const customerData = response?.data?.customer || response?.customer;
    
    // Transform metafields into a map for easy access
    const metafields = {};
    if (customerData?.metafields?.edges) {
      customerData.metafields.edges.forEach((edge) => {
        metafields[edge.node.key] = edge.node;
      });
      console.log('Quiz History - Parsed metafields:', Object.keys(metafields));
    } else {
      console.log('Quiz History - No metafields found in response');
    }
    
    // Render with fetched data
    renderQuizHistory(root, metafields);
  } catch (err) {
    console.error('Quiz History Extension Error:', err);
    root.innerHTML = `
      <s-section heading="Symptom Assessment History">
        <s-banner status="critical">
          <s-text>Unable to load your assessment history. Error: ${err.message || 'Unknown error'}</s-text>
        </s-banner>
      </s-section>
    `;
  }
}

/**
 * Render the quiz history content
 */
function renderQuizHistory(root, metafields) {
  // Parse quiz history
  let quizHistory = [];
  if (metafields?.quiz_history?.value) {
    try {
      const parsed = JSON.parse(metafields.quiz_history.value);
      quizHistory = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      quizHistory = [];
    }
  }
  
  // Get latest quiz data
  const latestQuiz = {
    profileId: metafields?.symptom_profile_id?.value || null,
    score: metafields?.quiz_score?.value ? parseInt(metafields.quiz_score.value, 10) : null,
    scoreBracket: metafields?.score_bracket?.value || metafields?.severity_level?.value || null,
    state: metafields?.state?.value || metafields?.quiz_region?.value || null,
    date: metafields?.quiz_date?.value || null,
  };
  
  const hasQuizData = quizHistory.length > 0 || latestQuiz.profileId;
  
  // No quiz data state
  if (!hasQuizData) {
    root.innerHTML = `
      <s-section heading="Symptom Assessment History">
        <s-stack direction="block" gap="base">
          <s-text>You haven't completed any symptom assessments yet.</s-text>
          <s-text>Take our assessment for personalized recommendations.</s-text>
        </s-stack>
      </s-section>
    `;
    return;
  }
  
  // Build content with quiz data
  let content = '<s-stack direction="block" gap="base">';
  
  if (latestQuiz.profileId) {
    content += '<s-stack direction="block" gap="small-400">';
    content += '<s-text emphasis="bold">Latest Assessment</s-text>';
    content += '<s-stack direction="inline" gap="large">';
    
    if (latestQuiz.score !== null) {
      content += `
        <s-stack direction="block" gap="small-200">
          <s-text size="small" appearance="subdued">Score</s-text>
          <s-text emphasis="bold">${latestQuiz.score}</s-text>
        </s-stack>
      `;
    }
    
    if (latestQuiz.scoreBracket) {
      content += `
        <s-stack direction="block" gap="small-200">
          <s-text size="small" appearance="subdued">Score Bracket</s-text>
          <s-text emphasis="bold">${latestQuiz.scoreBracket}</s-text>
        </s-stack>
      `;
    }
    
    if (latestQuiz.state) {
      content += `
        <s-stack direction="block" gap="small-200">
          <s-text size="small" appearance="subdued">State</s-text>
          <s-text>${latestQuiz.state}</s-text>
        </s-stack>
      `;
    }
    
    content += '</s-stack>'; // Close inline stack
    
    if (latestQuiz.date) {
      content += `<s-text size="small" appearance="subdued">Completed: ${formatDate(latestQuiz.date)}</s-text>`;
    }
    
    if (latestQuiz.profileId) {
      content += `<s-text size="small" appearance="subdued">Profile ID: ${latestQuiz.profileId}</s-text>`;
    }
    
    content += '</s-stack>'; // Close block stack for latest assessment
  }
  
  // Show count if multiple assessments
  if (quizHistory.length > 1) {
    content += `
      <s-divider></s-divider>
      <s-text size="small" appearance="subdued">${quizHistory.length} total assessments on record</s-text>
    `;
  }
  
  content += '</s-stack>'; // Close main stack
  
  root.innerHTML = `
    <s-section heading="Symptom Assessment History">
      ${content}
    </s-section>
  `;
}

/**
 * Format date helper
 */
function formatDate(dateString) {
  if (!dateString) return "Date not available";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}
