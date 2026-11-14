// Client de l'API Chariow (https://api.chariow.com/v1), d'après la documentation officielle.
// Points vérifiés dans la doc :
//  - Authorization: Bearer <clé sk_...> ; 100 requêtes/minute par clé ; 429 avec en-tête Retry-After ;
//  - POST /checkout (scope checkout.write) ; GET /products/{id|slug} (products.read) ;
//  - GET /sales (sales.read) : AUCUN filtre par produit ni par e-mail, seulement customer_id,
//    status, from/to, period, search (id de vente) ; pagination par curseur ;
//  - GET /customers (customers.pii.read) : `search` trouve un client par e-mail ;
//  - GET /sales/{id} : champ `is_access_revoked`.

const BASE_URL = 'https://api.chariow.com/v1';

export const MESSAGES = {
  missing_key: "La clé API Chariow n'est pas enregistrée. Collez-la dans Réglages > Connexions.",
  unauthorized: 'Chariow a refusé la clé API (401). Elle est fausse, supprimée ou expirée : créez-en une nouvelle dans Chariow.',
  forbidden: "La clé API n'a pas toutes les autorisations nécessaires (403). Ajoutez les autorisations manquantes dans Chariow > Paramètres > Clés API.",
  not_found: "Chariow ne trouve pas cet élément (404). Vérifiez l'identifiant et que le produit est publié.",
  conflict: 'Conflit côté Chariow (409).',
  validation: 'Chariow a refusé les informations envoyées (422). Vérifiez les champs.',
  business: 'Chariow a refusé cette opération (400).',
  rate_limited: 'Trop de requêtes vers Chariow (429). Réessayez dans une minute.',
  network: 'Impossible de joindre Chariow. Vérifiez la connexion et réessayez.',
  unexpected: 'Réponse inattendue de Chariow. Réessayez plus tard.',
};

export class ChariowError extends Error {
  constructor(kind, status, detail = {}) {
    super(MESSAGES[kind] || MESSAGES.unexpected);
    this.name = 'ChariowError';
    this.kind = kind;
    this.status = status ?? null;
    this.apiMessage = detail.apiMessage ?? null;
    this.scopes = detail.scopes ?? [];
    this.fieldErrors = detail.fieldErrors ?? null;
    this.retryAfter = detail.retryAfter ?? null;
  }
}

function errorKindForStatus(status) {
  if (status === 400) return 'business';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  return 'unexpected';
}

/**
 * @param {{ apiKey: string, fetchImpl?: typeof fetch, sleep?: (ms:number)=>Promise<void>,
 *           baseUrl?: string, maxRetries?: number, timeoutMs?: number }} opts
 */
