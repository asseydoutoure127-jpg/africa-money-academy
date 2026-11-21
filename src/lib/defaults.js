// Textes du site par défaut. L'admin peut les modifier (Admin > Textes du site).
// Les textes juridiques doivent être relus par un juriste ; ils sont rédigés pour être publiables en l'état.
// Mise en forme : « # Titre », « - liste », « **gras** », « [texte](https://lien) », lignes vides entre paragraphes.

export const PAGE_DEFAULTS = {
  'a-propos': {
    title: 'À propos',
    body: `# Notre mission

Africa Money Academy aide les débutants d'Afrique francophone à apprendre, pas à pas, à gagner de l'argent à partir de leur téléphone, en partant de zéro.

Nous parlons simplement, nous montrons des méthodes concrètes, et nous ne promettons jamais de résultat rapide ni garanti : chacun avance à son rythme, avec du travail.

# Comment nous enseignons

- Des formations écrites, claires, lisibles sur téléphone.
- Des modules à suivre dans l'ordre, avec un exercice à la fin de chaque leçon.
- Votre progression est enregistrée : vous reprenez là où vous vous êtes arrêté.
- Un accès à la formation achetée, depuis votre compte.

# Un site qui s'améliore chaque jour

Nous ajoutons et améliorons quelque chose sur le site chaque jour. Si vous voyez ce qui pourrait être mieux, dites-le-nous.

# Une question ?

Écrivez-nous depuis la page Contact.`,
  },
  contact: {
    title: 'Contact',
    body: `# Nous écrire

Une question avant d'acheter, un souci d'accès après un paiement ? Écrivez-nous en indiquant **l'adresse e-mail utilisée pour payer** : elle nous aide à vous retrouver vite.

# Nos délais

- Nous répondons en général sous 48 heures.
- **Vous avez payé et l'accès ne s'est pas ouvert ?** Nous réglons le problème dans les 48 heures qui suivent votre message.

# Vous ne recevez pas nos e-mails ?

Regardez dans vos courriers indésirables (spam). Si le message s'y trouve, marquez-le comme « pas un spam » pour recevoir les prochains dans votre boîte principale.`,
  },
  cgu: {
    title: "Conditions d'utilisation",
    body: `Dernière mise à jour : novembre 2026.

# 1. Qui sommes-nous

Le site Africa Money Academy propose des formations en ligne, écrites, pour apprendre à gagner de l'argent à partir de son téléphone. Pour toute question, utilisez la page Contact.

# 2. Accepter ces conditions

En créant un compte ou en achetant une formation, vous acceptez ces conditions. Si vous n'êtes pas d'accord, n'utilisez pas le site.

# 3. Votre compte

Vous devez donner une adresse e-mail valide et la confirmer. Vous êtes responsable de votre mot de passe. Un compte est personnel : l'accès ne se partage pas et ne se prête pas.

# 4. Achats et accès

- Le prix de chaque formation est affiché avant le paiement.
- Le paiement se fait sur la page de paiement sécurisée de notre prestataire, Chariow. Nous ne voyons ni ne gardons vos données bancaires.
- L'accès s'ouvre sur le compte dont l'adresse e-mail est celle utilisée pour payer, dès que le paiement est confirmé.
- Si le paiement est pris mais que l'accès ne s'ouvre pas, écrivez-nous : nous réglons le problème dans les 48 heures.

# 5. Contenus et propriété

Les formations, textes, images et exercices sont protégés. Vous pouvez les suivre pour votre usage personnel. Il est interdit de les copier, de les diffuser, de les revendre ou de partager votre accès.

# 6. Aucune promesse de gains

Les formations expliquent des méthodes. Elles ne garantissent aucun revenu : les résultats dépendent de votre travail, de votre situation et de votre marché. Les exemples chiffrés servent à comprendre, pas à promettre.

# 7. Parrainage

Chaque compte a un lien de parrainage. Quand une personne crée son compte avec votre lien puis achète une formation payante, vous recevez une commission de 50 % du prix payé. Les règles complètes sont sur la page Parrainage. La commission est due 10 jours après l'achat (fin du délai de remboursement), à partir d'un minimum de 5 000 FCFA, et versée par notre équipe après vérification de l'achat. Un faux compte, un auto-parrainage ou une publicité trompeuse annulent la commission et peuvent entraîner la suspension du compte.

# 8. Suspension

Nous pouvons suspendre ou fermer un compte en cas de fraude, de partage d'accès, d'abus du parrainage ou de non-respect de ces conditions.

# 9. Disponibilité

Nous faisons de notre mieux pour que le site reste accessible, mais nous ne pouvons pas garantir qu'il fonctionne sans interruption.

# 10. Modifications

Nous pouvons modifier ces conditions. La date de mise à jour est indiquée en haut de cette page.

# 11. Contact

Pour toute question, utilisez la page Contact.`,
  },
  confidentialite: {
    title: 'Confidentialité',
    body: `Dernière mise à jour : novembre 2026.

# Ce que nous collectons

- Votre nom et votre adresse e-mail, quand vous créez un compte.
- Votre progression dans les formations et les réponses à vos exercices.
- Pour un achat : notre prestataire de paiement nous transmet votre nom, votre e-mail, votre pays et le produit acheté.
- Si vous parrainez : le lien qui a amené chaque nouveau compte.

Nous ne stockons **aucune donnée bancaire** : le paiement se fait chez notre prestataire.

# Pourquoi

Pour créer votre compte, ouvrir l'accès à vos formations, vous envoyer les e-mails utiles (confirmation, mot de passe oublié, achat) et suivre votre progression.

# Qui peut voir vos données

Notre équipe, et les services qui font fonctionner le site : l'hébergement, la base de données, l'envoi d'e-mails et le paiement. Nous ne vendons pas vos données et nous ne faisons pas de publicité.

# Vos réponses aux exercices

Les réponses que vous écrivez dans les exercices sont lues uniquement par l'administrateur et l'équipe de la formation, pour les valider et vous répondre. Elles ne sont jamais montrées aux autres élèves. Elles sont enregistrées dans notre base de données (hébergée aux États-Unis, chez un prestataire spécialisé). Elles sont effacées sur simple demande depuis la page Contact, ou automatiquement quand vous supprimez votre compte.

# Combien de temps

Tant que votre compte existe. Vous pouvez le supprimer depuis votre profil : vos données personnelles sont alors effacées. Certaines informations d'achat peuvent être conservées si la loi l'exige.

# Vos droits

Vous pouvez demander l'accès à vos données, leur correction ou leur suppression en nous écrivant depuis la page Contact.

# Cookies

Un seul cookie sert à vous garder connecté, et un autre retient pendant 30 jours le lien de parrainage qui vous a amené. Il n'y a pas de publicité ni de suivi publicitaire.

# E-mails

Nous vous écrivons pour les messages utiles au service. Ces e-mails peuvent arriver dans vos courriers indésirables : pensez à les vérifier.`,
  },
  remboursement: {
    title: 'Remboursement',
    body: `Dernière mise à jour : novembre 2026.

# Votre droit à être remboursé

Si la formation ne vous convient pas, vous pouvez demander un remboursement **dans les 7 jours après votre achat**, tant que vous avez suivi **moins de 20 %** de la formation. Ce pourcentage est celui affiché dans « Mon espace » : si la formation compte 15 leçons, vous avez suivi moins de 20 % tant que vous en avez terminé 2 ou moins (3 leçons = 20 %).

# Comment demander

Écrivez-nous depuis la page Contact avec :

- l'adresse e-mail utilisée pour payer ;
- le nom de la formation ;
- en une phrase, la raison de votre demande.

Nous répondons en général sous 48 heures.

# Le remboursement

Le remboursement est fait par le même moyen que le paiement, par l'intermédiaire de notre prestataire de paiement. Le délai d'arrivée de l'argent dépend de ce prestataire et de votre moyen de paiement. Quand un remboursement est accordé, l'accès à la formation est retiré.

# Paiement pris, mais pas d'accès

Ce n'est pas un cas de remboursement : c'est un problème à régler. Écrivez-nous : nous le réglons dans les 48 heures. Si nous ne pouvons pas ouvrir votre accès, nous vous remboursons.

# Parrainage

Si un achat est remboursé, la commission de parrainage liée à cet achat est annulée.`,
  },
  faq: {
    title: 'Questions fréquentes',
    body: `# Dois-je avoir de l'expérience ?

Non. Les formations partent de zéro et utilisent des mots simples.

# Combien de temps dure l'accès ?

Il n'y a pas de date de fin prévue : tant que le site fonctionne et que votre compte est actif, vous gardez l'accès à la formation achetée. Nous ne promettons pas « à vie », parce qu'aucun site ne peut garantir qu'il existera toujours. Si un jour le site devait fermer, nous préviendrions les élèves par e-mail.

# Je peux suivre depuis mon téléphone ?

Oui. Le site est pensé pour les téléphones, même avec une connexion lente.

# Je ne reçois pas l'e-mail de confirmation

Regardez dans vos courriers indésirables (spam). Si vous le trouvez là, marquez-le « pas un spam ». Sinon, connectez-vous et demandez un nouvel e-mail, ou écrivez-nous depuis la page Contact.

# J'ai payé mais je n'ai pas accès. Que faire ?

Vérifiez d'abord que vous êtes connecté avec l'adresse e-mail utilisée pour payer et que vous avez confirmé cette adresse. Puis cliquez sur « J'ai payé, vérifier mon achat ». Si l'accès ne s'ouvre toujours pas, écrivez-nous depuis la page Contact : nous réglons le problème dans les 48 heures.

# Puis-je être remboursé ?

Oui, dans les 7 jours si vous avez suivi moins de 20 % de la formation. Tous les détails sont dans la page Remboursement.

# Puis-je payer depuis mon pays ?

Les prix sont affichés en FCFA. Les moyens de paiement acceptés dépendent de votre pays et de la plateforme de paiement : ils s'affichent au moment de payer. Si vous n'êtes pas dans une zone FCFA (Guinée, RD Congo, Madagascar, Maghreb…) ou si vous n'êtes pas sûr que votre moyen de paiement passera, écrivez-nous avant d'acheter, par la page Contact.

# Comment fonctionne le parrainage ?

Vous partagez votre lien personnel. Quand un ami crée son compte avec ce lien puis achète une formation payante, vous recevez 50 % du prix. Voir la page Parrainage.

# Allez-vous me promettre de devenir riche ?

Non. Personne ne peut le faire honnêtement. Nous vous apprenons des méthodes ; les résultats dépendent de votre travail.`,
  },
};

export const PAGE_SLUGS = Object.keys(PAGE_DEFAULTS);
