export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";

const key = (courtId: string) => `overlay:rankedin:court:${courtId}:settings`;

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

  // allowlist a few fields (expand later)
  const next = {
    swap: !!body.swap,

    name1: typeof body.name1 === "string" && body.name1.trim() ? body.name1.trim() : null,
    name2: typeof body.name2 === "string" && body.name2.trim() ? body.name2.trim() : null,

    leftColor:
        typeof body.leftColor === "string" && body.leftColor.trim() ? body.leftColor.trim() : null,
    rightColor:
        typeof body.rightColor === "string" && body.rightColor.trim() ? body.rightColor.trim() : null,


    logoOpacity: typeof body.logoOpacity === "number" ? body.logoOpacity : null,
    logoScale: typeof body.logoScale === "number" ? body.logoScale : null,

    // NEW
    viewMode:
        body.viewMode === "auto" ||
        body.viewMode === "scoreboard" ||
        body.viewMode === "slate" ||
        body.viewMode === "hidden"
        ? body.viewMode
        : "auto",

    tournamentName:
        typeof body.tournamentName === "string" && body.tournamentName.trim()
        ? body.tournamentName.trim()
        : null,

    subtitle:
        typeof body.subtitle === "string" && body.subtitle.trim() ? body.subtitle.trim() : null
    };


  await kv.set(key(courtId), next);
  return Response.json({ ok: true });
}
