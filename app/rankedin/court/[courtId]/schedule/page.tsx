export const runtime = "edge";

function first(sp: any, fallback: string) {
  return Array.isArray(sp) ? (sp[0] ?? fallback) : (sp ?? fallback);
}

export default function SchedulePage({
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
            /* Deep slate theme */
            --slate: rgba(15, 23, 42, 0.92);
            --slateInk: rgba(255, 255, 255, 0.96);
            --slateBorder: rgba(255, 255, 255, 0.12);
            --slateLabel: rgba(255, 255, 255, 0.70);
            --slateSubtle: rgba(255, 255, 255, 0.50);

            /* Live indicator */
            --liveRed: rgba(239, 68, 68, 0.96);
            --liveGlow: 0 0 16px rgba(239, 68, 68, 0.6);

            --shadow: 0 12px 32px rgba(0,0,0,0.40);
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

          /* ===== SCHEDULE CARD ===== */
          .card {
            width: 820px;
            margin: 0 auto;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: var(--shadow);
            background: var(--slate);
            border: 1px solid var(--slateBorder);
            color: var(--slateInk);
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
            color: var(--slateInk);
          }

          .cardSubtitle {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateLabel);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Match list */
          .matchList {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .matchItem {
            padding: 14px 16px;
            border-radius: 6px;
            background: rgba(0,0,0,0.40);
            border: 1px solid rgba(255,255,255,0.10);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
          }

          .matchItem.live {
            border-color: rgba(239, 68, 68, 0.4);
            background: rgba(239, 68, 68, 0.08);
          }

          .matchPlayers {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .playerName {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            color: var(--slateInk);
          }

          .vsLabel {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateSubtle);
            letter-spacing: 0.4px;
          }

          .matchMeta {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .matchTime {
            font-size: 13px;
            font-weight: 800;
            color: var(--slateLabel);
            letter-spacing: 0.3px;
            white-space: nowrap;
          }

          .liveTag {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 3px;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          .liveDot {
            width: 6px;
            height: 6px;
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
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.6px;
            color: var(--liveRed);
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
                <div className="cardTitle">MATCH SCHEDULE</div>
                <div className="cardSubtitle" id="subtitle">—</div>
              </div>

              <div className="matchList" id="matchList">
                {/* Matches will be inserted here dynamically */}
              </div>

              <div className="empty hidden" id="empty">
                No matches scheduled
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

  const refreshMs = ${JSON.stringify(Math.max(1000, safeRefresh))};
  const API = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/data';

  const el = (id) => document.getElementById(id);

  function formatTime(isoString) {
    if (!isoString) return '—';
    try {
      return isoString.replace('T', ' ').slice(0, 16);
    } catch {
      return '—';
    }
  }

  async function tick(){
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();

      const match = data.match || null;
      const settings = (data.overlay && data.overlay.settings) ? data.overlay.settings : {};

      const matchList = el('matchList');
      const empty = el('empty');

      // Set header info
      el('subtitle').textContent = settings.subtitle || (data.courtName ? data.courtName : '—');

      // For now, we'll show the current match if available
      // In a real implementation, you'd fetch multiple matches from an endpoint
      if (!match) {
        matchList.innerHTML = '';
        matchList.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }

      matchList.classList.remove('hidden');
      empty.classList.add('hidden');

      const isLive = !!match.isLive;
      const swap = !!settings.swap;
      const p1 = match.player1;
      const p2 = match.player2;

      const left = swap ? p2 : p1;
      const right = swap ? p1 : p2;

      const nameLeft = (swap ? settings.name2 : settings.name1) || left?.name || 'Player 1';
      const nameRight = (swap ? settings.name1 : settings.name2) || right?.name || 'Player 2';

      const liveClass = isLive ? ' live' : '';
      const liveTag = isLive ? \`
        <div class="liveTag">
          <div class="liveDot"></div>
          <div class="liveText">LIVE</div>
        </div>
      \` : '';

      const timeDisplay = match.scheduledStartTime ? formatTime(match.scheduledStartTime) : (isLive ? 'In Progress' : '—');

      matchList.innerHTML = \`
        <div class="matchItem\${liveClass}">
          <div class="matchPlayers">
            <span class="playerName">\${String(nameLeft).toUpperCase()}</span>
            <span class="vsLabel">VS</span>
            <span class="playerName">\${String(nameRight).toUpperCase()}</span>
          </div>
          <div class="matchMeta">
            <span class="matchTime">\${timeDisplay}</span>
            \${liveTag}
          </div>
        </div>
      \`;

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
