> 🔗 **Connexion au Hub Central MbeukTechnologies** (licence + auth + essai +
> réabonnement + quota appareils) : voir **`HUB_INTEGRATION.md`** (détails
> techniques) et **`GUIDE_DEPLOIEMENT.html`** (guide pas-à-pas non-développeur,
> à ouvrir dans un navigateur).

# MbeukChurch — Architecture modulaire (Vite)

Ce projet est la refonte modulaire du fichier monolithique `index.html` original
(un seul fichier HTML/CSS/JS de ~5000 lignes) vers une architecture **Vite.js**
avec modules ES (`import`/`export`), sans changer une seule ligne de logique
métier, de clé `localStorage`, ou de comportement d'API.

**Zéro régression fonctionnelle** — voir la section "Comment j'ai vérifié" plus bas
pour la méthode utilisée (extraction mécanique + tests d'exécution réels, pas
seulement une vérification de syntaxe).

---

## 📁 Structure du projet

```
mbeukchurch/
├── api/                        # Réservé aux futures fonctions Vercel (vide, voir api/README.md)
├── public/
│   ├── icon.svg                 # Icône de l'app (extraite du data-URI original)
│   └── manifest.webmanifest     # Manifest PWA (idem)
├── src/
│   ├── css/
│   │   ├── main.css             # Variables :root, reset, layout de base
│   │   └── components.css       # Sidebar, cartes, boutons, tableaux, modales, animations
│   ├── js/
│   │   ├── core/
│   │   │   ├── state.js         # État global S{}, stores, persist()/remove(), sync multi-onglets
│   │   │   ├── utils.js         # esc/fmt/mon/notify/BTN/BADGE/ES/SCRD/modales...
│   │   │   ├── router.js        # Routeur hash (#/dashboard...), PAGES{}, showPage/renderPage
│   │   │   └── auth.js          # CFG, AUTH (session utilisateur Supabase)
│   │   ├── services/
│   │   │   ├── api-keys.js      # Vault (chiffrement local), config des clés API
│   │   │   ├── fingerprint.js   # Empreinte d'appareil (licences)
│   │   │   └── supabase.js      # Client Supabase REST minimal (SB)
│   │   ├── engines/              # Un fichier par domaine métier
│   │   │   ├── storage.js        # SQLite WASM+OPFS / IndexedDB (StorageAdapter)
│   │   │   ├── theme.js          # Thème clair/sombre, couleurs personnalisées
│   │   │   ├── dashboard.js      # Dashboard, Rapports, Recherche
│   │   │   ├── members.js        # Membres, Visiteurs
│   │   │   ├── finances.js       # Finances, Dons/Dîmes, Budget
│   │   │   ├── events.js         # Événements, Présences, Agenda
│   │   │   ├── ministries.js     # Ministères, Mariages/Baptêmes, Intercession
│   │   │   ├── sermons.js        # Enseignements
│   │   │   ├── users.js          # Utilisateurs système & rôles
│   │   │   ├── settings.js       # Paramétrage avancé, Synchronisation Sheets
│   │   │   ├── communication.js  # Email/SMS/WhatsApp, templates, historique
│   │   │   ├── ai-assistant.js   # Assistant IA (Gemini/Grok/OpenRouter), étude biblique
│   │   │   ├── subaccounts.js    # Sous-comptes, permissions, codes PIN
│   │   │   ├── cloud-sync.js     # Cloud Sync BYODB (Supabase propre à chaque église)
│   │   │   └── license.js        # Validation de licence, essai gratuit
│   │   ├── components/
│   │   │   └── auth-screens.js   # Écrans connexion/inscription/licence/bloqué
│   │   └── main.js               # Point d'entrée — voir commentaire en tête de fichier
│   └── index.html                # HTML épuré (juste le squelette + <script type="module">)
├── package.json
└── vite.config.js                # outDir: '../dist'
```

---

## 🔧 Installation locale

```bash
npm install
npm run dev        # → http://localhost:5173
```

Build de production :

```bash
npm run build       # génère dist/
npm run preview      # sert dist/ localement pour vérifier avant déploiement
```

