import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Mentions légales — PixelMillions",
  robots: { index: true, follow: true },
};

// NOTE : remplacez tous les champs [À COMPLÉTER] par vos informations réelles.
export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>PixelMillions</strong> (pixelmillions.com) est édité par :
      </p>
      <ul>
        <li>Nom / Prénom de l’exploitant : <span className="todo">[À COMPLÉTER]</span></li>
        <li>Statut : Entrepreneur individuel (micro-entreprise)</li>
        <li>Adresse : <span className="todo">[À COMPLÉTER]</span></li>
        <li>Numéro SIRET : <span className="todo">[À COMPLÉTER]</span></li>
        <li>Adresse e-mail de contact : <span className="todo">[À COMPLÉTER, ex. contact@pixelmillions.com]</span></li>
      </ul>
      <p>
        TVA non applicable, article 293 B du Code général des impôts (franchise
        en base de TVA applicable aux micro-entreprises).
      </p>

      <h2>Directeur de la publication</h2>
      <p><span className="todo">[À COMPLÉTER — généralement l’exploitant]</span></p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave
        #4133, Walnut, CA 91789, États-Unis — <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>.
      </p>
      <p>
        Les données (comptes, pixels, images) sont stockées via <strong>Google
        Firebase</strong> (Google Ireland Limited, Gordon House, Barrow Street,
        Dublin 4, Irlande).
      </p>

      <h2>Paiements</h2>
      <p>
        Les paiements sont traités de manière sécurisée par <strong>Stripe
        Payments Europe, Ltd.</strong> (1 Grand Canal Street Lower, Dublin,
        Irlande). PixelMillions n’a jamais accès aux données complètes de votre
        carte bancaire.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La structure du site, son design et ses contenus (hors contenus
        publiés par les utilisateurs) sont la propriété de l’éditeur. Toute
        reproduction non autorisée est interdite. Les images et logos publiés
        par les utilisateurs restent la responsabilité de ces derniers, qui
        garantissent en détenir les droits.
      </p>

      <h2>Responsabilité</h2>
      <p>
        L’éditeur met en œuvre les moyens raisonnables pour assurer
        l’exactitude des informations et la disponibilité du service, sans
        garantie d’absence d’interruption ou d’erreur. Les contenus publiés par
        les utilisateurs (images, liens) n’engagent que leurs auteurs.
      </p>

      <h2>Signalement d’un contenu</h2>
      <p>
        Pour signaler un contenu illicite ou inapproprié publié sur le canvas,
        écrivez à <span className="todo">[email de contact]</span>. Nous nous
        réservons le droit de retirer tout contenu contraire à la loi ou à nos
        conditions, sans remboursement.
      </p>
    </LegalLayout>
  );
}
