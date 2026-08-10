import { createFileRoute } from "@tanstack/react-router";

const SPORT_TYPE_MAP: Record<string, string> = {
  "Course à pied": "Run",
  "Trail": "TrailRun",
  "Vélo": "Ride",
  "Vélo route": "Ride",
  "Gravel": "GravelRide",
  "VTT": "MountainBikeRide",
  "Natation": "Swim",
  "Triathlon": "Triathlon",
  "Marche": "Walk",
  "Randonnée": "Hike",
  "Musculation": "WeightTraining",
  "Yoga": "Yoga",
  "Escalade": "RockClimbing",
  "Autre": "Workout",
};

function toIntervalsType(sport: string): string {
  return SPORT_TYPE_MAP[sport] ?? "Workout";
}

export const Route = createFileRoute("/api/intervals/events")({
  server: {
    handlers: {
      // POST: create a planned workout event on intervals.icu calendar
      POST: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens } = await import("@/lib/intervals.server");
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const tokens = await loadTokens(id);
          if (!tokens) {
            return new Response(JSON.stringify({ error: "Non connecté à intervals.icu" }), {
              status: 401,
              headers,
            });
          }

          const body = (await request.json()) as {
            date: string;           // "2025-08-06"
            sport: string;
            name?: string;
            detail?: string;
            objective?: string;
            durationPlanned?: number; // minutes
          };

          const payload: Record<string, unknown> = {
            category: "WORKOUT",
            start_date_local: `${body.date}T00:00:00`,
            type: toIntervalsType(body.sport),
            name: body.name || body.sport || "Séance planifiée",
          };

          if (body.detail || body.objective) {
            payload.description = [body.objective, body.detail].filter(Boolean).join("\n");
          }
          if (body.durationPlanned) {
            payload.moving_time = Math.round(body.durationPlanned * 60);
          }

          const res = await fetch(
            `https://intervals.icu/api/v1/athlete/${encodeURIComponent(tokens.athlete_id)}/events?upsertOnUid=true`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );

          if (!res.ok) {
            const txt = await res.text();
            return new Response(
              JSON.stringify({ error: `intervals.icu: ${res.status} — ${txt}` }),
              { status: 502, headers },
            );
          }

          const created = await res.json();
          return new Response(JSON.stringify({ ok: true, created }), { headers });
        } catch (error) {
          return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers },
          );
        }
      },

      // DELETE: remove a planned event by intervals.icu event id
      DELETE: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens } = await import("@/lib/intervals.server");
        const { id } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });

        try {
          const tokens = await loadTokens(id);
          if (!tokens) {
            return new Response(JSON.stringify({ error: "Non connecté" }), { status: 401, headers });
          }
          const body = (await request.json()) as { eventId: number | string };
          const res = await fetch(
            `https://intervals.icu/api/v1/athlete/${encodeURIComponent(tokens.athlete_id)}/events/${body.eventId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            },
          );
          if (!res.ok) {
            return new Response(JSON.stringify({ error: `intervals.icu: ${res.status}` }), { status: 502, headers });
          }
          return new Response(JSON.stringify({ ok: true }), { headers });
        } catch (error) {
          return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers });
        }
      },
    },
  },
});
