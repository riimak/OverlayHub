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
          }
        `}</style>
      </head>

      <body>
        <div id="container">
          <iframe id="displayFrame" style={{
            width: "100vw",
            height: "100vh",
            border: "none",
            display: "block"
          }}></iframe>
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
  const frame = document.getElementById('displayFrame');
  
  let currentView = '';

  async function checkAndUpdateView() {
    try {
      const r = await fetch(settingsAPI, { cache: 'no-store' });
      if (!r.ok) return;
      
      const settings = await r.json();
      const activeDisplay = settings.activeDisplay || 'scoreboard';
      
      if (currentView !== activeDisplay) {
        currentView = activeDisplay;
        
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
        
        frame.src = targetUrl;
      }
    } catch (e) {
      console.error('Failed to check active display:', e);
    }
  }

  checkAndUpdateView();
  setInterval(checkAndUpdateView, refreshMs);
})();
            `
          }}
        />
      </body>
    </html>
  );
}
