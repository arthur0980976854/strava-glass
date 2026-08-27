import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-Sent Events stream: re-polls COROS periodically and pushes newly
 * stored activities to the dashboard in real time.
 */
export const Route = createFileRoute("/api/coros/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { sessionEmail, loadTokens, fetchActivities, storeActivity, recentStoredActivities } =
          await import("@/lib/coros.server");
        let id = "";
        try {
          ({ id } = await resolveSession(request));
        } catch {
          /* database not configured yet */
        }
        let accessToken: string | null = null;
        let athleteName: string | null = null;
        let athleteId = "";
        try {
          if (id) {
            const email = await sessionEmail(id);
            if (email) {
              athleteId = email;
              const tokens = await loadTokens(email);
              if (tokens) {
                accessToken = tokens.access_token;
                athleteName = tokens.athlete_name;
              }
            }
          }
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
              connected: Boolean(accessToken),
              athlete: athleteName,
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
                if (accessToken) {
                  // Re-poll COROS every ~30s, then push whatever is new.
                  if (tick % 10 === 0) {
                    const raw = await fetchActivities(accessToken, 14);
                    for (const card of raw) await storeActivity(athleteId, card);
                  }
                  const rows = await recentStoredActivities(athleteId, cursor);
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
                // Token expired or revoked — tell the client to reconnect.
                send("auth", { connected: false });
                send("ping", { t: Date.now() });
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
