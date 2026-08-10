import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import markup from "@/app-legacy/markup.html?raw";

const TITLE = "Plan's — Planificateur d'entraînement & Strava";
const DESCRIPTION =
  "Planifie ta saison, suis tes séances et visualise tes activités Strava en temps réel dans une interface Liquid Glass.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "/plans/base.css" },
      { rel: "stylesheet", href: "/plans/glass.css" },
    ],
  }),
  component: Index,
});

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-plans="${src}"]`);
    if (existing) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset["plans"] = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function Index() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js");
      if (cancelled) return;
      await loadScript("/plans/app.js");
      if (cancelled) return;
      await loadScript("/plans/intervals.js");
    })().catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, []);

  return <div id="plans-root" dangerouslySetInnerHTML={{ __html: markup }} />;
}
