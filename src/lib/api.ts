"use client";

// Helpers client pour appeler les routes API du marketplace (avec jeton Firebase).

import { auth } from "@/lib/firebase";

async function authedPost<T = unknown>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Connexion requise.");
  const idToken = await user.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur.");
  return data as T;
}

/** Met un bloc en vente au prix indiqué (euros). */
export function listBlock(blockId: string, price: number) {
  return authedPost("/api/listing", { blockId, action: "list", price });
}

/** Retire un bloc de la vente. */
export function unlistBlock(blockId: string) {
  return authedPost("/api/listing", { blockId, action: "unlist" });
}

/** Propose une offre de rachat sur un bloc. */
export function makeOffer(blockId: string, amount: number) {
  return authedPost("/api/offers", { blockId, amount });
}

/** Répond à une offre : accepter/refuser (vendeur) ou annuler (acheteur). */
export function respondOffer(
  offerId: string,
  action: "accept" | "reject" | "cancel",
) {
  return authedPost("/api/offers/respond", { offerId, action });
}

/** Lance le paiement de rachat d'un bloc en vente, puis redirige vers Stripe. */
export async function buyResale(blockId: string) {
  const data = await authedPost<{ url: string }>("/api/create-checkout", {
    type: "resale",
    blockId,
  });
  if (!data.url) throw new Error("Réponse de paiement invalide.");
  window.location.href = data.url;
}
