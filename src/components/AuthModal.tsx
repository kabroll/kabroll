"use client";

// Modale d'authentification : onglets Connexion / Inscription,
// connexion Google, et "mot de passe oublié".

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui";

type Mode = "signin" | "signup";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Saisissez votre email.");
    if (password.length < 6) return setError("Mot de passe : 6 caractères minimum.");
    setLoading(true);
    try {
      if (mode === "signin") await signInWithEmail(email, password);
      else await signUpWithEmail(email, password, name);
      // onAuthStateChanged referme la modale.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setLoading(false);
    }
  }

  async function forgot() {
    setError(null);
    if (!email.trim()) return setError("Entrez votre email pour réinitialiser.");
    try {
      await resetPassword(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signin" ? "Connexion" : "Inscription"}
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-panel-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Poignée mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <span className="w-9 h-1 rounded-full bg-black/15" />
        </div>

        <div className="px-6 pt-5 pb-6">
          {/* Logo + titre */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" />
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.4" />
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.4" />
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" />
              </svg>
            </div>
            <div className="text-[16px] font-bold tracking-tight">
              {mode === "signin" ? "Se connecter" : "Créer un compte"}
            </div>
            <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/[0.06] text-black/30 hover:text-black/60 transition-colors" aria-label="Fermer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" /></svg>
            </button>
          </div>

          {/* Google */}
          <button
            onClick={google}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 border border-black/10 rounded-xl py-2.5 text-[14px] font-medium hover:bg-black/[0.03] transition-colors disabled:opacity-50"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C39.9 36.7 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <span className="flex-1 h-px bg-black/[0.08]" />
            <span className="text-[11px] text-black/35 uppercase tracking-wider">ou</span>
            <span className="flex-1 h-px bg-black/[0.08]" />
          </div>

          {/* Formulaire email */}
          <form onSubmit={submit} className="space-y-2.5">
            {mode === "signup" && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom affiché (optionnel)"
                maxLength={40}
                className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl px-3.5 py-3 text-[14px] focus:outline-none focus:border-accent/40 transition-colors"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoComplete="email"
              className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl px-3.5 py-3 text-[14px] focus:outline-none focus:border-accent/40 transition-colors"
            />
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full bg-black/[0.02] border border-black/[0.08] rounded-xl px-3.5 py-3 pr-10 text-[14px] focus:outline-none focus:border-accent/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-black/30 hover:text-black/60 transition-colors"
                aria-label={showPwd ? "Masquer" : "Afficher"}
              >
                {showPwd ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.1A9.5 9.5 0 0112 5c5 0 9 4 10 7-0.4 1.2-1.2 2.4-2.2 3.4M6.1 6.1C4 7.4 2.6 9.3 2 12c1 3 5 7 10 7 1.2 0 2.3-.2 3.4-.6" /></svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>

            {mode === "signin" && (
              <div className="text-right">
                <button type="button" onClick={forgot} className="text-[12px] text-accent hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {error && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
            )}

            <Button type="submit" loading={loading} fullWidth className="py-3 rounded-xl mt-1">
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          {/* Bascule */}
          <div className="text-center text-[13px] text-black/50 mt-4">
            {mode === "signin" ? (
              <>
                Pas encore de compte ?{" "}
                <button onClick={() => { setMode("signup"); setError(null); }} className="text-accent font-medium hover:underline">
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <button onClick={() => { setMode("signin"); setError(null); }} className="text-accent font-medium hover:underline">
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
