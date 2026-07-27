// src/js/services/hub-service.js
// ────────────────────────────────────────────────────────────────────────
// Couche d'accès au Hub Central MbeukTechnologies, DEPUIS LE NAVIGATEUR.
// Ce module n'appelle JAMAIS le Hub directement : il appelle les routes
// serveur /api/hub/* (voir /api/hub/*.js), qui elles seules utilisent le
// SDK avec la clé MBEUK_HUB_API_KEY (jamais exposée ici).
// Remplace l'ancien client Supabase central (services/supabase.js / SB).
// ────────────────────────────────────────────────────────────────────────

async function callHub(path, body) {
  let res, json;
  try {
    res = await fetch('/api/hub/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    json = await res.json();
  } catch (e) {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Impossible de contacter le serveur.' } };
  }
  if (!res.ok || !json || json.success === false) {
    return { ok: false, error: (json && json.error) || { code: 'UNKNOWN_ERROR', message: 'Erreur inconnue.' }, status: res.status };
  }
  return { ok: true, data: json.data };
}

export const HubService = {
  register(email, password, { startTrial = false, deviceIdentifier } = {}) {
    return callHub('register', { email, password, start_trial: startTrial, device_identifier: deviceIdentifier });
  },

  login(email, password, deviceIdentifier) {
    return callHub('login', { email, password, device_identifier: deviceIdentifier });
  },

  refreshSession(refreshToken) {
    return callHub('refresh', { refresh_token: refreshToken });
  },

  forgotPassword(email) {
    return callHub('forgot-password', { email });
  },

  logout(sessionToken) {
    return callHub('logout', { session_token: sessionToken });
  },

  revokeDevice(email, deviceIdentifier, sessionToken) {
    return callHub('revoke-device', { email, device_identifier: deviceIdentifier, session_token: sessionToken });
  },

  verify(email, deviceIdentifier, sessionToken) {
    return callHub('verify', { email, device_identifier: deviceIdentifier, session_token: sessionToken });
  },

  startCheckout(customerEmail, { promoCode, affiliateSlug, ref } = {}) {
    return callHub('checkout', { customer_email: customerEmail, promo_code: promoCode, affiliate_slug: affiliateSlug, ref });
  },

  getCloud(tenantId) {
    return callHub('cloud', { tenant_id: tenantId });
  },
};
