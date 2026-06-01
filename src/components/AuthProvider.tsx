"use client";

// Contexte d'authentification Firebase.
// Fournisseurs : Google (popup) ET email + mot de passe.
// Une modale (AuthModal) gère connexion / inscription / mot de passe oublié.
// Fonctionne en "mode démo" (user null) si Firebase n'est pas configuré.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/components/ToastProvider";
import AuthModal from "@/components/AuthModal";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  /** Ouvre la modale de connexion / inscription. */
  openAuth: () => void;
  closeAuth: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const noop = async () => {};
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  openAuth: () => {},
  closeAuth: () => {},
  signInWithGoogle: noop,
  signInWithEmail: noop,
  signUpWithEmail: noop,
  resetPassword: noop,
  signOut: noop,
});

/** Traduit les codes d'erreur Firebase Auth en messages FR lisibles. */
function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-email": return "Adresse email invalide.";
    case "auth/missing-password": return "Saisissez un mot de passe.";
    case "auth/weak-password": return "Mot de passe trop court (6 caractères min).";
    case "auth/email-already-in-use": return "Un compte existe déjà avec cet email.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Email ou mot de passe incorrect.";
    case "auth/too-many-requests": return "Trop de tentatives. Réessayez plus tard.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return "";
    default: return "Une erreur est survenue. Réessayez.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setModalOpen(false); // referme la modale après connexion
    });
    return () => unsub();
  }, []);

  function ensureConfigured(): boolean {
    if (!auth) {
      toast.info("Mode démo : connectez Firebase pour activer la connexion.");
      return false;
    }
    return true;
  }

  async function signInWithGoogle() {
    if (!ensureConfigured()) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth!, provider);
      toast.success("Connecté ✅");
    } catch (e) {
      const msg = authErrorMessage((e as { code?: string })?.code);
      if (msg) toast.error(msg);
      throw e;
    }
  }

  async function signInWithEmail(email: string, password: string) {
    if (!ensureConfigured()) throw new Error("non configuré");
    try {
      await signInWithEmailAndPassword(auth!, email.trim(), password);
      toast.success("Connecté ✅");
    } catch (e) {
      throw new Error(authErrorMessage((e as { code?: string })?.code) || "Erreur");
    }
  }

  async function signUpWithEmail(email: string, password: string, name?: string) {
    if (!ensureConfigured()) throw new Error("non configuré");
    try {
      const cred = await createUserWithEmailAndPassword(auth!, email.trim(), password);
      if (name && name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
        // On rafraîchit l'utilisateur SANS le copier (le spread casserait les
        // méthodes comme getIdToken). onAuthStateChanged garde l'instance à jour ;
        // on force juste un re-render avec la même instance.
        setUser(auth!.currentUser);
      }
      toast.success("Compte créé, bienvenue ! 🎉");
    } catch (e) {
      throw new Error(authErrorMessage((e as { code?: string })?.code) || "Erreur");
    }
  }

  async function resetPassword(email: string) {
    if (!ensureConfigured()) throw new Error("non configuré");
    try {
      await sendPasswordResetEmail(auth!, email.trim());
      toast.success("Email de réinitialisation envoyé.");
    } catch (e) {
      throw new Error(authErrorMessage((e as { code?: string })?.code) || "Erreur");
    }
  }

  async function signOut() {
    if (!auth) return;
    await fbSignOut(auth);
    toast.info("Déconnecté.");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: isFirebaseConfigured,
        openAuth: () => setModalOpen(true),
        closeAuth: () => setModalOpen(false),
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
