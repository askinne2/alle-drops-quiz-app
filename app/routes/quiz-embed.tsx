import type { LoaderFunctionArgs } from 'react-router'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  // Fly terminates TLS at the proxy and forwards requests as http internally.
  // Trust x-forwarded-proto to reconstruct the correct public origin.
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  const origin = `${proto}://${url.host}`

  const consultRedirect = url.searchParams.get('consult') ?? ''
  const testOptionsRedirect = url.searchParams.get('testOptions') ?? ''
  const testMode = url.searchParams.get('test') === '1'
  const shopDomain = url.searchParams.get('shop') ?? ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AlleDrops Symptom Assessment</title>
  <link rel="stylesheet" href="${origin}/quiz-bundle-css">
  <style>
    /* AlleDrops brand tokens — mirrors the Shopify theme CSS variables */
    :root {
      --color-foreground: 46, 42, 57;
      --color-background: 229, 244, 237;
      --color-button: 44, 62, 63;
      --color-button-text: 253, 251, 247;
      --color-link: 44, 62, 63;
      --font-body-family: Inter, sans-serif;
      --font-body-size: 1.6rem;
      --font-body-line-height: 1.6;
      --font-heading-family: Inter, sans-serif;
      --font-heading-scale: 1.2;
      --font-heading-weight: 900;
      --gradient-background: linear-gradient(180deg, #e5f4ed, #FDFBF7 100%);
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { font-size: 62.5%; }
    html, body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div data-alledrops-quiz></div>
  <script>
    window.AlleDropsQuizConfig = {
      appUrl: ${JSON.stringify(origin)},
      shopUrl: ${JSON.stringify(shopDomain)},
      apiEndpoint: ${JSON.stringify(origin + '/api/quiz/submit')},
      testMode: ${JSON.stringify(testMode)},
      consultRedirectUrl: ${JSON.stringify(consultRedirect)},
      testOptionsRedirectUrl: ${JSON.stringify(testOptionsRedirect)},
    };

    if (window.self !== window.top) {
      // Navigate parent window instead of the iframe
      window.location.assign = function(url) {
        window.parent.postMessage({ type: 'quiz:navigate', url: String(url) }, '*');
      };

      // Intercept anchor clicks so they navigate the parent too
      document.addEventListener('click', function(e) {
        var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!el) return;
        var href = el.getAttribute('href');
        if (!href || href.startsWith('#') || el.target === '_blank') return;
        e.preventDefault();
        window.parent.postMessage({
          type: 'quiz:navigate',
          url: new URL(href, window.location.href).href
        }, '*');
      });

      // Report content height so the parent can size the iframe
      var _lastH = 0;
      function _reportHeight() {
        var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        if (h > 0 && h !== _lastH) {
          _lastH = h;
          window.parent.postMessage({ type: 'quiz:resize', height: h }, '*');
        }
      }
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(_reportHeight).observe(document.body);
      }
      window.addEventListener('load', _reportHeight);
      setTimeout(_reportHeight, 200);
      setTimeout(_reportHeight, 800);
    }
  </script>
  <script src="${origin}/quiz-bundle-js"></script>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "frame-ancestors *",
      'Cache-Control': 'no-store',
    },
  })
}
