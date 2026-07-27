// POST /api/hub/checkout
// Body: { customer_email, promo_code?, affiliate_slug?, ref? }
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost, rejectIfInvalidEmail, isSafeString } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { customer_email, promo_code, affiliate_slug, ref } = req.body || {};

  if (enforceRateLimit(req, res, { routeName: 'checkout', limit: 10, windowMs: 15 * 60 * 1000, discriminant: customer_email })) return;
  if (rejectIfInvalidEmail(res, customer_email)) return;
  for (const [name, val] of [['promo_code', promo_code], ['affiliate_slug', affiliate_slug], ['ref', ref]]) {
    if (val !== undefined && !isSafeString(val, 128)) {
      return sendJson(res, 400, { success: false, error: { code: 'BAD_REQUEST', message: `${name} invalide.` } });
    }
  }

  try {
    const hub = getHubClient();
    const product_id = getProductId();
    const result = await hub.checkout.create({ product_id, customer_email, promo_code, affiliate_slug, ref });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
