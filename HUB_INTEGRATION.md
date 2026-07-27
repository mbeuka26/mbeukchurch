# HUB_INTEGRATION.md — MbeukChurch ↔ Hub Central MbeukTechnologies

Ce document résume la connexion de **MbeukChurch** au Hub Central
(licence + auth email/mot de passe + essai + réabonnement + quota
appareils). Il complète `GUIDE_DEPLOIEMENT.html` (guide non-développeur).

## 1. Ce qui a changé

| Avant | Après |
|---|---|
| Auth Supabase centrale (projet Supabase dédié, clé anon hardcodée dans `core/auth.js`) | Auth Hub Central via `mbeuk-hub-sdk` |
| Table `licenses` + clé `MBK-XXXX-XXXX-XXXX` à activer manuellement | Licence liée à `(email, product_id)`, gérée par le Hub |
| Table `user_devices` (quota appareils géré par le SaaS) | Quota `max_devices` géré exclusivement par le Hub |
| Lien statique `BUY_LINK` (Chariow) | `hub.checkout.create()` dynamique, avec le même email de compte |
| Onglet "Activer une licence" dans l'écran d'auth | **Retiré** |

Le **Cloud Sync BYODB** (chaque église connecte son propre projet Supabase
gratuit, `engines/cloud-sync.js`) est **inchangé** — il n'a aucun rapport
avec l'auth/licence.

## 2. Architecture ajoutée

```
vendor/mbeuk-hub-sdk/        ← SDK officiel vendorisé (dist/ + package.json)
lib/hub/client.js            ← instancie MbeukHub depuis process.env (SERVEUR uniquement)
api/hub/
  register.js                ← POST hub.auth.register
  login.js                   ← POST hub.auth.login
  refresh.js                 ← POST hub.auth.refreshSession
  forgot-password.js         ← POST hub.auth.forgotPassword
  logout.js                  ← POST hub.auth.logout
  revoke-device.js           ← POST hub.auth.revokeDevice
  verify.js                  ← POST hub.licenses.verify
  checkout.js                ← POST hub.checkout.create
  cloud.js                   ← POST hub.cloud.getCloud (réservé, non utilisé activement)
src/js/services/hub-service.js   ← client fetch('/api/hub/...') — AUCUN secret ici
src/js/engines/license.js        ← LIC.{validate,login,register,forgotPassword,revokeDevice,logout,startCheckout}
src/js/components/auth-screens.js← écrans login / register / forgot / quota appareils / réabonnement
src/js/core/auth.js              ← session Hub (session_token/refresh_token), CFG public
```

Le navigateur **n'appelle jamais** le Hub directement : il appelle les
routes `/api/hub/*` (fonctions serverless Vercel), qui seules utilisent
`MBEUK_HUB_API_KEY` via le SDK.

## 3. Variables d'environnement

Voir `.env.example` — noms uniquement, **aucune valeur** dans le repo.

| Variable | Où | Description |
|---|---|---|
| `MBEUK_HUB_URL` | Vercel + `.env.local` | URL du Hub, sans `/` final |
| `MBEUK_HUB_API_KEY` | Vercel + `.env.local` | Clé `mbs_...`, scopes `auth:*`, `licenses:verify` |
| `MBEUK_PRODUCT_ID` | Vercel + `.env.local` | UUID du produit "MbeukChurch" dans le Hub |
| `SAAS_BREVO_API_KEY` / `SAAS_BREVO_SENDER_EMAIL` / `SAAS_BREVO_SENDER_NAME` | optionnel | Seulement si le Hub n'a pas déjà `HUB_BREVO_*` |

**Ne jamais** préfixer ces variables par `NEXT_PUBLIC_` ou `VITE_` : elles
ne doivent être lues que côté serveur (`process.env` dans `api/hub/*.js` /
`lib/hub/client.js`).

## 4. Parcours utilisateur

1. **Créer un compte** → `doRegister()` → `hub.auth.register({ start_trial: true, device_identifier })` puis connexion automatique.
2. **Se connecter** → `doLogin()` → `hub.auth.login()`. Si `device_status === 'device_limit_reached'` → écran "gérer mes appareils" (`doRevokeDevice`), jamais un renvoi vers l'achat.
3. **Mot de passe oublié** → `doForgotPassword()` → `hub.auth.forgotPassword()` → nouveau mot de passe envoyé par email (Brevo, côté Hub).
4. **Licence expirée / essai fini** → écran de blocage → bouton "Réabonner mon compte" → `hub.checkout.create()` avec le même email → redirection Chariow.
5. **Retour de paiement** → au prochain chargement, `LIC.validate()` (`hub.licenses.verify`) redonne l'accès, sans nouveau compte.
6. **Vidage du navigateur** → écran de connexion (email + mot de passe) → licence retrouvée si non expirée.

## 5. Point d'attention — Cloud Central IA (à traiter manuellement)

`engines/ai-assistant.js` (`callClaudeCentral`) et `engines/communication.js`
(`sendEmailBrevoCentral`) appellent une Edge Function Supabase
(`CFG.CLOUD_CENTRAL_URL + '/functions/v1/api-proxy'`) avec, en en-tête
`Authorization: Bearer <AUTH.token>`. **Avant la migration**, `AUTH.token`
était un JWT Supabase vérifié par cette Edge Function. **Après la
migration**, `AUTH.token` est le `session_token` du Hub — l'Edge Function
ne peut plus le vérifier tel quel.

Cette fonctionnalité (`S.cloudActive`, dérivé de `license.has_cloud_access`
renvoyé par le Hub) est une feature premium **indépendante** de l'auth/
licence de base : elle continuera à fonctionner pour l'essentiel de l'app
(dashboard, membres, finances, etc.), mais **ces deux appels précis
échoueront** tant que l'Edge Function `api-proxy` n'aura pas été adaptée
pour vérifier un `session_token` Hub (par exemple via un appel serveur à
`hub.licenses.verify`). C'est une action de **votre** côté (Edge Function
Supabase existante, hors du périmètre de ce SDK) — pas un oubli du code
livré ici.

## 6. Comment tester une fois les env renseignées

```bash
npm install
npm run dev        # http://localhost:5173 (les routes /api/hub/* nécessitent `vercel dev`)
# ou, pour tester les routes API localement :
npx vercel dev
```

Checklist (voir aussi `GUIDE_DEPLOIEMENT.html`) :
- [ ] Création de compte + essai gratuit (1 appareil)
- [ ] Connexion
- [ ] Mot de passe oublié → email reçu
- [ ] Quota appareils → révocation → reconnexion
- [ ] Réabonnement → redirection Chariow → retour → accès rétabli
- [ ] Vidage du navigateur → reconnexion → licence retrouvée
- [ ] Mode hors-ligne → cache local (grâce 5 jours) toujours fonctionnel

## 7. À faire manuellement (humain, jamais dans un chat IA)

1. Vérifier que la migration `023` est appliquée sur le Hub.
2. Créer/vérifier une clé `mbs_...` avec les scopes `auth:register`, `auth:login`, `auth:password`, `licenses:verify`.
3. Copier le `product_id` du produit "MbeukChurch" (Super Admin Hub).
4. Coller `MBEUK_HUB_URL`, `MBEUK_HUB_API_KEY`, `MBEUK_PRODUCT_ID` dans Vercel → Environment Variables (et `.env.local` en dev).
5. Ne jamais coller ces secrets dans une discussion IA, un ticket, ou une capture d'écran.
