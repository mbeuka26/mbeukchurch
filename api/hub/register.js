// POST /api/hub/register
// Body: { email, password, start_trial?, device_identifier? }
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost, rejectIfInvalidEmail, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { email, password, start_trial, device_identifier } = req.body || {};

  // Anti-spam de création de comptes : 5 créations / heure par IP.
  if (enforceRateLimit(req, res, { routeName: 'register', limit: 5, windowMs: 60 * 60 * 1000 })) return;

  if (rejectIfInvalidEmail(res, email)) return;
  if (!isSafeString(password, 256) || password.length < 6) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'Mot de passe : 6 caractères minimum.' } });
  }
  if (device_identifier !== undefined && !isSafeString(device_identifier, 256)) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'device_identifier invalide.' } });
  }

  try {
    const hub = getHubClient();
    const product_id = getProductId();
    const result = await hub.auth.register({
      email,
      password,
      product_id,
      start_trial: !!start_trial,
      device_identifier,
    });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
