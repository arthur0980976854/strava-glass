import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-Sent Events stream: re-polls intervals.icu periodically and pushes
 * newly stored activities to the dashboard in real time.
 */
export const Route = createFileRoute("/api/intervals/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens, fetchActivities, storeActivity, recentStoredActivities } =
          await import("@/lib/intervals.server");
        const { id } = resolveSession(request);
        let tokens = null;
        try {
          tokens = await loadTokens(id);
        } catch {
          /* database not configured yet */
        }

        const encoder = new TextEncoder();
        let cursor = Date.now();
        let closed = false;

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              if (closed) return;
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              );
            };
            send("ready", {
              connected: Boolean(tokens),
              athlete: tokens?.athlete_name ?? null,
            });

            request.signal.addEventListener("abort", () => {
              closed = true;
              try {
                controller.close();
              } catch {
                /* already closed */
              }
            });

            for (let tick = 0; tick < 600 && !closed; tick++) {
              await new Promise((r) => setTimeout(r, 3000));
              if (closed) break;
              try {
                if (tokens) {
                  // Re-poll intervals.icu every ~30s, then push whatever is new.
                  if (tick % 10 === 0) {
                    const raw = await fetchActivities(tokens, 14);
                    for (const a of raw) await storeActivity(tokens.athlete_id, a);
                  }
                  const rows = await recentStoredActivities(tokens.athlete_id, cursor);
                  if (rows.length) {
                    cursor = Math.max(...rows.map((r) => r.receivedAt));
                    send(
                      "activity",
                      rows.map((r) => r.activity),
                    );
                  }
                }
                send("ping", { t: Date.now() });
              } catch {
                /* keep the stream alive on transient errors */
              }
            }
            if (!closed) {
              closed = true;
              try {
                controller.close();
              } catch {
                /* noop */
              }
            }
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
