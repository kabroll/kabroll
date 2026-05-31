// Client Stripe côté serveur (initialisation paresseuse).
import Stripe from "stripe";

let cached: Stripe | null = null;

/** Retourne l'instance Stripe, en lançant une erreur claire si non configurée. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante : configurez vos clés Stripe.");
  }
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