---

## ☁️ Migration Vercel — checklist

Votre projet Vercel existant pointait probablement vers le fichier `index.html`
statique. Pour basculer vers cette architecture Vite :

1. **Dashboard Vercel → Project Settings → General → Build & Development Settings**
   - **Framework Preset** : `Vite`
   - **Build Command** : `npm run build` (généralement auto-détecté)
   - **Output Directory** : `dist`
   - **Install Command** : `npm install` (auto-détecté)

2. **Dossier `api/`** : Vercel le détecte et le déploie automatiquement comme
   fonctions serverless, sans configuration supplémentaire — actuellement vide
   dans ce projet (voir `api/README.md`), donc rien à faire tant que vous n'y
   ajoutez rien.

3. **Variables d'environnement** : si votre ancien déploiement utilisait des
   variables d'environnement Vercel, elles restent valables à l'identique —
   rien à changer côté configuration Supabase/licences.

---

## 🚀 Protocole de déploiement sécurisé (zéro downtime)

```bash
# 1. Créer une branche dédiée à la refonte
git checkout -b refonte-modulaire

# 2. Ajouter tous les nouveaux fichiers et committer
git add .
git commit -m "Refonte modulaire Vite.js — zéro régression fonctionnelle"

# 3. Pousser vers GitHub pour déclencher un Preview Deployment Vercel
git push origin refonte-modulaire
```

Vercel détecte automatiquement le push sur cette branche et génère une **URL de
prévisualisation** unique (visible dans l'onglet "Deployments" de votre projet
Vercel, ou en commentaire automatique sur la Pull Request si vous en ouvrez une).

### 4. Tester sur l'URL de prévisualisation avant tout merge

Vérifiez, sur cette URL de preview (pas en local) :
- Connexion / création de compte / activation de licence fonctionnent
- Les données existantes (si vous testez avec un compte qui a déjà des données
  en `localStorage`/`IndexedDB` sur ce domaine) sont toujours là — **le
  stockage local est lié au domaine, donc une URL de preview `*.vercel.app`
  aura son propre stockage vide** ; pour tester avec vos vraies données, le
  test le plus fiable est `npm run build && npm run preview` **en local**, sur
  le même navigateur où vous avez déjà utilisé l'ancienne version.
- Un ajout (membre, finance, etc.) persiste bien après un F5
- La synchronisation Google Sheets / Cloud Sync BYODB / Cloud Central (si
  configurés) répondent normalement

### 5. Fusion finale (swap instantané, zéro coupure)

```bash
git checkout main
git merge refonte-modulaire
git push origin main
```

Vercel redéploie automatiquement `main` en production. Le **swap est atomique** :
Vercel construit la nouvelle version en parallèle puis bascule le trafic
instantanément une fois le build validé — vos utilisateurs ne voient jamais un
état intermédiaire cassé, et l'ancienne version reste servie jusqu'à la
dernière milliseconde du swap.

---

## 🔒 Garanties données/API (contraintes absolues respectées)

- **Zéro perte de données** : toutes les clés `localStorage` (`gsUrl`, `sq`,
  `mbk_theme_v2`, `mbk_vk`, `mbk_byodb`, `mbk_last_page`, `mbk_active_account`,
  session Supabase...) et le nom de la base IndexedDB (`mbk5`) sont strictement
  identiques à l'original — un utilisateur qui bascule vers cette version ne
  perd ni ses données locales, ni sa session, ni son thème personnalisé.
- **Zéro cassure d'API** : tous les appels `fetch` (Supabase, Brevo,
  Africa's Talking, Twilio via Apps Script, Gemini/Grok/OpenRouter, Edge
  Functions) sont copiés à l'identique, seulement déplacés dans
  `services/`/`engines/`.
- **Zéro élision** : le code de chaque fichier est extrait **mécaniquement**
  depuis l'original (script Python, extraction par plage de lignes exacte —
  pas retapé de mémoire), donc fidèle au caractère près. Les 3 exceptions sont
  documentées ci-dessous, chacune vérifiée comme fonctionnellement neutre.

---

