// ============================================================================
// MbeukChurch — main.js
// Point d'entrée de l'application (chargé via <script type="module"> dans
// src/index.html). Rôle :
//   1) Charger les styles (main.css + components.css)
//   2) Importer tous les modules métier
//   3) Exposer CHAQUE export sur `window` — nécessaire car contrairement à un
//      script classique (où toute fonction top-level devient automatiquement
//      une propriété de `window`), les modules ES ne le font JAMAIS
//      implicitement. Or l'application génère énormément de HTML dynamique
//      avec des attributs `onclick="saveMember('id')"` etc. : ces attributs
//      ne voient QUE la portée globale. Sans cette étape, l'application
//      semblerait fonctionner (page chargée, pas d'erreur console) puis
//      chaque bouton généré dynamiquement échouerait silencieusement.
//   4) Construire la table PAGES (routage) une fois toutes les fonctions
//      pgX importées.
//   5) Définir init() / launchApp() / bootSaaS() — copie fidèle et exacte du
//      comportement original (voir index.html historique, fonctions
//      identiques ligne pour ligne, uniquement reliées par des imports).
// ============================================================================

import '../css/main.css';
import '../css/components.css';

// ── Core ──
import * as StateNS from './core/state.js';
import * as UtilsNS from './core/utils.js';
import * as RouterNS from './core/router.js';
import * as AuthNS from './core/auth.js';

// ── Engines ──
import * as StorageNS from './engines/storage.js';
import * as ThemeNS from './engines/theme.js';
import * as DashboardNS from './engines/dashboard.js';
import * as MembersNS from './engines/members.js';
import * as FinancesNS from './engines/finances.js';
import * as EventsNS from './engines/events.js';
import * as MinistriesNS from './engines/ministries.js';
import * as SermonsNS from './engines/sermons.js';
import * as UsersNS from './engines/users.js';
import * as SettingsNS from './engines/settings.js';
import * as CommunicationNS from './engines/communication.js';
import * as AiAssistantNS from './engines/ai-assistant.js';
import * as SubaccountsNS from './engines/subaccounts.js';
import * as CloudSyncNS from './engines/cloud-sync.js';
import * as GuideNS from './engines/guide.js';
import * as LicenseNS from './engines/license.js';

// ── Services ──
import * as ApiKeysNS from './services/api-keys.js';
import * as FingerprintNS from './services/fingerprint.js';
import * as HubServiceNS from './services/hub-service.js';

// ── Components ──
import * as AuthScreensNS from './components/auth-screens.js';

