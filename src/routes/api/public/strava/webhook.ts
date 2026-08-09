import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z.object({
  object_type: z.enum(["activity", "athlete"]),
  object_id: z.number(),
  aspect_type: z.enum(["create", "update", "delete"]),
  owner_id: z.number(),
  subscription_id: z.number().optional(),
  event_time: z.number().optional(),
});

export const Route = createFileRoute("/api/public/strava/webhook")({
  server: {
    handlers: {
      // Strava subscription validation handshake
      GET: async ({ request }) => {
        const verifyToken = process.env["STRAVA_VERIFY_TOKEN"];
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
          return Response.json({ "hub.challenge": challenge });
        }
        return new Response("Forbidden", { status: 403 });
      },
      // Activity / athlete events
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = eventSchema.parse(await request.json());
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        if (parsed.object_type !== "activity") return new Response("ok");

        try {
          const { ensureSchema, getDb } = await import("@/lib/turso.server");
          if (parsed.aspect_type === "delete") {
            await ensureSchema();
            await getDb().execute({
              sql: "DELETE FROM strava_activities WHERE id = ?",
              args: [parsed.object_id],
            });
            return new Response("ok");
          }
          const { sessionsForAthlete, loadTokens, validAccessToken, fetchActivity, storeActivity } =
            await import("@/lib/strava.server");
          const sessions = await sessionsForAthlete(parsed.owner_id);
          const sessionId = sessions[0];
          if (sessionId) {
            const tokens = await loadTokens(sessionId);
            if (tokens) {
              const access = await validAccessToken(tokens);
              const activity = await fetchActivity(access, parsed.object_id);
              await storeActivity(parsed.owner_id, activity);
            }
          }
        } catch {
          /* always ack: Strava retries on non-2xx */
        }
        return new Response("ok");
      },
    },
  },
});
