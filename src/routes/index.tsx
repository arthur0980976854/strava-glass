import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PlannerShell } from "../lib/plans-ui/PlannerShell";

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
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-plans="${src}"]`,
    );
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
      // Chart.js is vendored locally under /plans/vendor so the dashboard has
      // no runtime dependency on a third-party CDN.
      await loadScript("/plans/vendor/chart.umd.min.js");
      if (cancelled) return;
      // Legacy imperative scripts enhance the React-rendered shell below by id.
      await loadScript("/plans/app.js");
      if (cancelled) return;
      await loadScript("/plans/intervals.js");
    })()
      .catch((error) => console.error(error))
      .finally(() => {
        // Once the app is interactive (scripts loaded, or failed), tell the
        // splash screen (mounted in the root shell) to fade out.
        if (!cancelled) window.dispatchEvent(new Event("plans:ready"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // PWA: register the service worker in production only (in dev it would cache
  // stale assets and confuse iteration).
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return <PlannerShell />;
}