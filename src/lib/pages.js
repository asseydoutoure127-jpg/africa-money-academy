// Textes du site : la version modifiée dans l'admin, sinon le texte par défaut.
import * as store from './store.js';
import { PAGE_DEFAULTS } from './defaults.js';

export async function getPageText(db, slug) {
  const def = PAGE_DEFAULTS[slug];
  if (!def) return null;
  const row = await store.getSitePage(db, slug);
  return row ? { slug, title: row.title, body: row.body, custom: true } : { slug, title: def.title, body: def.body, custom: false };
}
