export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";

const key = (courtId: string) => `overlay:rankedin:court:${courtId}:settings`;

function clampNumber(v: any, min: number, max: number, fallback: number | null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(_req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");
  if (!courtId) return new Response("Missing courtId", { status: 400 });

  const settings = (await kv.get(key(courtId))) ?? {};
  return Response.json(settings, {
    headers: { "cache-control": "no-store" }
  });
}

export async function POST(req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");
  if (!courtId) return new Response("Missing courtId", { status: 400 });

  const body = await req.json().catch(() => ({}));

  const viewMode =
    body.viewMode === "auto" ||
    body.viewMode === "scoreboard" ||
    body.viewMode === "slate" ||
    body.viewMode === "hidden"
      ? body.viewMode
      : "auto";

  const tournamentLang =
    typeof body.tournamentLang === "string" && body.tournamentLang.trim()
      ? body.tournamentLang.trim()
      : "en";

  // allowlist fields
  const next = {
    // existing
    swap: !!body.swap,

    name1: typeof body.name1 === "string" && body.name1.trim() ? body.name1.trim() : null,
    name2: typeof body.name2 === "string" && body.name2.trim() ? body.name2.trim() : null,

    leftColor: typeof body.leftColor === "string" && body.leftColor.trim() ? body.leftColor.trim() : null,
    rightColor:
      typeof body.rightColor === "string" && body.rightColor.trim() ? body.rightColor.trim() : null,

    logoOpacity: clampNumber(body.logoOpacity, 0, 1, null),
    logoScale: clampNumber(body.logoScale, 0.25, 3, null),

    viewMode,

    tournamentName:
      typeof body.tournamentName === "string" && body.tournamentName.trim() ? body.tournamentName.trim() : null,

    subtitle: typeof body.subtitle === "string" && body.subtitle.trim() ? body.subtitle.trim() : null,

    // NEW: tournament programming
    tournamentId:
      typeof body.tournamentId === "string" && body.tournamentId.trim() ? body.tournamentId.trim() : null,

    tournamentLang,

    tournamentCourtName:
      typeof body.tournamentCourtName === "string" && body.tournamentCourtName.trim()
        ? body.tournamentCourtName.trim()
        : null,

    // NEW: optional pins
    pinnedNowMatchId:
      body.pinnedNowMatchId !== undefined && body.pinnedNowMatchId !== null && String(body.pinnedNowMatchId).trim()
        ? String(body.pinnedNowMatchId).trim()
        : null,

    pinnedNextMatchId:
      body.pinnedNextMatchId !== undefined && body.pinnedNextMatchId !== null && String(body.pinnedNextMatchId).trim()
        ? String(body.pinnedNextMatchId).trim()
        : null,

    // NEW: active display for unified view
    activeDisplay:
      body.activeDisplay === "scoreboard" ||
      body.activeDisplay === "now" ||
      body.activeDisplay === "next" ||
      body.activeDisplay === "schedule"
        ? body.activeDisplay
        : undefined
  };

  await kv.set(key(courtId), next);

  // Broadcast SSE event if activeDisplay changed
  if (next.activeDisplay) {
    try {
      const { broadcastDisplayChange } = await import("../events/route");
      broadcastDisplayChange(courtId, next.activeDisplay);
    } catch (e) {
      // SSE module not available or failed
      console.warn("Failed to broadcast display change:", e);
    }
  }

  return Response.json({ ok: true });
}
