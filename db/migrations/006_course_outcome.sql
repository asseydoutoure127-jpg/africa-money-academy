-- Résultat concret promis à la fin de chaque formation (affiché sur les cartes et la page de formation).
alter table courses add column if not exists outcome text not null default '';

update courses set outcome = 'un budget écrit avec vos vrais chiffres et un premier montant mis de côté.' where slug = 'bases-de-largent' and outcome = '';
update courses set outcome = 'un produit choisi, une vitrine WhatsApp Business prête et un prix qui laisse un vrai bénéfice.' where slug = 'vendre-sur-whatsapp-et-reseaux-sociaux' and outcome = '';
update courses set outcome = 'une offre claire, un profil avec trois exemples de travail et un plan de 90 jours.' where slug = 'freelance-vendre-ses-competences-en-ligne' and outcome = '';
update courses set outcome = 'une idée testée en petit, vos prix et votre point d’équilibre calculés, et un plan de 90 jours.' where slug = 'lancer-une-petite-activite-rentable' and outcome = '';
update courses set outcome = 'un produit numérique prêt à publier, sa page de vente et un plan de 90 jours.' where slug = 'creer-et-vendre-un-produit-numerique' and outcome = '';
