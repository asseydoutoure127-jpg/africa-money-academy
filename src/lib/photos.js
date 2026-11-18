// Photos du site, par formation. `s` = petite version (cartes), `l` = grande version (en-têtes).
const P = (n) => ({ s: `/photos/${n}-s.jpg`, l: `/photos/${n}.jpg` });

export const COURSE_PHOTOS = {
  'bases-de-largent': P('budget'),
  'vendre-sur-whatsapp-et-reseaux-sociaux': P('rue-telephone'),
  'freelance-vendre-ses-competences-en-ligne': P('cafe'),
  'lancer-une-petite-activite-rentable': P('colis'),
  'creer-et-vendre-un-produit-numerique': P('montage'),
};
export const PHOTOS = { groupe: P('groupe'), equipe: P('equipe'), bureau: P('bureau-soir'), amis: P('amis-graphiques') };

export const photoForCourse = (slug) => COURSE_PHOTOS[slug] || null;
