export default function ScoreboardPage({
  params,
  searchParams
}: {
  params: { courtId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const courtId = params.courtId;

  const scaleRaw = searchParams?.scale;
  const refreshRaw = searchParams?.refresh;

  const scale = Number(Array.isArray(scaleRaw) ? scaleRaw[0] : scaleRaw ?? 1);
  const refreshMs = Number(
    Array.isArray(refreshRaw) ? refreshRaw[0] : refreshRaw ?? 1000
  );

  const safeScale = Number.isFinite(scale) ? scale : 1;
  const safeRefresh = Number.isFinite(refreshMs) ? refreshMs : 1000;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          html, body { margin:0; background: transparent; font-family: Inter, Arial, sans-serif; }
          .wrap { transform: scale(${safeScale}); transform-origin: top left; }
          .box {
            display:inline-block;
            padding: 14px 18px;
            border-radius: 16px;
            background: rgba(0,0,0,0.55);
            color: #fff;
            box-shadow: 0 8px 24px rgba(0,0,0,0.35);
            min-width: 520px;
          }
          .row { display:flex; justify-content:space-between; align-items:center; gap:16px; }
          .name { font-size: 22px; font-weight: 700; white-space: nowrap; overflow:hidden; text-overflow: ellipsis; max-width: 320px; }
          .scores { display:flex; gap:14px; align-items:center; }
          .pill { padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.12); font-size: 14px; }
          .points { font-size: 30px; font-weight: 800; letter-spacing: 0.5px; min-width: 34px; text-align:right; }
          .serve { width:10px; height:10px; border-radius: 50%; background: #fff; display:inline-block; opacity:0.15; }
          .serve.on { opacity: 1; }
          .muted { opacity: 0.7; font-size: 12px; margin-top: 8px; }
          .spacer { height: 10px; }
          .hidden { display:none; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="box" id="box">
            <div className="row">
              <div className="name" id="p1name">—</div>
              <div className="scores">
                <span className="pill">
                  Games <b id="p1games">0</b>
                </span>
                <span className="serve" id="p1serve"></span>
                <span className="points" id="p1pts">0</span>
              </div>
            </div>

            <div className="spacer"></div>

            <div className="row">
              <div className="name" id="p2name">—</div>
              <div className="scores">
                <span className="pill">
                  Games <b id="p2games">0</b>
                </span>
                <span className="serve" id="p2serve"></span>
                <span className="points" id="p2pts">0</span>
              </div>
            </div>

            <div className="muted" id="status">…</div>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  const courtId = ${JSON.stringify(courtId)};
  const refreshMs = ${JSON.stringify(safeRefresh)};
  const API = '/api/rankedin/court/' + encodeURIComponent(courtId) + '/data';

  const el = (id) => document.getElementById(id);

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

      el('p1name').textContent = data.match.player1.name;
      el('p2name').textContent = data.match.player2.name;

      el('p1games').textContent = data.match.player1.games;
      el('p2games').textContent = data.match.player2.games;

      el('p1pts').textContent = data.match.player1.points;
      el('p2pts').textContent = data.match.player2.points;

      el('p1serve').className = 'serve' + (data.match.player1.serving ? ' on' : '');
      el('p2serve').className = 'serve' + (data.match.player2.serving ? ' on' : '');

      const when = data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '';
      const court = data.courtName ? (data.courtName + ' • ') : '';
      const tb = data.match.tiebreak ? ' • TB' : '';
      el('status').textContent = court + (data.match.status || 'Live') + tb + (when ? (' • Updated: ' + when) : '');
    } catch(e){
      el('status').textContent = 'Greška: ' + e.message;
      // ne skrivamo box na grešku, da ostane zadnje poznato stanje (ako ga ima)
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
