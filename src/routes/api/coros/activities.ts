import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/coros/activities")({
  server: {
    handlers: {
      // GET: fetch activities from COROS (requires a session linked to a COROS account)
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { sessionEmail, loadTokens, fetchActivities, storeActivity } = await import(
          "@/lib/coros.server"
        );
        const { id, setCookie } = await resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const email = await sessionEmail(id);
          if (!email) {
            return new Response(
              JSON.stringify({ connected: false, activities: [], error: "Connecte ton compte COROS" }),
              { headers },
            );
          }
          const tokens = await loadTokens(email);
          if (!tokens) {
            return new Response(
              JSON.stringify({ connected: false, activities: [], error: "Reconnecte ton compte COROS" }),
              { headers },
            );
          }
          const raw = await fetchActivities(tokens.access_token, 120);
          for (const card of raw) await storeActivity(email, card);
          return new Response(
            JSON.stringify({
              connected: true,
              athlete: tokens.athlete_name,
              activities: raw,
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

      // POST: mark a workout as done — COROS has no public write API, so the
      // session is already saved locally by the client; accept and confirm.
      POST: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { id, setCookie } = await resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);
        try {
          await request.json();
          return new Response(JSON.stringify({ ok: true, localOnly: true }), { headers });
        } catch {
          return new Response(JSON.stringify({ ok: true, localOnly: true }), { headers });
        }
      },

      // DELETE: disconnect — unlink the session from the account (data stays)
      DELETE: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { unlinkSession } = await import("@/lib/coros.server");
        const { id } = await resolveSession(request);
        await unlinkSession(id);
        return Response.json({ ok: true });
      },
    },
  },
});
