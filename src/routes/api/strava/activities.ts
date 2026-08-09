import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/strava/activities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens, validAccessToken, fetchActivities, storeActivity, toCard } =
          await import("@/lib/strava.server");
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const tokens = await loadTokens(id);
          if (!tokens) {
            return new Response(JSON.stringify({ connected: false, activities: [] }), { headers });
          }
          const access = await validAccessToken(tokens);
          const raw = await fetchActivities(access, 20);
          if (tokens.athlete_id) {
            for (const a of raw) await storeActivity(tokens.athlete_id, a);
          }
          return new Response(
            JSON.stringify({
              connected: true,
              athlete: tokens.athlete_name,
              activities: raw.map(toCard),
            }),
            { headers },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ connected: false, activities: [], error: (error as Error).message }),
            { status: 200, headers },
          );
        }
      },
      DELETE: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { ensureSchema, getDb } = await import("@/lib/turso.server");
        const { id } = resolveSession(request);
        await ensureSchema();
        await getDb().execute({
          sql: "DELETE FROM strava_tokens WHERE session_id = ?",
          args: [id],
        });
        return Response.json({ ok: true });
      },
    },
  },
});
