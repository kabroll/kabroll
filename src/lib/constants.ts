// Paramètres globaux du canvas et de la tarification.
// Centralisés ici pour pouvoir tout ajuster en un seul endroit.

/** Côté de la grille (1000 x 1000 = 1 000 000 de pixels). */
export const GRID_SIZE = 1000;

/** Nombre total de pixels disponibles. */
export const TOTAL_PIXELS = GRID_SIZE * GRID_SIZE;

/** Prix d'un pixel, en euros. */
export const PRICE_PER_PIXEL_EUR = 1;

/** Prix d'un pixel exprimé en centimes (unité attendue par Stripe). */
export const PRICE_PER_PIXEL_CENTS = Math.round(PRICE_PER_PIXEL_EUR * 100);

/** Taille minimale d'un bloc achetable (en pixels de côté). */
export const MIN_BLOCK_SIDE = 1;

/** Taille maximale d'un bloc achetable en une fois (en pixels de côté). */
export const MAX_BLOCK_SIDE = 1000;

/** Durée de validité d'une réservation en attente de paiement (ms). */
export const RESERVATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Nom de la collection Firestore qui stocke les blocs de pixels. */
export const PIXELS_COLLECTION = "pixels";

/** Nom de la collection Firestore qui stocke les agrégats par utilisateur. */
export const USERS_COLLECTION = "users";

/** Formatte un montant en euros pour l'affichage (locale FR). */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Formatte un entier avec séparateurs de milliers (locale FR). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
