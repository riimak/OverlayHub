export const runtime = "edge";

export default function ScoreboardPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const refreshRaw = searchParams?.refresh;
  const refreshMs = Number(
    Array.isArray(refreshRaw) ? refreshRaw[0] : refreshRaw ?? 1000
  );
  const safeRefresh = Number.isFinite(refreshMs) ? refreshMs : 1000;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          html, body { margin:0; background: transparent; font-family: Inter, Arial, sans-serif; }

          .wrap { padding: 16px; }

          /* Bar container */
          .sb {
            width: 820px;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 12px 34px rgba(0,0,0,0.35);
          }

          .top {
            display: grid;
            grid-template-columns: 1fr 120px 1fr;
            align-items: stretch;
            height: 64px;
          }

          .team {
            display:flex;
            align-items:center;
            gap: 12px;
            padding: 0 16px;
            color: #fff;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            font-size: 22px;
            overflow:hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .left { background: #0b3aa6; justify-content:flex-start; }
          .right { background: #c66a08; justify-content:flex-end; }

          .center {
            background: #111;
            display:flex;
            align-items:center;
            justify-content:center;
            gap: 14px;
            color: #fff;
          }

          .score {
            font-size: 42px;
            font-weight: 900;
            line-height: 1;
            min-width: 28px;
            text-align:center;
          }

          .divider {
            width: 2px;
            height: 38px;
            background: rgba(255,255,255,0.22);
          }

          .serveDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #fff;
            opacity: 0.25;
          }
          .serveDot.on { opacity: 1; }

          .bottom {
            display:flex;
            justify-content: space-between;
            align-items:center;
            height: 30px;
            background: rgba(0,0,0,0.85);
            color: rgba(255,255,255,0.92);
            padding: 0 14px;
            font-size: 14px;
            font-weight: 700;
          }

          .pill {
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.10);
            font-weight: 800;
          }

          .muted { opacity: 0.8; font-weight: 700; }

          .hidden { display:none; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="sb" id="box">
            <div className="top">
              <div className="team left">
                <span className="serveDot" id="s1"></span>
                <span id="n1">—</span>
              </div>

              <div className="center">
                <span className="score" id="g1">0</span>
                <span className="divider"></span>
                <span className="score" id="g2">0</span>
              </div>

              <div className="team right">
                <span id="n2">—</span>
                <span className="serveDot" id="s2"></span>
              </div>
            </div>

            <div className="bottom">
              <div>
                <span className="pill" id="game">G1</span>
                <span className="muted" id="points"> • Pts 0–0</span>
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

  const refreshMs = ${JSON.stringify(safeRefresh)};
  const API = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/data';

  const el = (id) => document.getElementById(id);

  function fmtTime(sec){
    if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

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

      // BIG SCORE = GAMES (like your sample image)
      el('g1').textContent = data.match.player1.games ?? 0;
      el('g2').textContent = data.match.player2.games ?? 0;

      // Small info row = current points
      el('points').textContent = ' • Pts ' + (data.match.player1.points ?? 0) + '–' + (data.match.player2.points ?? 0);

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
  setInterval(tick, Math.max(250, refreshMs));
})();
            `
          }}
        />
      </body>
    </html>
  );
}
