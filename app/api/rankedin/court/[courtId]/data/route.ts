export const runtime = "nodejs";

type RankedInResponse = any;

function computeGames(detailed: any[] | undefined) {
  let g1 = 0,
    g2 = 0;

  if (!Array.isArray(detailed)) return { g1, g2, completed: 0 };

  for (const g of detailed) {
    const a = g?.firstParticipantScore;
    const b = g?.secondParticipantScore;
    if (typeof a !== "number" || typeof b !== "number") continue;

    // count finished games by higher score
    if (a > b) g1++;
    else if (b > a) g2++;
  }

  return { g1, g2, completed: detailed.length };
}

function fullName(p: any) {
  return [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ").trim();
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

  const upstream = `https://live.rankedin.com/api/v1/court/${encodeURIComponent(
    courtId
  )}/scoreboard`;

  const res = await fetch(upstream, {
    cache: "no-store",
    headers: {
      // helps with some WAF/proxy setups
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
  const detailed = score?.detailedResult as any[] | undefined;

  const { g1, g2, completed } = computeGames(detailed);

  const currentPoints1 = score?.firstParticipantScore ?? 0;
  const currentPoints2 = score?.secondParticipantScore ?? 0;

  // If there are completed games, current game number = completed + 1.
  // (Good enough for scoreboard overlay; can be refined later.)
  const gameNumber = Math.max(1, completed + 1);

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
        points: currentPoints1,
        serving: isP1Serving
      },
      player2: {
        name: fullName(p2) || "Player 2",
        games: g2,
        points: currentPoints2,
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
