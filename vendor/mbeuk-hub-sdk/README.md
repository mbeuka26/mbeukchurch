# mbeuk-hub-sdk

SDK officiel **JavaScript / TypeScript** pour le Hub central MbeukTechnologies.

Vos SaaS l’utilisent pour vérifier les licences, lire le catalogue, gérer les influenceurs (commission / code promo / lien) et lancer des checkouts Chariow.

## Installation

### Depuis ce monorepo (recommandé en local)

```bash
# Dans votre projet SaaS
npm install file:../mbeuk-commerce-hub/packages/mbeuk-hub-sdk
```

Ou après build + publication privée :

```bash
npm install mbeuk-hub-sdk
```

### Build du package

```bash
cd packages/mbeuk-hub-sdk
npm install
npm run build
```

## Démarrage rapide (SaaS)

```ts
import { MbeukHub, MbeukHubError } from "mbeuk-hub-sdk";

const hub = new MbeukHub({
  baseUrl: process.env.MBEUK_HUB_URL!,      // https://votre-hub.com
  apiKey: process.env.MBEUK_HUB_API_KEY!,   // mbs_...
});

// Vérifier une licence client
const result = await hub.licenses.verify({
  email: "client@exemple.com",
  product_id: "uuid-produit",
  device_identifier: "optional-fingerprint",
});

if (!result.valid) {
  console.log("Accès refusé:", result.reason);
}

// Catalogue
const { products } = await hub.products.list({ active: true });

// Checkout
const session = await hub.checkout.create({
  product_id: "…",
  customer_email: "client@exemple.com",
  promo_code: "AMB4F2A", // ou affiliate_slug / ref
});
```

## Auth clients SaaS (email + mot de passe)

Compte **par produit** (Option 0-A). Licences toujours liées à `(email, product_id)`.

```ts
await hub.auth.register({
  email: "client@exemple.com",
  password: "Secret123!",
  product_id: "uuid-produit",
});

const session = await hub.auth.login({
  email: "client@exemple.com",
  password: "Secret123!",
  product_id: "uuid-produit",
  device_identifier: "device-fingerprint",
});

// session.session_token / refresh_token
// session.license — même forme que licenses.verify()
// session.device_status === "device_limit_reached" → gérer appareils (revokeDevice), pas checkout

if (session.device_status === "device_limit_reached") {
  await hub.auth.revokeDevice({
    email: "client@exemple.com",
    product_id: "uuid-produit",
    device_identifier: "old-device-id",
    session_token: session.session_token,
  });
}

const reset = await hub.auth.requestPasswordReset({
  email: "client@exemple.com",
  product_id: "uuid-produit",
});
// reset.reset_token → le SaaS envoie l'email (Brevo), puis :
await hub.auth.resetPassword({
  token: reset.reset_token!,
  new_password: "NouveauSecret123!",
});
```

Doc Hub : `docs/HUB_AUTH_CUSTOMERS.md`

## Fichiers à extraire pour un SaaS (pack léger)

Après `npm run build` dans `packages/mbeuk-hub-sdk`, copiez **uniquement** :

1. `package.json`
2. `dist/index.js`
3. `dist/index.cjs`
4. `dist/index.d.ts`
5. `dist/index.d.cts` (si présent)
6. `README.md` (optionnel)

Ou sources minimales si vous rebuild côté SaaS :

- `src/index.ts`
- `src/client.ts`
- `src/http.ts`
- `src/errors.ts`
- `src/types.ts`
- `src/resources/auth.ts`
- `src/resources/licenses.ts` (+ autres ressources utilisées)
- `tsconfig.json` / scripts build du `package.json`

N’emportez **pas** `node_modules/`, tests, ni le reste du monorepo Hub.

## Influenceurs (commission + code promo + lien)

```ts
// Création (admin JWT)
const hubAdmin = new MbeukHub({
  baseUrl: process.env.MBEUK_HUB_URL!,
  bearerToken: adminAccessToken,
});

const { influencer, temporary_password } = await hubAdmin.influencers.create({
  name: "Alice Kouassi",
  email: "alice@exemple.com",
  commission_percentage: 15,
  // promo_code optionnel — généré auto sinon
});

// Lien d'affiliation storefront
const link = hubAdmin.influencers.buildAffiliateUrl(
  "https://shop.mbeukstore.com",
  influencer.promo_code!
);
// → https://shop.mbeukstore.com?ref=ALICEA1B2
```

## API exposée

| Ressource | Méthodes |
|-----------|----------|
| `hub.health()` | statut Hub |
| `hub.products` | `list`, `get`, `create`, `update`, `remove` |
| `hub.licenses` | `list`, `create`, `verify`, `activate`, `startTrial`, `sync` |
| `hub.influencers` | `list`, `get`, `create`, `update`, `remove`, `buildAffiliateUrl` |
| `hub.checkout` | `create` |
| `hub.saasApps` | `list` |
| `hub.apiKeys` | `list`, `create`, `revoke` (admin) |

## Auth

- **SaaS** : `apiKey: "mbs_..."` → header `X-API-Key`
- **Admin / Influenceur** : `bearerToken: "<jwt>"` → `Authorization: Bearer …`

## Erreurs

```ts
try {
  await hub.licenses.verify({ email, product_id });
} catch (e) {
  if (e instanceof MbeukHubError) {
    console.error(e.code, e.status, e.message);
  }
}
```

## Prérequis Hub

1. Migration `018_api_keys_central_hub.sql` appliquée
2. Clé créée via `POST /api/v1/admin/api-keys`
3. Doc API : `docs/API_CENTRAL.md` · OpenAPI : `docs/openapi.yaml`
