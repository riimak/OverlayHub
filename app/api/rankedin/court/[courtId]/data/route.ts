export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { kv } from "../../../../../lib/kv";

const RANKEDIN_LIVE_BASE = "https://live.rankedin.com/api/v1";

const settingsKey = (courtId: string) => `overlay:rankedin:court:${courtId}:settings`;
const eventKey = (courtId: string) => `overlay:rankedin:court:${courtId}:event`;

type OverlaySettings = {
  // existing
  swap?: boolean;
  name1?: string | null;
  name2?: string | null;
  leftColor?: string | null;
  rightColor?: string | null;
  jerseyColor1?: string | null;
  jerseyColor2?: string | null;
  logoOpacity?: number | null;
  logoScale?: number | null;
  viewMode?: "auto" | "scoreboard" | "slate" | "hidden";
  tournamentName?: string | null;
  tournamentDate?: string | null;
  tournamentVenue?: string | null;
  subtitle?: string | null;

  // tournament programming
  tournamentId?: string | null;
  tournamentLang?: string | null;
  tournamentCourtName?: string | null;
  pinnedNowMatchId?: string | number | null;
  pinnedNextMatchId?: string | number | null;
};

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

function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function countryFromParticipants(p: any) {
  const arr = Array.isArray(p) ? p : [];
  const one = arr[0] ?? null;
  if (!one) return null;
  return one.countryCode ?? null;
}

function fmtStatus(matchAction?: string) {
  const a = String(matchAction || "").toLowerCase();
  if (a === "play") return "LIVE";
  if (a === "pause") return "PAUSE";
  if (a) return a.toUpperCase();
  return "NOT LIVE";
}

// Pick the "current game" row
function pickCurrentGameRow(detailed: any[]) {
  const rows = Array.isArray(detailed) ? detailed : [];
  if (!rows.length) return null;

  const sorted = rows
    .map((g) => ({
      index: safeNum(g.index, 0),
      p1: safeNum(g.firstParticipantScore, 0),
      p2: safeNum(g.secondParticipantScore, 0)
    }))
    .sort((a, b) => a.index - b.index);

  const last = sorted[sorted.length - 1];
  if (last && last.p1 === 0 && last.p2 === 0) return last;
  return last;
}

// Normalize tournament match into a simple card
function normalizeTournamentMatch(m: any) {
  const challenger = m?.Challenger ?? {};
  const challenged = m?.Challenged ?? {};

  return {
    id: safeNum(m?.Id, 0),
    date: typeof m?.Date === "string" ? m.Date : null,
    court: typeof m?.Court === "string" ? m.Court : null,
    className: typeof m?.TournamentClassName === "string" ? m.TournamentClassName : null,
    draw: typeof m?.Draw === "string" ? m.Draw : null,

    player1: { name: challenger?.Name ?? "—", country: challenger?.CountryShort ?? null },
    player2: { name: challenged?.Name ?? "—", country: challenged?.CountryShort ?? null },

    result: m?.MatchResult?.Score
      ? {
          games1: safeNum(m.MatchResult.Score.FirstParticipantScore, 0),
          games2: safeNum(m.MatchResult.Score.SecondParticipantScore, 0),
          detailed: Array.isArray(m.MatchResult.Score.DetailedScoring)
            ? m.MatchResult.Score.DetailedScoring.map((g: any) => ({
                p1: safeNum(g?.FirstParticipantScore, 0),
                p2: safeNum(g?.SecondParticipantScore, 0),
                winner1: !!g?.IsFirstParticipantWinner
              }))
            : []
        }
      : null,

    isFinished: !!m?.MatchResult?.IsPlayed || safeNum(m?.State, 0) === 6,
    isScheduled: !!m?.IsMatchScheduled
  };
}

