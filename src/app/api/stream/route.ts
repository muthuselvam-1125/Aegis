import { getPlaces } from "@/lib/data";
import { nowcast } from "@/lib/wx";

export const dynamic = "force-dynamic";

/*
  Server-Sent Events. SSE (not WebSocket) is chosen deliberately: it runs
  over plain HTTP/1.1+, auto-reconnects, and survives flaky mobile networks
  and restrictive middleboxes far better than raw WS during an emergency.
*/
export async function GET(request: Request) {
  const places = await getPlaces();
  const home = places[0];
  const encoder = new TextEncoder();
  let closed = false;
  let tick: NodeJS.Timeout | null = null;
  let hb: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (tick) clearInterval(tick);
    if (hb) clearInterval(hb);
  };

  request.signal.addEventListener("abort", cleanup);

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };
      send("hello", { ok: true, at: new Date().toISOString() });

      tick = setInterval(async () => {
        if (closed) {
          cleanup();
          return;
        }
        try {
          const nc = home ? await nowcast(home.lat, home.lon, new Date()) : [];
          const rate = nc[0]?.mmPerHr ?? 0;
          send("gauge", {
            at: new Date().toISOString(),
            rainRateMmHr: rate,
            riverLevelM: Math.round((2.4 + rate / 30) * 100) / 100,
            trend: rate > 15 ? "rising" : "steady",
          });
        } catch {
          // ignore transient error
        }
      }, 5000);

      hb = setInterval(() => {
        if (closed) {
          cleanup();
          return;
        }
        send("ping", { at: Date.now() });
      }, 15000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
