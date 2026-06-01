import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente — PixelMillions",
  robots: { index: true, follow: true },
};

export default function CgvPage() {
  return (
    <LegalLayout title="Conditions Générales de Vente">
      <p>
        Les présentes conditions générales de vente (« CGV ») régissent l’achat
        et la revente de pixels sur le site <strong>PixelMillions</strong>
        (pixelmillions.com), exploité par <span className="todo">[exploitant —
        micro-entreprise]</span> (ci-après « l’Éditeur »). Toute commande
        implique l’acceptation pleine et entière des présentes CGV.
      </p>

      <h2>1. Objet et description du service</h2>
      <p>
        PixelMillions est une œuvre d’art numérique collaborative composée d’un
        canvas d’un million de pixels. Les utilisateurs achètent un ou plusieurs
        pixels afin d’y afficher une couleur, une image ou un logo, accompagné
        éventuellement d’un lien et d’un message. Les pixels achetés sont
        rattachés au compte de l’utilisateur.
      </p>

      <h2>2. Prix</h2>
      <p>
        Le prix de vente d’un pixel est indiqué sur le site au moment de la
        commande (à titre indicatif, 1&nbsp;€ par pixel). Les prix sont exprimés
        en euros. En application de l’article 293 B du CGI, la TVA n’est pas
        applicable (franchise en base). Le montant total dû est affiché avant
        validation du paiement.
      </p>

      <h2>3. Commande et paiement</h2>
      <p>
        La commande est validée après paiement intégral via notre prestataire
        <strong> Stripe</strong>. Le paiement par carte bancaire est sécurisé.
        Les pixels sont attribués au compte de l’acheteur une fois le paiement
        confirmé. En cas d’échec du paiement, la réservation des pixels est
        annulée et ceux-ci redeviennent disponibles.
      </p>

      <h2>4. Contenus publiés par l’utilisateur</h2>
      <p>
        L’utilisateur est seul responsable des contenus qu’il publie (couleurs,
        images, logos, liens, messages). Il garantit en détenir les droits et
        s’engage à ne publier aucun contenu :
      </p>
      <ul>
        <li>illégal, diffamatoire, haineux, violent ou pornographique ;</li>
        <li>portant atteinte aux droits de tiers (marques, droits d’auteur, vie privée) ;</li>
        <li>trompeur, frauduleux ou renvoyant vers un site malveillant.</li>
      </ul>
      <p>
        L’Éditeur se réserve le droit de retirer tout contenu non conforme,
        <strong> sans remboursement</strong>, et de suspendre le compte
        concerné.
      </p>

      <h2>5. Droit de rétractation</h2>
      <p>
        Conformément à l’article L.221-28 du Code de la consommation, le droit
        de rétractation ne s’applique pas à la fourniture de contenus numériques
        non fournis sur support matériel dont l’exécution a commencé après
        accord préalable exprès du consommateur. En validant sa commande,
        l’utilisateur <strong>demande expressément l’exécution immédiate</strong>
        du service (attribution des pixels) et <strong>reconnaît renoncer à son
        droit de rétractation</strong> une fois les pixels attribués.
      </p>

      <h2>6. Revente entre utilisateurs (marketplace)</h2>
      <p>
        Un utilisateur peut proposer ses pixels (ou une création entière) à la
        revente, à un prix qu’il fixe librement. Un autre utilisateur peut les
        racheter ou faire une offre. Lors d’un rachat :
      </p>
      <ul>
        <li>la propriété des pixels est transférée à l’acheteur après paiement ;</li>
        <li>le prix est encaissé via Stripe ;</li>
        <li>les modalités de reversement au vendeur sont précisées sur le site ;
          en l’absence de dispositif de reversement automatique actif, le produit
          de la revente est conservé par l’Éditeur jusqu’à mise en place dudit
          dispositif.</li>
      </ul>
      <p>
        L’Éditeur agit comme intermédiaire technique et n’est pas responsable des
        contenus échangés entre utilisateurs.
      </p>

      <h2>7. Clôture de l’œuvre et reversement</h2>
      <p>
        L’œuvre est clôturée à la date indiquée sur le site. À l’issue, le
        canvas est figé. <strong>Une partie du prix de vente de l’œuvre finale
        sera reversée</strong> à des projets d’éducation financière ainsi qu’à
        une ou plusieurs associations caritatives. Les modalités précises seront
        communiquées sur le site.
      </p>

      <h2>8. Disponibilité et responsabilité</h2>
      <p>
        L’Éditeur s’efforce d’assurer la disponibilité du service mais ne saurait
        être tenu responsable des interruptions, bugs ou pertes de données
        indépendantes de sa volonté. Sa responsabilité est limitée au montant de
        la commande concernée.
      </p>

      <h2>9. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans notre{" "}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>10. Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit français. En cas de litige, une
        solution amiable sera recherchée avant toute action judiciaire.
        Conformément à l’article L.612-1 du Code de la consommation, le
        consommateur peut recourir gratuitement à un médiateur de la
        consommation : <span className="todo">[médiateur à désigner]</span>.
        Plateforme européenne de règlement des litiges :{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
      </p>
    </LegalLayout>
  );
}
