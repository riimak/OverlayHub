export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";


const key = (courtId: string) => `overlay:rankedin:court:${courtId}:event`;

export async function POST(req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");
  if (!courtId) return new Response("Missing courtId", { status: 400 });

  const body = await req.json().catch(() => ({}));
  const event = {
    type: typeof body.type === "string" ? body.type : "flash",
    target: typeof body.target === "string" ? body.target : "score",
    at: Date.now()
  };

  // store the latest event (overlay will consume and clear)
  await kv.set(key(courtId), event, { ex: 30 }); // expires quickly
  return Response.json({ ok: true, event });
}
