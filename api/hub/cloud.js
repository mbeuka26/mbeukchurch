// POST /api/hub/cloud
// Body: { tenant_id? }
// Résout le Cloud actif pour ce produit (mode "central" ou "bring_your_own").
// MbeukChurch utilise aujourd'hui uniquement le flux BYODB existant
// (Cloud Sync BYODB, indépendant du Hub) — cette route est prête si vous
// activez un jour le Cloud Central pour ce produit dans le Hub.
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  if (enforceRateLimit(req, res, { routeName: 'cloud', limit: 20, windowMs: 10 * 60 * 1000 })) return;
  try {
    const { tenant_id } = req.body || {};
    const hub = getHubClient();
    const product_id = getProductId();
    const result = await hub.cloud.getCloud({ productId: product_id, tenantId: tenant_id });
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
