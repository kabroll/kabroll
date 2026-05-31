# unmillion.fr

Canvas géant de **1 000 000 de pixels** : achetez une parcelle, posez une
couleur ou une image, et inscrivez votre marque dans l'histoire d'Internet.
Inspiré de _The Million Dollar Homepage_ (2005), façon r/place.

Stack : **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Firebase
(Auth + Firestore + Storage) · Stripe Checkout**.

---

## ✨ Fonctionnalités

- **Canvas interactif** (zoom molette, déplacement, sélection rectangulaire), rendu HTML5 Canvas.
- **Achat de pixels** : couleur unie ou image/logo, lien et message au survol.
- **Paiement Stripe Checkout** (1 € / pixel par défaut, configurable).
- **Auth Firebase** (Google).
- **Temps réel** : les pixels achetés apparaissent en direct (Firestore `onSnapshot`).
- **Classement** des plus gros acheteurs.
- **Profil** : mes pixels, total dépensé.
- **Anti-double-achat** : réservation serveur + vérification de chevauchement.
- **Mode démo** : l'app tourne sans configuration (données factices) le temps de tout brancher.

---

## 🚀 Démarrage

```bash
npm install
cp .env.local.example .env.local   # puis remplir les valeurs
npm run dev
```

Ouvrez http://localhost:3000. Sans `.env.local`, l'app démarre en **mode démo**.

---

## 🔌 Ce qu'il reste à brancher (les clés)

Tout le code est prêt. Il ne manque que les identifiants à coller dans
`.env.local` (voir `.env.local.example` pour le détail).

### 1) Firebase

1. Créez un projet sur https://console.firebase.google.com
2. **Authentication** → activez le fournisseur **Google**.
3. **Firestore Database** → créez la base (mode production).
4. **Storage** → activez-le.
5. **Paramètres du projet → Général** : copiez la config Web dans les variables
   `NEXT_PUBLIC_FIREBASE_*`.
6. **Paramètres → Comptes de service → Générer une nouvelle clé privée** :
   collez le JSON dans `FIREBASE_SERVICE_ACCOUNT_KEY` (sur une seule ligne).
7. Déployez les règles :
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
   (fichiers `firestore.rules` et `storage.rules` fournis)

> Pensez à autoriser votre domaine dans **Authentication → Settings → Domaines
> autorisés**, et à configurer **CORS** sur le bucket Storage si besoin.

### 2) Stripe

1. Récupérez vos clés sur https://dashboard.stripe.com/apikeys
   → `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. Créez un **webhook** vers `https://VOTRE-DOMAINE/api/webhook`
   (événements `checkout.session.completed` et `checkout.session.expired`),
   puis copiez le secret dans `STRIPE_WEBHOOK_SECRET`.
3. En local :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```

### 3) Application

- `NEXT_PUBLIC_SITE_URL` = URL publique du site (pour les redirections Stripe).

C'est tout : une fois ces variables remplies, l'achat réel est actif.

---

## 🧩 Réglages utiles

Dans `src/lib/constants.ts` :

| Constante | Rôle | Défaut |
|-----------|------|--------|
| `GRID_SIZE` | côté de la grille | `1000` |
| `PRICE_PER_PIXEL_EUR` | prix d'un pixel | `1` |
| `MIN_BLOCK_SIDE` / `MAX_BLOCK_SIDE` | bornes d'un bloc | `1` / `1000` |
| `RESERVATION_TTL_MS` | durée d'une réservation | `30 min` |

---

## 📁 Structure

```
src/
  app/
    layout.tsx              # layout + Auth + nav
    page.tsx                # canvas live + achat
    leaderboard/page.tsx    # classement
    profil/page.tsx         # profil
    success/ cancel/        # retours de paiement
    api/
      create-checkout/      # crée la session Stripe + réservation
      webhook/              # confirme/annule l'achat (Firestore)
  components/
    PixelCanvas.tsx         # canvas interactif
    BuyPanel.tsx            # panneau d'achat
    Header.tsx BottomNav.tsx AuthProvider.tsx
  lib/
    constants.ts types.ts geometry.ts
    firebase.ts firebaseAdmin.ts stripe.ts
    usePixels.ts mockData.ts
firestore.rules storage.rules
```

---

## ⚖️ Avant la mise en production

- **Modération** des images et liens uploadés (contenu illégal/NSFW).
- **Mentions légales / CGV / RGPD** (vente en France).
- Job de **nettoyage** des réservations `pending` expirées (Cloud Function planifiée).
- **Compression** des images uploadées et limites de taille (déjà dans `storage.rules`).
```
