import { createFileRoute } from "@tanstack/react-router";

/**
 * Planned sessions ("events") are saved locally only — the COROS Training Hub
 * API has no public write endpoint. These handlers exist so the legacy client
 * can keep its save flow without erroring.
 */
export const Route = createFileRoute("/api/coros/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { id, setCookie } = await resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);
        try {
          await request.json();
        } catch {
          /* body optional */
        }
        return new Response(JSON.stringify({ ok: true, localOnly: true }), { headers });
      },
      DELETE: async () => {
        return Response.json({ ok: true, localOnly: true });
      },
    },
  },
});
