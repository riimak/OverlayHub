export const runtime = "edge";

function first(sp: any, fallback: string) {
  return Array.isArray(sp) ? (sp[0] ?? fallback) : (sp ?? fallback);
}

export default function NowMatchPage({
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

            /* Live indicator */
            --liveRed: #EF4444;
            --liveGlow: 0 0 16px rgba(239, 68, 68, 0.6);

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
          }

          /* ===== CURRENT MATCH CARD ===== */
          .card {
            width: 820px;
            margin: 0 auto;
            border-radius: 3px;
            overflow: hidden;
            box-shadow: var(--shadow);
            background: var(--bg);
            border: 1px solid var(--line);
            color: var(--ink);
          }

          .cardInner {
            padding: 20px 24px;
          }

          .cardHeader {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .cardTitle {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            background: linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .liveIndicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 4px;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          .liveDot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: var(--liveRed);
            box-shadow: var(--liveGlow);
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          .liveText {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.6px;
            color: var(--liveRed);
          }

          .cardSubtitle {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateLabel);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
          }

          /* Match section */
          .matchRow {
            margin-top: 12px;
            padding: 18px;
            border-radius: 6px;
            background: rgba(0,0,0,0.40);
            border: 1px solid rgba(255,255,255,0.10);
          }

          .scoreGrid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 16px;
            align-items: center;
          }

          .playerSection {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .playerSection.right {
            align-items: flex-end;
          }

          .playerName {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            color: var(--slateInk);
          }

          .playerGames {
            font-size: 14px;
            font-weight: 800;
            color: var(--slateLabel);
            letter-spacing: 0.3px;
          }

          .serveDot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.3);
            margin-left: 6px;
          }

          .serveDot.active {
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
          }

          .scoreCenter {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 0 20px;
          }

          .points {
            font-size: 36px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: var(--slateInk);
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .pointsSep {
            font-size: 28px;
            opacity: 0.5;
          }

          .matchStatus {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .statusText {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateLabel);
            letter-spacing: 0.4px;
          }

          .matchTime {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateLabel);
            letter-spacing: 0.4px;
          }

          .empty {
            text-align: center;
            padding: 32px 24px;
            font-size: 15px;
            font-weight: 800;
            color: var(--slateLabel);
            letter-spacing: 0.4px;
          }

          .hidden { display:none; }

          /* ===== Animations ===== */
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .fade { animation: fadeIn 400ms ease-out; }

          @keyframes flash {
            0% { filter: brightness(1); }
            35% { filter: brightness(1.3); }
            100% { filter: brightness(1); }
          }
          .flash { animation: flash 450ms ease-out; }
        `}</style>
      </head>

      <body>
        <div className="wrap">
          <div className="card fade" id="card">
            <div className="cardInner">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">CURRENT MATCH</div>
                  <div className="cardSubtitle" id="subtitle">—</div>
                </div>
                <div className="liveIndicator hidden" id="liveIndicator">
                  <div className="liveDot"></div>
                  <div className="liveText">LIVE</div>
                </div>
              </div>

              <div className="matchRow" id="matchRow">
                <div className="scoreGrid">
                  <div className="playerSection">
                    <div className="playerName" id="player1">—</div>
                    <div className="playerGames">
                      <span id="games1">0</span> games
                      <span className="serveDot" id="serve1"></span>
                    </div>
                  </div>

                  <div className="scoreCenter">
                    <div className="points">
                      <span id="points1">0</span>
                      <span className="pointsSep">–</span>
                      <span id="points2">0</span>
                    </div>
                  </div>

                  <div className="playerSection right">
                    <div className="playerName" id="player2">—</div>
                    <div className="playerGames">
                      <span className="serveDot" id="serve2"></span>
                      <span id="games2">0</span> games
                    </div>
                  </div>
                </div>

                <div className="matchStatus">
                  <div className="statusText" id="status">—</div>
                  <div className="matchTime" id="duration">00:00</div>
                </div>
              </div>

              <div className="empty hidden" id="empty">
                No match in progress
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

  const el = (id) => document.getElementById(id);

  function fmtTime(sec){
    if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  let lastEventAt = 0;

  async function tick(){
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();

      const match = data.match || null;
      const settings = (data.overlay && data.overlay.settings) ? data.overlay.settings : {};
      const event = (data.overlay && data.overlay.event) ? data.overlay.event : null;

      const matchRow = el('matchRow');
      const empty = el('empty');
      const liveIndicator = el('liveIndicator');

      // Set header info
      el('subtitle').textContent = settings.subtitle || (data.courtName ? data.courtName : '—');

      if (!match) {
        // No match
        matchRow.classList.add('hidden');
        empty.classList.remove('hidden');
        liveIndicator.classList.add('hidden');
        return;
      }

      // Show match info
      matchRow.classList.remove('hidden');
      empty.classList.add('hidden');

      const isLive = !!match.isLive;
      if (isLive) {
        liveIndicator.classList.remove('hidden');
      } else {
        liveIndicator.classList.add('hidden');
      }

      const swap = !!settings.swap;
      const p1 = match.player1;
      const p2 = match.player2;

      const left = swap ? p2 : p1;
      const right = swap ? p1 : p2;

      const nameLeft = (swap ? settings.name2 : settings.name1) || left?.name || 'PLAYER 1';
      const nameRight = (swap ? settings.name1 : settings.name2) || right?.name || 'PLAYER 2';

      el('player1').textContent = String(nameLeft).toUpperCase();
      el('player2').textContent = String(nameRight).toUpperCase();

      // Points
      el('points1').textContent = String(left?.points ?? 0);
      el('points2').textContent = String(right?.points ?? 0);

      // Games
      el('games1').textContent = String(left?.games ?? 0);
      el('games2').textContent = String(right?.games ?? 0);

      // Serve indicators
      const serve1 = el('serve1');
      const serve2 = el('serve2');
      if (left?.serving) {
        serve1.classList.add('active');
      } else {
        serve1.classList.remove('active');
      }
      if (right?.serving) {
        serve2.classList.add('active');
      } else {
        serve2.classList.remove('active');
      }

      // Status and time
      el('status').textContent = (match.status || (isLive ? 'IN PROGRESS' : 'WAITING')).toUpperCase();
      el('duration').textContent = fmtTime(match.durationSeconds);

      // Animation on events
      if (event && typeof event.at === 'number' && event.at > lastEventAt) {
        lastEventAt = event.at;

        const card = el('card');
        if (event.type === 'flash') {
          card.classList.remove('flash');
          void card.offsetWidth;
          card.classList.add('flash');
          setTimeout(() => card.classList.remove('flash'), 700);
        }
      }

    } catch (e) {
      // Keep last known values on screen
      console.error('Failed to fetch match data:', e);
    }
  }

  tick();
  setInterval(tick, refreshMs);
})();

// Check if this view should still be active
(function(){
  const parts = window.location.pathname.split('/').filter(Boolean);
  const courtId = parts[2];
  if (!courtId) return;

  const settingsAPI = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/settings';

  async function checkActiveView() {
    try {
      const r = await fetch(settingsAPI, { cache: 'no-store' });
      if (!r.ok) return;
      
      const settings = await r.json();
      const activeDisplay = settings.activeDisplay || 'scoreboard';
      
      if (activeDisplay !== 'now') {
        const params = new URLSearchParams(window.location.search);
        const baseUrl = window.location.origin;
        let targetUrl = '';
        
        switch(activeDisplay) {
          case 'scoreboard':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/scoreboard?' + params.toString();
            break;
          case 'next':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/next?' + params.toString();
            break;
          case 'schedule':
            targetUrl = baseUrl + '/rankedin/court/' + encodeURIComponent(courtId) + '/schedule?' + params.toString();
            break;
        }
        
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  setInterval(checkActiveView, ${JSON.stringify(Math.max(500, safeRefresh))});
})();
            `
          }}
        />
      </body>
    </html>
  );
}
