import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function showToast(msg: string) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  window.clearTimeout((t as unknown as { _h?: number })._h);
  (t as unknown as { _h?: number })._h = window.setTimeout(
    () => t.classList.remove("show"),
    2600,
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Sidebar button that installs the app as a PWA. Uses the browser's
 * `beforeinstallprompt` when available (Chrome/Edge/Android); otherwise shows a
 * short how-to toast (iOS Safari / already installed).
 */
export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // Client-only: reading `window` during SSR would crash the render.
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        showToast("Plan's installé ✅");
      }
      setDeferred(null);
      return;
    }
    if (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator as unknown as { standalone?: boolean }).standalone === undefined
    ) {
      showToast("Sur iOS : Partager → Ajouter à l'écran d'accueil");
    } else {
      showToast("Utilise le menu du navigateur → Installer l'application");
    }
  };

  return (
    <button type="button" className="install-pwa-btn" onClick={install} title="Installer l'application Plan's">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 19h16" />
      </svg>
      Ajouter l'app
    </button>
  );
}