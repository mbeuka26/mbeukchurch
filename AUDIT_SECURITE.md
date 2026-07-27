# AUDIT_SECURITE.md — MbeukChurch × Hub Central
Audit réalisé sur le code livré (intégration Hub). Périmètre : `api/hub/*`,
`lib/hub/*`, `src/js/services/hub-service.js`, `src/js/engines/license.js`,
`src/js/core/auth.js`, `src/js/components/auth-screens.js`,
`src/js/services/fingerprint.js`. Le reste de l'app (membres, finances,
communication, sous-comptes) n'a pas été ré-audité intégralement — seuls
les points qui touchaient à l'auth (ex. Cloud Central) ont été vérifiés.

Méthode : lecture ligne à ligne des routes serveur, du client HTTP, du
rendu DOM, test de build réel (`npm install && npm run build`), et
raisonnement en boîte grise sur ce qu'un attaquant peut envoyer directement
à `/api/hub/*` en contournant totalement le frontend (Postman/curl).

**Toutes les failles Critiques et Hautes ci-dessous ont déjà été corrigées
dans le ZIP livré.** Les points "Résiduel" restent des limites connues à
traiter en dehors de ce dépôt (côté Hub) ou à activer plus tard (Upstash).

---

## 1. Résumé exécutif

| Sévérité | Trouvé | Corrigé dans ce livrable |
|---|---|---|
| 🔴 Critique | 2 | 2 |
| 🟠 Haute | 3 | 3 |
| 🟡 Moyenne | 3 | 2 (1 résiduel documenté) |
| 🔵 Faible / hygiène | 2 | 2 |

Aucune faille ne permettait de **compromettre un compte sans en connaître
le mot de passe**. Les failles critiques touchaient le **contrôle
d'accès** (qui a le droit d'interroger/modifier le compte d'un autre) et
une **injection HTML/JS (XSS)** dans l'écran de gestion des appareils.

---

## 2. Failles Critiques (corrigées)

