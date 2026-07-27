// POST /api/hub/refresh
// Body: { refresh_token }
import { rejectIfBadOrigin, getHubClient, sendJson, sendHubError, requirePost, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { refresh_token } = req.body || {};

  if (enforceRateLimit(req, res, { routeName: 'refresh', limit: 20, windowMs: 10 * 60 * 1000 })) return;
  if (!isSafeString(refresh_token, 2048)) {
    return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: 'refresh_token requis.' } });
  }

  try {
    const hub = getHubClient();
    const result = await hub.auth.refreshSession({ refresh_token });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