export function createChariowClient(opts) {
  const {
    apiKey,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    baseUrl = BASE_URL,
    maxRetries = 2,
    timeoutMs = 15000,
  } = opts;

  async function request(method, path, { query, body } = {}) {
    if (!apiKey) throw new ChariowError('missing_key', null);
    const url = new URL(baseUrl + path);
    for (const [k, v] of Object.entries(query || {})) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetchImpl(url, {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new ChariowError('network', null);
      }

      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.ok) {
        if (json === null || typeof json !== 'object') throw new ChariowError('unexpected', res.status);
        return json;
      }

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after')) || 5;
        // La doc recommande de ne jamais réessayer avant la fin de Retry-After.
        if (attempt < maxRetries && retryAfter <= 10) {
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new ChariowError('rate_limited', 429, { retryAfter });
      }

      const kind = errorKindForStatus(res.status);
      throw new ChariowError(res.status >= 500 ? 'unexpected' : kind, res.status, {
        apiMessage: typeof json?.message === 'string' ? json.message : null,
        scopes: Array.isArray(json?.errors?.scopes) ? json.errors.scopes : [],
        fieldErrors: json?.errors && !Array.isArray(json.errors) ? json.errors : null,
      });
    }
  }

  // ---------- Produits ----------
  const getProduct = async (ref) => (await request('GET', `/products/${encodeURIComponent(ref)}`)).data;

  // ---------- Paiement ----------
  const initCheckout = async (payload) => (await request('POST', '/checkout', { body: payload })).data;

  // ---------- Pagination par curseur ----------
  async function listAll(path, query, maxPages = 10) {
    const out = [];
    let cursor;
    for (let i = 0; i < maxPages; i++) {
      const page = await request('GET', path, { query: { per_page: 100, ...query, cursor } });
      out.push(...(Array.isArray(page.data) ? page.data : []));
      if (!page.pagination?.has_more_pages || !page.pagination?.next_cursor) break;
      cursor = page.pagination.next_cursor;
    }
    return out;
  }

  /** Clients dont l'e-mail correspond EXACTEMENT (la recherche Chariow est approximative). */
  async function findCustomersByEmail(email) {
    const wanted = String(email).trim().toLowerCase();
    const found = await listAll('/customers', { search: wanted }, 3);
    return found.filter((c) => String(c.email || '').trim().toLowerCase() === wanted);
  }

  /** Ventes payées d'un client. `settled` = fonds reversés au vendeur : la vente est bien payée. */
  async function listPaidSalesForCustomer(customerId) {
    const [completed, settled] = await Promise.all([
      listAll('/sales', { customer_id: customerId, status: 'completed' }, 5),
      listAll('/sales', { customer_id: customerId, status: 'settled' }, 5),
    ]);
    return [...completed, ...settled];
  }

  /** Toutes les ventes payées d'une adresse e-mail (pas de filtre e-mail dans l'API : on passe par le client). */
  async function findPaidSalesByEmail(email) {
    const customers = await findCustomersByEmail(email);
    const sales = [];
    for (const c of customers) sales.push(...(await listPaidSalesForCustomer(c.id)));
    return sales;
  }

  /** Ventes payées depuis une date (AAAA-MM-JJ). */
  async function listPaidSalesSince(fromDate, maxPages = 10) {
    const [completed, settled] = await Promise.all([
      listAll('/sales', { status: 'completed', from: fromDate }, maxPages),
      listAll('/sales', { status: 'settled', from: fromDate }, maxPages),
    ]);
    return [...completed, ...settled];
  }

  const getSale = async (saleId) => (await request('GET', `/sales/${encodeURIComponent(saleId)}`)).data;

  /**
   * Teste la clé en appelant, pour de vrai, un point d'accès par autorisation nécessaire.
   * (`checkout.write` ne peut pas être testé sans créer une vente : une erreur 403 claire
   * apparaîtra lors du premier achat si elle manque.)
   */
  async function testKey() {
    const probes = [
      ['products.read', () => request('GET', '/products', { query: { per_page: 1 } })],
      ['sales.read', () => request('GET', '/sales', { query: { per_page: 1 } })],
      ['customers.pii.read', () => request('GET', '/customers', { query: { per_page: 1 } })],
    ];
    const checks = [];
    for (const [scope, run] of probes) {
      try {
        await run();
        checks.push({ scope, ok: true });
      } catch (e) {
        if (e instanceof ChariowError) {
          checks.push({ scope, ok: false, kind: e.kind, message: e.message, missingScopes: e.scopes });
          if (e.kind === 'missing_key' || e.kind === 'unauthorized' || e.kind === 'network') break;
        } else {
          checks.push({ scope, ok: false, kind: 'unexpected', message: MESSAGES.unexpected });
        }
      }
    }
    return { ok: checks.length > 0 && checks.every((c) => c.ok), checks };
  }

  return {
    request,
    getProduct,
    initCheckout,
    findCustomersByEmail,
    findPaidSalesByEmail,
    listPaidSalesSince,
    getSale,
    testKey,
  };
}

/** Types de produit qui peuvent passer par le checkout API (doc « Initiate Checkout »). */
export const API_INCOMPATIBLE_TYPES = ['service', 'coaching'];

/**
 * Analyse un produit renvoyé par l'API et dit s'il peut être utilisé pour une formation.
 * Retourne { ok, errors[], warnings[], summary }.
 */
export function assessProduct(product, mode) {
  const errors = [];
  const warnings = [];
  if (!product || !product.id) {
    return { ok: false, errors: ['Réponse de produit invalide.'], warnings, summary: null };
  }
  if (product.status !== 'published') {
    errors.push(
      product.status === 'draft'
        ? "Ce produit est en brouillon dans Chariow : publiez-le, sinon le paiement échouera (erreur 404)."
        : `Ce produit n'est pas publié dans Chariow (statut : ${product.status}).`,
    );
  }
  const pricingType = product.pricing?.type;
  if (mode === 'api') {
    if (API_INCOMPATIBLE_TYPES.includes(product.type)) {
      errors.push(`Les produits de type « ${product.type} » ne peuvent pas passer par le paiement depuis votre plateforme. Choisissez le mode « Lien direct ».`);
    }
    if (pricingType === 'what_you_want') {
      errors.push('Les produits à prix libre ne peuvent pas passer par le paiement depuis votre plateforme. Choisissez le mode « Lien direct ».');
    }
  }
  if (product.type === 'license') {
    warnings.push('Produit de type « licence » : chaque achat génère une nouvelle clé et les rachats sont permis. Pour une formation, préférez le type « cours ».');
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      status: product.status,
      pricingType: pricingType || null,
      isFree: Boolean(product.is_free),
    },
  };
}