### 2.1 — Contrôle d'accès défaillant sur `/api/hub/revoke-device`
**Avant :** la route acceptait `{ email, device_identifier }` et appelait
`hub.auth.revokeDevice(...)` **sans jamais vérifier que l'appelant était
bien connecté sur ce compte**. N'importe qui, sans authentification,
pouvait forcer la déconnexion d'un appareil sur **n'importe quel email**
(déni de service ciblé, harcèlement d'un client).

**Corrigé :** `session_token` est désormais **obligatoire** (401 sinon).
Le flux "quota d'appareils atteint" a été adapté : le Hub renvoie un
`session_token` valide même quand l'accès est refusé pour cause de quota
(le mot de passe était correct) — ce token est maintenant transmis à
l'écran de gestion des appareils puis à cette route, au lieu d'être perdu.
→ `api/hub/revoke-device.js`, `src/js/engines/license.js`,
`src/js/components/auth-screens.js`.

### 2.2 — Fuite d'information sur `/api/hub/verify`
**Avant :** la route acceptait `{ email }` **sans authentification** et
renvoyait le statut de licence complet (essai/payant, date d'expiration,
liste des appareils avec leurs identifiants) pour **n'importe quel email**
fourni. Combiné à 2.1, cela permettait d'énumérer un email puis de
révoquer ses appareils sans jamais se connecter.

**Corrigé :** `session_token` désormais obligatoire (401 sinon) + limite
de débit dédiée. **Limite résiduelle documentée en §5.1** : le SDK Hub ne
fournit pas de méthode pour prouver qu'un `session_token` appartient
réellement à l'`email` fourni — voir Résiduel.

---

## 3. Failles Hautes (corrigées)

### 3.1 — XSS (injection HTML/JS) dans l'écran "gérer mes appareils"
`components/auth-screens.js` construisait la liste des appareils via
`innerHTML` en insérant `device_identifier` brut, et l'utilisait aussi
dans un attribut `onclick="doRevokeDevice('...','...')"` avec un
échappement partiel (seules les apostrophes étaient échappées, pas les
guillemets doubles — une évasion d'attribut HTML restait possible).

**Pourquoi c'est exploitable :** `device_identifier` est une empreinte
**générée et envoyée par le navigateur** (voir `fingerprint.js`) — un
attaquant peut appeler `/api/hub/login` directement avec un
`device_identifier` de son choix, y compris du HTML/JS malveillant.

**Impact aggravé par l'architecture :** les jetons de session
(`session_token` / `refresh_token`) sont stockés en `localStorage`, lisible
par tout script injecté. Un XSS ici équivaut donc à un **vol de session
complet**, pas juste un désagrément visuel.

**Corrigé :** réécriture complète du rendu en DOM natif
(`createElement` + `textContent` + `addEventListener`), qui élimine la
classe de vulnérabilité entièrement — plus aucune concaténation de
chaîne HTML avec une donnée externe dans cet écran.

### 3.2 — Absence de limitation de débit (brute-force / spam)
Aucune route `/api/hub/*` ne limitait le nombre de tentatives. Risques :
credential-stuffing sur `/login`, spam de création de comptes d'essai sur
`/register`, "email bombing" d'un tiers via `/forgot-password`.

**Corrigé :** limiteur de débit (par IP + par compte ciblé) ajouté sur
toutes les routes sensibles (`lib/hub/rate-limit.js`), avec seuils
différenciés (ex. 8 tentatives de connexion / 10 min, 3 mots de passe
oubliés / heure, 5 créations de compte / heure). **Voir limite résiduelle
en §5.2** (mémoire de processus, pas distribué).

### 3.3 — Fuite potentielle via `error.details`
Le champ `details` d'une erreur du Hub (typé `unknown` côté SDK — peut
contenir n'importe quoi) était renvoyé tel quel au navigateur.

**Corrigé :** `details` n'est plus jamais transmis au client ; il est
uniquement loggé côté serveur (`lib/hub/client.js`).

---

## 4. Failles Moyennes

### 4.1 — Absence de validation d'entrée (corrigé)
Aucune route ne validait le format d'email, la longueur des chaînes, ni
ne rejetait les mots de passe trop courts avant de les transmettre au
Hub. **Corrigé** : validation stricte (regex email, longueurs max,
mot de passe ≥ 6) ajoutée dans `lib/hub/client.js` et appliquée à chaque
route.

### 4.2 — En-têtes de sécurité HTTP absents (corrigé)
Aucun `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`,
`Referrer-Policy` n'était configuré. **Corrigé** via `vercel.json`.

### 4.3 — Quota d'appareils contournable (résiduel, voir §5.3)
`device_identifier` étant 100 % généré et transmis par le client, un
attaquant peut envoyer une valeur arbitraire à chaque connexion et
contourner la limite `max_devices`. Ce n'est **pas** une faille
permettant de compromettre un autre compte — c'est une limite du modèle
"empreinte navigateur" en général, à traiter comme un risque business
(perte de revenu potentielle) plutôt qu'un risque de sécurité des données.

---

## 5. Risques résiduels à connaître (non corrigibles depuis ce dépôt seul)

### 5.1 — Le SDK Hub ne permet pas de vérifier qu'un `session_token` appartient à un email donné
`hub.licenses.verify()` et `hub.auth.revokeDevice()` sont conçus, côté
Hub, pour être appelés par le **backend** du SaaS avec un email fourni en
clair (confiance placée dans la clé API `mbs_...`, pas dans un jeton
utilisateur). Exiger un `session_token` nous protège des appels
totalement anonymes, mais **ne garantit pas mathématiquement** que ce
token appartient à l'email demandé — un utilisateur A pourrait, en théorie,
présenter son propre `session_token` valide avec l'email de B.
**Recommandation transmise à l'équipe Hub** : exposer une méthode
`hub.auth.whoami({ session_token })` retournant l'email associé, pour
fermer complètement ce contrôle côté SaaS.

### 5.2 — Rate limiting en mémoire, pas distribué
Le limiteur ajouté (`lib/hub/rate-limit.js`) vit dans la mémoire de
chaque instance serverless Vercel. Efficace contre un script basique
depuis une seule machine ; **pas garanti** contre un attaquant distribué
(botnet, plusieurs IP). **Recommandation** : brancher Upstash Redis
(`@upstash/ratelimit`, gratuit à faible volume) — le module est structuré
pour accueillir ce remplacement sans toucher aux routes.

### 5.3 — Quota d'appareils = contrôle UX, pas un contrôle de sécurité
Voir §4.3. Documenté ici pour que ce soit un choix assumé, pas un oubli.

### 5.4 — Pas de CSP (Content-Security-Policy) stricte
L'application utilise massivement des gestionnaires `onclick="..."`
inline historiques (hors du module d'auth, dans le reste de l'app :
membres, finances, etc.). Une CSP stricte (`script-src 'self'`) casserait
ces écrans existants. **Recommandation** : traiter séparément, dans un
chantier dédié de migration des `onclick` inline vers
`addEventListener`, avant d'activer une CSP stricte globale.

### 5.5 — Cloud Central IA (déjà signalé dans `HUB_INTEGRATION.md` §5)
Les 2 appels `callClaudeCentral` / `sendEmailBrevoCentral` utilisent
l'ancien modèle de jeton Supabase pour une Edge Function qui n'a pas été
mise à jour pour comprendre les jetons du Hub. Fonctionnalité premium
optionnelle, non bloquante pour le reste de l'app, mais à corriger côté
Edge Function.

---

## 6. Ce qui était déjà correct (points positifs à noter)

- **Aucun secret côté client** : `MBEUK_HUB_API_KEY` n'apparaît que dans
  `lib/hub/client.js` et `api/hub/*.js` — jamais importée dans un fichier
  sous `src/js/` (vérifié par recherche exhaustive sur le bundle Vite).
- **`product_id` toujours dérivé du serveur** (`getProductId()`), jamais
  accepté depuis le corps de la requête client — empêche un appelant de
  cibler un autre produit du Hub.
- **Messages génériques anti-énumération** sur "mot de passe oublié"
  (le frontend ne confirme jamais si un email existe ou non).
- **`.env.example`** ne contient que des noms de variables, aucune valeur
  — bonne hygiène pour un dépôt destiné à être versionné.
- Erreurs serveur inattendues renvoient un message générique 500, jamais
  de stack trace au client (`sendHubError`).

---

## 7. Plan de remédiation restant (priorisé)

1. **Court terme (avant mise en prod si volume attendu important) :**
   activer Upstash Redis pour le rate limiting distribué (§5.2).
2. **Moyen terme :** demander à l'équipe Hub une méthode `whoami`
   token→email (§5.1) et mettre à jour `verify.js`/`revoke-device.js`
   pour vérifier explicitement la correspondance.
3. **Moyen terme :** adapter l'Edge Function `api-proxy` (Cloud Central)
   pour accepter les jetons Hub (§5.5).
4. **Long terme :** chantier de migration des `onclick` inline restants
   dans le reste de l'app, pour permettre une CSP stricte (§5.4).

---

## 8. Addendum — 2ᵉ passe d'audit (grille OWASP élargie)

Une seconde passe a été menée sur l'état déjà corrigé du code (§2–4 ci-dessus),
en suivant une grille OWASP plus large (injections, mass assignment, SSRF,
CSRF, secrets). Vérifications effectuées **par lecture directe du code**,
pas par supposition :

| Vecteur | Résultat | Preuve |
|---|---|---|
| SQL/NoSQL injection | Non applicable | Aucune requête DB directe dans ce dépôt — tout passe par les méthodes typées du SDK (`hub.auth.*`, `hub.licenses.*`), jamais de chaîne concaténée. |
| Mass assignment / over-posting | Non trouvé | Chaque route `api/hub/*.js` déstructure explicitement les champs attendus (`const { email, password } = req.body`) — aucun `...req.body` n'est jamais transmis au SDK. |
| SSRF | Non applicable | Aucune route ne fait de `fetch()` vers une URL fournie par le client ; le SDK n'appelle que `MBEUK_HUB_URL` (valeur serveur fixe). |
| Cookies (flags HttpOnly/Secure/SameSite) | Non applicable | Aucun cookie n'est utilisé pour l'auth — les jetons transitent en body JSON, pas en cookie (voir compromis en §5.1 sur le stockage `localStorage`). |
| CSRF classique | Structurellement inopérant | Le CSRF classique exploite un cookie envoyé automatiquement par le navigateur. Ici, l'identifiant de session (`session_token`) est en `localStorage`, jamais accessible à un autre site — un formulaire malveillant sur un autre domaine ne peut donc pas "rejouer" la session d'une victime. |
| Secrets côté client | Confirmé absent | Recherche exhaustive de `MBEUK_HUB_API_KEY`/`process.env` dans `src/js/` : aucune occurrence réelle (une seule mention dans un commentaire). |

**Durcissement ajouté malgré tout (défense en profondeur, pas parce qu'une
faille exploitable a été démontrée) :**
- `requirePost()` exige désormais `Content-Type: application/json` (rejette
  les soumissions de formulaire HTML classiques, vecteur théorique de
  confused-deputy même si non exploitable ici faute de cookie).
- `rejectIfBadOrigin()` : vérifie l'en-tête `Origin` contre une liste
  blanche (`ALLOWED_ORIGIN` + `VERCEL_URL` automatique) quand il est
  présent. Ne bloque pas les appels sans en-tête `Origin` (ex. outils
  serveur-à-serveur légitimes) — ce n'est pas un mécanisme d'authentification,
  seulement une couche supplémentaire.

**Aucune preuve d'intrusion réelle n'a été trouvée ni recherchée dans ce
dépôt** (ce dépôt ne contient pas de logs de production). Si un incident
réel est suspecté, voir `GUIDE_SECURITE_MANUEL.html` §"En cas de doute
d'intrusion" pour la marche à suivre (rotation de clés, révocation de
sessions, etc.) — ces actions ne peuvent être exécutées que par vous,
depuis les consoles Hub/Vercel/Supabase, pas depuis ce code.

---

*Cet audit couvre le code livré à date. Il ne remplace pas un test
d'intrusion (pentest) formel avant une mise en production à grande
échelle, en particulier pour valider le comportement réel du Hub Central
lui-même (hors périmètre de ce dépôt).*
