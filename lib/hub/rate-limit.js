// lib/hub/rate-limit.js
// ────────────────────────────────────────────────────────────────────────
// Limiteur de débit "best effort" pour les routes /api/hub/*.
//
// ⚠️ LIMITE CONNUE : les fonctions serverless Vercel peuvent tourner sur
// plusieurs instances/régions en parallèle, chacune avec sa propre mémoire.
// Ce limiteur en mémoire freine donc les abus scriptés basiques (un seul
// script, une seule instance chaude) mais N'EST PAS une garantie contre un
// attaquant distribué. Pour une protection fiable en production, activez
// Upstash Redis (gratuit en petit volume) : voir la fonction
// `rateLimitUpstash` plus bas, désactivée tant que les env vars ne sont
// pas renseignées (fallback silencieux vers le limiteur mémoire).
// ────────────────────────────────────────────────────────────────────────

const buckets = new Map(); // clé -> { count, resetAt }

function memoryRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (b.count >= limit) return { allowed: false, remaining: 0, retryAfterMs: b.resetAt - now };
  b.count += 1;
  return { allowed: true, remaining: limit - b.count };
}

// Nettoyage périodique pour éviter une fuite mémoire sur instance longue durée.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 5 * 60 * 1000).unref?.();

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Applique une limite `limit` requêtes / `windowMs` par (IP + discriminant).
 * `discriminant` est typiquement l'email de la requête, pour limiter aussi
 * par compte ciblé (empêche un attaquant multi-IP de bourriner UN SEUL
 * compte victime, en plus de la limite par IP globale).
 * Renvoie true si la requête a été bloquée (429 déjà envoyé).
 */
export function enforceRateLimit(req, res, { routeName, limit, windowMs, discriminant }) {
  const ip = clientIp(req);
  const keyIp = `${routeName}:ip:${ip}`;
  const ipCheck = memoryRateLimit(keyIp, limit, windowMs);
  if (!ipCheck.allowed) {
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez plus tard.' } });
    return true;
  }
  if (discriminant) {
    const keyD = `${routeName}:acct:${String(discriminant).toLowerCase()}`;
    const dCheck = memoryRateLimit(keyD, limit, windowMs);
    if (!dCheck.allowed) {
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives pour ce compte, réessayez plus tard.' } });
      return true;
    }
  }
  return false;
}
