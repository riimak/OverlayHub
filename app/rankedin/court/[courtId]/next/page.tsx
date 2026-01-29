export const runtime = "edge";

function first(sp: any, fallback: string) {
  return Array.isArray(sp) ? (sp[0] ?? fallback) : (sp ?? fallback);
}

export default function NextMatchPage({
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

            /* Blue accent */
            --blue: #7DC1FF;

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

          /* ===== NEXT MATCH CARD ===== */
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
            align-items: baseline;
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

          .cardSubtitle {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateLabel);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Match section */
          .matchRow {
            margin-top: 12px;
            padding: 16px 18px;
            border-radius: 6px;
            background: rgba(0,0,0,0.40);
            border: 1px solid rgba(255,255,255,0.10);
          }

          .matchLabel {
            font-size: 12px;
            font-weight: 900;
            color: var(--slateLabel);
            letter-spacing: 0.6px;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .matchPlayers {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }

          .playerName {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            color: var(--slateInk);
            flex: 1;
            text-align: left;
          }

          .playerName.right {
            text-align: right;
          }

          .vsLabel {
            font-size: 16px;
            font-weight: 900;
            color: var(--slateLabel);
            letter-spacing: 0.5px;
            padding: 0 12px;
          }

          .matchTime {
            margin-top: 10px;
            font-size: 14px;
            font-weight: 800;
            color: var(--slateLabel);
            letter-spacing: 0.3px;
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
        `}</style>
      </head>

      <body>
        <div className="wrap">
          <div className="card fade" id="card">
            <div className="cardInner">
              <div className="cardHeader">
                <div className="cardTitle" id="title">NEXT MATCH</div>
                <div className="cardSubtitle" id="subtitle">—</div>
              </div>

              <div className="matchRow" id="matchRow">
                <div className="matchLabel">UP NEXT</div>
                <div className="matchPlayers">
                  <div className="playerName" id="player1">—</div>
                  <div className="vsLabel">VS</div>
                  <div className="playerName right" id="player2">—</div>
                </div>
                <div className="matchTime" id="startTime">Starts: —</div>
              </div>

              <div className="empty hidden" id="empty">
                No upcoming match scheduled
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

  async function tick(){
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();

      const match = data.match || null;
      const settings = (data.overlay && data.overlay.settings) ? data.overlay.settings : {};

      const matchRow = el('matchRow');
      const empty = el('empty');

      // Set header info
      el('title').textContent = 'NEXT MATCH';
      el('subtitle').textContent = settings.subtitle || (data.courtName ? String(data.courtName) : '—');

      if (!match) {
        // No match scheduled
        matchRow.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }

      // Show match info
      matchRow.classList.remove('hidden');
      empty.classList.add('hidden');

      const swap = !!settings.swap;
      const p1 = match.player1;
      const p2 = match.player2;

      const left = swap ? p2 : p1;
      const right = swap ? p1 : p2;

      const nameLeft = (swap ? settings.name2 : settings.name1) || left?.name || 'PLAYER 1';
      const nameRight = (swap ? settings.name1 : settings.name2) || right?.name || 'PLAYER 2';

      el('player1').textContent = String(nameLeft).toUpperCase();
      el('player2').textContent = String(nameRight).toUpperCase();

      // Start time
      const st = match?.scheduledStartTime;
      if (typeof st === 'string' && st) {
        const pretty = st.replace('T',' ').slice(0,16);
        el('startTime').textContent = 'Starts: ' + pretty;
      } else {
        el('startTime').textContent = 'Starts: —';
      }

    } catch (e) {
      // Keep last known values on screen
      console.error('Failed to fetch match data:', e);
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
