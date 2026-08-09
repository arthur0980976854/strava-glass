import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { ensureSchema, getDb } = await import("@/lib/turso.server");
        const { resolveSession } = await import("@/lib/session.server");
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);
        try {
          await ensureSchema();
          const rs = await getDb().execute({
            sql: "SELECT data FROM app_state WHERE session_id = ?",
            args: [id],
          });
          const row = rs.rows[0];
          return new Response(JSON.stringify({ value: row ? (row["data"] as string) : null }), {
            headers,
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ value: null, error: (error as Error).message }),
            { status: 200, headers },
          );
        }
      },
      PUT: async ({ request }) => {
        const { ensureSchema, getDb } = await import("@/lib/turso.server");
        const { resolveSession } = await import("@/lib/session.server");
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);
        const body = (await request.json()) as { value?: unknown };
        if (typeof body.value !== "string" || body.value.length > 4_000_000) {
          return new Response(JSON.stringify({ error: "invalid payload" }), {
            status: 400,
            headers,
          });
        }
        await ensureSchema();
        await getDb().execute({
          sql: `INSERT INTO app_state (session_id, data, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
          args: [id, body.value, Date.now()],
        });
        return new Response(JSON.stringify({ ok: true }), { headers });
      },
    },
  },
});
