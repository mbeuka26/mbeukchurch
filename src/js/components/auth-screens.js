// components/auth-screens.js
// ────────────────────────────────────────────────────────────────────────
// Écrans d'authentification — connectés au Hub Central MbeukTechnologies
// via engines/license.js (LIC) / services/hub-service.js (HubService).
// L'onglet "Activer une licence" (clé MBK-XXXX manuelle) a été RETIRÉ :
// la licence est désormais liée au compte (email+mdp) créé sur ce SaaS,
// gérée entièrement par le Hub (essai auto, réabonnement, quota appareils).
// ────────────────────────────────────────────────────────────────────────
import { AUTH, CFG } from '../core/auth.js';
import { TabSync } from '../core/state.js';
import { LIC } from '../engines/license.js';

export function showAuthScreen(msg) {
  document.body.innerHTML = `
<div id="auth-root" style="min-height:100vh;background:#0f2744;font-family:'Segoe UI',sans-serif;overflow-x:hidden">
<style>
  #auth-root{--auth-nv:#0f2744;--auth-nv2:#1a3a5c;--auth-gd:#c9a84c;--auth-gd2:#f0c96b}
  @keyframes authFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes authFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes authFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes authGlow{0%,100%{opacity:.5}50%{opacity:1}}
  .auth-wrap{display:grid;grid-template-columns:1.5fr 1fr;min-height:100vh}
  .auth-visual{position:relative;background:linear-gradient(135deg,#0a1d33 0%,#0f2744 45%,#1a3a5c 100%);padding:56px 48px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
  .auth-visual::before{content:'';position:absolute;top:-15%;right:-10%;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,.16),transparent 70%);animation:authGlow 6s ease-in-out infinite}
  .auth-visual::after{content:'';position:absolute;bottom:-20%;left:-8%;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(26,58,92,.5),transparent 70%)}
  .auth-formside{background:linear-gradient(180deg,#0f2744,#132c4d);padding:40px 32px;display:flex;flex-direction:column;justify-content:center;align-items:center}
  .auth-feat{display:flex;align-items:center;gap:12px;padding:11px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;margin-bottom:10px;backdrop-filter:blur(6px);animation:authFadeUp .5s ease both;transition:transform .2s,background .2s}
  .auth-feat:hover{transform:translateX(4px);background:rgba(255,255,255,.08)}
  .auth-badge{display:flex;align-items:center;gap:7px;padding:8px 13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;font-size:.72rem;color:rgba(255,255,255,.65);white-space:nowrap}
  .auth-card{animation:authFadeUp .55s cubic-bezier(.22,1,.36,1) both}
  #auth-root input:focus{border-color:var(--auth-gd)!important;box-shadow:0 0 0 3px rgba(201,168,76,.18)}
  #auth-root button{transition:transform .15s ease,filter .15s ease,box-shadow .15s ease}
  #auth-root button:hover{filter:brightness(1.08)}
  #auth-root button:active{transform:scale(.97)}
  .auth-link:hover{background:rgba(255,255,255,.09)!important;transform:translateY(-2px)}
  .auth-cross{animation:authFloat 5s ease-in-out infinite}
  @media(max-width:900px){
    .auth-wrap{grid-template-columns:1fr}
    .auth-visual{padding:36px 24px 28px;text-align:center}
    .auth-visual::before,.auth-visual::after{display:none}
    .auth-feat{justify-content:center}
    .auth-badges-row{justify-content:center}
    .auth-formside{padding:28px 18px 40px}
  }
</style>

<div class="auth-wrap">

  <!-- ═══ PARTIE GAUCHE : VITRINE (60%) ═══ -->
  <div class="auth-visual">
    <div style="position:relative;z-index:1;max-width:520px;margin:0 auto;width:100%">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:26px">
        <div class="auth-cross" style="font-size:2.4rem">&#10013;</div>
        <div>
          <div style="color:#f0c96b;font-size:1.5rem;font-weight:800;letter-spacing:.5px">${CFG.APP_NAME}</div>
          <div style="color:rgba(255,255,255,.45);font-size:.75rem">Church Management System</div>
        </div>
      </div>

      <div style="color:#fff;font-size:1.7rem;font-weight:700;line-height:1.35;margin-bottom:14px;animation:authFadeUp .5s ease both">
        Gérez votre église,<br><span style="color:#f0c96b">simplement et sereinement.</span>
      </div>
      <div style="color:rgba(255,255,255,.55);font-size:.92rem;line-height:1.6;margin-bottom:30px;animation:authFadeUp .6s ease both">
        Membres, finances, communication et intercession : tout MbeukChurch fonctionne même sans connexion internet, où que vous soyez.
      </div>

      <div style="margin-bottom:28px">
        <div class="auth-feat" style="animation-delay:.05s">
          <span style="font-size:1.15rem">&#128101;</span><span style="color:rgba(255,255,255,.85);font-size:.85rem;font-weight:600">Gestion complète des membres &amp; visiteurs</span>
        </div>
        <div class="auth-feat" style="animation-delay:.1s">
          <span style="font-size:1.15rem">&#128176;</span><span style="color:rgba(255,255,255,.85);font-size:.85rem;font-weight:600">Finances, dîmes et budget en temps réel</span>
        </div>
        <div class="auth-feat" style="animation-delay:.15s">
          <span style="font-size:1.15rem">&#128226;</span><span style="color:rgba(255,255,255,.85);font-size:.85rem;font-weight:600">Email, SMS &amp; WhatsApp intégrés</span>
        </div>
        <div class="auth-feat" style="animation-delay:.2s">
          <span style="font-size:1.15rem">&#129302;</span><span style="color:rgba(255,255,255,.85);font-size:.85rem;font-weight:600">Assistant IA &amp; étude biblique</span>
        </div>
        <div class="auth-feat" style="animation-delay:.25s">
          <span style="font-size:1.15rem">&#128274;</span><span style="color:rgba(255,255,255,.85);font-size:.85rem;font-weight:600">Sous-comptes &amp; permissions sécurisées</span>
        </div>
        <div class="auth-feat" style="animation-delay:.3s">
          <span style="font-size:1.15rem">&#9889;</span><span style="color:rgba(255,255,255,.85);font-size:.85rem;font-weight:600">Fonctionne 100% hors-ligne</span>
        </div>
      </div>

      <div class="auth-badges-row" style="display:flex;flex-wrap:wrap;gap:8px;animation:authFadeIn .8s ease both">
        <div class="auth-badge">&#128737;&#65039; Sécurisé</div>
        <div class="auth-badge">&#9729;&#65039; Hébergé Cloud</div>
        <div class="auth-badge">&#8987; Disponible 24h/24</div>
        <div class="auth-badge">&#128190; Sauvegardes auto</div>
        <div class="auth-badge">&#127981; Support pro</div>
        <div class="auth-badge">&#128272; Données protégées</div>
      </div>
    </div>
  </div>

  <!-- ═══ PARTIE DROITE : FORMULAIRES (40%) ═══ -->
  <div class="auth-formside">
  <div style="width:100%;max-width:400px">

  <!-- Card -->
  <div id="auth-card" class="auth-card" style="background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.4)">

    <!-- Tabs -->
    <div style="display:flex;background:rgba(0,0,0,.3);border-radius:12px;padding:4px;margin-bottom:24px">
      <button id="tab-login" onclick="authTab('login')" style="flex:1;padding:10px;border:none;border-radius:9px;cursor:pointer;font-size:.85rem;font-weight:600;font-family:inherit;background:#c9a84c;color:#0f2744;transition:all .2s">Se connecter</button>
      <button id="tab-register" onclick="authTab('register')" style="flex:1;padding:10px;border:none;border-radius:9px;cursor:pointer;font-size:.85rem;font-weight:600;font-family:inherit;background:transparent;color:rgba(255,255,255,.6)">Créer un compte</button>
    </div>

    ${msg ? `<div style="background:rgba(229,57,53,.15);border:1px solid rgba(229,57,53,.4);border-radius:10px;padding:12px;color:#ff8a80;font-size:.83rem;margin-bottom:16px;text-align:center">${msg}</div>` : ''}

    <!-- Login Form -->
    <div id="form-login">
      <div style="margin-bottom:14px">
        <label style="color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;display:block;margin-bottom:5px">EMAIL</label>
        <input id="l-email" type="email" placeholder="email@exemple.com" style="${INP_STYLE}">
      </div>
      <div style="margin-bottom:10px">
        <label style="color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;display:block;margin-bottom:5px">MOT DE PASSE</label>
        <input id="l-password" type="password" placeholder="••••••••" style="${INP_STYLE}">
      </div>
      <div style="text-align:right;margin-bottom:14px">
        <a href="#" onclick="authTab('forgot');return false" style="color:rgba(255,255,255,.5);font-size:.76rem;text-decoration:underline">Mot de passe oublié ?</a>
      </div>
      <button onclick="doLogin()" style="${BTN_PRIMARY}">Se connecter &rarr;</button>
    </div>

    <!-- Register Form -->
    <div id="form-register" style="display:none">
      <div style="margin-bottom:14px">
        <label style="color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;display:block;margin-bottom:5px">NOM COMPLET (facultatif)</label>
        <input id="r-name" placeholder="Jean Konan" style="${INP_STYLE}">
      </div>
      <div style="margin-bottom:14px">
        <label style="color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;display:block;margin-bottom:5px">EMAIL</label>
        <input id="r-email" type="email" placeholder="email@exemple.com" style="${INP_STYLE}">
      </div>
      <div style="margin-bottom:20px">
        <label style="color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;display:block;margin-bottom:5px">MOT DE PASSE</label>
        <input id="r-password" type="password" placeholder="••••••••" style="${INP_STYLE}">
      </div>
      <button onclick="doRegister()" style="width:100%;padding:16px;background:linear-gradient(135deg,#c9a84c,#f0c96b);color:#0f2744;border:none;border-radius:14px;cursor:pointer;font-weight:800;font-size:1rem;letter-spacing:.5px;box-shadow:0 4px 20px rgba(201,168,76,.3)">
        &#127775; CRÉER MON COMPTE &amp; DÉMARRER L'ESSAI — ${CFG.TRIAL_DAYS} JOURS
      </button>
      <div style="text-align:center;color:rgba(255,255,255,.4);font-size:.72rem;margin-top:10px">
        Un compte = un email + mot de passe pour ${CFG.APP_NAME}. Votre essai gratuit démarre automatiquement.
      </div>
    </div>

    <!-- Forgot password form -->
    <div id="form-forgot" style="display:none">
      <div style="color:rgba(255,255,255,.75);font-size:.85rem;margin-bottom:16px;line-height:1.5">
        Entrez votre email : nous vous envoyons un nouveau mot de passe par email.
      </div>
      <div style="margin-bottom:20px">
        <label style="color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;display:block;margin-bottom:5px">EMAIL</label>
        <input id="f-email" type="email" placeholder="email@exemple.com" style="${INP_STYLE}">
      </div>
      <button onclick="doForgotPassword()" style="${BTN_PRIMARY}">Recevoir un nouveau mot de passe</button>
      <div style="text-align:center;margin-top:14px">
        <a href="#" onclick="authTab('login');return false" style="color:rgba(255,255,255,.5);font-size:.78rem;text-decoration:underline">&larr; Retour à la connexion</a>
      </div>
    </div>

    <!-- Device quota management form -->
    <div id="form-devices" style="display:none">
      <div style="color:rgba(255,255,255,.75);font-size:.85rem;margin-bottom:14px;line-height:1.5">
        Nombre maximum d'appareils atteint pour ce compte. Libérez un appareil ci-dessous puis reconnectez-vous.
      </div>
      <div id="devices-list" style="margin-bottom:16px"></div>
      <div style="text-align:center">
        <a href="#" onclick="authTab('login');return false" style="color:rgba(255,255,255,.5);font-size:.78rem;text-decoration:underline">&larr; Retour à la connexion</a>
      </div>
    </div>

    <!-- Auth messages -->
    <div id="auth-err" style="display:none;margin-top:14px;background:rgba(229,57,53,.15);border:1px solid rgba(229,57,53,.4);border-radius:10px;padding:12px;color:#ff8a80;font-size:.83rem;text-align:center"></div>
    <div id="auth-ok"  style="display:none;margin-top:14px;background:rgba(46,125,50,.15);border:1px solid rgba(67,160,71,.4);border-radius:10px;padding:12px;color:#a5d6a7;font-size:.83rem;text-align:center"></div>
    <div id="auth-load" style="display:none;margin-top:14px;text-align:center;color:rgba(255,255,255,.5);font-size:.82rem">&#8987; Chargement...</div>
  </div>

  <!-- Links -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
    <a href="${CFG.WEBSITE_LINK}" target="_blank" class="auth-link" style="display:block;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:rgba(255,255,255,.7);text-decoration:none;text-align:center;font-size:.8rem;font-weight:600;transition:all .2s">
      &#127760; Notre site web
    </a>
    <a href="${CFG.WHATSAPP_LINK}" target="_blank" class="auth-link" style="display:block;padding:12px;background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.3);border-radius:12px;color:#25d366;text-decoration:none;text-align:center;font-size:.8rem;font-weight:600;transition:all .2s">
      &#128242; WhatsApp Support
    </a>
    <a href="${CFG.FACEBOOK_LINK}" target="_blank" class="auth-link" style="display:block;padding:12px;background:rgba(24,119,242,.1);border:1px solid rgba(24,119,242,.3);border-radius:12px;color:#1877f2;text-decoration:none;text-align:center;font-size:.8rem;font-weight:600;transition:all .2s;grid-column:span 2">
      &#128241; Facebook
    </a>
  </div>

  <div style="text-align:center;margin-top:16px;color:rgba(255,255,255,.3);font-size:.72rem">
    ${CFG.APP_NAME} © ${new Date().getFullYear()} · Tous droits réservés
  </div>
  </div>
  </div>

</div>
</div>`;

  // Keyboard enter support
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const reg = document.getElementById('form-register');
      const forgot = document.getElementById('form-forgot');
      if (reg && reg.style.display !== 'none') doRegister();
      else if (forgot && forgot.style.display !== 'none') doForgotPassword();
      else doLogin();
    }
  }, { once: true });
}


