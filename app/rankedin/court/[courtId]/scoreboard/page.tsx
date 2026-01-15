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
            --bg: rgba(247, 241, 225, 0.92);      /* name plate */
            --bg2: rgba(240, 232, 210, 0.88);     /* subtle */
            --ink: rgba(18, 18, 18, 0.95);
            --muted: rgba(18, 18, 18, 0.70);
            --line: rgba(18, 18, 18, 0.18);
            --cap: rgba(16, 16, 16, 0.92);        /* score capsule */
            --capInk: rgba(255,255,255,0.96);
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

          /* ===== SCORE BAR (matches your photo) ===== */
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
          }

          .namePlate.left {
            justify-content: flex-start;
            border-right: none;
          }

          .namePlate.right {
            justify-content: flex-end;
            border-left: none;
          }

          .cap {
            height: 38px;
            background: var(--cap);
            color: var(--capInk);
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 10px;
            border-top: 1px solid rgba(255,255,255,0.08);
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }

          .pt {
            font-weight: 900;
            font-size: 18px;
            min-width: 22px;
            text-align:center;
          }

          .games {
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 6px;
            padding: 0 10px;
            height: 22px;
            border-radius: 2px;
            background: rgba(255,255,255,0.10);
            border: 1px solid rgba(255,255,255,0.12);
            font-weight: 900;
            letter-spacing: 0.6px;
            font-size: 13px;
          }

          .dot {
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: rgba(255,255,255,0.35);
          }
          .dot.on { background: rgba(255,255,255,0.95); }

          /* Status / not-live tiny hint (optional) */
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
            opacity: 0.0; /* default hidden; set to 1 if you want it visible */
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
          .slateTitle { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
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
            </div>
          </div>

          {/* optional status line (currently hidden by CSS opacity) */}
          <div className="status" id="statusLine">
            <span id="st">LIVE</span>
            <span id="tm">00:00</span>
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
        // nothing to show -> slate placeholder
        bar.classList.add('hidden');
        slate.classList.remove('hidden');
        el('tname').textContent = (settings.tournamentName || 'TOURNAMENT').toUpperCase();
        el('subtitle').textContent = settings.subtitle || (data.courtName ? ('Court: ' + data.courtName) : '—');
        el('nextL').textContent = '—';
        el('nextR').textContent = '—';
        el('nextTime').textContent = 'Starts: —';
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

        // Points = current game points
        el('p1').textContent = String(left.points ?? 0);
        el('p2').textContent = String(right.points ?? 0);

        // Middle = games won (like your photo: 1-2)
        const gL = left.games ?? 0;
        const gR = right.games ?? 0;
        el('gmid').textContent = String(gL) + '–' + String(gR);

        // Serve dots (optional)
        el('s1').className = 'dot' + (left.serving ? ' on' : '');
        el('s2').className = 'dot' + (right.serving ? ' on' : '');

        // Optional status line (currently hidden by CSS opacity)
        el('st').textContent = (match.status || (isLive ? 'LIVE' : 'NOT LIVE')).toUpperCase();
        el('tm').textContent = fmtTime(match.durationSeconds);

      } else if (showSlate) {
        bar.classList.add('hidden');
        slate.classList.remove('hidden');

        el('tname').textContent = (settings.tournamentName || 'TOURNAMENT').toUpperCase();
        el('subtitle').textContent = settings.subtitle || (data.courtName ? ('Court: ' + data.courtName) : '—');

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
