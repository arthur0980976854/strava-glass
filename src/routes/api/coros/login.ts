import { createFileRoute } from "@tanstack/react-router";

/**
 * Log in to COROS with the e-mail + password submitted from the login form.
 * On success it creates (or reuses) an account keyed by the COROS e-mail, links
 * the current browser session to it and stores the access token. The password
 * itself is never persisted.
 *
 * Because the session is linked to the account, the same COROS login on another
 * device retrieves the same planning data and activities.
 */
export const Route = createFileRoute("/api/coros/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { id, setCookie } = await resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        let email = "";
        let password = "";
        try {
          const body = (await request.json()) as { email?: string; password?: string };
          email = (body.email ?? "").trim().toLowerCase();
          password = body.password ?? "";
        } catch {
          return new Response(JSON.stringify({ error: "Requête invalide" }), {
            status: 400,
            headers,
          });
        }
        if (!email || !password) {
          return new Response(JSON.stringify({ error: "E-mail et mot de passe requis" }), {
            status: 400,
            headers,
          });
        }

        try {
          const { corosLogin, saveTokens, linkSession, migrateSessionStateToAccount } = await import(
            "@/lib/coros.server"
          );
          const accessToken = await corosLogin(email, password);
          const athleteName = email.split("@")[0] ?? null;
          await saveTokens({
            email,
            athlete_name: athleteName,
            access_token: accessToken,
            expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h; re-login on demand
          });
          await linkSession(id, email);
          await migrateSessionStateToAccount(id, email);
          return new Response(JSON.stringify({ ok: true, athlete: athleteName }), { headers });
        } catch (error) {
          return new Response(
            JSON.stringify({ error: (error as Error).message || "Échec de connexion COROS" }),
            { status: 401, headers },
          );
        }
      },
    },
  },
});
