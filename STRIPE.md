# Brancher Stripe (paiements)

Les clés API sont déjà dans `.env.local` (mode **test**). Il reste à activer
le **webhook** : c'est lui qui confirme un paiement et écrit les pixels en base.
Sans webhook, après paiement le bloc resterait en attente (`pending`).

## En local (développement)

### 1. Installer la CLI Stripe

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Se connecter

```bash
stripe login
```
(ouvre le navigateur, valide l'accès)

### 3. Écouter les webhooks et les renvoyer vers l'app

Dans un terminal **séparé** (laisse-le tourner pendant que tu développes) :

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

La commande affiche un **secret de webhook** :
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxx
```

### 4. Copier ce secret dans `.env.local`

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

Puis **redémarre** `npm run dev` (pour recharger l'env).

### 5. Tester un achat

- Lance `npm run dev` (terminal 1) + `stripe listen ...` (terminal 2)
- Sur le site, peins des pixels → **Payer**
- Page de paiement Stripe → utilise une **carte de test** :
  - Numéro : `4242 4242 4242 4242`
  - Date : n'importe quelle date future · CVC : 3 chiffres · Code postal : 5 chiffres
- Après paiement → retour sur `/success`, et le bloc apparaît sur le canvas
  (le webhook l'a activé).

> Cartes de test Stripe : https://stripe.com/docs/testing

---

## En production (Vercel)

1. **Dashboard Stripe → Développeurs → Webhooks → Ajouter un endpoint**
   - URL : `https://VOTRE-DOMAINE/api/webhook`
   - Événements : `checkout.session.completed` et `checkout.session.expired`
2. Copier le **secret de signature** affiché (`whsec_...`)
3. L'ajouter aux variables d'environnement Vercel :
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SITE_URL` = l'URL de prod
4. Passer en **clés live** (`sk_live_…`, `pk_live_…`) quand tu es prêt à
   encaisser de vrais paiements.

---

## Versement aux vendeurs (revente)

Le rachat transfère la **propriété** des pixels, mais pour reverser l'argent
au vendeur il faut **Stripe Connect** (comptes connectés). En attendant, le
montant dû est journalisé dans `users/{uid}.pendingPayout`.
Voir https://stripe.com/docs/connect
