// POST /api/hub/forgot-password
// Body: { email }
// Le Hub génère un nouveau mot de passe et l'envoie par email (Brevo).
import { rejectIfBadOrigin, getHubClient, getProductId, sendJson, sendHubError, requirePost, rejectIfInvalidEmail } from '../../lib/hub/client.js';
import { enforceRateLimit } from '../../lib/hub/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (rejectIfBadOrigin(req, res)) return;
  const { email } = req.body || {};

  // Anti email-bombing : 3 demandes / heure par IP ET par email ciblé.
  if (enforceRateLimit(req, res, { routeName: 'forgot-password', limit: 3, windowMs: 60 * 60 * 1000, discriminant: email })) return;
  if (rejectIfInvalidEmail(res, email)) return;

  try {
    const hub = getHubClient();
    const product_id = getProductId();

    let brevo;
    if (process.env.SAAS_BREVO_API_KEY && process.env.SAAS_BREVO_SENDER_EMAIL) {
      brevo = {
        apiKey: process.env.SAAS_BREVO_API_KEY,
        senderEmail: process.env.SAAS_BREVO_SENDER_EMAIL,
        senderName: process.env.SAAS_BREVO_SENDER_NAME || undefined,
      };
    }

    const result = await hub.auth.forgotPassword({ email, product_id, brevo });
    // Réponse volontairement générique côté UI (voir auth-screens.js) pour
    // ne pas confirmer/infirmer l'existence d'un compte (anti-énumération).
    return sendJson(res, 200, { success: true, data: result });
  } catch (e) {
    return sendHubError(res, e);
  }
}
