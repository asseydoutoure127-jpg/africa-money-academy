// Messages affichés après une action (paramètre d'adresse `?m=code`). Phrases courtes, mots simples.
export const FLASH = {
  // Comptes
  inscrit: ['ok', 'Votre compte est créé. Nous vous avons envoyé un e-mail pour confirmer votre adresse.'],
  email_ok: ['ok', 'Votre adresse e-mail est confirmée. Merci !'],
  email_lien: ['err', "Ce lien de confirmation n'est plus valable. Connectez-vous et demandez un nouvel e-mail."],
  verif_envoyee: ['ok', 'E-mail envoyé. Regardez aussi dans vos courriers indésirables (spam).'],
  verif_limite: ['err', "Trop de demandes d'e-mail. Réessayez dans une heure."],
  identifiants: ['err', 'E-mail ou mot de passe incorrect.'],
  trop_essais: ['err', 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'],
  nom_invalide: ['err', 'Écrivez votre nom (2 lettres au minimum).'],
  email_invalide: ['err', "Cette adresse e-mail n'est pas valide."],
  mdp_court: ['err', 'Le mot de passe doit avoir au moins 8 caractères.'],
  mdp_different: ['err', 'Les deux mots de passe ne sont pas identiques.'],
  mdp_actuel: ['err', "Le mot de passe actuel n'est pas correct."],
  cgu_requis: ['err', "Cochez la case pour accepter les conditions d'utilisation."],
  compte_existe: ['err', 'Un compte existe déjà avec cette adresse. Connectez-vous ou demandez un nouveau mot de passe.'],
  reset_envoye: ['ok', 'Si cette adresse a un compte, un e-mail vient de partir. Regardez aussi vos spams.'],
  reset_lien: ['err', "Ce lien n'est plus valable. Refaites la demande de nouveau mot de passe."],
  mdp_ok: ['ok', 'Mot de passe changé. Vous pouvez vous connecter.'],
  mdp_change: ['ok', 'Votre mot de passe est changé.'],
  profil_ok: ['ok', 'Vos informations sont enregistrées.'],
  deconnecte: ['ok', 'Vous êtes déconnecté.'],
  compte_supprime: ['ok', 'Votre compte et vos données sont supprimés.'],
  suppression_confirmation: ['err', 'Pour supprimer le compte, écrivez SUPPRIMER et votre mot de passe.'],
  dernier_admin: ['err', "Vous êtes le seul administrateur : le compte ne peut pas être supprimé."],

  // Achat et accès
  deja_acces: ['ok', 'Vous avez déjà accès à cette formation.'],
  gratuit_ok: ['ok', 'Inscription réussie. Bonne formation !'],
  achat_trouve: ['ok', 'Achat retrouvé : votre accès est activé.'],
  achat_deja: ['ok', 'Votre achat est bien enregistré : vous avez déjà accès.'],
  achat_introuvable: ['err', "Nous ne trouvons pas d'achat payé avec votre adresse e-mail. Si vous avez payé avec une autre adresse, écrivez-nous."],
  verif_email: ['err', "Confirmez d'abord votre adresse e-mail (lien reçu à l'inscription), puis recommencez."],
  verif_indispo: ['err', "La vérification est momentanément indisponible. Réessayez dans quelques minutes ou contactez le support."],
  verif_trop: ['err', 'Trop de vérifications. Patientez 10 minutes.'],
  achat_indispo: ['err', "Le paiement est momentanément indisponible. Réessayez plus tard ou contactez le support."],
  achat_champs: ['err', 'Vérifiez vos informations : prénom, nom, pays et numéro de téléphone.'],
  achat_telephone: ['err', "Le numéro de téléphone n'est pas accepté pour ce pays. Écrivez-le sans l'indicatif."],
  achat_trop: ['err', 'Trop de demandes. Patientez une minute et réessayez.'],
  achat_mode: ['err', "Cette formation ne se paie pas depuis le site. Utilisez le bouton « Acheter » de la page de la formation."],
  acces_verrouille: ['err', "Ce module est verrouillé. Terminez d'abord le module précédent."],
  lecon_ok: ['ok', 'Leçon terminée. Bravo !'],

  // Admin
  admin_ok: ['ok', 'Enregistré.'],
  admin_erreur: ['err', "L'opération a échoué. Vérifiez les informations."],
  admin_publie: ['ok', 'La formation est publiée.'],
  admin_sans_produit: ['err', "Impossible de publier : collez d'abord l'identifiant du produit Chariow, puis cliquez sur « Vérifier le produit »."],
  admin_produit_ko: ['err', "Impossible de publier : le produit Chariow n'est pas utilisable. Cliquez sur « Vérifier le produit » pour voir pourquoi."],
  admin_api_ko: ['err', "Impossible de joindre Chariow avec la clé enregistrée. Vérifiez Réglages > Connexions."],
  admin_slug: ['err', 'Cette adresse de formation est déjà utilisée.'],
  secret_ajoute: ['ok', 'Secret enregistré.'],
  secret_invalide: ['err', 'Le secret doit commencer par whsec_ (ce n’est pas la clé API sk_...).'],
  cle_invalide: ['err', 'La clé API doit commencer par sk_ (ce n’est pas le secret whsec_...).'],
};

export function flashFor(code) {
  const entry = code && FLASH[code];
  return entry ? { type: entry[0], text: entry[1] } : null;
}
