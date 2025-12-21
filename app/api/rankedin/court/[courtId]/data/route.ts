export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";

const RANKEDIN_BASE = "https://live.rankedin.com/api/v1";

const settingsKey = (courtId: string) => `overlay:rankedin:court:${courtId}:settings`;
const eventKey = (courtId: string) => `overlay:rankedin:court:${courtId}:event`;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function nameFromParticipants(p: any) {
  const arr = Array.isArray(p) ? p : [];
  const one = arr[0] ?? null;
  if (!one) return "—";
  const first = one.firstName ?? "";
  const last = one.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || "—";
}

function fmtStatus(matchAction?: string) {
  const a = String(matchAction || "").toLowerCase();
  if (a === "play") return "LIVE";
  if (a === "pause") return "PAUSE";
  if (a) return a.toUpperCase();
  return "NOT LIVE";
}

/**
 * We expose a stable shape for the overlay:
 * {
 *   courtId, courtName,
 *   match: {
 *     isLive, status, durationSeconds, scheduledStartTime,
 *     gameNumber,
 *     player1: { name, points, games, serving },
 *     player2: { name, points, games, serving }
 *   },
 *   overlay: { settings, event }
 * }
 */
export async function GET(_req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");

  if (!courtId) return json({ error: "Missing courtId" }, 400);

  // 1) Pull RankedIn data
  const upstreamUrl = `${RANKEDIN_BASE}/court/${encodeURIComponent(courtId)}/scoreboard`;

  let upstream: any = null;
  try {
    const r = await fetch(upstreamUrl, { cache: "no-store" });
    if (!r.ok) {
      return json({ error: `Upstream HTTP ${r.status}` }, 502);
    }
    upstream = await r.json();
  } catch (e: any) {
    return json({ error: "Upstream fetch failed" }, 502);
  }

  const courtName = upstream?.details?.courtName ?? null;

  // 2) Load overlay settings + one-shot event from KV (and delete event)
  const [settings, event] = await Promise.all([
    kv.get(settingsKey(courtId)).catch(() => ({})),
    kv.get(eventKey(courtId)).catch(() => null)
  ]);

  if (event) {
    await kv.del(eventKey(courtId)).catch(() => {});
  }

  // 3) Normalize match shape
  const liveMatch = upstream?.liveMatch ?? null;

  // If there is a live match -> use it
  if (liveMatch?.state) {
    const base = liveMatch.base ?? {};
    const state = liveMatch.state ?? {};
    const score = state.score ?? {};

    const detailed: any[] = Array.isArray(score.detailedResult) ? score.detailedResult : [];

    // Current game number:
    // score.index seems to represent game index, but detailedResult contains array of games with index too.
    const gameNumber = Number(score.index || (detailed[detailed.length - 1]?.index ?? 1)) || 1;

    // Points: show CURRENT GAME points.
    // In RankedIn examples you posted, current points live in detailedResult[gameNumber-1]
    const currentGame = detailed.find((g) => Number(g.index) === gameNumber) ?? detailed[detailed.length - 1] ?? null;

    const p1Points = currentGame ? Number(currentGame.firstParticipantScore ?? 0) : 0;
    const p2Points = currentGame ? Number(currentGame.secondParticipantScore ?? 0) : 0;

    // Games: use firstParticipantScore / secondParticipantScore (games won)
    const p1Games = Number(score.firstParticipantScore ?? 0);
    const p2Games = Number(score.secondParticipantScore ?? 0);

    const isFirstServing = !!state?.serve?.isFirstParticipantServing;

    const match = {
      isLive: String(state.matchAction || "").toLowerCase() === "play",
      status: fmtStatus(state.matchAction),
      durationSeconds: Number(state.totalDurationInSeconds ?? 0),
      scheduledStartTime: null as string | null,
      gameNumber,

      player1: {
        name: nameFromParticipants(base.firstParticipant),
        points: p1Points,
        games: p1Games,
        serving: isFirstServing
      },
      player2: {
        name: nameFromParticipants(base.secondParticipant),
        points: p2Points,
        games: p2Games,
        serving: !isFirstServing
      }
    };

    return json({
      courtId,
      courtName,
      match,
      overlay: {
        settings: settings ?? {},
        event: event ?? null
      }
    });
  }

  // 4) No live match: use nextMatch (for slate/testing)
  const nextMatch = upstream?.nextMatch ?? null;

  if (nextMatch) {
    const match = {
      isLive: false,
      status: "NOT LIVE",
      durationSeconds: 0,
      scheduledStartTime: typeof nextMatch.startTime === "string" ? nextMatch.startTime : null,
      gameNumber: 1,

      player1: {
        name: nameFromParticipants(nextMatch.firstParticipant),
        points: 0,
        games: 0,
        serving: false
      },
      player2: {
        name: nameFromParticipants(nextMatch.secondParticipant),
        points: 0,
        games: 0,
        serving: false
      }
    };

    return json({
      courtId,
      courtName,
      match,
      overlay: {
        settings: settings ?? {},
        event: event ?? null
      }
    });
  }

  // 5) Nothing at all
  return json({
    courtId,
    courtName,
    match: null,
    overlay: {
      settings: settings ?? {},
      event: event ?? null
    }
  });
}
