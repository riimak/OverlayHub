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

// Squash game completion heuristic: to 11, win by 2 (can go beyond 11)
function isGameComplete(a: number, b: number) {
  const hi = Math.max(a, b);
  const diff = Math.abs(a - b);
  return hi >= 11 && diff >= 2;
}

/**
 * Games won = number of completed games won.
 * Works for BO3 or BO5 because it’s independent of match length.
 */
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

/**
 * Current game points:
 * RankedIn is inconsistent:
 * - Sometimes live points appear in detailedResult[0] (even if index=1)
 * - Sometimes live points appear in score.firstParticipantScore/secondParticipantScore
 * - Sometimes detailedResult includes finished games AND a current game snapshot as last entry
 *
 * Robust rule:
 * - If detailedResult exists: use the last entry as the "current game snapshot"
 * - Otherwise: use top-level score fields
 *
 * For the game number, use last.index if present; else fall back.
 */
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
    headers: {
      "user-agent": "OverlayHub/1.0 (+https://overlay-hub.vercel.app)"
    }
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
  const live = raw?.liveMatch;

  // Base response
  const basePayload: any = {
    courtId: Number(courtId),
    courtName: raw?.details?.courtName ?? null,
    updatedAt: new Date().toISOString(),
    match: null
  };

  // Read overlay settings & event from KV (always)
  // - settings: persistent config (swap, format, name overrides, colors...)
  // - event: one-shot animation trigger
  const [settings, event] = await Promise.all([
    kv.get(settingsKey(courtId)).catch(() => ({})),
    kv.get(eventKey(courtId)).catch(() => null)
  ]);

  // No live match
  if (!live?.base || !live?.state) {
    const payload = {
      ...basePayload,
      overlay: { settings: settings ?? {}, event: event ?? null }
    };

    // Clear event if present (one-shot)
    if (event) await kv.del(eventKey(courtId)).catch(() => {});

    return new Response(JSON.stringify(payload), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=1, stale-while-revalidate=1",
        "access-control-allow-origin": "*"
      }
    });
  }

  const p1 = live?.base?.firstParticipant?.[0];
  const p2 = live?.base?.secondParticipant?.[0];

  const score = live?.state?.score ?? {};
  const { g1, g2 } = computeGamesWon(score);
  const current = pickCurrentGame(score);

  const isP1Serving = !!live?.state?.serve?.isFirstParticipantServing;

  // Build match payload
  const payload: any = {
    courtId: Number(courtId),
    courtName: raw?.details?.courtName ?? null,
    updatedAt: live?.state?.dateSent ?? new Date().toISOString(),
    match: {
      status: live?.state?.matchAction ?? "Live",
      refereeAction: live?.state?.refereeAction ?? null,
      tiebreak: !!score?.isTieBreak,
      durationSeconds: live?.state?.totalDurationInSeconds ?? null,

      // Current game
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

    // Merge overlay meta
    overlay: {
      settings: settings ?? {},
      event: event ?? null
    }
  };

  // Clear event after reading (one-shot animation trigger)
  if (event) await kv.del(eventKey(courtId)).catch(() => {});

  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, s-maxage=1, stale-while-revalidate=1",
      "access-control-allow-origin": "*"
    }
  });
}
