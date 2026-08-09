import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/strava/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const { readSessionId, newSessionId, sessionCookie } = await import(
          "@/lib/session.server"
        );
        const headers = new Headers();
        const sessionId = url.searchParams.get("state") || readSessionId(request) || newSessionId();
        headers.append("set-cookie", sessionCookie(sessionId));

        if (error || !code) {
          headers.set("location", `/?strava_error=${encodeURIComponent(error ?? "missing_code")}`);
          return new Response(null, { status: 302, headers });
        }

        try {
          const { exchangeCode, saveTokens, fetchActivities, storeActivity } = await import(
            "@/lib/strava.server"
          );
          const token = await exchangeCode(code);
          const athleteId = token.athlete?.id ?? null;
          await saveTokens(sessionId, {
            session_id: sessionId,
            athlete_id: athleteId,
            athlete_name: token.athlete
              ? `${token.athlete.firstname ?? ""} ${token.athlete.lastname ?? ""}`.trim()
              : null,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_at: token.expires_at,
          });
          if (athleteId) {
            const activities = await fetchActivities(token.access_token, 20);
            for (const activity of activities) await storeActivity(athleteId, activity);
          }
          headers.set("location", "/?strava=connected");
        } catch (e) {
          headers.set("location", `/?strava_error=${encodeURIComponent((e as Error).message)}`);
        }
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
