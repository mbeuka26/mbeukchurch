// engines/license.js
// ────────────────────────────────────────────────────────────────────────
// LicenseGate — état d'accès dérivé UNIQUEMENT du Hub Central
// MbeukTechnologies (login / refreshSession / licenses.verify).
// L'ancien système (tables Supabase `licenses` / `user_licenses` /
// `user_devices`, clé de licence MBK-XXXX à activer manuellement) est
// entièrement retiré : plus de recalcul local d'expiration, plus de
// gestion d'appareils côté SaaS — tout est décidé par le Hub.
// ────────────────────────────────────────────────────────────────────────
import { AUTH, CFG } from '../core/auth.js';
import { S } from '../core/state.js';
import { getDeviceId } from '../services/fingerprint.js';
import { HubService } from '../services/hub-service.js';

function applyCloudActive(license) {
  try { S.cloudActive = !!(license && license.has_cloud_access); } catch (e) {}
}

export const LIC = {
  cache: null,

  // Durée max pendant laquelle une licence en cache (hors-ligne) reste
  // acceptée sans re-vérification serveur réussie — empêche qu'un cache
  // local ne fasse indéfiniment foi à la place du Hub.
  MAX_OFFLINE_GRACE_MS: 5 * 24 * 3600 * 1000, // 5 jours

  save(result) {
    LIC.cache = result;
    localStorage.setItem('_lic', JSON.stringify({ ...result, cached: Date.now() }));
  },

  loadCache() {
    try {
      const l = JSON.parse(localStorage.getItem('_lic') || 'null');
      if (l && Date.now() - l.cached < 3600000) { LIC.cache = l; return l; } // 1h
    } catch (e) {}
    return null;
  },

  /**
   * Contrôle d'accès périodique (au boot, avec session déjà restaurée).
   * Utilise hub.licenses.verify via HubService — jamais de recalcul local.
   */
  async validate() {
    if (!AUTH.user || !AUTH.token) return { valid: false, reason: 'not_logged_in' };
    const did = await getDeviceId();
    const res = await HubService.verify(AUTH.user.email, did, AUTH.token);

    if (res.ok) {
      const data = res.data; // LicenseVerifyResult
      LIC.save(data);
      applyCloudActive(data.license);
      return {
        valid: !!data.valid,
        reason: data.reason,
        lic: data.license,
        devices: data.devices,
        max_devices: data.max_devices,
      };
    }

    // Hors-ligne / Hub injoignable → fenêtre de grâce bornée sur le cache local.
    const cached = LIC.loadCache();
    const withinGrace = cached && (Date.now() - (cached.cached || 0)) < LIC.MAX_OFFLINE_GRACE_MS;
    if (cached && cached.valid && withinGrace) {
      return { valid: true, lic: cached.license, offline: true };
    }
    return { valid: false, reason: res.error && res.error.code === 'NETWORK_ERROR' ? 'offline_no_cache' : (res.error && res.error.code) };
  },

  /**
   * Connexion + licence en un appel (hub.auth.login via HubService.login).
   * Retourne un objet unifié consommé par components/auth-screens.js.
   */
  async login(email, password) {
    const did = await getDeviceId();
    const res = await HubService.login(email, password, did);
    if (!res.ok) return { ok: false, error: res.error };
    const data = res.data; // AuthLoginResult
    if (!data.authenticated) return { ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect.' } };

    if (data.access_granted === false || data.device_status === 'device_limit_reached') {
      // Quota appareils atteint : PAS d'accès à l'app, mais le mot de passe
      // était correct donc le Hub renvoie tout de même un session_token —
      // on le transmet pour PROUVER l'identité lors de l'appel à
      // revokeDevice (voir api/hub/revoke-device.js, qui exige désormais
      // un session_token non vide). On ne l'enregistre PAS dans AUTH/localStorage
      // tant que l'accès n'est pas accordé : il ne sert qu'à cette action ponctuelle.
      return {
        ok: false,
        deviceLimitReached: true,
        devices: data.devices,
        max_devices: data.max_devices,
        email, // nécessaire pour appeler revokeDevice ensuite
        sessionToken: data.session_token,
      };
    }

    AUTH.save({ session_token: data.session_token, refresh_token: data.refresh_token, email: data.email, expires_at: data.expires_at });
    LIC.save(data.license || {});
    AUTH.license = data.license;
    applyCloudActive(data.license);

    if (data.license && data.license.valid === false) {
      return { ok: false, licenseInvalid: true, reason: data.license.reason, license: data.license };
    }
    return { ok: true, license: data.license };
  },

  /** Création de compte (+ essai optionnel en un seul appel). */
  async register(email, password, { startTrial = true } = {}) {
    const did = await getDeviceId();
    const res = await HubService.register(email, password, { startTrial, deviceIdentifier: did });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  },

  async forgotPassword(email) {
    return HubService.forgotPassword(email);
  },

  async revokeDevice(email, deviceIdentifier, sessionToken) {
    return HubService.revokeDevice(email, deviceIdentifier, sessionToken);
  },

  async logout() {
    if (AUTH.token) { try { await HubService.logout(AUTH.token); } catch (e) {} }
  },

  /** Réabonnement / achat — toujours avec le même email de compte. */
  async startCheckout(promoCode, emailOverride) {
    const email = emailOverride || (AUTH.user && AUTH.user.email);
    if (!email) return { ok: false, error: { code: 'NOT_LOGGED_IN', message: 'Connectez-vous d\'abord.' } };
    return HubService.startCheckout(email, { promoCode });
  },
};