function deriveProgramFromTournament(matches: any[], courtName: string, nowTs: number) {
  const forCourt = matches
    .filter((m) => (m?.Court ?? "") === courtName)
    .map(normalizeTournamentMatch)
    .filter((m) => m.id > 0)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const upcoming = forCourt.filter((m) => !m.isFinished);
  const finished = forCourt.filter((m) => m.isFinished);

  const pastOrNowUpcoming = upcoming.filter((m) => {
    const t = m.date ? Date.parse(m.date) : NaN;
    return Number.isFinite(t) ? t <= nowTs : false;
  });

  const nowMatch =
    (pastOrNowUpcoming.length ? pastOrNowUpcoming[pastOrNowUpcoming.length - 1] : null) ??
    (upcoming[0] ?? null) ??
    null;

  let nextMatch: any = null;
  if (nowMatch) {
    const idx = upcoming.findIndex((m) => m.id === nowMatch.id);
    nextMatch = idx >= 0 ? upcoming[idx + 1] ?? null : upcoming[0] ?? null;
  } else {
    nextMatch = upcoming[0] ?? null;
  }

  const schedule: any[] = [];
  if (nowMatch) schedule.push(nowMatch);

  for (const m of upcoming) {
    if (schedule.length >= 12) break;
    if (nowMatch && m.id === nowMatch.id) continue;
    schedule.push(m);
  }

  while (schedule.length < 12 && finished.length) {
    const candidate = finished[finished.length - (schedule.length + 1)];
    if (!candidate) break;
    schedule.push(candidate);
  }

  return { courtName, nowOnCourt: nowMatch, nextOnCourt: nextMatch, schedule };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ courtId: string }> }
) {
  const { courtId } = await context.params;
  const courtIdStr = String(courtId ?? "").trim();
  if (!courtIdStr) return json({ error: "Missing courtId" }, 400);

  const upstreamUrl = `${RANKEDIN_LIVE_BASE}/court/${encodeURIComponent(courtIdStr)}/scoreboard`;

  let upstream: any = null;
  try {
    const r = await fetch(upstreamUrl, { cache: "no-store" });
    if (!r.ok) return json({ error: `Upstream HTTP ${r.status}` }, 502);
    upstream = await r.json();
  } catch {
    return json({ error: "Upstream fetch failed" }, 502);
  }

  const courtNameLive = upstream?.details?.courtName ?? null;

  // IMPORTANT: cast kv payload away from unknown
  const [settingsRaw, event] = await Promise.all([
    kv.get(settingsKey(courtIdStr)).catch(() => ({})),
    kv.get(eventKey(courtIdStr)).catch(() => null)
  ]);

  const settings: OverlaySettings = (settingsRaw as any) ?? {};
  if (event) await kv.del(eventKey(courtIdStr)).catch(() => {});

  // Tournament programming (from settings)
  const tournamentId = settings.tournamentId ? String(settings.tournamentId) : null;
  const tournamentCourtName = settings.tournamentCourtName ? String(settings.tournamentCourtName) : null;
  const tournamentLang = settings.tournamentLang ? String(settings.tournamentLang) : "en";

  const pinnedNowMatchId = settings.pinnedNowMatchId ? safeNum(settings.pinnedNowMatchId, 0) : 0;
  const pinnedNextMatchId = settings.pinnedNextMatchId ? safeNum(settings.pinnedNextMatchId, 0) : 0;

  let program: any = null;

  if (tournamentId && tournamentCourtName) {
    try {
      const proxyUrl = new URL(req.url);
      proxyUrl.pathname = `/api/rankedin/tournament/${encodeURIComponent(tournamentId)}/matches`;
      proxyUrl.search = `?lang=${encodeURIComponent(tournamentLang)}&readonly=true`;

      const r = await fetch(proxyUrl.toString(), { cache: "no-store" });
      if (r.ok) {
        const t = await r.json();
        const matches = Array.isArray(t?.Matches) ? t.Matches : [];
        const derived = deriveProgramFromTournament(matches, tournamentCourtName, Date.now());

        if (pinnedNowMatchId) {
          const pinned = matches.map(normalizeTournamentMatch).find((m: any) => m.id === pinnedNowMatchId);
          if (pinned) derived.nowOnCourt = pinned;
        }
        if (pinnedNextMatchId) {
          const pinned = matches.map(normalizeTournamentMatch).find((m: any) => m.id === pinnedNextMatchId);
          if (pinned) derived.nextOnCourt = pinned;
        }

        program = { tournamentId, courtName: tournamentCourtName, lang: tournamentLang, ...derived };
      }
    } catch {
      // ignore
    }
  }

  const liveMatch = upstream?.liveMatch ?? null;

  if (liveMatch?.state) {
    const base = liveMatch.base ?? {};
    const state = liveMatch.state ?? {};
    const score = state.score ?? {};

    const detailed: any[] = Array.isArray(score.detailedResult) ? score.detailedResult : [];
    const current = pickCurrentGameRow(detailed);

    const p1Points = current ? safeNum(current.p1, 0) : 0;
    const p2Points = current ? safeNum(current.p2, 0) : 0;

    const p1Games = safeNum(score.firstParticipantScore, 0);
    const p2Games = safeNum(score.secondParticipantScore, 0);

    const isFirstServing = !!state?.serve?.isFirstParticipantServing;

    const gameScores = detailed
      .map((g) => ({
        index: safeNum(g.index, 0),
        p1: safeNum(g.firstParticipantScore, 0),
        p2: safeNum(g.secondParticipantScore, 0)
      }))
      .sort((a, b) => a.index - b.index);

    // Infer match format from the number of games configured (3, 5, or 7)
    // Default to 5 if cannot be determined
    const bestOf = base.matchConfigurationId ? safeNum(base.matchConfigurationId, 5) : 
                   (gameScores.length >= 5 ? 7 : gameScores.length >= 3 ? 5 : 3);

    const match = {
      isLive: String(state.matchAction || "").toLowerCase() === "play",
      status: fmtStatus(state.matchAction),
      durationSeconds: safeNum(state.totalDurationInSeconds, 0),
      scheduledStartTime: null as string | null,
      gameNumber: current?.index ?? 1,
      bestOf,

      player1: {
        name: nameFromParticipants(base.firstParticipant),
        country: countryFromParticipants(base.firstParticipant),
        points: p1Points,
        games: p1Games,
        serving: isFirstServing
      },
      player2: {
        name: nameFromParticipants(base.secondParticipant),
        country: countryFromParticipants(base.secondParticipant),
        points: p2Points,
        games: p2Games,
        serving: !isFirstServing
      },

      gameScores
    };

    return json({
      courtId: courtIdStr,
      courtName: courtNameLive,
      match,
      program,
      overlay: { settings, event: event ?? null }
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
        country: countryFromParticipants(nextMatch.firstParticipant),
        points: 0,
        games: 0,
        serving: false
      },
      player2: {
        name: nameFromParticipants(nextMatch.secondParticipant),
        country: countryFromParticipants(nextMatch.secondParticipant),
        points: 0,
        games: 0,
        serving: false
      },

      gameScores: []
    };

    return json({
      courtId: courtIdStr,
      courtName: courtNameLive,
      match,
      program,
      overlay: { settings, event: event ?? null }
    });
  }

  return json({
    courtId: courtIdStr,
    courtName: courtNameLive,
    match: null,
    program,
    overlay: { settings, event: event ?? null }
  });
}
