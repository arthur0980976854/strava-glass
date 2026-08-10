import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Plan's" },
      { name: "description", content: "Connectez-vous à Plan's pour accéder à votre tableau de bord sportif." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    // Simulate auth — replace with real logic
    setTimeout(() => {
      setLoading(false);
      navigate({ to: "/" });
    }, 900);
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; min-height: 100%; }

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          padding: 24px;
          background:
            radial-gradient(ellipse at 20% -10%, #e8f1ff 0%, transparent 55%),
            radial-gradient(ellipse at 100% 0%, #ffe9f4 0%, transparent 50%),
            linear-gradient(160deg, #eef3fb 0%, #f6f8fd 45%, #eef6f4 100%);
          background-attachment: fixed;
          position: relative;
          overflow: hidden;
        }

        /* Animated blobs */
        .login-root::before,
        .login-root::after {
          content: '';
          position: fixed;
          z-index: 0;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.55;
          pointer-events: none;
        }
        .login-root::before {
          width: 46vw; height: 46vw;
          top: -12vw; left: -8vw;
          background: radial-gradient(circle at 30% 30%, #7cc4ff, #4f6bff 60%, transparent 72%);
          animation: blobA 26s ease-in-out infinite alternate;
        }
        .login-root::after {
          width: 40vw; height: 40vw;
          bottom: -14vw; right: -6vw;
          background: radial-gradient(circle at 60% 40%, #ffb4d8, #ff7a59 55%, transparent 72%);
          animation: blobB 32s ease-in-out infinite alternate;
        }
        @keyframes blobA {
          from { transform: translate3d(0,0,0) scale(1); }
          to   { transform: translate3d(8vw,6vh,0) scale(1.15); }
        }
        @keyframes blobB {
          from { transform: translate3d(0,0,0) scale(1.05); }
          to   { transform: translate3d(-7vw,-8vh,0) scale(0.92); }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-root::before, .login-root::after { animation: none; }
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.58);
          backdrop-filter: blur(28px) saturate(190%);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 28px;
          padding: 44px 40px 40px;
          box-shadow:
            0 20px 60px -20px rgba(15,23,42,0.2),
            inset 0 1px 0 rgba(255,255,255,0.85);
          animation: cardIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }

        /* Brand */
        .login-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 32px;
        }
        .login-brand-icon {
          width: 44px; height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(10,132,255,0.96), rgba(94,92,230,0.94));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 22px -8px rgba(10,132,255,0.75), inset 0 1px 0 rgba(255,255,255,0.3);
          flex-shrink: 0;
        }
        .login-brand-icon svg { color: #fff; }
        .login-brand-text { display: flex; flex-direction: column; gap: 1px; }
        .login-brand-name {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #10131a;
        }
        .login-brand-tagline {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* Heading */
        .login-title {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #10131a;
          margin: 0 0 4px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 28px;
          font-weight: 400;
        }

        /* Form */
        .login-form { display: flex; flex-direction: column; gap: 16px; }

        .lf-field { display: flex; flex-direction: column; gap: 6px; }
        .lf-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }
        .lf-input-wrap { position: relative; }
        .lf-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          display: flex; align-items: center;
          pointer-events: none;
          transition: color 0.2s;
        }
        .lf-input {
          width: 100%;
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(16px) saturate(170%);
          border: 1px solid rgba(255,255,255,0.65);
          border-radius: 14px;
          color: #10131a;
          padding: 12px 14px 12px 40px;
          font-size: 13.5px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
          box-shadow: 0 2px 12px -6px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.85);
          transition: all 0.25s ease;
          outline: none;
          -webkit-appearance: none;
        }
        .lf-input::placeholder { color: #94a3b8; font-weight: 400; }
        .lf-input:hover {
          border-color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.68);
        }
        .lf-input:focus {
          border-color: rgba(10,132,255,0.65);
          background: rgba(255,255,255,0.75);
          box-shadow: 0 0 0 4px rgba(10,132,255,0.14), 0 2px 12px -6px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .lf-input:focus + .lf-icon,
        .lf-input-wrap:focus-within .lf-icon {
          color: #0a84ff;
        }
        /* For icon + toggle on password */
        .lf-pwd-toggle {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.2s;
          line-height: 1;
        }
        .lf-pwd-toggle:hover { color: #4a5568; }
        .lf-pwd-input { padding-right: 40px; }

        /* Error */
        .lf-error {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,69,58,0.10);
          border: 1px solid rgba(255,69,58,0.22);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          color: #c0392b;
          font-weight: 500;
          animation: shake 0.3s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-4px); }
          75%      { transform: translateX(4px); }
        }

        /* Submit */
        .lf-submit {
          margin-top: 4px;
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, rgba(10,132,255,0.97), rgba(94,92,230,0.95));
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 14px;
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 26px -12px rgba(10,132,255,0.85), inset 0 1px 0 rgba(255,255,255,0.25);
          transition: all 0.25s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          letter-spacing: -0.01em;
        }
        .lf-submit:hover:not(:disabled) {
          filter: brightness(1.07);
          transform: translateY(-1px);
          box-shadow: 0 14px 30px -12px rgba(10,132,255,0.9), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .lf-submit:active:not(:disabled) { transform: translateY(0); }
        .lf-submit:disabled { opacity: 0.72; cursor: not-allowed; }

        /* Spinner */
        .lf-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Divider */
        .lf-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 4px 0;
        }
        .lf-divider::before, .lf-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.6);
        }
        .lf-divider span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        /* Strava-style connect button */
        .lf-oauth {
          width: 100%;
          padding: 12px 20px;
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(14px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.65);
          border-radius: 14px;
          color: #10131a;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px -8px rgba(15,23,42,0.2), inset 0 1px 0 rgba(255,255,255,0.85);
          transition: all 0.25s ease;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          text-decoration: none;
        }
        .lf-oauth:hover {
          background: rgba(255,255,255,0.75);
          transform: translateY(-1px);
          box-shadow: 0 8px 22px -8px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .lf-oauth-icon {
          width: 22px; height: 22px;
          border-radius: 6px;
          background: linear-gradient(135deg, #fc4c02, #ff9f0a);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px -4px rgba(252,76,2,0.6);
        }

        /* Footer link */
        .lf-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
        .lf-footer a {
          color: #0a84ff;
          text-decoration: none;
          font-weight: 600;
        }
        .lf-footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="login-root">
        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <polyline points="13 2 6 14 10 14 11 22 18 10 14 10 13 2"/>
              </svg>
            </div>
            <div className="login-brand-text">
              <span className="login-brand-name">Plan's</span>
              <span className="login-brand-tagline">Entraînement &amp; Strava</span>
            </div>
          </div>

          <h1 className="login-title">Connexion</h1>
          <p className="login-subtitle">Accédez à votre tableau de bord sportif</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="lf-field">
              <label className="lf-label">Nom d'utilisateur</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
                <input
                  className="lf-input"
                  type="text"
                  placeholder="votre_pseudo"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="lf-field">
              <label className="lf-label">Mot de passe</label>
              <div className="lf-input-wrap">
                <span className="lf-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  className={`lf-input lf-pwd-input`}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="lf-pwd-toggle"
                  onClick={() => setShowPwd(p => !p)}
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                >
                  {showPwd ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="lf-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button className="lf-submit" type="submit" disabled={loading}>
              {loading ? (
                <><div className="lf-spinner"/><span>Connexion…</span></>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Se connecter
                </>
              )}
            </button>

            <div className="lf-divider"><span>ou continuer avec</span></div>

            {/* Strava OAuth */}
            <a className="lf-oauth" href="/api/intervals/authorize">
              <span className="lf-oauth-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <polyline points="13 2 6 14 10 14 11 22 18 10 14 10 13 2"/>
                </svg>
              </span>
              Continuer avec intervals.icu
            </a>
          </form>

          <div className="lf-footer">
            Pas encore de compte ?{" "}
            <a href="#">Créer un compte</a>
          </div>
        </div>
      </div>
    </>
  );
}