export const INP_STYLE = 'width:100%;padding:11px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:.85rem;outline:none;font-family:inherit;box-sizing:border-box';
export const BTN_PRIMARY = 'width:100%;padding:13px;background:linear-gradient(135deg,#c9a84c,#f0c96b);color:#0f2744;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:.9rem;font-family:inherit;transition:all .2s';


export function authTab(tab) {
  const forms = { login: 'form-login', register: 'form-register', forgot: 'form-forgot', devices: 'form-devices' };
  Object.entries(forms).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === tab ? 'block' : 'none';
  });
  const tl = document.getElementById('tab-login');
  const tr = document.getElementById('tab-register');
  const isReg = tab === 'register';
  const showTabs = tab === 'login' || tab === 'register';
  if (tl && tr) {
    tl.style.display = showTabs ? 'block' : 'none';
    tr.style.display = showTabs ? 'block' : 'none';
    tl.style.background = isReg ? 'transparent' : '#c9a84c';
    tl.style.color = isReg ? 'rgba(255,255,255,.6)' : '#0f2744';
    tr.style.background = isReg ? '#c9a84c' : 'transparent';
    tr.style.color = isReg ? '#0f2744' : 'rgba(255,255,255,.6)';
  }
  authClearMsg();
}


export function authErr(msg) {
  const el = document.getElementById('auth-err');
  const ok = document.getElementById('auth-ok');
  const ld = document.getElementById('auth-load');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  if (ok) ok.style.display = 'none';
  if (ld) ld.style.display = 'none';
}

