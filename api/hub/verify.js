// POST /api/hub/verify
// Body: { email, device_identifier?, session_token }
//
// ⚠️ SÉCURITÉ (voir HUB_INTEGRATION.md) : le SDK Hub (`licenses.verify`)
// est conçu pour être appelé par le backend du SaaS avec un email fourni
// en clair — il n'existe pas côté Hub de méthode "whoami(token)" pour
// prouver que le session_token appartient bien à cet email. On exige donc
// ICI, à minima, la présence d'un session_token non vide pour rejeter les
// appels totalement anonymes/scriptés — mais un attaquant en possession
// d'UN session_token valide (le sien) pourrait toujours interroger le
// statut de licence d'un AUTRE email. C'est une limite structurelle de la
// version actuelle du SDK, remontée à l'équipe Hub ; en attendant, cette
// route est protégée par validation stricte + rate limiting.
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost, rejectIfInvalidEmail, rejectIfNoSessionToken, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { email, device_identifier, session_token } = req.body || {};

  if (enforceRateLimit(req, res, { routeName: 'verify', limit: 30, windowMs: 10 * 60 * 1000, discriminant: email })) return;
  if (rejectIfInvalidEmail(res, email)) return;
  if (rejectIfNoSessionToken(res, session_token)) return;
  if (device_identifier !== undefined && !isSafeString(device_identifier, 256)) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'device_identifier invalide.' } });
  }

  try {
    const hub = getHubClient();
    const product_id = getProductId();
    const result = await hub.licenses.verify({ email, product_id, device_identifier });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
