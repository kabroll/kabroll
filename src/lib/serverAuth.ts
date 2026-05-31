// Helpers serveur partagés par les routes API du marketplace.
import { getAdminAuth, isAdminConfigured } from "@/lib/firebaseAdmin";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Vérifie le backend et le jeton Firebase, retourne le uid de l'appelant. */
export async function requireUser(idToken: unknown): Promise<{ uid: string }> {
  if (!isAdminConfigured()) {
    throw new ApiError("Backend non configuré (Firebase Admin manquant).", 503);
  }
  if (!idToken || typeof idToken !== "string") {
    throw new ApiError("Authentification requise.", 401);
  }
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return { uid: decoded.uid };
}
