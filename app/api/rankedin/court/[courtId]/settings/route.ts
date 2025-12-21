export const runtime = "nodejs";

import { kv } from "@/app/lib/kv";

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
    format: body.format ?? null, // "bo3" | "bo5"
    swap: !!body.swap,
    name1: typeof body.name1 === "string" ? body.name1 : null,
    name2: typeof body.name2 === "string" ? body.name2 : null,
    leftColor: typeof body.leftColor === "string" ? body.leftColor : null,
    rightColor: typeof body.rightColor === "string" ? body.rightColor : null,
    logoOpacity: typeof body.logoOpacity === "number" ? body.logoOpacity : null,
    logoScale: typeof body.logoScale === "number" ? body.logoScale : null
  };

  await kv.set(key(courtId), next);
  return Response.json({ ok: true });
}
