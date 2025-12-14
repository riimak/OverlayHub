export const runtime = "edge";

function first(sp: any, fallback: string) {
  return Array.isArray(sp) ? (sp[0] ?? fallback) : (sp ?? fallback);
}

export default function ScoreboardPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const refreshMs = Number(first(searchParams?.refresh, "1000"));
  const safeRefresh = Number.isFinite(refreshMs) ? refreshMs : 1000;

  // Theme / branding (query params)
  // Example:
  // ?theme=squasher&logo=https%3A%2F%2F...png&font=Inter
  const theme = String(first(searchParams?.theme, "squasher"));
  const logo = String(first(searchParams?.logo, "")); // supply your logo URL here
  const font = String(first(searchParams?.font, "Inter"));

  // Allow overriding colors via query params if you want (hex without # also OK)
  const cBg = String(first(searchParams?.bg, theme === "squasher" ? "#0b1220" : "#111"));
  const cPanel = String(first(searchParams?.panel, theme === "squasher" ? "#0f172a" : "#111"));
  const cAccent = String(first(searchParams?.accent, theme === "squasher" ? "#38bdf8" : "#ffffff"));
  const cLeft = String(first(searchParams?.left, "#0b3aa6"));   // keep your blue/orange team bars
  const cRight = String(first(searchParams?.right, "#c66a08"));

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Optional: load Google font by name (if it exists) */}
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
            --bg: ${cBg};
            --panel: ${cPanel};
            --accent: ${cAccent};
            --left: ${cLeft};
            --right: ${cRight};
          }

          html, body {
            margin:0;
            background: transparent;
            font-family: ${JSON.stringify(font)}, Inter, Arial, sans-serif;
          }

          .wrap { padding: 16px; }

          .sb {
            width: 900px;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 14px 40px rgba(0,0,0,0.38);
            background: var(--panel);
            position: relative;
          }

          /* Branding strip */
          .brand {
            position: absolute;
            left: 14px;
            top: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 5;
          }
          .brand img{
            height: 22px;
            width: auto;
            opacity: 0.95;
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.35));
          }
          .brandTag {
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.75);
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.10);
          }

          .top {
            display: grid;
            grid-template-columns: 1fr 160px 1fr;
            align-items: stretch;
            height: 78px;
          }

          .team {
            display:flex;
            align-items:center;
            gap: 12px;
            padding: 0 18px;
            color: #fff;
            font-weight: 900;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            font-size: 24px;
            overflow:hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .left { background: var(--left); justify-content:flex-start; }
          .right { background: var(--right); justify-content:flex-end; }

          /* Center score = CURRENT GAME POINTS (in focus) */
          .center {
            background: #0b0f1a;
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 14px;
            color: #fff;
            position: relative;
          }

          .score {
            font-size: 52px;
            font-weight: 900;
            line-height: 1;
            min-width: 34px;
            text-align:center;
          }

          .divider {
            width: 2px;
            height: 44px;
            background: rgba(255,255,255,0.18);
          }

          .serveDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #fff;
            opacity: 0.25;
          }
          .serveDot.on { opacity: 1; }

          /* Footer: games + state */
          .bottom {
            display:flex;
            justify-content: space-between;
            align-items:center;
            height: 34px;
            background: rgba(0,0,0,0.65);
            color: rgba(255,255,255,0.92);
            padding: 0 14px;
            font-size: 14px;
            font-weight: 800;
          }

          .pill {
            padding: 5px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.10);
            border: 1px solid rgba(255,255,255,0.10);
            font-weight: 900;
          }

          .muted { opacity: 0.85; font-weight: 800; }

          .hidden { display:none; }
        `}</style>
      </head>

      <body>
        <div className="wrap">
          <div className="sb" id="box">
            <div className="brand" id="brand">
              {/* logo injected via JS only if provided */}
              <span className="brandTag">SQUASHer</span>
            </div>

            <div className="top">
              <div className="team left">
                <span className="serveDot" id="s1"></span>
                <span id="n1">—</span>
              </div>

              <div className="center">
                <span className="score" id="p1">0</span>
                <span className="divider"></span>
                <span className="score" id="p2">0</span>
              </div>

              <div className="team right">
                <span id="n2">—</span>
                <span className="serveDot" id="s2"></span>
              </div>
            </div>

            <div className="bottom">
              <div>
                <span className="pill" id="game">G1</span>
                <span className="muted" id="games"> • Games 0–0</span>
              </div>
              <div>
                <span className="muted" id="status">LIVE</span>
                <span className="muted" id="time"> • 00:00</span>
              </div>
            </div>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  const parts = window.location.pathname.split('/').filter(Boolean);
  const courtId = parts[2];
  if (!courtId) return;

  const refreshMs = ${JSON.stringify(Math.max(250, safeRefresh))};
  const API = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/data';

  const logo = ${JSON.stringify(logo)};
  const theme = ${JSON.stringify(theme)};

  const el = (id) => document.getElementById(id);

  function fmtTime(sec){
    if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  // Apply branding (logo optional)
  (function initBrand(){
    const brand = el('brand');
    if (!brand) return;

    if (logo) {
      const img = document.createElement('img');
      img.src = logo;
      img.alt = 'Logo';
      img.referrerPolicy = 'no-referrer';
      brand.insertBefore(img, brand.firstChild);
    }

    // If you want a tag other than "SQUASHer" change it here:
    // brand.querySelector('.brandTag')?.textContent = theme.toUpperCase();
  })();

  async function tick(){
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();

      if(!data.match){
        el('box').classList.add('hidden');
        return;
      }
      el('box').classList.remove('hidden');

      el('n1').textContent = data.match.player1.name || 'PLAYER 1';
      el('n2').textContent = data.match.player2.name || 'PLAYER 2';

      // BIG SCORE = CURRENT GAME POINTS (in focus)
      el('p1').textContent = data.match.player1.points ?? 0;
      el('p2').textContent = data.match.player2.points ?? 0;

      // Footer: games in match + game number
      el('games').textContent = ' • Games ' + (data.match.player1.games ?? 0) + '–' + (data.match.player2.games ?? 0);
      el('game').textContent = 'G' + (data.match.gameNumber ?? 1);

      const status = (data.match.status || 'LIVE').toUpperCase();
      el('status').textContent = status;

      el('time').textContent = ' • ' + fmtTime(data.match.durationSeconds);

      el('s1').className = 'serveDot' + (data.match.player1.serving ? ' on' : '');
      el('s2').className = 'serveDot' + (data.match.player2.serving ? ' on' : '');

    } catch(e){
      el('status').textContent = 'ERROR';
    }
  }

  tick();
  setInterval(tick, refreshMs);
})();
            `
          }}
        />
      </body>
    </html>
  );
}
