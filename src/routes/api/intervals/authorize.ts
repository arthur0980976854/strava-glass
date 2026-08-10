import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/intervals/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authorizeUrl } = await import("@/lib/intervals.server");
        const { resolveSession } = await import("@/lib/session.server");
        const { id, setCookie } = resolveSession(request);
        const origin = new URL(request.url).origin;
        const headers = new Headers();
        if (setCookie) headers.append("set-cookie", setCookie);
        try {
          headers.set("location", authorizeUrl(`${origin}/api/intervals/callback`, id));
        } catch (error) {
          headers.set(
            "location",
            `/?intervals_error=${encodeURIComponent((error as Error).message)}`,
          );
        }
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
