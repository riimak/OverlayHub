export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";

const key = (courtId: string) => `overlay:rankedin:court:${courtId}:event`;

export async function POST(req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");

  if (!courtId) {
    return new Response(JSON.stringify({ error: "Missing courtId" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const type = body?.type;
  const allowed = new Set(["flash", "slide"]);

  if (!allowed.has(type)) {
    return new Response(JSON.stringify({ error: "Invalid type. Use flash|slide" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const event = {
    type,
    at: Date.now()
  };

  // store one-shot event; short TTL so it doesn't linger forever
  await kv.set(key(courtId), event, { ex: 10 });

  return new Response(JSON.stringify({ ok: true, event }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}
