import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/intervals/activities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens, fetchActivities, storeActivity, toCard } = await import(
          "@/lib/intervals.server"
        );
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const tokens = await loadTokens(id);
          if (!tokens) {
            return new Response(JSON.stringify({ connected: false, activities: [] }), { headers });
          }
          const raw = await fetchActivities(tokens);
          for (const a of raw) await storeActivity(tokens.athlete_id, a);
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
        const { deleteTokens } = await import("@/lib/intervals.server");
        const { id } = resolveSession(request);
        await deleteTokens(id);
        return Response.json({ ok: true });
      },
    },
  },
});
