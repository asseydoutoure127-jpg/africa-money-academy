# Plan de migration Vercel → Cloudflare Workers (à lancer seulement sur décision)

Statut : **préparé, non lancé.** Le site reste sur Vercel gratuit jusqu'à ce que l'hébergement payant soit possible.
Cible : Cloudflare Workers via l'adaptateur OpenNext (`@opennextjs/cloudflare`), plan payant à 5 $/mois (le gratuit plafonne à 100 000 requêtes/jour et 10 ms de calcul par requête).

## Ce que le code utilise (inventaire du 21/11/2026)
- Dépendances : `next` 15.5, `react` 19, `pg` seulement. Très léger, c'est un atout.
- `pg` (connexion TCP directe à Neon) : à tester sous Workers (`nodejs_compat`) ; sinon passer au pilote serverless de Neon.
- `src/lib/mail.js` : client SMTP écrit à la main avec `node:net` / `node:tls` vers Gmail. **Point le plus risqué** : à tester sur Workers. Alternative : envoi par API HTTP (Resend demande un domaine à soi).
- `node:crypto` (6 fichiers) : bien géré par `nodejs_compat`.
- `scripts/migrate.mjs` (`fs`, `path`) : tourne au build, pas sur le serveur ; à lancer depuis la CI ou à la main.
- `vercel.json` : région iad1 et **tâche planifiée** `/api/cron/reconcile` (tous les jours à 3 h). À remplacer par un Cron Trigger Cloudflare qui appelle la même route avec `CRON_SECRET`.
- Routes avec `runtime = 'nodejs'` (achat/statut, cron, webhook Chariow) : à vérifier avec OpenNext.
- Variables d'environnement : `DATABASE_URL`, `CRON_SECRET`, `SETUP_TOKEN` (+ réglages stockés en base). À recopier dans Cloudflare.
- Le webhook Chariow (Pulse) pointe vers l'adresse du site : à mettre à jour si l'adresse change.

## Étapes
1. Créer le compte Cloudflare, ajouter la carte, passer au plan Workers payant.
2. Ajouter `@opennextjs/cloudflare` + `wrangler`, `open-next.config`, `wrangler.jsonc` (`nodejs_compat`, date ≥ 2024-09-23).
3. Déployer sur une adresse de test, **avec la même base** (aucune écriture de test sur de vraies données : utiliser une branche Neon de test).
4. Tests : inscription, connexion, e-mail de confirmation (SMTP), leçon, exercice, achat (Pulse), classement, admin, cron.
5. Mesurer le temps de calcul par requête et le nombre de requêtes par visite.
6. Si tout passe : changer l'adresse du webhook Chariow, l'adresse du site (`SITE_URL`/réglage), puis basculer. Garder Vercel actif quelques jours pour revenir en arrière.

## Risques connus
Voir la conversation du 21/11/2026 : limite 10 ms du gratuit, `pg` en TCP, SMTP maison, taille du paquet, middleware Node non géré.
