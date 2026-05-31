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
