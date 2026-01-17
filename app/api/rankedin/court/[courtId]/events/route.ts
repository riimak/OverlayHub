export const runtime = "nodejs";

import { kv } from "../../../../../lib/kv";

const key = (courtId: string) => `overlay:rankedin:court:${courtId}:settings`;

// Store active connections per court
const connections = new Map<string, Set<WritableStreamDefaultWriter>>();

export async function GET(_req: Request, context: any) {
  const params = await context?.params;
  const courtId = String(params?.courtId ?? "");
  if (!courtId) return new Response("Missing courtId", { status: 400 });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      // Get current settings and send initial state
      kv.get(key(courtId)).then(settings => {
        const activeDisplay = (settings as any)?.activeDisplay || 'scoreboard';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "display", view: activeDisplay })}\n\n`)
        );
      });

      // Store this connection
      if (!connections.has(courtId)) {
        connections.set(courtId, new Set());
      }
      
      const writer = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (e) {
            // Connection closed
          }
        }
      };
      
      connections.get(courtId)!.add(writer as any);

      // Keep alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on close
      _req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        const courtConnections = connections.get(courtId);
        if (courtConnections) {
          courtConnections.delete(writer as any);
          if (courtConnections.size === 0) {
            connections.delete(courtId);
          }
        }
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}

// Helper function to broadcast events (called from settings route)
export function broadcastDisplayChange(courtId: string, view: string) {
  const courtConnections = connections.get(courtId);
  if (!courtConnections || courtConnections.size === 0) return;

  const message = `data: ${JSON.stringify({ type: "display", view })}\n\n`;
  
  courtConnections.forEach((writer: any) => {
    try {
      writer.write(message);
    } catch (e) {
      // Remove dead connections
      courtConnections.delete(writer);
    }
  });
}
