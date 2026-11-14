// Textes du site par défaut. L'admin peut les modifier (Admin > Textes du site).
// ⚠ Les textes juridiques sont des MODÈLES à faire relire par un juriste avant le lancement.
// Mise en forme : « # Titre », « - liste », « **gras** », « [texte](https://lien) », lignes vides entre paragraphes.

const LEGAL_NOTICE = "> Modèle de départ : à faire relire et adapter avant la mise en ligne.";

export const PAGE_DEFAULTS = {
  'a-propos': {
    title: 'À propos',
    body: `# Notre mission

Africa Money Academy aide les débutants d'Afrique francophone à apprendre, pas à pas, à gagner de l'argent sur Internet en partant de zéro.

Nous parlons simplement, nous montrons des méthodes concrètes, et nous ne promettons jamais de résultat rapide ni garanti : chacun avance à son rythme, avec du travail.

# Comment nous enseignons

- Des formations écrites, claires, lisibles sur téléphone.
- Des modules à suivre dans l'ordre, avec une progression visible.
- Un accès à vie à la formation achetée, tant que le site existe.

# Une question ?

Écrivez-nous depuis la page Contact.`,
  },
  contact: {
    title: 'Contact',
    body: `# Nous écrire

Une question avant d'acheter, un souci d'accès après un paiement ? Écrivez-nous et gardez l'adresse e-mail utilisée pour payer : elle nous aide à vous retrouver.

Nous répondons dès que possible.`,
  },
  cgu: {
    title: "Conditions d'utilisation",
    body: `${LEGAL_NOTICE}

# 1. Objet

Ces conditions encadrent l'utilisation du site et l'achat de formations en ligne proposées par Africa Money Academy.

# 2. Compte

Vous devez donner une adresse e-mail valide et la confirmer. Vous êtes responsable de votre mot de passe. Un compte est personnel : l'accès ne se partage pas.

# 3. Achats et accès

Le paiement est géré par notre prestataire de paiement. L'accès à une formation s'ouvre après confirmation du paiement, sur le compte dont l'adresse e-mail est celle utilisée pour payer.

# 4. Contenus

Les contenus sont protégés. Vous pouvez les suivre pour votre usage personnel ; vous ne pouvez ni les revendre, ni les diffuser.

# 5. Aucune promesse de gains

Les formations expliquent des méthodes. Elles ne garantissent aucun revenu : les résultats dépendent de votre travail et de votre situation.

# 6. Suspension

Nous pouvons suspendre un compte en cas de fraude, de partage d'accès ou de non-respect de ces conditions.

# 7. Contact

Pour toute question, utilisez la page Contact.`,
  },
  confidentialite: {
    title: 'Confidentialité',
    body: `${LEGAL_NOTICE}

# Ce que nous collectons

Votre nom, votre adresse e-mail et votre progression dans les formations. Pour un achat, notre prestataire de paiement nous transmet votre nom, votre e-mail, votre pays et le produit acheté.

Nous ne stockons **aucune donnée bancaire**.

# Pourquoi

Pour créer votre compte, ouvrir l'accès à vos formations, vous envoyer les e-mails utiles (confirmation, mot de passe oublié, achat) et suivre votre progression.

# Combien de temps

Tant que votre compte existe. Vous pouvez le supprimer depuis votre profil : vos données sont alors effacées.

# Vos droits

Vous pouvez demander l'accès à vos données, leur correction ou leur suppression en nous écrivant depuis la page Contact.

# Cookies

Un seul cookie est utilisé : celui qui vous garde connecté. Il n'y a pas de publicité.`,
  },
  remboursement: {
    title: 'Remboursement',
    body: `${LEGAL_NOTICE}

# Votre demande

Si la formation ne vous convient pas, écrivez-nous depuis la page Contact avec l'adresse e-mail utilisée pour payer.

# Délai

[À compléter : nombre de jours pendant lesquels une demande est acceptée, par exemple 7 jours.]

# Comment

[À compléter : conditions du remboursement, par exemple « si moins de 20 % de la formation a été suivie ».]

Quand un remboursement est accordé, l'accès à la formation est retiré.`,
  },
  faq: {
    title: 'Questions fréquentes',
    body: `# Dois-je avoir de l'expérience ?

Non. Les formations partent de zéro et utilisent des mots simples.

# Combien de temps dure l'accès ?

Vous gardez l'accès à la formation achetée avec votre compte.

# Je peux suivre depuis mon téléphone ?

Oui. Le site est pensé pour les téléphones, même avec une connexion lente.

# J'ai payé mais je n'ai pas accès. Que faire ?

Connectez-vous avec l'adresse e-mail utilisée pour payer, puis cliquez sur « J'ai payé, vérifier mon achat ». Si cela ne marche pas, écrivez-nous.

# Allez-vous me promettre de devenir riche ?

Non. Personne ne peut le faire honnêtement. Nous vous apprenons des méthodes ; les résultats dépendent de votre travail.`,
  },
};

export const PAGE_SLUGS = Object.keys(PAGE_DEFAULTS);
