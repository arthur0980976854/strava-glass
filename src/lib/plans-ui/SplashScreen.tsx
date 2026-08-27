import { useEffect, useState } from "react";

/**
 * Branded full-screen loading overlay, shown from the very first SSR paint
 * until the app signals it is ready ("plans:ready" event, dispatched by the
 * index route once the legacy scripts have loaded). Fades out before unmount.
 *
 * Self-contained: styles are inlined (scoped under #app-splash) so the splash
 * renders correctly even before the app stylesheets finish loading.
 */

const SPLASH_CSS = `
#app-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 20% -10%, #e8f1ff 0%, transparent 55%),
    radial-gradient(ellipse at 100% 0%, #ffe9f4 0%, transparent 50%),
    linear-gradient(160deg, #eef3fb 0%, #f6f8fd 45%, #eef6f4 100%);
  transition: opacity 0.45s ease;
}
#app-splash.splash-leave { opacity: 0; }
#app-splash .splash-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 42px 58px 36px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 28px;
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 24px 60px -20px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: splashIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
#app-splash .splash-logo {
  max-width: 190px;
  height: auto;
  animation: splashFloat 2.6s ease-in-out infinite;
}
#app-splash .splash-spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(10, 132, 255, 0.18);
  border-top-color: #0a84ff;
  animation: splashSpin 0.9s linear infinite;
}
#app-splash .splash-text {
  margin: 0;
  font: 600 13px/1.4 "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  color: #4a5568;
  letter-spacing: 0.01em;
}
@keyframes splashIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
@keyframes splashFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes splashSpin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  #app-splash *, #app-splash *::before, #app-splash *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;

type Phase = "in" | "leaving" | "gone";

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    let ready = false;
    const hide = () => {
      if (ready) return;
      ready = true;
      setPhase("leaving");
      window.setTimeout(() => setPhase("gone"), 520);
    };
    window.addEventListener("plans:ready", hide);
    // Safety net: never keep the splash up forever if something goes wrong.
    const safety = window.setTimeout(hide, 8000);
    return () => {
      window.removeEventListener("plans:ready", hide);
      window.clearTimeout(safety);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      id="app-splash"
      className={phase === "leaving" ? "splash splash-leave" : "splash"}
      role="status"
      aria-label="Chargement de l'application"
    >
      <style>{SPLASH_CSS}</style>
      <div className="splash-card">
        <img className="splash-logo" src="/plans-logo.png" alt="Plan's" width={190} height={104} />
        <div className="splash-spinner" aria-hidden="true" />
        <p className="splash-text">Préparation de ton plan d'entraînement…</p>
      </div>
    </div>
  );
}