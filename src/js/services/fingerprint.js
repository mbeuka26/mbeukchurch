export async function generateDeviceFingerprint() {
  const components = [];

  // Infos navigateur stables
  components.push(navigator.userAgent || '');
  components.push(navigator.platform || '');
  components.push(navigator.language || '');
  components.push(navigator.hardwareConcurrency || 0);
  components.push((navigator.deviceMemory || 0).toString());
  components.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);
  components.push(new Date().getTimezoneOffset().toString());
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');

  // Canvas fingerprint (rendu unique par GPU/OS)
  try {
    const cv = document.createElement('canvas');
    cv.width = 200; cv.height = 50;
    const ctx = cv.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#0f2744';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#c9a84c';
    ctx.fillText('MbeukChurch\u2713', 10, 10);
    ctx.fillStyle = 'rgba(201,168,76,0.5)';
    ctx.fillText('MbeukChurch\u2713', 12, 12);
    components.push(cv.toDataURL().slice(-50));
  } catch(e) { components.push('no-canvas'); }

  // WebGL fingerprint
  try {
    const cvw = document.createElement('canvas');
    const gl = cvw.getContext('webgl') || cvw.getContext('experimental-webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      components.push(dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'no-dbg');
      components.push(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'no-dbg');
    }
  } catch(e) { components.push('no-webgl'); }

  // Hash SHA-256 de tous les composants
  const raw = components.join('||');
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    return 'FP-' + hex.slice(0, 32).toUpperCase();
  } catch(e) {
    // Fallback deterministe si SubtleCrypto indisponible
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    return 'FP-' + Math.abs(h).toString(36).toUpperCase().padEnd(32, '0');
  }
}

// Cache en mémoire + IndexedDB (survit au nettoyage localStorage)

export let _deviceFpCache = null;
export async function getDeviceId() {
  if (_deviceFpCache) return _deviceFpCache;
  // Essayer IndexedDB d'abord (plus persistant que localStorage)
  try {
    const stored = await _getFpFromIDB();
    if (stored) { _deviceFpCache = stored; return stored; }
  } catch(e) {}
  // Générer un nouveau fingerprint stable
  const fp = await generateDeviceFingerprint();
  _deviceFpCache = fp;
  // Stocker en IndexedDB ET localStorage (redondance)
  try { await _saveFpToIDB(fp); } catch(e) {}
  try { localStorage.setItem('_eid', fp); } catch(e) {}
  return fp;
}


export function _getFpFromIDB() {
  return new Promise((ok, fail) => {
    if (!indexedDB) { fail(); return; }
    const req = indexedDB.open('_mbk_fp', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('fp', { keyPath: 'k' });
    req.onsuccess = e => {
      try {
        const t = e.target.result.transaction('fp', 'readonly');
        const r = t.objectStore('fp').get('deviceFp');
        r.onsuccess = () => ok(r.result?.v || null);
        r.onerror = () => ok(null);
      } catch(_) { ok(null); }
    };
    req.onerror = () => fail();
  });
}


export function _saveFpToIDB(fp) {
  return new Promise((ok) => {
    const req = indexedDB.open('_mbk_fp', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('fp', { keyPath: 'k' });
    req.onsuccess = e => {
      try {
        const t = e.target.result.transaction('fp', 'readwrite');
        t.objectStore('fp').put({ k: 'deviceFp', v: fp });
        t.oncomplete = ok;
      } catch(_) { ok(); }
    };
    req.onerror = ok;
  });
}