export function authOk(msg) {
  const el = document.getElementById('auth-ok');
  const er = document.getElementById('auth-err');
  const ld = document.getElementById('auth-load');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  if (er) er.style.display = 'none';
  if (ld) ld.style.display = 'none';
}

export function authLoad(msg) {
  const ld = document.getElementById('auth-load');
  const er = document.getElementById('auth-err');
  const ok = document.getElementById('auth-ok');
  if (ld) { ld.textContent = '⏳ ' + (msg || 'Chargement...'); ld.style.display = 'block'; }
  if (er) er.style.display = 'none';
  if (ok) ok.style.display = 'none';
}

export function authClearMsg() {
  ['auth-err','auth-ok','auth-load'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

const LICENSE_ERROR_MESSAGES = {
  no_license: 'Aucune licence active. Créez un compte pour démarrer votre essai gratuit.',
  ACCOUNT_REQUIRED: 'Créez d\'abord un compte pour démarrer votre essai gratuit.',
  trial_expired: 'Votre période d\'essai gratuite est expirée. Veuillez vous réabonner.',
  TRIAL_EXPIRED: 'Votre période d\'essai gratuite est expirée. Veuillez vous réabonner.',
  license_expired: 'Votre licence est expirée. Veuillez la renouveler.',
  LICENSE_EXPIRED: 'Votre licence est expirée. Veuillez la renouveler.',
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
};

function licenseMessage(reason) {
  return LICENSE_ERROR_MESSAGES[reason] || ('Accès refusé : ' + (reason || 'raison inconnue'));
}


export async function doLogin() {
  const email = document.getElementById('l-email')?.value?.trim();
  const pass  = document.getElementById('l-password')?.value;
  if (!email || !pass) { authErr('Email et mot de passe requis.'); return; }
  authLoad('Connexion en cours...');
  const res = await LIC.login(email, pass);

  if (res.deviceLimitReached) {
    authClearMsg();
    showDeviceQuotaScreen(res.email, res.devices || [], res.sessionToken);
    return;
  }
  if (!res.ok) {
    if (res.licenseInvalid) { showBlockedScreen(res.reason, email); return; }
    authErr((res.error && res.error.message) || 'Email ou mot de passe incorrect.');
    return;
  }
  launchApp();
}


export async function doRegister() {
  const name  = document.getElementById('r-name')?.value?.trim();
  const email = document.getElementById('r-email')?.value?.trim();
  const pass  = document.getElementById('r-password')?.value;
  if (!email || !pass) { authErr('Email et mot de passe requis.'); return; }
  if (pass.length < 6) { authErr('Mot de passe : minimum 6 caractères.'); return; }
  authLoad('Création du compte et démarrage de l\'essai...');
  const res = await LIC.register(email, pass, { startTrial: true });
  if (!res.ok) { authErr((res.error && res.error.message) || 'Erreur création compte.'); return; }

  // Le register ne renvoie pas de session : on enchaîne un login pour
  // récupérer session_token + license, comme prévu par le SDK.
  authLoad('Connexion...');
  const loginRes = await LIC.login(email, pass);
  if (loginRes.deviceLimitReached) { authClearMsg(); showDeviceQuotaScreen(loginRes.email, loginRes.devices || [], loginRes.sessionToken); return; }
  if (loginRes.licenseInvalid) { showBlockedScreen(loginRes.reason, email); return; }
  if (!loginRes.ok) { authErr((loginRes.error && loginRes.error.message) || 'Compte créé, mais connexion impossible. Réessayez.'); return; }

  if (AUTH.profile === null) AUTH.profile = {};
  AUTH.profile.name = name || '';
  try {
    const raw = JSON.parse(localStorage.getItem('_as') || 'null');
    if (raw) { raw.profile = AUTH.profile; localStorage.setItem('_as', JSON.stringify(raw)); }
  } catch (e) {}

  authOk('✅ Compte créé et essai gratuit de ' + CFG.TRIAL_DAYS + ' jours démarré !');
  setTimeout(launchApp, 900);
}


export async function doForgotPassword() {
  const email = document.getElementById('f-email')?.value?.trim();
  if (!email) { authErr('Entrez votre email.'); return; }
  authLoad('Envoi en cours...');
  const res = await LIC.forgotPassword(email);
  if (!res.ok) { authErr((res.error && res.error.message) || 'Erreur lors de l\'envoi.'); return; }
  authOk('✅ Si un compte existe pour cet email, un nouveau mot de passe vient de lui être envoyé.');
}


// ── QUOTA APPAREILS ──

export function showDeviceQuotaScreen(email, devices, sessionToken) {
  authTab('devices');
  const list = document.getElementById('devices-list');
  if (!list) return;
  list.innerHTML = ''; // reset sans injection

  if (!devices.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:rgba(255,255,255,.5);font-size:.82rem;text-align:center';
    empty.textContent = 'Aucun appareil listé par le serveur.';
    list.appendChild(empty);
    return;
  }

  devices.forEach((d, i) => {
    // IMPORTANT SÉCURITÉ : device_identifier provient du serveur mais est
    // in fine une valeur générée côté navigateur (empreinte), donc
    // potentiellement falsifiable par un attaquant qui appellerait l'API
    // directement. On ne l'insère JAMAIS via innerHTML/onclick interpolé :
    // on utilise exclusivement textContent + addEventListener ci-dessous,
    // ce qui neutralise toute tentative d'injection HTML/JS.
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;margin-bottom:8px';

    const info = document.createElement('div');
    info.style.cssText = 'min-width:0';
    const idLine = document.createElement('div');
    idLine.style.cssText = 'color:#fff;font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    idLine.textContent = d.device_identifier || ('Appareil ' + (i + 1)); // textContent = pas d'exécution possible
    info.appendChild(idLine);
    if (d.last_seen_at) {
      const seenLine = document.createElement('div');
      seenLine.style.cssText = 'color:rgba(255,255,255,.4);font-size:.7rem';
      seenLine.textContent = 'Vu le ' + new Date(d.last_seen_at).toLocaleString('fr-FR');
      info.appendChild(seenLine);
    }

    const btn = document.createElement('button');
    btn.style.cssText = 'padding:8px 12px;background:rgba(229,57,53,.15);border:1px solid rgba(229,57,53,.4);border-radius:8px;color:#ff8a80;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap';
    btn.textContent = 'Révoquer';
    btn.addEventListener('click', () => doRevokeDevice(email, d.device_identifier, sessionToken)); // pas de string JS interpolée

    row.appendChild(info);
    row.appendChild(btn);
    list.appendChild(row);
  });
}

export async function doRevokeDevice(email, deviceIdentifier, sessionToken) {
  authLoad('Libération de l\'appareil...');
  const res = await LIC.revokeDevice(email, deviceIdentifier, sessionToken);
  if (!res.ok) { authErr((res.error && res.error.message) || 'Erreur lors de la révocation.'); return; }
  authOk('✅ Appareil libéré. Reconnectez-vous.');
  setTimeout(() => authTab('login'), 900);
}


// ── EXPIRED / BLOCKED SCREEN (réabonnement) ──

let BLOCKED_SCREEN_EMAIL = null; // capturé au moment de l'affichage, survit à un AUTH.clear()

export function showBlockedScreen(reason, email) {
  BLOCKED_SCREEN_EMAIL = email || (AUTH.user && AUTH.user.email) || null;
  const msgs = {
    trial_expired: {
      title: '⏰ Essai gratuit expiré',
      body: 'Votre période d\'essai gratuite est terminée.\nRéabonnez-vous pour continuer à utiliser ' + CFG.APP_NAME + '.',
    },
    TRIAL_EXPIRED: {
      title: '⏰ Essai gratuit expiré',
      body: 'Votre période d\'essai gratuite est terminée.\nRéabonnez-vous pour continuer à utiliser ' + CFG.APP_NAME + '.',
    },
    license_expired: {
      title: '🔐 Licence expirée',
      body: 'Votre licence a expiré. Réabonnez-vous pour continuer.',
    },
    LICENSE_EXPIRED: {
      title: '🔐 Licence expirée',
      body: 'Votre licence a expiré. Réabonnez-vous pour continuer.',
    },
  };
  const m = msgs[reason] || { title: '🔒 Accès refusé', body: 'Votre accès a été révoqué ou n\'est plus valide.' };
  document.body.innerHTML = `
<div style="min-height:100vh;background:linear-gradient(135deg,#0a1d33 0%,#0f2744 50%,#1a3a5c 100%);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;padding:20px;position:relative;overflow:hidden">
<style>
  @keyframes blkFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes blkFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .blk-card{animation:blkFadeUp .5s cubic-bezier(.22,1,.36,1) both}
  .blk-icon{animation:blkFloat 3.5s ease-in-out infinite}
  .blk-link{transition:all .2s}
  .blk-link:hover{transform:translateY(-2px);filter:brightness(1.08)}
</style>
<div style="position:absolute;top:-15%;right:-10%;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,.14),transparent 70%)"></div>
<div class="blk-card" style="position:relative;background:rgba(255,255,255,.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:44px 36px;max-width:420px;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.4)">
  <div class="blk-icon" style="font-size:3.2rem;margin-bottom:16px">🔒</div>
  <div style="font-size:1.35rem;font-weight:800;color:#f0c96b;margin-bottom:12px">${m.title}</div>
  <div style="color:rgba(255,255,255,.7);line-height:1.6;margin-bottom:26px;white-space:pre-line;font-size:.9rem">${m.body}</div>
  <div id="blk-err" style="display:none;margin-bottom:14px;background:rgba(229,57,53,.15);border:1px solid rgba(229,57,53,.4);border-radius:10px;padding:10px;color:#ff8a80;font-size:.8rem"></div>
  <button onclick="doStartReabonnement()" class="blk-link" style="width:100%;display:block;padding:14px;background:linear-gradient(135deg,#c9a84c,#f0c96b);color:#0f2744;border:none;border-radius:14px;font-weight:800;margin-bottom:10px;box-shadow:0 4px 20px rgba(201,168,76,.3);cursor:pointer;font-family:inherit;font-size:.95rem">🔄 Réabonner mon compte</button>
  <a href="${CFG.WHATSAPP_LINK}" target="_blank" class="blk-link" style="display:block;padding:12px;background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.3);border-radius:12px;color:#25d366;text-decoration:none;font-weight:600;font-size:.85rem">📱 Contacter le support WhatsApp</a>
  <button onclick="AUTH.clear();location.reload()" style="margin-top:14px;background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:.8rem;text-decoration:underline;transition:color .2s" onmouseover="this.style.color='rgba(255,255,255,.7)'" onmouseout="this.style.color='rgba(255,255,255,.4)'">Se connecter avec un autre compte</button>
</div>
</div>`;
}

export async function doStartReabonnement() {
  const errEl = document.getElementById('blk-err');
  if (!BLOCKED_SCREEN_EMAIL) {
    if (errEl) { errEl.textContent = 'Session introuvable — reconnectez-vous puis réessayez.'; errEl.style.display = 'block'; }
    return;
  }
  const res = await LIC.startCheckout(undefined, BLOCKED_SCREEN_EMAIL);
  if (!res.ok) {
    if (errEl) { errEl.textContent = (res.error && res.error.message) || 'Erreur lors de l\'ouverture du paiement.'; errEl.style.display = 'block'; }
    return;
  }
  const url = res.data && (res.data.checkout_url || res.data.url || res.data.payment_url);
  if (url) { window.location.href = url; }
  else if (errEl) { errEl.textContent = 'Le Hub n\'a pas renvoyé d\'URL de paiement.'; errEl.style.display = 'block'; }
}

// ── USER MENU (top bar addition) ──

export function addUserMenu() {
  const tba = document.getElementById('tba');
  if (!tba) return;
  const name = (AUTH.profile && AUTH.profile.name) || (AUTH.user && AUTH.user.email) || 'Utilisateur';
  const lic = AUTH.license || {};
  const accessType = lic.access_type || (lic.license && lic.license.access_type);
  const expiration = lic.expiration_date || (lic.license && lic.license.expiration_date);
  const exp = expiration ? new Date(expiration).toLocaleDateString('fr-FR') : '';
  const isTrialBadge = accessType === 'trial' ?
    '<span style="background:#c9a84c;color:#0f2744;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px">ESSAI</span>' : '';

  const menuHtml = `
<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
  <div style="font-size:.78rem;color:#6b7280">
    <span style="font-weight:600;color:#0f2744">${name.split(' ')[0]}</span>${isTrialBadge}
    ${exp ? '<br><span style="font-size:.7rem;color:#9ba3b4">Expire: ' + exp + '</span>' : ''}
  </div>
  <button onclick="doLogout()" style="padding:6px 14px;background:none;border:1.5px solid #e4e7ed;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600;color:#6b7280">Déconnexion</button>
</div>`;
  tba.insertAdjacentHTML('beforeend', menuHtml);
}


export async function doLogout() {
  if (!confirm('Se déconnecter?')) return;
  await LIC.logout();
  AUTH.clear();
  sessionStorage.removeItem('mbk_welcomed');
  sessionStorage.removeItem('mbk_active_account');
  if (typeof TabSync !== 'undefined') TabSync.emit('logout');
  location.reload();
}

// ── LAUNCH APP ──
