// core/auth.js
// ────────────────────────────────────────────────────────────────────────
// Config publique de l'app + gestion de session Hub Central MbeukTechnologies.
// L'ancien système d'authentification central Supabase (SUPABASE_URL /
// SUPABASE_ANON_KEY / clé anon hardcodée) a été retiré : toute l'auth +
// licence passe désormais par le Hub (voir engines/license.js et
// services/hub-service.js). Le Cloud Sync BYODB (Supabase PROPRE à chaque
// église, configuré par l'utilisateur dans Paramétrage) est INCHANGÉ et
// n'a aucun rapport avec ce module.
// ────────────────────────────────────────────────────────────────────────

export const CFG = {
  WHATSAPP_LINK: 'https://wa.me/237620964316',
  FACEBOOK_LINK: 'https://www.facebook.com/share/1CJmrEFg8g/',
  WEBSITE_LINK:  'https://mbeuktech.vercel.app/',
  // Valeurs d'affichage par défaut UNIQUEMENT (le Hub reste la source de
  // vérité pour trial_days / max_devices réels, retournés par register/login).
  TRIAL_DAYS: 3,
  MAX_DEVICES: 2,
  APP_NAME: 'MbeukChurch',
  APP_VERSION: '3.1-SaaS',

  // ── Cloud Central (feature IA/Brevo premium, INDÉPENDANTE du Hub d'auth) ──
  // ⚠️ Point d'attention migration : cette Edge Function Supabase
  // (`/functions/v1/api-proxy`) attendait auparavant un JWT Supabase
  // (AUTH.token de l'ancienne session centrale) pour vérifier l'identité de
  // l'appelant. Depuis la bascule vers le Hub, AUTH.token est un
  // session_token Hub — l'Edge Function doit être adaptée pour le
  // vérifier (ex: appel serveur à hub.licenses.verify), sinon ces 2 appels
  // (callClaudeCentral / sendEmailBrevoCentral dans ai-assistant.js /
  // communication.js) échoueront avec une erreur d'autorisation.
  // Voir HUB_INTEGRATION.md → section "Cloud Central IA (point d'attention)".
  CLOUD_CENTRAL_URL: 'https://ksvugkumnszcdjynhgni.supabase.co',
};

// ── SESSION HUB (remplace l'ancienne session Supabase centrale) ──
// Stockée sous la même clé localStorage `_as` qu'auparavant pour ne pas
// casser la logique de démarrage (bootSaaS lit `_as` pour savoir s'il y a
// une session à restaurer) — seule la FORME du contenu change.

export const AUTH = {
  user: null,        // { id: email, email }
  token: null,        // session_token Hub
  refreshToken: null, // refresh_token Hub
  session: null,       // objet brut renvoyé par hub.auth.login / register
  license: null,       // LicenseVerifyResult (voir engines/license.js)
  profile: null,       // { name, phone } — infos locales, non gérées par le Hub

  save({ session_token, refresh_token, email, expires_at, profile } = {}) {
    AUTH.token = session_token || null;
    AUTH.refreshToken = refresh_token || null;
    AUTH.user = email ? { id: email, email } : AUTH.user;
    if (profile) AUTH.profile = profile;
    AUTH.session = { session_token, refresh_token, expires_at };
    localStorage.setItem('_as', JSON.stringify({
      token: session_token,
      refresh: refresh_token,
      email: AUTH.user ? AUTH.user.email : null,
      profile: AUTH.profile,
      // expires_at Hub est en secondes epoch (voir SDK) ; fallback 1h.
      exp: expires_at ? expires_at * 1000 : Date.now() + 3600 * 1000,
    }));
  },

  load() {
    try {
      const s = JSON.parse(localStorage.getItem('_as') || 'null');
      if (s && s.token && s.exp > Date.now()) {
        AUTH.token = s.token;
        AUTH.refreshToken = s.refresh;
        AUTH.user = s.email ? { id: s.email, email: s.email } : null;
        AUTH.profile = s.profile || null;
        return true;
      }
    } catch (e) {}
    return false;
  },

  /** Session expirée mais refresh_token potentiellement encore valide. */
  loadExpiredForRefresh() {
    try {
      const s = JSON.parse(localStorage.getItem('_as') || 'null');
      if (s && s.refresh) {
        AUTH.refreshToken = s.refresh;
        AUTH.user = s.email ? { id: s.email, email: s.email } : null;
        AUTH.profile = s.profile || null;
        return true;
      }
    } catch (e) {}
    return false;
  },

  clear() {
    AUTH.user = null; AUTH.token = null; AUTH.refreshToken = null;
    AUTH.session = null; AUTH.license = null; AUTH.profile = null;
    localStorage.removeItem('_as');
    localStorage.removeItem('_lic');
  },
};
