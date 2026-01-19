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
            padding:0;
            background: transparent;
            font-family: ${JSON.stringify(font)}, Inter, Arial, sans-serif;
            overflow: hidden;
          }

          #contentFrame {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            transform: scale(${safeScale});
            transform-origin: top center;
          }
        `}</style>
      </head>

      <body>
        <iframe id="contentFrame" title="Overlay Display"></iframe>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  const parts = window.location.pathname.split('/').filter(Boolean);
  const courtId = parts[2];
  if (!courtId) return;

  const params = new URLSearchParams(window.location.search);
  const iframe = document.getElementById('contentFrame');
  let currentView = '';
  
  function updateView(view) {
    if (currentView === view) return;
    
    console.log('Switching to view:', view);
    currentView = view;
    
    let targetUrl = '';
    switch(view) {
      case 'scoreboard':
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/scoreboard?' + params.toString();
        break;
      case 'now':
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/now?' + params.toString();
        break;
      case 'next':
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/next?' + params.toString();
        break;
      case 'schedule':
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/schedule?' + params.toString();
        break;
      case 'results':
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/results?' + params.toString();
        break;
      case 'welcome':
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/welcome?' + params.toString();
        break;
      default:
        targetUrl = '/rankedin/court/' + encodeURIComponent(courtId) + '/scoreboard?' + params.toString();
    }
    
    iframe.src = targetUrl;
  }
  
  // Fetch initial view from settings
  const settingsAPI = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/settings';
  fetch(settingsAPI, { cache: 'no-store' })
    .then(res => res.json())
    .then(settings => {
      const initialView = settings.activeDisplay || 'scoreboard';
      console.log('Initial view from settings:', initialView);
      updateView(initialView);
    })
    .catch(err => {
      console.error('Failed to fetch initial settings:', err);
      updateView('scoreboard');
    });
  
  // Connect to SSE endpoint for real-time updates
  const eventsAPI = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/events';
  const eventSource = new EventSource(eventsAPI);
  
  eventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        console.log('✅ Connected to SSE stream');
        return;
      }
      
      if (data.type === 'display' && data.view) {
        console.log('📡 SSE received view change:', data.view);
        updateView(data.view);
      }
    } catch (e) {
      console.error('Failed to parse SSE message:', e);
    }
  };
  
  eventSource.onerror = function(err) {
    console.error('❌ SSE connection error:', err);
  };
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    eventSource.close();
  });
})();
            `
          }}
        />
      </body>
    </html>
  );
}
