export const runtime = "edge";

type RankedInResponse = any;

function computeGames(detailed: any[] | undefined) {
  let g1 = 0,
    g2 = 0;
  if (!Array.isArray(detailed)) return { g1, g2 };
  for (const g of detailed) {
    const a = g?.firstParticipantScore;
    const b = g?.secondParticipantScore;
    if (typeof a !== "number" || typeof b !== "number") continue;
    if (a > b) g1++;
    else if (b > a) g2++;
  }
  return { g1, g2 };
}

function fullName(p: any) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
}

/**
 * Next.js 16 route handler typing:
 * - context.params can be a Promise (per the error you saw),
 * so we read it defensively via `await`.
 */
export async function GET(request: Request, context: any) {
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

  const res = await fetch(upstream, { cache: "no-store" });

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

  // No live match on court
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

  const points1 = live?.state?.score?.firstParticipantScore ?? 0;
  const points2 = live?.state?.score?.secondParticipantScore ?? 0;

  const { g1, g2 } = computeGames(live?.state?.score?.detailedResult);

  const isP1Serving = !!live?.state?.serve?.isFirstParticipantServing;

  const payload = {
    courtId: Number(courtId),
    courtName: raw?.details?.courtName ?? null,
    updatedAt: live?.state?.dateSent ?? new Date().toISOString(),
    match: {
      status: live?.state?.matchAction ?? "Live",
      tiebreak: !!live?.state?.score?.isTieBreak,
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
      // Allow Vercel/edge cache for 1s (reduces upstream load)
      "cache-control": "public, s-maxage=1, stale-while-revalidate=1",
      // Optional: allow external consumers
      "access-control-allow-origin": "*"
    }
  });
}
