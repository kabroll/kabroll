/** Mode de remplissage d'un bloc de pixels. */
export type PixelFill = "color" | "image";

/** Statut d'un bloc dans Firestore. */
export type PixelStatus = "pending" | "active";

/** Un bloc rectangulaire de pixels acheté (ou en cours d'achat). */
export interface PixelBlock {
  id: string;
  /** Coin supérieur gauche (en cellules, 0..GRID_SIZE-1). */
  x: number;
  y: number;
  /** Dimensions en cellules. */
  w: number;
  h: number;
  fill: PixelFill;
  /** Couleur hex si fill === "color". */
  color?: string;
  /** URL de l'image si fill === "image". */
  imageUrl?: string;
  /** Lien cliquable associé au bloc. */
  link?: string;
  /** Message / légende (affiché au survol). */
  message?: string;
  /** Propriétaire. */
  ownerId?: string;
  ownerName?: string;
  status: PixelStatus;
  /** Timestamp de création (ms epoch). */
  createdAt?: number;
  /** Expiration d'une réservation "pending" (ms epoch). */
  expiresAt?: number;

  // ---- Marketplace (revente) ----
  /** Le bloc est-il proposé à la revente ? */
  forSale?: boolean;
  /** Prix de revente demandé (en euros). */
  salePrice?: number;
  /** Si défini, vente privée réservée à cet acheteur (offre acceptée). */
  reservedForUid?: string;
  reservedForName?: string;
  /** Nombre de fois que le bloc a changé de mains. */
  resaleCount?: number;
}

/** Statut d'une offre de rachat. */
export type OfferStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";

/** Une offre de rachat faite sur un bloc. */
export interface Offer {
  id: string;
  blockId: string;
  /** Acheteur potentiel. */
  fromUid: string;
  fromName: string;
  /** Propriétaire actuel (vendeur). */
  toUid: string;
  /** Montant proposé (en euros). */
  amount: number;
  status: OfferStatus;
  createdAt: number;
  updatedAt?: number;
  /** Aperçu du bloc au moment de l'offre (pour l'affichage). */
  blockSnapshot?: { x: number; y: number; w: number; h: number };
}

/** Sélection rectangulaire en cours sur le canvas. */
export interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Entrée du classement. */
export interface LeaderboardEntry {
  ownerId: string;
  ownerName: string;
  totalPixels: number;
  totalSpent: number;
  blocks: number;
}
