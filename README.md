# Africa Money Academy

Plateforme de formations en ligne (en français) pour débutants. Next.js 15, base Postgres (Neon), paiement et accès via Chariow, e-mails via Resend.

## Mise en route en 10 minutes

1. **Base de données (Neon)** : copiez l'adresse de connexion Postgres.
2. **Vercel** : importez ce dépôt GitHub. Ajoutez les variables d'environnement :
   - `DATABASE_URL` : l'adresse Neon.
   - `APP_SECRET` : une longue phrase aléatoire (32 caractères minimum). **Ne la changez plus ensuite** (elle chiffre les clés enregistrées).
   - `SITE_URL` : l'adresse HTTPS finale du site (ex. `https://academie.exemple.com`).
   - `SETUP_TOKEN` : un code secret (16 caractères minimum) pour créer le premier administrateur.
   - `CRON_SECRET` : un autre code secret (protège la tâche de rattrapage).
3. **Désactivez « Vercel Authentication »** (Project Settings > Deployment Protection), sinon Chariow ne pourra pas joindre le site. Utilisez de préférence un domaine à vous.
4. Déployez. Les tables sont créées automatiquement (`npm run migrate` est lancé au build).
5. Ouvrez `https://votre-site/setup`, saisissez `SETUP_TOKEN` et créez votre compte administrateur.
6. **Admin > Réglages > Connexions** :
   - collez la clé API Chariow (`sk_…`, autorisations `products.read`, `sales.read`, `customers.pii.read`, `checkout.write`) puis « Tester la clé API » ;
   - dans Chariow > Automatisations > Pulses, créez un Pulse avec l'adresse affichée et l'événement `successful.sale`, puis collez le secret `whsec_…` ;
   - envoyez un événement de test depuis Chariow, puis « Dernier Pulse reçu » ;
   - clé Resend et adresse d'expéditeur (domaine vérifié chez Resend).
7. **Admin > Formations** : créez une formation, collez l'identifiant du produit Chariow, « Vérifier le produit », ajoutez modules et leçons, puis « Publier ».
8. **Faites un vrai achat test** avec une adresse e-mail à vous. Vérifiez que l'accès s'ouvre tout seul.

## Comment l'accès après paiement fonctionne

- Chariow envoie un Pulse signé (`successful.sale`). Le site vérifie la signature sur le corps brut, l'enregistre, répond 200, puis traite.
- L'accès est lié à la **vente payée** (pas à une licence) et à une **adresse e-mail confirmée**. Sans compte confirmé, l'achat attend (« Achats en attente ») et s'active à la confirmation.
- Filets de sécurité : bouton « J'ai payé, vérifier mon achat » (apprenant), « Vérifier les ventes maintenant » (admin), tâche quotidienne `/api/cron/reconcile` (offre Hobby de Vercel : une fois par jour maximum), accès manuel, détection des remboursements, alertes dans le tableau de bord.

## Points à confirmer au premier achat réel (non documentés par Chariow)

- Format du téléphone attendu par l'API (numéro national ou international ?).
- Contenu des événements `license.*` (ignorés pour l'instant, l'accès repose sur la vente).
- Variable de retour après paiement : la page de retour utilise une adresse fixe et ne dépend d'aucun paramètre Chariow.

## Développement

```
npm install
npm run dev
npm test      # tests unitaires et de flux (nécessitent un Postgres local pour flow.test.mjs)
```

Variables : voir `.env.example`. Sauvegardes : activez la restauration dans Neon ; exportez régulièrement la base.

## Pas encore fait (étapes suivantes)

Devoirs, examens, certificats PDF, stockage de fichiers (R2), témoignages.
Les textes légaux sont des **modèles** à faire relire par un juriste.
