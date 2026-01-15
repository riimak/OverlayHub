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

// Pick the "current game" row in a robust way
function pickCurrentGameRow(detailed: any[]) {
  const rows = Array.isArray(detailed) ? detailed : [];
  if (!rows.length) return null;

  // Sort by index just in case
  const sorted = rows
    .map((g) => ({
      index: Number(g.index ?? 0),
      p1: Number(g.firstParticipantScore ?? 0),
      p2: Number(g.secondParticipantScore ?? 0),
      raw: g
    }))
    .sort((a, b) => a.index - b.index);

  const last = sorted[sorted.length - 1];

  // If the last row is 0-0, that is typically the active "new game"
  if (last && last.p1 === 0 && last.p2 === 0) return last;

  // Otherwise, last row is the current one
  return last;
}

export async function GET(_req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");

  if (!courtId) return json({ error: "Missing courtId" }, 400);

  const upstreamUrl = `${RANKEDIN_BASE}/court/${encodeURIComponent(courtId)}/scoreboard`;

  let upstream: any = null;
  try {
    const r = await fetch(upstreamUrl, { cache: "no-store" });
    if (!r.ok) return json({ error: `Upstream HTTP ${r.status}` }, 502);
    upstream = await r.json();
  } catch {
    return json({ error: "Upstream fetch failed" }, 502);
  }

  const courtName = upstream?.details?.courtName ?? null;

  const [settings, event] = await Promise.all([
    kv.get(settingsKey(courtId)).catch(() => ({})),
    kv.get(eventKey(courtId)).catch(() => null)
  ]);

  if (event) await kv.del(eventKey(courtId)).catch(() => {});

  const liveMatch = upstream?.liveMatch ?? null;

  if (liveMatch?.state) {
    const base = liveMatch.base ?? {};
    const state = liveMatch.state ?? {};
    const score = state.score ?? {};

    const detailed: any[] = Array.isArray(score.detailedResult) ? score.detailedResult : [];
    const current = pickCurrentGameRow(detailed);

    const p1Points = current ? Number(current.p1) : 0;
    const p2Points = current ? Number(current.p2) : 0;

    // Games won (this is what RankedIn stores in firstParticipantScore/secondParticipantScore)
    const p1Games = Number(score.firstParticipantScore ?? 0);
    const p2Games = Number(score.secondParticipantScore ?? 0);

    const isFirstServing = !!state?.serve?.isFirstParticipantServing;

    // Optional: expose gameScores if you want per-game later
    const gameScores = detailed
      .map((g) => ({
        index: Number(g.index ?? 0),
        p1: Number(g.firstParticipantScore ?? 0),
        p2: Number(g.secondParticipantScore ?? 0)
      }))
      .sort((a, b) => a.index - b.index);

    const match = {
      isLive: String(state.matchAction || "").toLowerCase() === "play",
      status: fmtStatus(state.matchAction),
      durationSeconds: Number(state.totalDurationInSeconds ?? 0),
      scheduledStartTime: null as string | null,
      gameNumber: current?.index ?? 1,

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
      },

      gameScores
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
      },

      gameScores: []
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
