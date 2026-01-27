export const runtime = "edge";

function first(sp: any, fallback: string) {
  return Array.isArray(sp) ? (sp[0] ?? fallback) : (sp ?? fallback);
}

export default function WelcomePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const refreshMs = Number(first(searchParams?.refresh, "5000"));
  const safeRefresh = Number.isFinite(refreshMs) ? refreshMs : 5000;

  const scale = Number(first(searchParams?.scale, "1"));
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  const font = String(first(searchParams?.font, "Inter"));

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            font
          )}:wght@600;700;800;900&display=swap`}
          rel="stylesheet"
        />

        <style>{`
          :root{
            /* Squasher.hr dark theme */
            --bg: rgba(30, 41, 59, 0.95);
            --ink: rgba(255, 255, 255, 0.95);
            --line: rgba(100, 116, 139, 0.3);

            /* Primary accent - mint green */
            --accent: #ACEF34;
            --accentDark: #8BC428;

            /* Shadow */
            --shadow: 0 12px 26px rgba(0,0,0,0.5);
          }

          html, body {
            margin:0;
            background: transparent;
            font-family: ${JSON.stringify(font)}, Inter, Arial, sans-serif;
          }

          .wrap {
            width: 100%;
            padding: 20px;
            transform: scale(${safeScale});
            transform-origin: top center;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }

          /* ===== WELCOME CARD ===== */
          .card {
            width: 900px;
            margin: 0 auto;
            border-radius: 3px;
            overflow: hidden;
            box-shadow: var(--shadow);
            background: var(--bg);
            border: 1px solid var(--line);
            color: var(--ink);
          }

          .cardInner {
            padding: 48px 56px;
            text-align: center;
          }

          .welcomeIcon {
            font-size: 80px;
            margin-bottom: 24px;
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          .welcomeTitle {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .tournamentName {
            font-size: 48px;
            font-weight: 900;
            margin-bottom: 32px;
            color: var(--ink);
            line-height: 1.2;
            letter-spacing: 0.5px;
          }

          .infoGrid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 24px;
            margin-top: 32px;
          }

          .infoBox {
            padding: 24px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.30);
            border: 1px solid rgba(255, 255, 255, 0.10);
          }

          .infoLabel {
            font-size: 13px;
            font-weight: 800;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 8px;
          }

          .infoValue {
            font-size: 22px;
            font-weight: 900;
            color: var(--ink);
            letter-spacing: 0.3px;
          }

          .subtitle {
            font-size: 18px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 16px;
            line-height: 1.5;
          }

          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--accent), transparent);
            margin: 32px 0;
          }

          .placeholder {
            font-size: 16px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.5);
            font-style: italic;
          }
        `}</style>
      </head>

      <body>
        <div className="wrap">
          <div className="card">
            <div className="cardInner" id="content">
              <div className="welcomeIcon">🏆</div>
              <div className="welcomeTitle">Welcome To</div>
              <div className="tournamentName" id="tournamentName">
                Loading...
              </div>
              
              <div className="divider"></div>

              <div className="infoGrid">
                <div className="infoBox">
                  <div className="infoLabel">📅 Date</div>
                  <div className="infoValue" id="tournamentDate">
                    <span className="placeholder">Not set</span>
                  </div>
                </div>
                <div className="infoBox">
                  <div className="infoLabel">📍 Venue</div>
                  <div className="infoValue" id="tournamentVenue">
                    <span className="placeholder">Not set</span>
                  </div>
                </div>
              </div>

              <div className="subtitle" id="tournamentSubtitle"></div>
            </div>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const courtId = parts[2];
  if (!courtId) {
    document.getElementById('tournamentName').textContent = 'Error: No courtId';
    return;
  }

  let lastSettings = null;

  async function fetchData() {
    try {
      const url = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/data';
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) {
        console.error('Fetch failed:', r.status);
        return;
      }
      const data = await r.json();
      
      const settings = (data.overlay && data.overlay.settings) ? data.overlay.settings : {};
      const program = data.program || null;
      
      const renderData = {
        settings,
        program,
        tournamentId: program?.tournamentId || settings?.tournamentId || null
      };
      
      if (JSON.stringify(renderData) !== JSON.stringify(lastSettings)) {
        lastSettings = renderData;
        render(renderData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }

  function render(data) {
    const settings = data.settings || {};
    const program = data.program || null;
    
    // Use settings first, fall back to sensible defaults
    const tournamentName = settings?.tournamentName || 'Tournament';
    const tournamentDate = settings?.tournamentDate || '';
    const tournamentVenue = settings?.tournamentVenue || '';
    const subtitle = settings?.subtitle || '';
    
    // Show program stats if available
    let programInfo = '';
    if (program) {
      const upcomingCount = program.upcomingMatches?.length || 0;
      const finishedCount = program.finishedMatches?.length || 0;
      const totalCount = upcomingCount + finishedCount;
      if (totalCount > 0) {
        programInfo = totalCount + ' match' + (totalCount !== 1 ? 'es' : '') + ' scheduled';
      }
    }

    document.getElementById('tournamentName').textContent = tournamentName;
    
    const dateEl = document.getElementById('tournamentDate');
    if (tournamentDate) {
      dateEl.innerHTML = tournamentDate;
    } else {
      dateEl.innerHTML = '<span class="placeholder">Not set</span>';
    }

    const venueEl = document.getElementById('tournamentVenue');
    if (tournamentVenue) {
      venueEl.innerHTML = tournamentVenue;
    } else {
      venueEl.innerHTML = '<span class="placeholder">Not set</span>';
    }

    const subtitleEl = document.getElementById('tournamentSubtitle');
    const displayText = subtitle || programInfo;
    if (displayText) {
      subtitleEl.textContent = displayText;
      subtitleEl.style.display = 'block';
    } else {
      subtitleEl.style.display = 'none';
    }
  }

  fetchData();
  setInterval(fetchData, ${safeRefresh});
})();
            `
          }}
        />
      </body>
    </html>
  );
}
