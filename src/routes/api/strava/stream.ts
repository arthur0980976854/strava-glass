import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-Sent Events stream. Webhook deliveries are persisted by
 * /api/public/strava/webhook; this stream polls for rows newer than the
 * client's cursor and pushes them instantly to the dashboard.
 */
export const Route = createFileRoute("/api/strava/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens, recentStoredActivities } = await import("@/lib/strava.server");
        const { loadFeed, syncFeed } = await import("@/lib/feed.server");
        const { id } = resolveSession(request);
        let tokens = null;
        let feed = null;
        try {
          tokens = await loadTokens(id);
          feed = await loadFeed(id);
        } catch {
          /* database not configured yet */
        }

        const encoder = new TextEncoder();
        let cursor = Date.now();
        let feedCursor = 0;
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
              connected: Boolean(tokens) || Boolean(feed),
              athlete: tokens?.athlete_name ?? null,
              feed: Boolean(feed),
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
                if (tokens?.athlete_id) {
                  const rows = await recentStoredActivities(tokens.athlete_id, cursor);
                  if (rows.length) {
                    cursor = Math.max(...rows.map((r) => r.receivedAt));
                    send(
                      "activity",
                      rows.map((r) => r.activity),
                    );
                  }
                }
                if (feed) {
                  // Re-poll the feed source every ~30s, then push whatever is new.
                  if (tick % 10 === 0) await syncFeed(id);
                  const rows = await recentStoredActivities(feed.athleteKey, feedCursor);
                  if (rows.length) {
                    feedCursor = Math.max(...rows.map((r) => r.receivedAt));
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
