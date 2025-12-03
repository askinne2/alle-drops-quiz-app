/**
 * Health check endpoint for keeping the app warm
 * This endpoint is lightweight and doesn't require authentication
 * Perfect for UptimeRobot or similar ping services
 */
export async function loader() {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'alle-drops-quiz-app'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

