import { createFileRoute } from "@tanstack/react-router";

/** Zero-OAuth feed importer: configure, sync and read an activity source. */
export const Route = createFileRoute("/api/feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadFeed, syncFeed } = await import("@/lib/feed.server");
        const { recentStoredActivities } = await import("@/lib/strava.server");
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const feed = await loadFeed(id);
          if (!feed) {
            return new Response(JSON.stringify({ configured: false, activities: [] }), { headers });
          }
          const url = new URL(request.url);
          let error = feed.lastError;
          if (url.searchParams.get("sync") === "1") {
            error = (await syncFeed(id)).error;
          }
          const rows = await recentStoredActivities(feed.athleteKey, 0);
          return new Response(
            JSON.stringify({
              configured: true,
              url: feed.url,
              hasToken: Boolean(feed.token),
              lastSync: feed.lastSync,
              error,
              activities: rows.map((r) => r.activity),
            }),
            { headers },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ configured: false, activities: [], error: (error as Error).message }),
            { headers },
          );
        }
      },

      POST: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { saveFeed, syncFeed } = await import("@/lib/feed.server");
        const { recentStoredActivities } = await import("@/lib/strava.server");
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const body = (await request.json()) as { url?: string; token?: string };
          const url = (body.url ?? "").trim();
          if (!/^https?:\/\//i.test(url)) throw new Error("URL invalide");
          const athleteKey = await saveFeed(id, url, (body.token ?? "").trim() || null);
          const result = await syncFeed(id);
          const rows = await recentStoredActivities(athleteKey, 0);
          return new Response(
            JSON.stringify({
              configured: true,
              url,
              imported: result.imported,
              error: result.error,
              activities: rows.map((r) => r.activity),
            }),
            { headers },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ configured: false, activities: [], error: (error as Error).message }),
            { headers },
          );
        }
      },

      DELETE: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { deleteFeed } = await import("@/lib/feed.server");
        const { id } = resolveSession(request);
        await deleteFeed(id);
        return Response.json({ ok: true });
      },
    },
  },
});
