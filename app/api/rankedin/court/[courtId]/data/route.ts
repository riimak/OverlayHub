export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";

type RankedInResponse = any;

function fullName(p: any) {
  return [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ").trim();
}

function safeNumber(x: any, fallback = 0) {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}

function getDetailed(score: any): any[] {
  return Array.isArray(score?.detailedResult) ? score.detailedResult : [];
}

// Squash completion heuristic: to 11, win by 2
function isGameComplete(a: number, b: number) {
  const hi = Math.max(a, b);
  const diff = Math.abs(a - b);
  return hi >= 11 && diff >= 2;
}

function computeGamesWon(score: any) {
  const dr = getDetailed(score);
  let g1 = 0,
    g2 = 0;

  for (const g of dr) {
    const a = safeNumber(g?.firstParticipantScore, -1);
    const b = safeNumber(g?.secondParticipantScore, -1);
    if (a < 0 || b < 0) continue;
    if (!isGameComplete(a, b)) continue;

    if (a > b) g1++;
    else if (b > a) g2++;
  }

  return { g1, g2 };
}

function pickCurrentGame(score: any) {
  const dr = getDetailed(score);

  if (dr.length) {
    const last = dr[dr.length - 1];
    const a = safeNumber(last?.firstParticipantScore, 0);
    const b = safeNumber(last?.secondParticipantScore, 0);
    const idx = safeNumber(last?.index, safeNumber(score?.index, dr.length || 1));
    return { a, b, idx, complete: isGameComplete(a, b), source: "detailed:last" as const };
  }

  const a = safeNumber(score?.firstParticipantScore, 0);
  const b = safeNumber(score?.secondParticipantScore, 0);
  const idx = safeNumber(score?.index, 1);
  return { a, b, idx, complete: isGameComplete(a, b), source: "top-level" as const };
}

const settingsKey = (courtId: string) => `overlay:rankedin:court:${courtId}:settings`;
const eventKey = (courtId: string) => `overlay:rankedin:court:${courtId}:event`;

export async function GET(_request: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");

  if (!courtId) {
    return new Response(JSON.stringify({ error: "Missing courtId" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const upstream = `https://live.rankedin.com/api/v1/court/${encodeURIComponent(
    courtId
  )}/scoreboard`;

  const res = await fetch(upstream, {
    cache: "no-store",
    headers: { "user-agent": "OverlayHub/1.0 (+https://overlay-hub.vercel.app)" }
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Upstream HTTP ${res.status}` }), {
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  const raw: RankedInResponse = await res.json();

  // KV (settings + one-shot event)
  const [settings, event] = await Promise.all([
    kv.get(settingsKey(courtId)).catch(() => ({})),
    kv.get(eventKey(courtId)).catch(() => null)
  ]);

  // Always clear event after read (one-shot)
  if (event) await kv.del(eventKey(courtId)).catch(() => {});

  const courtName = raw?.details?.courtName ?? null;

  // --- NEW: If not live, provide a "preview match" from nextMatch (or previousMatch)
  if (!raw?.liveMatch) {
    const candidate = raw?.nextMatch ?? raw?.previousMatch ?? null;

    const p1 = candidate?.firstParticipant?.[0] ?? null;
    const p2 = candidate?.secondParticipant?.[0] ?? null;

    const payload: any = {
      courtId: Number(courtId),
      courtName,
      updatedAt: new Date().toISOString(),
      match: {
        isLive: false,
        status: "NOT LIVE",
        gameNumber: 1,
        durationSeconds: 0,
        player1: {
          name: fullName(p1) || "Player 1",
          games: 0,
          points: 0,
          serving: false
        },
        player2: {
          name: fullName(p2) || "Player 2",
          games: 0,
          points: 0,
          serving: false
        },
        // extra info for the UI
        scheduledStartTime: candidate?.startTime ?? null,
        className: candidate?.className ?? null
      },
      overlay: {
        settings: settings ?? {},
        event: null
      }
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*"
      }
    });
  }

  // --- Live match case (existing behavior)
  const live = raw.liveMatch;
  const p1 = live?.base?.firstParticipant?.[0];
  const p2 = live?.base?.secondParticipant?.[0];

  const score = live?.state?.score ?? {};
  const { g1, g2 } = computeGamesWon(score);
  const current = pickCurrentGame(score);

  const isP1Serving = !!live?.state?.serve?.isFirstParticipantServing;

  const payload: any = {
    courtId: Number(courtId),
    courtName,
    updatedAt: live?.state?.dateSent ?? new Date().toISOString(),
    match: {
      isLive: true,
      status: live?.state?.matchAction ?? "Live",
      durationSeconds: live?.state?.totalDurationInSeconds ?? null,

      gameNumber: current.idx,
      gameComplete: current.complete,
      pointsSource: current.source,

      player1: {
        name: fullName(p1) || "Player 1",
        games: g1,
        points: current.a,
        serving: isP1Serving
      },
      player2: {
        name: fullName(p2) || "Player 2",
        games: g2,
        points: current.b,
        serving: !isP1Serving
      }
    },
    overlay: {
      settings: settings ?? {},
      event: null
    }
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, s-maxage=1, stale-while-revalidate=1",
      "access-control-allow-origin": "*"
    }
  });
}
