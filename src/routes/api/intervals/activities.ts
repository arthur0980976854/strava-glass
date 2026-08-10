import { createFileRoute } from "@tanstack/react-router";

// Sport name (local app) → intervals.icu activity type
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
  "Aviron": "Rowing",
  "Ski nordique": "NordicSki",
  "Ski alpin": "AlpineSki",
  "Autre": "Workout",
};

function toIntervalsType(sport: string): string {
  return SPORT_TYPE_MAP[sport] ?? "Workout";
}

export const Route = createFileRoute("/api/intervals/activities")({
  server: {
    handlers: {
      // GET: list recent activities (unchanged)
      GET: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { loadTokens, fetchActivities, storeActivity, toCard } = await import(
          "@/lib/intervals.server"
        );
        const { id, setCookie } = resolveSession(request);
        const headers = new Headers({ "content-type": "application/json" });
        if (setCookie) headers.append("set-cookie", setCookie);

        try {
          const tokens = await loadTokens(id);
          if (!tokens) {
            return new Response(JSON.stringify({ connected: false, activities: [] }), { headers });
          }
          const raw = await fetchActivities(tokens);
          const normalizedId = tokens.athlete_id.replace(/^i/i, "");
          for (const a of raw) await storeActivity(normalizedId, a);
          return new Response(
            JSON.stringify({
              connected: true,
              athlete: tokens.athlete_name,
              activities: raw.map(toCard),
            }),
            { headers },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ connected: false, activities: [], error: (error as Error).message }),
            { status: 200, headers },
          );
        }
      },

      // POST: create a completed (done) activity via intervals.icu manual bulk endpoint
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
            date: string;          // "2025-08-06"
            sport: string;         // local sport name
            name?: string;
            detail?: string;
            duration?: number;     // minutes
            distance?: number;     // km
            elevation?: number;    // m
            bpmAvg?: number;
            rpe?: number;
            charge?: number;       // TSS
          };

          const startDateLocal = `${body.date}T09:00:00`;
          const movingTimeSec = body.duration ? Math.round(body.duration * 60) : undefined;
          const distanceM = body.distance ? Math.round(body.distance * 1000) : undefined;

          const payload: Record<string, unknown> = {
            name: body.name || body.sport || "Séance",
            type: toIntervalsType(body.sport),
            start_date_local: startDateLocal,
          };

          if (movingTimeSec) payload.moving_time = movingTimeSec;
          if (distanceM) payload.distance = distanceM;
          if (body.elevation) payload.total_elevation_gain = body.elevation;
          if (body.bpmAvg) payload.average_heartrate = body.bpmAvg;
          if (body.rpe) payload.perceived_exertion = body.rpe;
          if (body.charge) payload.icu_training_load = body.charge;
          if (body.detail) payload.description = body.detail;

          const athleteId = tokens.athlete_id.replace(/^i/i, "");
          const res = await fetch(
            `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}/activities/manual/bulk`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify([payload]),
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

      // DELETE: disconnect
      DELETE: async ({ request }) => {
        const { resolveSession } = await import("@/lib/session.server");
        const { deleteTokens } = await import("@/lib/intervals.server");
        const { id } = resolveSession(request);
        await deleteTokens(id);
        return Response.json({ ok: true });
      },
    },
  },
});
