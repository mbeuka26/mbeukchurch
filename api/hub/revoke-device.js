// POST /api/hub/revoke-device
// Body: { email, device_identifier, session_token }
//
// ⚠️ SÉCURITÉ : voir la même note que verify.js dans HUB_INTEGRATION.md.
// session_token est désormais OBLIGATOIRE ici (il était optionnel dans le
// SDK) précisément pour empêcher un appel anonyme de révoquer l'appareil
// de n'importe quel email deviné/énuméré.
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost, rejectIfInvalidEmail, rejectIfNoSessionToken, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { email, device_identifier, session_token } = req.body || {};

  if (enforceRateLimit(req, res, { routeName: 'revoke-device', limit: 10, windowMs: 15 * 60 * 1000, discriminant: email })) return;
  if (rejectIfInvalidEmail(res, email)) return;
  if (rejectIfNoSessionToken(res, session_token)) return;
  if (!isSafeString(device_identifier, 256)) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'device_identifier requis.' } });
  }

  try {
    const hub = getHubClient();
    const product_id = getProductId();
    const result = await hub.auth.revokeDevice({ email, product_id, device_identifier, session_token });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
