import { createFileRoute } from "@tanstack/react-router";

/**
 * Comptes email / mot de passe.
 * GET    → session courante
 * POST   → { mode: "login" | "signup", email, password }
 * DELETE → déconnexion
 */
export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readSessionId } = await import("@/lib/session.server");
        const { findUserById } = await import("@/lib/auth.server");
        const id = readSessionId(request);
        if (!id) return Response.json({ authenticated: false });
        try {
          const user = await findUserById(id);
          return Response.json(
            user ? { authenticated: true, user: { email: user.email } } : { authenticated: false },
          );
        } catch (error) {
          return Response.json({ authenticated: false, error: (error as Error).message });
        }
      },

      POST: async ({ request }) => {
        const { sessionCookie } = await import("@/lib/session.server");
        const { signIn, signUp } = await import("@/lib/auth.server");
        try {
          const body = (await request.json()) as {
            mode?: string;
            email?: string;
            password?: string;
          };
          const email = body.email ?? "";
          const password = body.password ?? "";
          if (!email || !password) {
            return Response.json({ error: "Veuillez remplir tous les champs." }, { status: 400 });
          }
          const user = body.mode === "signup" ? await signUp(email, password) : await signIn(email, password);
          const headers = new Headers({ "content-type": "application/json" });
          headers.append("set-cookie", sessionCookie(user.id));
          return new Response(JSON.stringify({ ok: true, user: { email: user.email } }), { headers });
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 401 });
        }
      },

      DELETE: async () => {
        const headers = new Headers({ "content-type": "application/json" });
        headers.append(
          "set-cookie",
          "plans_sid=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0",
        );
        return new Response(JSON.stringify({ ok: true }), { headers });
      },
    },
  },
});
