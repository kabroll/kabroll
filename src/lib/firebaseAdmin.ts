// Initialisation du SDK Firebase ADMIN (côté serveur uniquement).
// Utilisé par les routes API (création de checkout, webhook Stripe) pour
// écrire dans Firestore avec des privilèges élevés.
//
// L'initialisation est paresseuse : elle n'a lieu que lorsqu'une route API
// l'appelle réellement, ce qui permet de "build" le projet sans credentials.

import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

function loadServiceAccount(): ServiceAccount {
  // Option A : JSON complet dans FIREBASE_SERVICE_ACCOUNT_KEY
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: (parsed.private_key as string)?.replace(/\\n/g, "\n"),
    };
  }

  // Option B : les trois champs séparés
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  throw new Error(
    "Firebase Admin non configuré : renseignez FIREBASE_SERVICE_ACCOUNT_KEY " +
      "ou (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).",
  );
}

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(loadServiceAccount()) });
  return cachedApp;
}

/** Retourne l'instance Firestore Admin (initialisée à la demande). */
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/** Retourne l'instance Auth Admin (initialisée à la demande). */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** True si les credentials Admin semblent présents. */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY),
  );
}
