import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité — PixelMillions",
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        La présente politique décrit comment <strong>PixelMillions</strong>
        (pixelmillions.com) collecte et traite vos données personnelles,
        conformément au Règlement général sur la protection des données (RGPD).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <span className="todo">[Exploitant — micro-entreprise]</span>, joignable
        à l’adresse <span className="todo">[email de contact]</span>.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Compte</strong> : adresse e-mail, nom affiché, identifiant (via Google ou email/mot de passe).</li>
        <li><strong>Achats</strong> : pixels achetés, montants, historique de transactions.</li>
        <li><strong>Contenus publiés</strong> : couleurs, images, liens et messages que vous placez sur le canvas.</li>
        <li><strong>Données techniques</strong> : informations de connexion strictement nécessaires au fonctionnement du service.</li>
      </ul>
      <p>
        Les données de paiement (numéro de carte, etc.) sont traitées
        directement par <strong>Stripe</strong> et ne sont jamais stockées par
        PixelMillions.
      </p>

      <h2>3. Finalités</h2>
      <ul>
        <li>création et gestion de votre compte ;</li>
        <li>traitement des achats et reventes de pixels ;</li>
        <li>affichage public de vos pixels sur le canvas (et du nom associé) ;</li>
        <li>respect de nos obligations légales et comptables.</li>
      </ul>

      <h2>4. Affichage public</h2>
      <p>
        Les pixels que vous achetez, ainsi que le nom d’affichage associé, sont
        <strong> visibles publiquement</strong> sur le canvas, le classement et
        la place de marché. Afin de protéger votre vie privée, lorsque votre
        identifiant est une adresse e-mail, celle-ci est <strong>masquée</strong>
        à l’affichage (ex. « ma***@gmail.com »).
      </p>

      <h2>5. Base légale</h2>
      <p>
        Le traitement repose sur l’exécution du contrat (fourniture du service),
        votre consentement (création de compte) et le respect de nos obligations
        légales.
      </p>

      <h2>6. Destinataires et sous-traitants</h2>
      <ul>
        <li><strong>Google Firebase</strong> (authentification, base de données, stockage des images) ;</li>
        <li><strong>Stripe</strong> (paiements) ;</li>
        <li><strong>Vercel</strong> (hébergement).</li>
      </ul>
      <p>Aucune donnée n’est vendue à des tiers.</p>

      <h2>7. Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif, puis
        archivées le temps requis par les obligations légales (notamment
        comptables). Les pixels achetés et leur attribution peuvent être
        conservés au titre de l’intégrité de l’œuvre.
      </p>

      <h2>8. Vos droits</h2>
      <p>
        Vous disposez d’un droit d’accès, de rectification, d’effacement, de
        limitation, d’opposition et de portabilité de vos données. Pour les
        exercer, écrivez à <span className="todo">[email de contact]</span>. Vous
        pouvez également introduire une réclamation auprès de la CNIL
        (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
      </p>

      <h2>9. Cookies</h2>
      <p>
        PixelMillions utilise uniquement les cookies strictement nécessaires au
        fonctionnement du service (notamment pour maintenir votre session de
        connexion). Aucun cookie publicitaire ou de traçage tiers n’est déposé
        sans votre consentement.
      </p>
    </LegalLayout>
  );
}
