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

  // Defaults (can be overridden by query params, and also by Control settings)
  const defaultLeft = String(first(searchParams?.left, "#0b3aa6"));
  const defaultRight = String(first(searchParams?.right, "#c66a08"));

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
            --left: ${defaultLeft};
            --right: ${defaultRight};
            --logoOpacity: 0.75;
            --logoScale: 0.9;
          }

          html, body {
            margin:0;
            background: transparent;
            font-family: ${JSON.stringify(font)}, Inter, Arial, sans-serif;
          }

          .wrap { padding: 16px; width: 920px; }

          /* Shared container style */
          .card {
            width: 900px;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 14px 40px rgba(0,0,0,0.38);
            background: rgba(15, 23, 42, 0.92);
          }

          /* SCOREBOARD */
          .sb { }

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

          /* SLATE */
          .slateInner{
            padding: 18px;
          }
          .slateTitle{
            font-weight: 900;
            font-size: 28px;
            color: #fff;
            letter-spacing: 0.4px;
            text-transform: uppercase;
          }
          .slateSubtitle{
            margin-top: 6px;
            font-weight: 800;
            opacity: 0.85;
            color: #fff;
          }
          .nextBox{
            margin-top: 14px;
            padding: 14px;
            border-radius: 14px;
            background: rgba(0,0,0,0.55);
            border: 1px solid rgba(255,255,255,0.10);
          }
          .nextLabel{
            font-weight: 900;
            color: #fff;
            opacity: 0.85;
            font-size: 13px;
            letter-spacing: 0.6px;
          }
          .nextRow{
            margin-top: 6px;
            display:flex;
            justify-content:space-between;
            gap: 12px;
            color:#fff;
            font-weight: 900;
            font-size: 22px;
            text-transform: uppercase;
            align-items: center;
          }
          .vs{
            opacity: 0.7;
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1px;
          }
          .nextTime{
            margin-top: 8px;
            color: #fff;
            opacity: 0.75;
            font-weight: 800;
          }

          .hidden { display:none; }

          /* Not-live tint on scoreboard */
          .notlive .bottom{
            background: rgba(120, 10, 10, 0.62);
          }

          /* Centered SVG logo under everything */
          .logoWrap{
            width: 900px;
            display:flex;
            justify-content:center;
            margin-top: 10px;
            opacity: var(--logoOpacity);
            transform: scale(var(--logoScale));
            transform-origin: top center;
            pointer-events: none;
            filter: drop-shadow(0 10px 22px rgba(0,0,0,0.30));
          }

          /* Animation classes */
          @keyframes flash {
            0% { filter: brightness(1); transform: scale(1); }
            30% { filter: brightness(1.4); transform: scale(1.03); }
            100% { filter: brightness(1); transform: scale(1); }
          }
          .flash .center { animation: flash 450ms ease-out; }

          @keyframes slideIn {
            0% { transform: translateY(18px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .slide { animation: slideIn 350ms ease-out; }

        `}</style>
      </head>

      <body>
        <div className="wrap">
          {/* SCOREBOARD CARD */}
          <div className="card sb" id="box">
            <div className="top">
              <div className="team left">
                <span className="serveDot" id="s1"></span>
                <span id="n1">—</span>
              </div>

              <div className="center">
                <span className="score" id="p1">
                  0
                </span>
                <span className="divider"></span>
                <span className="score" id="p2">
                  0
                </span>
              </div>

              <div className="team right">
                <span id="n2">—</span>
                <span className="serveDot" id="s2"></span>
              </div>
            </div>

            <div className="bottom">
              <div>
                <span className="pill" id="game">
                  G1
                </span>
                <span className="muted" id="games">
                  {" "}
                  • Games 0–0
                </span>
              </div>
              <div>
                <span className="muted" id="status">
                  LIVE
                </span>
                <span className="muted" id="time">
                  {" "}
                  • 00:00
                </span>
              </div>
            </div>
          </div>

          {/* SLATE CARD */}
          <div className="card hidden" id="slate">
            <div className="slateInner">
              <div className="slateTitle" id="tname">
                TOURNAMENT
              </div>
              <div className="slateSubtitle" id="subtitle">
                —
              </div>

              <div className="nextBox">
                <div className="nextLabel">NEXT MATCH</div>
                <div className="nextRow">
                  <span id="nextL">—</span>
                  <span className="vs">VS</span>
                  <span id="nextR">—</span>
                </div>
                <div className="nextTime" id="nextTime">
                  Starts: —
                </div>
              </div>
            </div>
          </div>

          {/* LOGO UNDER EVERYTHING */}
          <div className="logoWrap" aria-hidden="true">
            {/* Your SVG */}
            <svg
              width="101"
              height="40"
              viewBox="0 0 101 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_278_6701)">
                <path
                  d="M76.6052 19.0984H71.6402V27.7625H68.8652V8.4032H71.6402V16.3112H76.6052V8.4032H79.3652V27.7625H76.6052V19.0984Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M2.16 26.5731C1.16 25.7213 0.5 24.2344 0.5 22.7677V21.4472H3.29V22.7425C3.29 23.4482 3.535 24.0631 3.99 24.4814C4.445 24.8846 5.065 25.0711 5.96 25.0711C6.855 25.0711 7.425 24.8745 7.93 24.4058C8.385 23.9623 8.645 23.297 8.645 22.5611C8.645 20.7718 7.1 20.0007 5.275 19.1993C2.24 17.8435 0.72 15.9333 0.72 13.4384C0.72 10.2732 2.86 8.1311 6.01 8.1311C9.16 8.1311 11.29 10.1976 11.29 13.2418V14.5472H8.5V13.2418C8.5 11.7802 7.565 10.9032 6.01 10.9032C4.455 10.9032 3.495 11.8709 3.495 13.4384C3.495 15.2025 5.05 15.9988 6.88 16.8002C9.86 18.1056 11.42 20.0813 11.42 22.5661C11.42 24.0278 10.835 25.5348 9.825 26.5126C8.88 27.3744 7.53 27.8583 5.96 27.8583C4.39 27.8583 3.08 27.3996 2.16 26.5781V26.5731Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M28.3905 26.0791C27.6005 25.071 27.1455 23.6195 27.1455 21.9865V8.3125H29.9205V21.9865C29.9205 22.5762 30.0105 23.1104 30.1555 23.5439C30.6605 24.693 31.2305 25.0862 32.4105 25.0862C33.2905 25.0862 33.8255 24.8392 34.2905 24.2898C34.6655 23.7656 34.8855 22.9441 34.8855 21.9915V8.3125H37.6455V21.9865C37.6455 23.6447 37.2055 25.1114 36.4255 26.064C35.4905 27.2282 34.0805 27.8532 32.4055 27.8532C30.7305 27.8532 29.2805 27.2131 28.3855 26.074L28.3905 26.0791Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M57.0955 26.573C56.0955 25.7212 55.4355 24.2343 55.4355 22.7677V21.4471H58.2255V22.7425C58.2255 23.4481 58.4705 24.063 58.9255 24.4813C59.3805 24.8845 60.0005 25.071 60.8955 25.071C61.7905 25.071 62.3605 24.8744 62.8655 24.4057C63.3205 23.9622 63.5805 23.2969 63.5805 22.561C63.5805 20.7717 62.0355 20.0006 60.2105 19.1992C57.1755 17.8384 55.6605 15.9332 55.6605 13.4333C55.6605 10.268 57.8005 8.12598 60.9505 8.12598C64.1005 8.12598 66.2305 10.1924 66.2305 13.2367V14.5421H63.4405V13.2367C63.4405 11.7751 62.5055 10.8981 60.9505 10.8981C59.3955 10.8981 58.4355 11.8658 58.4355 13.4333C58.4355 15.1973 59.9905 15.9937 61.8205 16.7951C64.8005 18.1005 66.3605 20.0762 66.3605 22.561C66.3605 24.0227 65.7755 25.5297 64.7655 26.5075C63.8205 27.3693 62.4705 27.8532 60.9005 27.8532C59.3305 27.8532 58.0205 27.3945 57.1005 26.573H57.0955Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M89.4846 22.4451H92.2447L92.2297 22.6416C92.2047 24.1436 91.6097 25.6103 90.6747 26.5125C89.6997 27.3895 88.3946 27.8582 86.8496 27.8582C85.1246 27.8582 83.6846 27.2433 82.7246 26.079C81.8696 25.0962 81.3896 23.5942 81.3896 21.8856V19.1034C81.3896 17.4049 81.8546 15.9281 82.6996 14.8949C83.6596 13.7558 85.1246 13.1157 86.8246 13.1157C88.5246 13.1157 89.9996 13.7558 90.9596 14.8949C91.8046 15.9533 92.2546 17.4301 92.2546 19.1034V21.8755H84.1646V21.8906C84.1646 22.3896 84.2146 22.8332 84.3096 23.186C84.8146 24.5821 85.5046 25.0962 86.8496 25.0962C87.7596 25.0962 88.3296 24.9147 88.7546 24.4813C89.2096 24.0226 89.4546 23.3725 89.4697 22.6366L89.4846 22.4551V22.4451ZM89.4996 19.0984C89.4996 18.04 89.2946 17.2688 88.8396 16.6942C88.3846 16.1197 87.7897 15.8828 86.8297 15.8828C85.8697 15.8828 85.2746 16.1297 84.8596 16.6942C84.3796 17.2688 84.1747 18.0551 84.1747 19.0984H89.5046H89.4996Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M100.5 13.2821V16.0794H97.97C97.205 16.0794 97.09 16.2508 97.09 17.4503V27.6718H94.29V13.2821H97.09V13.6198C97.235 13.2519 97.585 13.2821 97.84 13.2821H100.5Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M54.1197 24.078C53.9447 23.4732 53.7247 22.8986 53.5097 22.3442C53.3897 22.0267 53.2647 21.7041 53.1547 21.3866C52.9997 20.938 52.8547 20.4844 52.7097 20.0308C52.5697 19.5923 52.4297 19.1538 52.2797 18.7153L50.1697 12.5865C49.9697 12.0169 49.7797 11.4776 49.6297 10.9333C49.5847 10.772 49.5247 10.5603 49.4497 10.3386C49.3047 9.59765 48.8647 8.96259 48.2547 8.56442C47.8747 8.29225 47.3897 8.11584 46.7647 8.11584C46.1397 8.11584 45.6597 8.29729 45.2747 8.56442C44.6697 8.96259 44.2247 9.59765 44.0797 10.3386C43.9997 10.5654 43.9447 10.772 43.8997 10.9383C43.7497 11.4827 43.5597 12.022 43.3597 12.5966L41.2497 18.7204C41.0997 19.1588 40.9597 19.5973 40.8197 20.0409C40.6747 20.4945 40.5297 20.9431 40.3747 21.3916C40.2647 21.7142 40.1397 22.0317 40.0197 22.3493C39.8097 22.9037 39.5897 23.4783 39.4097 24.0831C39.2547 24.6073 39.1097 25.2423 39.2097 25.9379C39.2747 26.3814 39.4297 26.7645 39.6797 27.0769C40.0347 27.5154 40.5597 27.7977 41.1597 27.8632C41.2597 27.8733 41.3597 27.8783 41.4547 27.8783C42.4097 27.8783 43.1847 27.3894 43.6197 27.1122C44.5697 26.5074 45.6097 26.2252 46.6147 26.2806H46.9097C47.9147 26.2252 48.9547 26.5074 49.9097 27.1122C50.3447 27.3894 51.1147 27.8783 52.0747 27.8783C52.1697 27.8783 52.2697 27.8783 52.3697 27.8632C52.9697 27.7977 53.4947 27.5205 53.8497 27.0769C54.0947 26.7695 54.2547 26.3864 54.3197 25.9379C54.4197 25.2423 54.2747 24.6123 54.1197 24.0831V24.078Z"
                  fill="#F9FAFB"
                ></path>
                <path
                  d="M23.8849 9.68341C22.8049 8.56954 21.2499 8 19.2549 8C18.0949 8 17.0799 8.19657 16.2049 8.5645C16.1899 8.56954 16.1749 8.57962 16.1599 8.58466C15.9949 8.65522 15.8349 8.73082 15.6799 8.81651C14.8749 9.23484 14.2899 9.80438 13.8699 10.4495C12.9899 11.7045 12.5949 13.3829 12.7199 15.3788C12.7099 16.0693 12.7699 16.7699 12.9199 17.4654C13.0399 18.0299 13.2199 18.791 13.4599 19.6529C14.2949 22.9995 15.5099 25.3986 16.4849 26.9409C16.4899 26.9409 16.5099 26.9813 16.5149 26.9863C16.5449 27.0317 16.5699 27.077 16.5999 27.1274C16.6449 27.203 16.6849 27.2837 16.7299 27.3593C16.7899 27.4702 16.8449 27.576 16.8949 27.6869C16.9649 27.828 17.0299 27.9691 17.0949 28.1153C17.1699 28.2867 17.2449 28.4631 17.3149 28.6395C17.3999 28.8461 17.4749 29.0528 17.5499 29.2594C17.6349 29.4963 17.7199 29.7382 17.7949 29.9802C17.8799 30.2523 17.9649 30.5245 18.0399 30.8017C18.1249 31.1091 18.2049 31.4166 18.2799 31.724C18.3099 31.8501 18.3399 31.9811 18.3699 32.1121C18.5999 33.6141 18.1249 37.8982 17.9749 39.2037C17.9399 39.3549 17.9199 39.496 17.9299 39.5968C17.9299 39.5968 18.0499 40.0302 19.0599 39.9899C20.0649 40.0302 20.1899 39.5968 20.1899 39.5968C20.1899 39.5968 20.1899 39.5766 20.1849 39.5565C20.1849 39.4657 20.1699 39.3599 20.1449 39.2389C19.9949 37.9688 19.5149 33.6192 19.7449 32.1071C19.7449 32.092 19.7449 32.0819 19.7499 32.0718C19.7499 32.0718 19.7499 32.0617 19.7499 32.0567C19.7499 32.0567 19.7499 32.0466 19.7499 32.0315C19.8149 31.7341 19.8849 31.4418 19.9649 31.1495C20.0399 30.8622 20.1199 30.5799 20.2049 30.2977C20.2799 30.0457 20.3599 29.7937 20.4499 29.5467C20.5249 29.3249 20.6049 29.1082 20.6899 28.8915C20.7599 28.705 20.8349 28.5185 20.9149 28.332C20.9799 28.1758 21.0499 28.0246 21.1199 27.8683C21.1749 27.7423 21.2349 27.6214 21.2999 27.5004C21.3449 27.4097 21.3949 27.3189 21.4449 27.2282C21.4799 27.1677 21.5099 27.1073 21.5449 27.0468C21.5599 27.0165 21.5799 26.9863 21.5999 26.946C22.1999 26.0387 22.7499 25.0811 23.2249 24.063C23.3949 23.6951 23.5599 23.3171 23.7149 22.934C24.3049 21.5631 24.8299 19.9905 25.1849 18.2567C25.3949 17.3747 25.5749 16.4272 25.5949 15.4544C25.6599 12.8335 25.0999 10.9485 23.8799 9.68845L23.8849 9.68341Z"
                  fill="#F9FAFB"
                ></path>
              </g>
              <defs>
                <clipPath id="clip0_278_6701">
                  <rect width="100" height="32" fill="white" transform="translate(0.5 8)"></rect>
                </clipPath>
              </defs>
            </svg>
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

  function setVar(name, value){
    document.documentElement.style.setProperty(name, String(value));
  }

  function normalizeColor(v){
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    if (!s) return '';
    return s.startsWith('#') ? s : ('#' + s);
  }

  // Capture CSS defaults once (so clearing colors reverts properly)
  const DEFAULT_LEFT = getComputedStyle(document.documentElement).getPropertyValue('--left').trim();
  const DEFAULT_RIGHT = getComputedStyle(document.documentElement).getPropertyValue('--right').trim();

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

      const showScoreboard =
        viewMode === 'scoreboard' ||
        (viewMode === 'auto' && !!match && isLive);

      const showSlate =
        viewMode === 'slate' ||
        (viewMode === 'auto' && (!!match && !isLive));

      const hideAll = viewMode === 'hidden';

      const box = el('box');
      const slate = el('slate');

      if (hideAll) {
        box.classList.add('hidden');
        slate.classList.add('hidden');
        return;
      }

      // If we have no match at all (should be rare with your preview logic),
      // prefer slate in auto mode.
      if (!match && viewMode === 'auto') {
        box.classList.add('hidden');
        slate.classList.remove('hidden');
        el('tname').textContent = (settings.tournamentName || 'TOURNAMENT').toUpperCase();
        el('subtitle').textContent = settings.subtitle || (data.courtName ? ('Court: ' + data.courtName) : '—');
        el('nextL').textContent = '—';
        el('nextR').textContent = '—';
        el('nextTime').textContent = 'Starts: —';
        return;
      }

      // Apply theme vars from settings (with fallback to captured defaults)
      const leftColor = normalizeColor(settings.leftColor);
      const rightColor = normalizeColor(settings.rightColor);

      setVar('--left', leftColor || DEFAULT_LEFT);
      setVar('--right', rightColor || DEFAULT_RIGHT);

      if (typeof settings.logoOpacity === 'number') setVar('--logoOpacity', Math.max(0, Math.min(1, settings.logoOpacity)));
      if (typeof settings.logoScale === 'number') setVar('--logoScale', Math.max(0.4, Math.min(2, settings.logoScale)));

      if (showScoreboard) {
        box.classList.remove('hidden');
        slate.classList.add('hidden');

        const p1 = match.player1;
        const p2 = match.player2;

        const swap = !!settings.swap;
        const left = swap ? p2 : p1;
        const right = swap ? p1 : p2;

        // Name overrides (respect swap)
        const name1 = (swap ? settings.name2 : settings.name1) || left.name || 'PLAYER 1';
        const name2 = (swap ? settings.name1 : settings.name2) || right.name || 'PLAYER 2';

        el('n1').textContent = String(name1).toUpperCase();
        el('n2').textContent = String(name2).toUpperCase();

        // Big score: current game points
        el('p1').textContent = left.points ?? 0;
        el('p2').textContent = right.points ?? 0;

        // Footer: games + game number
        el('games').textContent = ' • Games ' + (left.games ?? 0) + '–' + (right.games ?? 0);
        el('game').textContent = 'G' + (match.gameNumber ?? 1);

        // Live/not-live indicator for scoreboard
        el('status').textContent = (match.status || (isLive ? 'LIVE' : 'NOT LIVE')).toUpperCase();
        if (!isLive) box.classList.add('notlive');
        else box.classList.remove('notlive');

        el('time').textContent = ' • ' + fmtTime(match.durationSeconds);

        // Serve dots
        el('s1').className = 'serveDot' + (left.serving ? ' on' : '');
        el('s2').className = 'serveDot' + (right.serving ? ' on' : '');

        // Consume one-shot event (flash/slide)
        if (event && typeof event.at === 'number' && event.at > lastEventAt) {
          lastEventAt = event.at;

          // Animate whichever card is currently visible
          const target = !box.classList.contains('hidden') ? box : (!slate.classList.contains('hidden') ? slate : null);
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


        return;
      }

      if (showSlate) {
        box.classList.add('hidden');
        slate.classList.remove('hidden');

        el('tname').textContent = (settings.tournamentName || 'TOURNAMENT').toUpperCase();
        el('subtitle').textContent = settings.subtitle || (data.courtName ? ('Court: ' + data.courtName) : '—');

        const p1n = match?.player1?.name || 'PLAYER 1';
        const p2n = match?.player2?.name || 'PLAYER 2';

        // Respect swap even in slate (so it matches your broadcast preference)
        const swap = !!settings.swap;
        const leftName = swap ? p2n : p1n;
        const rightName = swap ? p1n : p2n;

        const nameL = (swap ? settings.name2 : settings.name1) || leftName;
        const nameR = (swap ? settings.name1 : settings.name2) || rightName;

        el('nextL').textContent = String(nameL).toUpperCase();
        el('nextR').textContent = String(nameR).toUpperCase();

        const st = match?.scheduledStartTime;
        if (typeof st === 'string' && st) {
          // keep it simple (ISO -> "YYYY-MM-DD HH:MM")
          const pretty = st.replace('T',' ').slice(0,16);
          el('nextTime').textContent = 'Starts: ' + pretty;
        } else {
          el('nextTime').textContent = 'Starts: —';
        }

        return;
      }

      // fallback: if viewMode is weird, just hide both
      box.classList.add('hidden');
      slate.classList.add('hidden');

    } catch(e){
      // keep last values on screen; just flag status if scoreboard visible
      const box = el('box');
      if (!box.classList.contains('hidden')) {
        el('status').textContent = 'ERROR';
      }
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
