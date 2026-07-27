// POST /api/hub/login
// Body: { email, password, device_identifier }
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost, rejectIfInvalidEmail, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { email, password, device_identifier } = req.body || {};

  // Anti brute-force : 8 tentatives / 10 min par IP ET par compte ciblé.
  if (enforceRateLimit(req, res, { routeName: 'login', limit: 8, windowMs: 10 * 60 * 1000, discriminant: email })) return;

  if (rejectIfInvalidEmail(res, email)) return;
  if (!isSafeString(password, 256)) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'Mot de passe requis.' } });
  }
  if (device_identifier !== undefined && !isSafeString(device_identifier, 256)) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'device_identifier invalide.' } });
  }

  try {
    const hub = getHubClient();
    const product_id = getProductId();
    const result = await hub.auth.login({ email, password, product_id, device_identifier });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
