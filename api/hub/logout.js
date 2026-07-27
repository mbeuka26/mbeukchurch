// POST /api/hub/logout
// Body: { session_token }
import { rejectIfBadOrigin, getHubClient, sendJson, sendHubError, requirePost, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { session_token } = req.body || {};

  if (enforceRateLimit(req, res, { routeName: 'logout', limit: 30, windowMs: 10 * 60 * 1000 })) return;
  if (!isSafeString(session_token, 2048)) {
    return sendJson(res, 200, { success: true, data: { logged_out: true } }); // rien à faire côté Hub
  }

  try {
    const hub = getHubClient();
    const result = await hub.auth.logout({ session_token });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
