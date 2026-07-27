// lib/hub/client.js
// ────────────────────────────────────────────────────────────────────────
// Client Hub Central MbeukTechnologies — UNIQUEMENT côté serveur.
// Ce module est importé par les fonctions Vercel dans /api/hub/*.js.
// NE JAMAIS importer ce fichier depuis du code exécuté dans le navigateur :
// MBEUK_HUB_API_KEY ne doit jamais atteindre le bundle client.
// ────────────────────────────────────────────────────────────────────────
import { MbeukHub, MbeukHubError } from 'mbeuk-hub-sdk';

export { MbeukHubError };

/**
 * Vérifie que les 3 variables d'environnement obligatoires sont présentes.
 * Renvoie { ok: true } ou { ok: false, missing: string[] }.
 */
export function checkHubEnv() {
  const required = ['MBEUK_HUB_URL', 'MBEUK_HUB_API_KEY', 'MBEUK_PRODUCT_ID'];
  const missing = required.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

/**
 * Construit un client MbeukHub à partir des env vars serveur.
 * Lève une erreur claire HUB_ENV_MISSING si la config est incomplète —
 * à intercepter dans chaque route API pour répondre proprement au client
 * ("configuration manquante") plutôt que de faire planter la fonction.
 */
export function getHubClient() {
  const { ok, missing } = checkHubEnv();
  if (!ok) {
    const err = new Error(
      'Configuration Hub manquante : ' + missing.join(', ') +
      ' — voir HUB_INTEGRATION.md pour renseigner ces variables.'
    );
    err.code = 'HUB_ENV_MISSING';
    throw err;
  }
  return new MbeukHub({
    baseUrl: process.env.MBEUK_HUB_URL,
    apiKey: process.env.MBEUK_HUB_API_KEY,
  });
}

/** product_id du produit MbeukChurch dans le Hub (env serveur uniquement). */
export function getProductId() {
  const id = process.env.MBEUK_PRODUCT_ID;
  if (!id) {
    const err = new Error('MBEUK_PRODUCT_ID manquant — voir HUB_INTEGRATION.md');
    err.code = 'HUB_ENV_MISSING';
    throw err;
  }
  return id;
}

/**
 * Enveloppe standard de réponse JSON pour toutes les routes /api/hub/*.
 */
export function sendJson(res, status, body) {
  res.status(status).json(body);
}

/**
 * Gestion d'erreur uniforme pour les routes /api/hub/*.
 * - HUB_ENV_MISSING → 503 + message clair "configuration manquante"
 * - MbeukHubError    → code/status/message renvoyés (JAMAIS `details`, qui
 *   est typé `unknown` côté SDK et pourrait contenir des infos internes
 *   du Hub — on ne le relaie jamais tel quel au navigateur).
 * - autre            → 500 générique (jamais de stack trace exposée au client)
 */
export function sendHubError(res, e) {
  if (e && e.code === 'HUB_ENV_MISSING') {
    return sendJson(res, 503, {
      success: false,
      error: { code: 'HUB_ENV_MISSING', message: e.message },
    });
  }
  if (e instanceof MbeukHubError) {
    if (e.details) console.error('[hub] MbeukHubError.details (non renvoyé au client):', e.details);
    return sendJson(res, e.status || 400, {
      success: false,
      error: { code: e.code, message: e.message },
    });
  }
  console.error('[hub] Erreur inattendue:', e);
  return sendJson(res, 500, {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.' },
  });
}

/**
 * Ne répond qu'aux requêtes POST — 405 sinon.
 * Exige également Content-Type: application/json (bloque les soumissions
 * de formulaire HTML classiques cross-origin — voir note CSRF dans
 * AUDIT_SECURITE.md : notre modèle (jeton en localStorage, jamais de
 * cookie) rend déjà le CSRF classique inopérant puisqu'aucun navigateur
 * n'envoie automatiquement le session_token d'une victime vers un autre
 * site ; cette vérification est une couche défensive supplémentaire, pas
 * la protection principale).
 */
export function requirePost(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST requis.' } });
    return false;
  }
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    sendJson(res, 415, { success: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type application/json requis.' } });
    return false;
  }
  return true;
}

/**
 * Vérifie que l'en-tête Origin (envoyé par tout navigateur moderne pour
 * une requête POST cross-origin en mode 'cors') correspond au domaine
 * attendu. Les env `ALLOWED_ORIGIN` (URL de prod) et `VERCEL_URL`
 * (preview deployments) sont acceptées automatiquement. Les requêtes
 * SANS en-tête Origin (ex: appels serveur-à-serveur légitimes, curl)
 * sont laissées passer ici — cette fonction est une couche défensive
 * anti-confused-deputy pour le navigateur, pas un mécanisme d'auth.
 */
export function rejectIfBadOrigin(req, res) {
  const origin = req.headers.origin;
  if (!origin) return false; // pas de header Origin = pas une requête cross-origin de navigateur
  const allowed = new Set(
    [process.env.ALLOWED_ORIGIN, process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : null]
      .filter(Boolean)
  );
  if (allowed.size === 0) return false; // rien de configuré → ne bloque pas (évite un 403 en dev/local mal configuré)
  const ok = [...allowed].some((a) => origin === a || origin.startsWith(a));
  if (!ok) {
    sendJson(res, 403, { success: false, error: { code: 'FORBIDDEN_ORIGIN', message: 'Origine non autorisée.' } });
    return true;
  }
  return false;
}

// ── Validation d'entrée (défense en profondeur — le Hub valide aussi côté
// serveur, mais on ne doit jamais lui transmettre des payloads bruts non
// contrôlés issus directement du client). ──

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

/** true si `v` est une string non vide et sous la limite de longueur. */
export function isSafeString(v, maxLen = 256) {
  return typeof v === 'string' && v.length > 0 && v.length <= maxLen;
}

export function isValidEmail(v) {
  return isSafeString(v, 254) && EMAIL_RE.test(v);
}

/**
 * Rejette la requête (400) si `email` est absent/invalide.
 * Retourne true si la requête a été rejetée (le handler doit alors `return`).
 */
export function rejectIfInvalidEmail(res, email) {
  if (!isValidEmail(email)) {
    sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'Email invalide.' } });
    return true;
  }
  return false;
}

/**
 * Exige un `session_token` non vide dans le body — utilisé par les routes
 * qui exposent des données ou actions liées à un compte (verify,
 * revoke-device) afin qu'un appel totalement anonyme (sans avoir été
 * connecté au moins une fois) soit rejeté d'emblée. Le Hub reste
 * responsable de la vérification cryptographique du token ; ce contrôle
 * ne fait que relever le niveau minimal d'accès requis pour appeler
 * ces routes (défense en profondeur, pas une garantie absolue — voir
 * HUB_INTEGRATION.md § Sécurité pour la limite connue).
 */
export function rejectIfNoSessionToken(res, session_token) {
  if (!isSafeString(session_token, 2048)) {
    sendJson(res, 401, { success: false, error: { code: 'SESSION_REQUIRED', message: 'Session requise pour cette action.' } });
    return true;
  }
  return false;
}
