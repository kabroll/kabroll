// Utilitaires d'affichage : confidentialité des noms/emails.

/**
 * Masque une adresse email pour l'affichage public (anti-spam / RGPD).
 *   "marie.dupont@gmail.com" -> "ma***@gmail.com"
 *   "ab@x.fr"                -> "a***@x.fr"
 * Les valeurs qui ne sont pas des emails sont renvoyées telles quelles.
 */
export function maskEmail(value: string | undefined | null): string {
  if (!value) return "Anonyme";
  const at = value.indexOf("@");
  if (at <= 0) return value; // pas un email -> nom d'affichage, on garde
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const keep = Math.min(2, Math.max(1, local.length - 1));
  return `${local.slice(0, keep)}***@${domain}`;
}

/**
 * Nom public d'un propriétaire : si c'est un email, on le masque ;
 * sinon on renvoie le nom tel quel.
 */
export function publicOwnerName(name: string | undefined | null): string {
  return maskEmail(name);
}

/** Formatte un "il y a X" court (fr). */
export function timeAgo(ms: number | undefined, now: number = Date.now()): string {
  if (!ms) return "";
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const w = Math.floor(d / 7);
  return `il y a ${w} sem`;
}
