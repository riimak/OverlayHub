export const runtime = "nodejs";

type RankedInResponse = any;

function fullName(p: any) {
  return [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ").trim();
}

function pickCurrentPoints(score: any) {
  const idx = score?.index; // current game number
  const dr = Array.isArray(score?.detailedResult) ? score.detailedResult : [];

  // If RankedIn stores live game score in detailedResult entry for current index, use it.
  const last = dr.length ? dr[dr.length - 1] : null;
  if (last && typeof idx === "number" && last.index === idx) {
    const a = last.firstParticipantScore;
    const b = last.secondParticipantScore;
    if (typeof a === "number" && typeof b === "number") return { a, b };
  }

  // Fallback to top-level score fields (some feeds use these)
  const a = score?.firstParticipantScore;
  const b = score?.secondParticipantScore;
  return {
    a: typeof a === "number" ? a : 0,
    b: typeof b === "number" ? b : 0
  };
}

function computeGamesWon(score: any) {
  const idx = score?.index;
  const dr = Array.isArray(score?.detailedResult) ? score.detailedResult : [];

  // Exclude current game entry (heuristic: same index as current score.index)
  const completed = dr.filter((g: any) => !(typeof idx === "number" && g?.index === idx));

  let g1 = 0, g2 = 0;
  for (const g of completed) {
    const a = g?.firstParticipantScore;
    const b = g?.secondParticipantScore;
    if (typeof a !== "number" || typeof b !== "number") continue;
    if (a > b) g1++;
    else if (b > a) g2++;
  }
  return { g1, g2 };
}

export async function GET(_request: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");

  if (!courtId) {
    return new Response(JSON.stringify({ error: "Missing courtId" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const upstream = `https://live.rankedin.com/api/v1/court/${encodeURIComponent(courtId)}/scoreboard`;

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

  if (!live?.base || !live?.state) {
    return new Response(
      JSON.stringify({
        courtId: Number(courtId),
        courtName: raw?.details?.courtName ?? null,
        updatedAt: new Date().toISOString(),
        match: null
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, s-maxage=1, stale-while-revalidate=1"
        }
      }
    );
  }

  const p1 = live?.base?.firstParticipant?.[0];
  const p2 = live?.base?.secondParticipant?.[0];

  const score = live?.state?.score ?? {};
  const { a: points1, b: points2 } = pickCurrentPoints(score);
  const { g1, g2 } = computeGamesWon(score);

  const gameNumber = typeof score?.index === "number" ? score.index : 1;
  const isP1Serving = !!live?.state?.serve?.isFirstParticipantServing;

  const payload = {
    courtId: Number(courtId),
    courtName: raw?.details?.courtName ?? null,
    updatedAt: live?.state?.dateSent ?? new Date().toISOString(),
    match: {
      status: live?.state?.matchAction ?? "Live",
      refereeAction: live?.state?.refereeAction ?? null,
      tiebreak: !!score?.isTieBreak,
      durationSeconds: live?.state?.totalDurationInSeconds ?? null,
      gameNumber,
      player1: {
        name: fullName(p1) || "Player 1",
        games: g1,
        points: points1,
        serving: isP1Serving
      },
      player2: {
        name: fullName(p2) || "Player 2",
        games: g2,
        points: points2,
        serving: !isP1Serving
      }
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
