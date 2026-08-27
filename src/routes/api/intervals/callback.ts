import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/intervals/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const { resolveSession } = await import("@/lib/session.server");
        const headers = new Headers();
        // Prefer the session cookie that authorize.ts established on this browser
        // (the server verifies its HMAC signature and returns the bare id). The
        // OAuth `state` param must never supersede it — trusting an externally
        // supplied `state` would let an attacker hijack the token association
        // (and, with it, the linked intervals.icu account).
        const { id: sessionId, setCookie } = await resolveSession(request);
        if (setCookie) headers.append("set-cookie", setCookie);

        if (error || !code) {
          headers.set(
            "location",
            `/?intervals_error=${encodeURIComponent(error ?? "missing_code")}`,
          );
          return new Response(null, { status: 302, headers });
        }

        try {
          const {
            exchangeCode,
            redirectUriFor,
            saveTokens,
            fetchAthlete,
            fetchActivities,
            storeActivity,
          } = await import("@/lib/intervals.server");
          const token = await exchangeCode(code, redirectUriFor(request));
          // Strip leading "i" — intervals.icu returns athlete IDs as integers but
          // some tokens prefix them with "i". The API paths require plain integers.
          const rawAthleteId = String(token.athlete_id ?? token.athlete?.id ?? "");
          const athleteId = rawAthleteId.replace(/^i/i, "");
          if (!athleteId) throw new Error("intervals.icu n'a pas renvoyé d'athlète");
          const profile = await fetchAthlete(token.access_token, athleteId);
          const tokens = {
            session_id: sessionId,
            athlete_id: athleteId,
            athlete_name: profile?.name ?? token.athlete?.name ?? null,
            access_token: token.access_token,
            refresh_token: token.refresh_token ?? null,
            expires_at: Math.floor(Date.now() / 1000) + (token.expires_in ?? 60 * 60 * 24 * 365),
          };
          await saveTokens(tokens);
          const activities = await fetchActivities(tokens);
          for (const activity of activities) await storeActivity(athleteId, activity);
          headers.set("location", "/?intervals=connected");
        } catch (e) {
          headers.set(
            "location",
            `/?intervals_error=${encodeURIComponent((e as Error).message)}`,
          );
        }
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
