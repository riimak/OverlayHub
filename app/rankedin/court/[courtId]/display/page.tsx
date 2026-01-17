export const runtime = "edge";

function first(sp: any, fallback: string) {
  return Array.isArray(sp) ? (sp[0] ?? fallback) : (sp ?? fallback);
}

export default function UnifiedDisplayPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const refreshMs = Number(first(searchParams?.refresh, "1000"));
  const safeRefresh = Number.isFinite(refreshMs) ? refreshMs : 1000;

  const scale = Number(first(searchParams?.scale, "1"));
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  const font = String(first(searchParams?.font, "Inter"));

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Unified Display</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            font
          )}:wght@600;700;800;900&display=swap`}
          rel="stylesheet"
        />

        <style>{`
          html, body {
            margin:0;
            background: transparent;
            font-family: ${JSON.stringify(font)}, Inter, Arial, sans-serif;
          }

          #container {
            transform: scale(${safeScale});
            transform-origin: top center;
            width: 100%;
            min-height: 100vh;
          }

          .hidden {
            display: none !important;
          }
        `}</style>
      </head>

      <body>
        <div id="container">
          {/* Container that will be populated dynamically */}
          <div id="dynamicContent"></div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  const parts = window.location.pathname.split('/').filter(Boolean);
  const courtId = parts[2];
  if (!courtId) return;

  const refreshMs = ${JSON.stringify(Math.max(250, safeRefresh))};
  const settingsAPI = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/settings';
  
  let currentView = '';
  let isInitialized = false;

  async function updateDisplay() {
    try {
      const settingsRes = await fetch(settingsAPI, { cache: 'no-store' });
      
      if (!settingsRes.ok) {
        console.error('Failed to fetch settings');
        return;
      }
      
      const settings = await settingsRes.json();
      const activeDisplay = settings.activeDisplay || 'scoreboard';
      
      // On initial load or when view changes, redirect to the correct page
      if (!isInitialized || (currentView && currentView !== activeDisplay)) {
        const baseUrl = window.location.origin;
        const params = new URLSearchParams(window.location.search);
        
        let targetUrl = '';
        switch(activeDisplay) {
          case 'scoreboard':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/scoreboard?' + params.toString();
            break;
          case 'now':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/now?' + params.toString();
            break;
          case 'next':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/next?' + params.toString();
            break;
          case 'schedule':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/schedule?' + params.toString();
            break;
          default:
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/scoreboard?' + params.toString();
        }
        
        console.log('Redirecting to:', targetUrl);
        window.location.href = targetUrl;
        return;
      }
      
      currentView = activeDisplay;
      isInitialized = true;
      
    } catch (e) {
      console.error('Failed to check active display:', e);
    }
  }

  // Initial redirect immediately
  updateDisplay();
  
  // Then check periodically for changes
  setInterval(updateDisplay, refreshMs);
})();
            `
          }}
        />
      </body>
    </html>
  );
}
