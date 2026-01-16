export const runtime = "nodejs";

import { NextRequest } from "next/server";

const RANKEDIN_TOURNAMENT_API =
  "https://api.rankedin.com/v1/tournament/GetMatchesSectionAsync";

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await context.params;
  const tournamentIdStr = String(tournamentId ?? "").trim();
  if (!tournamentIdStr) return json({ error: "Missing tournamentId" }, 400);

  const url = new URL(req.url);
  const LanguageCode = url.searchParams.get("lang") || "en";
  const IsReadonly = url.searchParams.get("readonly") || "true";

  const upstreamUrl =
    `${RANKEDIN_TOURNAMENT_API}` +
    `?Id=${encodeURIComponent(tournamentIdStr)}` +
    `&LanguageCode=${encodeURIComponent(LanguageCode)}` +
    `&IsReadonly=${encodeURIComponent(IsReadonly)}`;

  try {
    const r = await fetch(upstreamUrl, { cache: "no-store" });
    if (!r.ok) return json({ error: `Upstream HTTP ${r.status}` }, 502);
    const data = await r.json();
    return json(data);
  } catch {
    return json({ error: "Upstream fetch failed" }, 502);
  }
}