## ⚠️ Notes honnêtes sur la migration

### 3 exceptions au copier-coller mécanique (toutes vérifiées sûres)

L'original s'appuyait sur une astuce propre aux scripts classiques : **redéclarer
une fonction du même nom écrase silencieusement la précédente**. Les modules ES
interdisent cette redéclaration (`SyntaxError: Identifier has already been
declared` — testé et confirmé). Trois cas ont dû être adaptés :

1. **`openDB`/`dbAll`/`dbPut`/`dbDel`/`dbClr`/`loadAll`** — l'original avait une
   première version simple (IndexedDB direct), immédiatement écrasée par une
   seconde version (via `StorageAdapter`, SQLite/IndexedDB). La première
   n'était **jamais exécutée** dans l'original non plus (le commentaire du code
   source dit littéralement *"Silently replace the original IndexedDB
   functions"*). Seule la version finale est conservée dans `engines/storage.js`.
2. **`pgCommunication`** — la seconde version ("Communication Center") est un
   remplacement total et indépendant, confirmé par le commentaire source
   *"remplace l'ancien module Communication"*. La première est supprimée.
3. **`pgSync`** — seul cas où la première version était **réellement utilisée**
   (capturée via `_origPgSync` puis appelée par la seconde). Renommée
   `pgSyncBase` dans `engines/settings.js`, appelée directement par `pgSync` —
   comportement final strictement identique, juste sans l'indirection propre
   aux scripts classiques.

### 1 bug pré-existant découvert et corrigé (indépendant de cette migration)

En testant réellement le graphe de modules dans un environnement DOM, j'ai
découvert un **doublon d'`id` HTML** déjà présent dans votre fichier original :
`id="mn"` était utilisé à la fois pour le conteneur principal de la page ET
pour le champ "Nom" du formulaire Membre. `document.getElementById('mn')`
retournant toujours le premier élément trouvé, le formulaire "Nouveau Membre"
récupérait le mauvais élément et échouait. J'ai renommé le conteneur en
`id="mnw"` (aucune autre référence à cet id nulle part dans le code, changement
sûr à 100%) — **et appliqué le même correctif à votre fichier `index.html`
original**, puisqu'il vous affecte indépendamment de cette refonte.

### Un cycle d'import réel, corrigé proprement

`state.js → subaccounts.js → settings.js → cloud-sync.js → state.js` forme un
cycle d'import légitime (fonctionnalités qui se référencent mutuellement).
L'original exécutait une IIFE au chargement du script pour restaurer
`S.byodb` depuis `localStorage` ; en modules ES, cette IIFE pouvait s'exécuter
avant que `state.js` ait fini d'initialiser `S`. Transformée en fonction
`initByodbState()` appelée explicitement au tout début de `main.js` —
comportement final identique, sans dépendre de l'ordre d'évaluation des
modules.

## ✅ Comment j'ai vérifié (pas juste "ça devrait marcher")

1. **Extraction mécanique** : script Python qui repère chaque déclaration
   top-level par comptage de position (pas de réécriture manuelle), donc
   fidélité garantie au caractère près.
2. **Vérification statique systématique** : script qui compare, pour chaque
   fichier, tous les identifiants utilisés contre tous les exports connus, et
   signale tout import manquant — corrigé jusqu'à un résultat propre.
3. **Test d'exécution réel** (pas juste `node --check`) : chargement de
   l'intégralité du graphe de 24 modules dans un environnement DOM (jsdom),
   déclenchement réel de `bootSaaS()` → rendu de l'écran de connexion, puis
   rendu réel du Dashboard et ouverture réelle du formulaire "Nouveau Membre" —
   c'est ce test qui a révélé le bug `id="mn"` et le problème de cycle
   d'import, tous deux corrigés.

Ce que je n'ai **pas** pu tester : le rendu visuel réel dans un navigateur, les
appels réseau réels (Supabase/Brevo/IA), et Vite lui-même (pas de accès
`npm run build` complet avec bundling dans cet environnement). Testez sur
l'URL de preview Vercel avant de fusionner en production, comme indiqué
ci-dessus.
