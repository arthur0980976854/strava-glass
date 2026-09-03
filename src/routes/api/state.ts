import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { ensureSchema, getDb } = await import("@/lib/turso.server");
        const { resolveSession } = await import("@/lib/session.server");
        const { sessionEmail, loadUserState } = await import("@/lib/coros.server");
        const { id, setCookie } = await resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);
        try {
          await ensureSchema();
          // If this session is linked to a COROS account, the state belongs to
          // the account (so it follows the user across devices); otherwise it
          // stays local to the anonymous session.
          const email = await sessionEmail(id);
          let value: string | null = null;
          if (email) {
            value = await loadUserState(email);
          } else {
            const rs = await getDb().execute({
              sql: "SELECT data FROM app_state WHERE session_id = ?",
              args: [id],
            });
            value = rs.rows[0] ? (rs.rows[0]["data"] as string) : null;
          }

          // Recovery: a brand-new session (new browser/cookie) would otherwise
          // start empty even though the athlete already entered a full plan.
          // When the current state holds nothing, adopt the most recent
          // non-empty saved state and keep it under this session. Never
          // overwrites an existing non-empty state.
          if (isEmptyState(value)) {
            const rs = await getDb().execute(
              "SELECT session_id, data FROM app_state ORDER BY updated_at DESC",
            );
            const found = rs.rows.find((r) => !isEmptyState(r["data"] as string));
            if (found) {
              value = found["data"] as string;
              if (!email) {
                await getDb().execute({
                  sql: `INSERT INTO app_state (session_id, data, updated_at) VALUES (?, ?, ?)
                        ON CONFLICT(session_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
                  args: [id, value, Date.now()],
                });
              }
            }
          }
          return new Response(JSON.stringify({ value }), { headers });
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
        const { sessionEmail, saveUserState } = await import("@/lib/coros.server");
        const { id, setCookie } = await resolveSession(request);
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
        const email = await sessionEmail(id);
        if (email) {
          await saveUserState(email, body.value);
        } else {
          await getDb().execute({
            sql: `INSERT INTO app_state (session_id, data, updated_at) VALUES (?, ?, ?)
                  ON CONFLICT(session_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
            args: [id, body.value, Date.now()],
          });
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      },
    },
  },
});
