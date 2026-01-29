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

            /* Primary score capsule */
            --cap: rgba(15, 23, 42, 0.95);
            --capInk: rgba(255,255,255,0.96);

            /* Secondary pill (cool slate, softer contrast) */
            --pillBg: rgba(255,255,255,0.10);
            --pillBorder: rgba(255,255,255,0.14);
            --pillInk: rgba(255,255,255,0.78);

            /* Serve dots */
            --dotOff: rgba(255,255,255,0.28);
            --dotOn: rgba(255,255,255,0.92);

            --shadow: 0 12px 26px rgba(0,0,0,0.34);
          }

          html, body {
            margin:0;
            background: transparent;
            font-family: ${JSON.stringify(font)}, Inter, Arial, sans-serif;
          }

          .wrap {
            width: 100%;
            padding: 18px;
          }

          /* ===== SCORE BAR ===== */
          .bar {
            width: 820px;
            height: 38px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 170px 1fr;
            align-items: center;
            border-radius: 3px;
            overflow: hidden;
            box-shadow: var(--shadow);
            background: transparent;
          }

          .namePlate {
            height: 38px;
            display:flex;
            align-items:center;
            padding: 0 12px;
            background: var(--bg);
            color: var(--ink);
            font-weight: 900;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            font-size: 15px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            border: 1px solid var(--line);
            position: relative;
          }

          .namePlate.left {
            justify-content: flex-start;
            border-right: none;
          }

          .namePlate.right {
            justify-content: flex-end;
            border-left: none;
          }

          .jerseyLine {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 5px;
            box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4), 0 0 12px currentColor;
            opacity: 0.95;
          }

          .jerseyLine::before {
            content: '';
            position: absolute;
            top: -1px;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(255, 255, 255, 0.3);
          }

          .cap {
            height: 38px;
            background: var(--cap);
            color: var(--capInk);
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 10px;
            border-top: 1px solid rgba(255,255,255,0.07);
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          /* Primary score points (hero) */
          .pt{
            font-weight: 900;
            font-size: 19px;
            letter-spacing: 0.2px;
            min-width: 22px;
            text-align:center;
            color: var(--capInk);
          }

          /* Secondary games-won pill */
          .games{
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 6px;
            padding: 0 10px;
            height: 22px;
            border-radius: 3px;

            background: var(--pillBg);
            border: 1px solid var(--pillBorder);
            color: var(--pillInk);

            font-weight: 900;
            letter-spacing: 0.6px;
            font-size: 13px;
          }

          .dot{
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: var(--dotOff);
          }
          .dot.on { background: var(--dotOn); }

          /* Optional status line (hidden by default) */
          .status {
            width: 820px;
            margin: 6px auto 0;
            display:flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.78);
            text-shadow: 0 2px 10px rgba(0,0,0,0.65);
            user-select: none;
            opacity: 0.0; /* set to 1 to show */
          }

          /* Game/Match Ball Indicator */
          .ballStatus {
            width: 820px;
            margin: 6px auto 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .ballStatus.hidden {
            display: none;
          }

          .ballBadge {
            padding: 6px 18px;
            border-radius: 3px;
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid rgba(255, 255, 255, 0.95);
            color: rgba(255, 255, 255, 0.95);
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            box-shadow: var(--shadow);
            text-shadow: 0 2px 8px rgba(0,0,0,0.5);
          }

          /* Round Display */
          .roundDisplay {
            width: 820px;
            margin: 6px auto 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .roundDisplay.hidden {
            display: none;
          }

          .roundBadge {
            padding: 4px 14px;
            border-radius: 3px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.85);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          .hidden { display:none; }

          /* ===== SLATE (optional when not live) ===== */
          .slate {
            width: 820px;
            margin: 0 auto;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: var(--shadow);
            background: rgba(15, 23, 42, 0.84);
            border: 1px solid rgba(255,255,255,0.12);
            color: #fff;
          }

          .slateInner { padding: 14px 16px; }
          .slateTitle { 
            font-size: 20px; 
            font-weight: 900; 
            letter-spacing: 0.5px; 
            text-transform: uppercase;
            background: linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .slateSub { margin-top: 4px; opacity: 0.85; font-weight: 800; }
          .slateRow {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 6px;
            background: rgba(0,0,0,0.45);
            border: 1px solid rgba(255,255,255,0.10);
          }
          .slateLabel { font-size: 12px; font-weight: 900; opacity: 0.85; letter-spacing: 0.6px; text-transform: uppercase; }
          .slateNames { margin-top: 6px; font-size: 18px; font-weight: 900; display:flex; justify-content:space-between; gap: 10px; text-transform: uppercase; }
          .slateTime { margin-top: 6px; opacity: 0.8; font-weight: 800; }

          /* ===== Animations ===== */
          @keyframes flash {
            0% { filter: brightness(1); transform: scale(1); }
            35% { filter: brightness(1.45); transform: scale(1.02); }
            100% { filter: brightness(1); transform: scale(1); }
          }
          .flash { animation: flash 450ms ease-out; }

          @keyframes slideIn {
            0% { transform: translateY(18px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .slide { animation: slideIn 350ms ease-out; }
        `}</style>
      </head>

      <body>
        <div className="wrap">
          {/* SCOREBOARD BAR */}
          <div className="bar" id="bar">
            <div className="namePlate left">
              <span id="n1">—</span>
              <div className="jerseyLine" id="jersey1" style={{ background: "#1e3a8a" }}></div>
            </div>

            <div className="cap">
              <span className="pt" id="p1">
                0
              </span>

              <div className="games">
                <span className="dot" id="s1"></span>
                <span id="gmid">0–0</span>
                <span className="dot" id="s2"></span>
              </div>

              <span className="pt" id="p2">
                0
              </span>
            </div>

            <div className="namePlate right">
              <span id="n2">—</span>
              <div className="jerseyLine" id="jersey2" style={{ background: "#b91c1c" }}></div>
            </div>
          </div>

          {/* optional status line (currently hidden by CSS opacity) */}
          <div className="status" id="statusLine">
            <span id="st">LIVE</span>
            <span id="tm">00:00</span>
          </div>

          {/* Game/Match Ball Indicator */}
          <div className="ballStatus hidden" id="ballStatus">
            <div className="ballBadge" id="ballBadge">GAME BALL</div>
          </div>

          {/* Round Display */}
          <div className="roundDisplay hidden" id="roundDisplay">
            <div className="roundBadge" id="roundBadge">ROUND</div>
          </div>

          {/* SLATE */}
          <div className="slate hidden" id="slate">
            <div className="slateInner">
              <div className="slateTitle" id="tname">
                TOURNAMENT
              </div>
              <div className="slateSub" id="subtitle">
                —
              </div>

              <div className="slateRow">
                <div className="slateLabel">NEXT MATCH</div>
                <div className="slateNames">
                  <span id="nextL">—</span>
                  <span style={{ opacity: 0.75 }}>VS</span>
                  <span id="nextR">—</span>
                </div>
                <div className="slateTime" id="nextTime">
                  Starts: —
                </div>
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
      const program = data.program || null;
      const settings = (data.overlay && data.overlay.settings) ? data.overlay.settings : {};
      const event = (data.overlay && data.overlay.event) ? data.overlay.event : null;

      const viewMode = settings.viewMode || 'auto';
      const isLive = !!match?.isLive;

      const bar = el('bar');
      const slate = el('slate');

      const showScoreboard =
        viewMode === 'scoreboard' ||
        (viewMode === 'auto' && !!match && isLive);

      const showSlate =
        viewMode === 'slate' ||
        (viewMode === 'auto' && (!!match && !isLive));

      const hideAll = viewMode === 'hidden';

      if (hideAll) {
        bar.classList.add('hidden');
        slate.classList.add('hidden');
        return;
      }

      if (!match && viewMode === 'auto') {
        // Show default placeholder data instead of hiding
        bar.classList.remove('hidden');
        slate.classList.add('hidden');

        // Default placeholder names
        el('n1').textContent = 'PLAYER 1';
        el('n2').textContent = 'PLAYER 2';

        // Default jersey colors
        el('jersey1').style.background = '#1e3a8a';
        el('jersey2').style.background = '#b91c1c';

        // Default scores
        el('p1').textContent = '7';
        el('p2').textContent = '5';

        // Default games
        el('gmid').textContent = '1–0';

        // Default serve dots (left serving)
        el('s1').className = 'dot on';
        el('s2').className = 'dot';

        // Status
        el('st').textContent = 'PREVIEW MODE';
        el('tm').textContent = '00:00';

        // Hide ball status
        el('ballStatus').classList.add('hidden');

        // Show default round in preview mode (useful for Monrad/Swiss tournaments)
        el('roundBadge').textContent = 'ROUND 1';
        el('roundDisplay').classList.remove('hidden');
      } else if (showScoreboard) {
        bar.classList.remove('hidden');
        slate.classList.add('hidden');

        const p1 = match.player1;
        const p2 = match.player2;

        const swap = !!settings.swap;
        const left = swap ? p2 : p1;
        const right = swap ? p1 : p2;

        const nameLeft = (swap ? settings.name2 : settings.name1) || left.name || 'PLAYER 1';
        const nameRight = (swap ? settings.name1 : settings.name2) || right.name || 'PLAYER 2';

        el('n1').textContent = String(nameLeft).toUpperCase();
        el('n2').textContent = String(nameRight).toUpperCase();

        // Apply jersey colors with contrast enhancement
        const jerseyLeft = swap ? (settings.jerseyColor2 || '#b91c1c') : (settings.jerseyColor1 || '#1e3a8a');
        const jerseyRight = swap ? (settings.jerseyColor1 || '#1e3a8a') : (settings.jerseyColor2 || '#b91c1c');
        
        // Helper to calculate luminance and check if color is too similar to our system blue
        function getLuminance(hex) {
          const rgb = parseInt(hex.slice(1), 16);
          const r = ((rgb >> 16) & 0xff) / 255;
          const g = ((rgb >> 8) & 0xff) / 255;
          const b = (rgb & 0xff) / 255;
          const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
          return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        }
        
        function isSystemBlueLike(hex) {
          const systemBlue = '#1e3a8a';
          const systemRgb = parseInt(systemBlue.slice(1), 16);
          const colorRgb = parseInt(hex.slice(1), 16);
          
          const sR = (systemRgb >> 16) & 0xff;
          const sG = (systemRgb >> 8) & 0xff;
          const sB = systemRgb & 0xff;
          
          const cR = (colorRgb >> 16) & 0xff;
          const cG = (colorRgb >> 8) & 0xff;
          const cB = colorRgb & 0xff;
          
          // Calculate color distance
          const distance = Math.sqrt(
            Math.pow(sR - cR, 2) + 
            Math.pow(sG - cG, 2) + 
            Math.pow(sB - cB, 2)
          );
          
          return distance < 80; // Similar if distance is small
        }
        
        function enhanceJerseyColor(hex) {
          // If too similar to system blue, add white border/highlight
          if (isSystemBlueLike(hex)) {
            return 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, ' + hex + ' 50%, ' + hex + ' 100%)';
          }
          
          // If too dark, add brightness
          const lum = getLuminance(hex);
          if (lum < 0.1) {
            return 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, ' + hex + ' 60%, ' + hex + ' 100%)';
          }
          
          return hex;
        }
        
        el('jersey1').style.background = enhanceJerseyColor(jerseyLeft);
        el('jersey1').style.color = jerseyLeft;
        el('jersey2').style.background = enhanceJerseyColor(jerseyRight);
        el('jersey2').style.color = jerseyRight;

        // Points = current game points
        el('p1').textContent = String(left.points ?? 0);
        el('p2').textContent = String(right.points ?? 0);

        // Middle = games won
        const gL = left.games ?? 0;
        const gR = right.games ?? 0;
        el('gmid').textContent = String(gL) + '–' + String(gR);

        // Serve dots
        el('s1').className = 'dot' + (left.serving ? ' on' : '');
        el('s2').className = 'dot' + (right.serving ? ' on' : '');

        // Optional status line (currently hidden by CSS opacity)
        el('st').textContent = (match.status || (isLive ? 'LIVE' : 'NOT LIVE')).toUpperCase();
        el('tm').textContent = fmtTime(match.durationSeconds);

        // Game/Match Ball Detection
        const ballStatus = el('ballStatus');
        const ballBadge = el('ballBadge');
        
        const leftPoints = left.points ?? 0;
        const rightPoints = right.points ?? 0;
        const leftGames = left.games ?? 0;
        const rightGames = right.games ?? 0;
        
        // Determine if it's a game or match ball situation
        // Standard squash: first to 11 points (win by 2)
        const gameWinningPoint = 11;
        const winByMargin = 2;
        
        // Determine match format: best of 3, 5, or 7
        const bestOf = match.bestOf ?? 5; // default to best of 5
        const matchWinningGames = Math.ceil(bestOf / 2); // 2 for bo3, 3 for bo5, 4 for bo7
        
        let ballText = null;
        
        // Check if either player is at match ball (one game away from winning and at game point)
        const leftAtMatchBall = leftGames === matchWinningGames - 1 && 
          (leftPoints >= gameWinningPoint - 1 && leftPoints >= rightPoints + winByMargin - 1);
        const rightAtMatchBall = rightGames === matchWinningGames - 1 && 
          (rightPoints >= gameWinningPoint - 1 && rightPoints >= leftPoints + winByMargin - 1);
        
        // Check if either player is at game ball (not match ball but at game point)
        const leftAtGameBall = !leftAtMatchBall && 
          (leftPoints >= gameWinningPoint - 1 && leftPoints >= rightPoints + winByMargin - 1);
        const rightAtGameBall = !rightAtMatchBall && 
          (rightPoints >= gameWinningPoint - 1 && rightPoints >= leftPoints + winByMargin - 1);
        
        if (leftAtMatchBall || rightAtMatchBall) {
          ballText = 'MATCH BALL';
        } else if (leftAtGameBall || rightAtGameBall) {
          ballText = 'GAME BALL';
        }
        
        if (ballText && isLive) {
          ballBadge.textContent = ballText;
          ballStatus.classList.remove('hidden');
        } else {
          ballStatus.classList.add('hidden');
        }

        // Round Display
        const roundDisplay = el('roundDisplay');
        const roundBadge = el('roundBadge');
        
        // Get round info from program data
        const nowOnCourt = program && program.nowOnCourt ? program.nowOnCourt : null;
        const roundText = nowOnCourt && nowOnCourt.draw ? String(nowOnCourt.draw) : null;
        
        if (roundText && isLive) {
          roundBadge.textContent = roundText;
          roundDisplay.classList.remove('hidden');
        } else {
          roundDisplay.classList.add('hidden');
        }

      } else if (showSlate) {
        bar.classList.add('hidden');
        slate.classList.remove('hidden');

        el('tname').textContent = (settings.tournamentName || 'TOURNAMENT').toUpperCase();
        el('subtitle').textContent = settings.subtitle || (data.courtName ? String(data.courtName) : '—');

        const swap = !!settings.swap;
        const p1n = match?.player1?.name || 'PLAYER 1';
        const p2n = match?.player2?.name || 'PLAYER 2';

        const leftName = swap ? p2n : p1n;
        const rightName = swap ? p1n : p2n;

        const nameL = (swap ? settings.name2 : settings.name1) || leftName;
        const nameR = (swap ? settings.name1 : settings.name2) || rightName;

        el('nextL').textContent = String(nameL).toUpperCase();
        el('nextR').textContent = String(nameR).toUpperCase();

        const st = match?.scheduledStartTime;
        if (typeof st === 'string' && st) {
          const pretty = st.replace('T',' ').slice(0,16);
          el('nextTime').textContent = 'Starts: ' + pretty;
        } else {
          el('nextTime').textContent = 'Starts: —';
        }
      }

      // Animate whichever is visible (bar or slate)
      if (event && typeof event.at === 'number' && event.at > lastEventAt) {
        lastEventAt = event.at;

        const target = !bar.classList.contains('hidden') ? bar : (!slate.classList.contains('hidden') ? slate : null);
        if (!target) return;

        if (event.type === 'flash') {
          target.classList.remove('flash');
          void target.offsetWidth;
          target.classList.add('flash');
          setTimeout(() => target.classList.remove('flash'), 700);
        }

        if (event.type === 'slide') {
          target.classList.remove('slide');
          void target.offsetWidth;
          target.classList.add('slide');
          setTimeout(() => target.classList.remove('slide'), 900);
        }
      }

    } catch (e) {
      // Keep last known values on screen
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