// ────────────────────────────────────────────────────────────────────────
// 1) EXPOSITION GLOBALE — reproduit fidèlement le comportement des scripts
//    classiques d'origine (chaque fonction top-level = une propriété window).
// ────────────────────────────────────────────────────────────────────────
const ALL_NAMESPACES = [
  StateNS, UtilsNS, RouterNS, AuthNS,
  StorageNS, ThemeNS, DashboardNS, MembersNS, FinancesNS, EventsNS,
  MinistriesNS, SermonsNS, UsersNS, SettingsNS, CommunicationNS, AiAssistantNS,
  SubaccountsNS, CloudSyncNS, GuideNS, LicenseNS,
  ApiKeysNS, FingerprintNS, SupabaseNS, AuthScreensNS,
];
for (const ns of ALL_NAMESPACES) {
  for (const key of Object.keys(ns)) {
    window[key] = ns[key];
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2) TABLE DE ROUTAGE — identique à l'original :
//    var PAGES={dashboard:pgDash,membres:pgMembres,...}
// ────────────────────────────────────────────────────────────────────────
Object.assign(RouterNS.PAGES, {
  dashboard: DashboardNS.pgDash,
  membres: MembersNS.pgMembres,
  visiteurs: MembersNS.pgVisiteurs,
  finances: FinancesNS.pgFinances,
  dons: FinancesNS.pgDons,
  budget: FinancesNS.pgBudget,
  evenements: EventsNS.pgEvenements,
  presences: EventsNS.pgPresences,
  ministeres: MinistriesNS.pgMinisteres,
  mariages: MinistriesNS.pgMariages,
  priere: MinistriesNS.pgPriere,
  communication: CommunicationNS.pgCommunication,
  sermons: SermonsNS.pgSermons,
  agenda: EventsNS.pgAgenda,
  utilisateurs: UsersNS.pgUtilisateurs,
  rapports: DashboardNS.pgRapports,
  recherche: DashboardNS.pgRecherche,
  sync: SettingsNS.pgSync,
  guide: GuideNS.pgGuide,
  parametrage: SettingsNS.pgParametrage,
  assistant: AiAssistantNS.pgAssistant,
});

// ────────────────────────────────────────────────────────────────────────
// 3) INIT — copie exacte du comportement original (voir ancien index.html,
//    fonction init()). Rien n'a été modifié, seulement relié par imports.
// ────────────────────────────────────────────────────────────────────────
const { S, TabSync } = StateNS;
const { G, closeSB, toggleSB, notify, setSS } = UtilsNS;
const { manualSync, handleRoute } = RouterNS;
const { openDB, loadAll } = StorageNS;
const { seedDemo, regSW } = SettingsNS;
const { THEME } = ThemeNS;
const { ensureAdminAccount, AccountGate, applyAccountPermissions } = SubaccountsNS;
const { processCommQueue } = CommunicationNS;
const { initByodbState } = CloudSyncNS;

// Restaure S.byodb depuis localStorage — exécuté explicitement ici plutôt
// qu'au chargement du module (voir note dans cloud-sync.js).
initByodbState();

async function init() {
  try { await openDB(); await loadAll(); await seedDemo(); } catch (e2) { console.warn('Init error:', e2); }
  try { S.sq = JSON.parse(localStorage.getItem('sq') || '[]'); } catch (e2) { S.sq = []; }
  THEME.load(); // ← Appliquer le thème personnalisé dès l'init
  setSS(navigator.onLine ? 'online' : 'offline');
  regSW();
  await ensureAdminAccount();
  // Les liens de la sidebar sont de vrais <a href="#/x"> : la navigation (clic, molette,
  // nouvel onglet, retour navigateur) fonctionne nativement via l'évènement hashchange.
  document.querySelectorAll('.ni[data-p]').forEach(function (b) { b.addEventListener('click', closeSB); });
  G('sybg').addEventListener('click', manualSync);
  G('mbtn').addEventListener('click', toggleSB);
  G('ov').addEventListener('click', closeSB);
  await AccountGate.check();
  applyAccountPermissions();
  TabSync.listen();
  handleRoute(); // restaure le module depuis l'URL (#/x) ou la dernière page visitée
}
window.addEventListener('online', function () { setSS('online'); notify('Connexion retablie', 'success'); if (S.sq.length && S.gsUrl) manualSync(); if (S.data.commQueue && S.data.commQueue.length) processCommQueue(); });
window.addEventListener('offline', function () { setSS('offline'); notify('Hors ligne - donnees sauvegardees', 'error'); });
setInterval(function () { if (navigator.onLine && S.gsUrl && S.sq.length) manualSync(); }, 5 * 60 * 1000);

// ────────────────────────────────────────────────────────────────────────
// 4) LAUNCH APP / BOOT SEQUENCE — copie exacte du comportement original.
// ────────────────────────────────────────────────────────────────────────
const { AUTH } = AuthNS;
const { LIC } = LicenseNS;
const { showAuthScreen, showBlockedScreen, addUserMenu } = AuthScreensNS;
const { showWelcomeMessage } = UtilsNS;

async function launchApp() {
  // Remove auth screen
  const authRoot = document.getElementById('auth-root');
  if (authRoot) authRoot.remove();

  // Restore app HTML
  document.body.innerHTML = APP_HTML_TEMPLATE;
  document.getElementById('anti-fouc')?.remove(); // lève le masque, accès accordé
  addUserMenu();

  // Re-init the app
  if (typeof init === 'function') await init();
  if (typeof TabSync !== 'undefined') TabSync.emit('login');
  if (typeof showWelcomeMessage === 'function') {
    var nm = (AUTH.profile?.name || AUTH.user?.email || 'Utilisateur').split(' ')[0].split('@')[0];
    showWelcomeMessage(nm);
  }
}

// ── BOOT SEQUENCE ──
let APP_HTML_TEMPLATE = '';

async function bootSaaS() {
  // Save original app HTML
  APP_HTML_TEMPLATE = document.body.innerHTML;

  // Hydratation immédiate du thème (couleurs/mode) avant tout rendu visible,
  // pour éviter tout flash visuel incorrect sur nouvel onglet / F5.
  try { THEME.load(); } catch (e) {}

  // Try to restore session
  const hasSession = AUTH.load();
  if (hasSession) {
    // Auth Guard anti-flickering : on ne montre JAMAIS l'écran de connexion
    // pendant la vérification du token — uniquement un loader neutre.
    document.body.innerHTML = `<div style="min-height:100vh;background:linear-gradient(135deg,#0f2744,#1a3a5c);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Segoe UI',sans-serif;font-size:1rem">⏳ Vérification de votre session...</div>`;
    const licRes = await LIC.validate();
    if (licRes.valid) {
      AUTH.license = licRes.lic;
      document.body.innerHTML = APP_HTML_TEMPLATE;
      document.getElementById('anti-fouc')?.remove(); // lève le masque, accès accordé
      addUserMenu();
      THEME.load(); // ← Restaurer le thème personnalisé (re-applique une fois le DOM final en place)
      if (typeof init === 'function') await init();
      if (typeof showWelcomeMessage === 'function') {
        const nm = (AUTH.profile?.name || AUTH.user?.email || 'Utilisateur').split(' ')[0].split('@')[0];
        showWelcomeMessage(nm);
      }
      return;
    } else {
      AUTH.clear();
      const blocked = ['trial_expired', 'license_expired', 'max_devices'];
      if (blocked.includes(licRes.reason)) {
        showBlockedScreen(licRes.reason); return;
      }
      showAuthScreen(licRes.reason === 'offline_no_cache' ? null : '⚠️ Session expirée, veuillez vous reconnecter.');
      return;
    }
  }
  showAuthScreen();
}

// init/launchApp/bootSaaS sont eux-mêmes référencés depuis du HTML généré
// dynamiquement (ex: `if (typeof init === 'function')`) donc exposés aussi.
window.init = init;
window.launchApp = launchApp;
window.bootSaaS = bootSaaS;

// ── START ──
document.addEventListener('DOMContentLoaded', bootSaaS);
