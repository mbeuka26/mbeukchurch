import { BTN_PRIMARY, INP_STYLE } from '../components/auth-screens.js';
import { showPage } from '../core/router.js';
import { S, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, TW, celebrate, closeModal, esc, gv, notify, openModal, td, uid } from '../core/utils.js';
import { pgParametrage } from '../engines/settings.js';

export function genSalt(){ return Array.from(crypto.getRandomValues(new Uint8Array(8))).map(function(b){return b.toString(16).padStart(2,'0');}).join(''); }
export async function hashPin(pin, salt){
  var enc = new TextEncoder().encode(salt+':'+pin);
  var buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

export function isValidPinFormat(pin){ return /^\d{6,}$/.test(pin||''); }

// ── Détection automatique des menus existants de la sidebar (= permissions) ──

export function detectSidebarMenus(){
  var out=[];
  document.querySelectorAll('#sb .ni[data-p]').forEach(function(b){
    out.push({key:b.dataset.p, label:b.textContent.trim()});
  });
  return out;
}

// ── Compte Administrateur principal (créé automatiquement, PIN par défaut 000000) ──

export async function ensureAdminAccount(){
  var admin = S.data.subaccounts.find(function(x){return x.id==='admin';});
  if (admin) return;
  var salt = genSalt();
  var hash = await hashPin('000000', salt);
  await persist('subaccounts', {id:'admin', nom:'Administrateur', role:'admin', isAdmin:true, description:'Compte principal — accès total', avatar:'👑', pinHash:hash, pinSalt:salt, permissions:'*', active:true, attempts:0, lockedUntil:null, createdAt:Date.now()});
}

// ── Vérification de permission (utilisée par showPage) ──

export function hasPermission(pageKey){
  if (!S.activeAccount || S.activeAccount.isAdmin) return true; // Administrateur ou aucune restriction active = accès total
  var perms = S.activeAccount.permissions || [];
  return perms.indexOf(pageKey) >= 0;
}

// ── Application des permissions à la sidebar existante (masquage, sans réorganisation) ──

export function applyAccountPermissions(){
  var acc = S.activeAccount;
  document.querySelectorAll('#sb .ni[data-p]').forEach(function(b){
    var allowed = !acc || acc.isAdmin || (acc.permissions||[]).indexOf(b.dataset.p) >= 0;
    b.style.display = allowed ? '' : 'none';
  });
}

// ── Écran de sélection de compte + saisie PIN (overlay, ne modifie rien à l'existant) ──

export var AccountGate = {
  check: function(){
    return new Promise(function(resolve){
      var realSubs = S.data.subaccounts.filter(function(x){return x.role!=='admin';});
      if (!realSubs.length){ S.activeAccount=null; resolve(); return; } // CAS 1 : aucun sous-compte → accès direct
      var cached = null;
      try{ cached = JSON.parse(sessionStorage.getItem('mbk_active_account')||'null'); }catch(e){}
      if (cached){
        var fresh = S.data.subaccounts.find(function(x){return x.id===cached.id;});
        if (fresh && fresh.active){ S.activeAccount = fresh.isAdmin?{isAdmin:true,id:'admin',nom:'Administrateur'}:{id:fresh.id,nom:fresh.nom,permissions:fresh.permissions,avatar:fresh.avatar}; resolve(); return; }
      }
      AccountGate._resolve = resolve;
      AccountGate.showPicker();
    });
  },
  showPicker: function(){
    var accs = S.data.subaccounts.filter(function(x){return x.active;});
    var cardsHtml = accs.map(function(a){
      return '<div onclick="AccountGate.showPin(\''+a.id+'\')" style="cursor:pointer;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.14);border-radius:16px;padding:20px 14px;text-align:center;transition:transform .15s,background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.12)\'" onmouseout="this.style.background=\'rgba(255,255,255,.06)\'">' +
        '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#f0c96b);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 10px">'+(a.avatar||(a.isAdmin?'👑':a.nom[0].toUpperCase()))+'</div>' +
        '<div style="color:#fff;font-weight:700;font-size:.88rem">'+esc(a.nom)+'</div>' +
        (a.isAdmin?'<div style="color:#c9a84c;font-size:.68rem;margin-top:2px">Administrateur</div>':'<div style="color:rgba(255,255,255,.5);font-size:.68rem;margin-top:2px">'+esc(a.description||'Sous-compte')+'</div>') +
      '</div>';
    }).join('');
    var root = document.getElementById('account-gate-root');
    var html = '<div id="account-gate-root" style="position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0f2744 0%,#1a3a5c 50%,#0f2744 100%);display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',sans-serif;padding:20px">' +
      '<div style="max-width:520px;width:100%;text-align:center">' +
        '<div style="font-size:1.3rem;font-weight:700;color:#f0c96b;margin-bottom:6px">⛪ MbeukChurch</div>' +
        '<div style="color:rgba(255,255,255,.65);font-size:.85rem;margin-bottom:26px">Choisissez votre compte pour continuer</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px">'+cardsHtml+'</div>' +
      '</div>' +
    '</div>';
    if (root) root.outerHTML = html; else document.body.insertAdjacentHTML('beforeend', html);
  },
  showPin: function(id){
    var acc = S.data.subaccounts.find(function(x){return x.id===id;});
    if (!acc) return;
    if (acc.lockedUntil && acc.lockedUntil > Date.now()){
      var mins = Math.ceil((acc.lockedUntil-Date.now())/60000);
      AccountGate.showPicker();
      setTimeout(function(){ alert('🔒 Compte temporairement bloqué. Réessayez dans '+mins+' min.'); },50);
      return;
    }
    var root = document.getElementById('account-gate-root');
    var html = '<div id="account-gate-root" style="position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0f2744 0%,#1a3a5c 50%,#0f2744 100%);display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',sans-serif;padding:20px">' +
      '<div style="max-width:320px;width:100%;text-align:center">' +
        '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#f0c96b);display:flex;align-items:center;justify-content:center;font-size:1.7rem;margin:0 auto 14px">'+(acc.avatar||(acc.isAdmin?'👑':acc.nom[0].toUpperCase()))+'</div>' +
        '<div style="color:#fff;font-weight:700;font-size:1.05rem;margin-bottom:4px">'+esc(acc.nom)+'</div>' +
        '<div style="color:rgba(255,255,255,.6);font-size:.8rem;margin-bottom:20px">Entrez votre code PIN</div>' +
        '<input id="gatePin" type="password" inputmode="numeric" maxlength="10" placeholder="••••••" style="'+INP_STYLE+';text-align:center;font-size:1.3rem;letter-spacing:6px" onkeydown="if(event.key===\'Enter\')AccountGate.submit(\''+id+'\')">' +
        '<div id="gateErr" style="color:#ff8a80;font-size:.76rem;margin-top:8px;min-height:16px"></div>' +
        '<button onclick="AccountGate.submit(\''+id+'\')" style="'+BTN_PRIMARY+';margin-top:12px">Valider →</button>' +
        '<button onclick="AccountGate.showPicker()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:.78rem;margin-top:14px;cursor:pointer">← Changer de compte</button>' +
      '</div>' +
    '</div>';
    if (root) root.outerHTML = html; else document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(function(){ var el=G('gatePin'); if(el) el.focus(); },80);
  },
  submit: async function(id){
    var acc = S.data.subaccounts.find(function(x){return x.id===id;});
    if (!acc) return;
    var pin = gv('gatePin');
    var hash = await hashPin(pin, acc.pinSalt);
    if (hash === acc.pinHash){
      acc.attempts = 0; acc.lockedUntil = null;
      await persist('subaccounts', acc);
      AccountGate.grant(acc);
    } else {
      acc.attempts = (acc.attempts||0) + 1;
      if (acc.attempts >= 5){
        acc.lockedUntil = Date.now() + 5*60000;
        acc.attempts = 0;
        await persist('subaccounts', acc);
        var err = G('gateErr'); if (err) err.textContent = '🔒 Trop de tentatives — compte bloqué 5 minutes.';
      } else {
        await persist('subaccounts', acc);
        var err2 = G('gateErr'); if (err2) err2.textContent = '❌ PIN incorrect ('+(5-acc.attempts)+' essai(s) restant(s))';
      }
      var pinEl = G('gatePin'); if (pinEl) pinEl.value='';
    }
  },
  grant: function(acc){
    S.activeAccount = acc.isAdmin ? {isAdmin:true,id:'admin',nom:'Administrateur'} : {id:acc.id,nom:acc.nom,permissions:acc.permissions||[],avatar:acc.avatar};
    sessionStorage.setItem('mbk_active_account', JSON.stringify({id:acc.id}));
    var root = document.getElementById('account-gate-root');
    if (root) root.remove();
    applyAccountPermissions();
    if (AccountGate._resolve){ AccountGate._resolve(); AccountGate._resolve=null; }
    else { showPage(hasPermission(S.page)?S.page:(detectSidebarMenus().find(function(m){return hasPermission(m.key);})||{key:'dashboard'}).key); }
  }
};

export function reopenAccountPicker(){
  sessionStorage.removeItem('mbk_active_account');
  S.activeAccount = null;
  AccountGate.showPicker();
}

// ── Gestion des sous-comptes (Paramétrage → visible administrateur uniquement) ──

export function subaccountsAdminCardHtml(){
  if (S.activeAccount && !S.activeAccount.isAdmin) return ''; // masqué pour les sous-comptes
  var subs = S.data.subaccounts.filter(function(x){return x.role!=='admin';});
  var rows = subs.map(function(a){
    var permCount = (a.permissions||[]).length;
    return '<tr><td>'+(a.avatar||a.nom[0].toUpperCase())+' '+esc(a.nom)+'</td><td>'+esc(a.description||'-')+'</td><td>'+BADGE(a.active?'bgr':'bgy',a.active?'Actif':'Inactif')+'</td><td>'+permCount+' menu(s)</td><td>'+BTN('bo bsm','openSubaccountModal(\''+a.id+'\')','Modifier')+' '+BTN(a.active?'brd bsm':'bgn bsm','toggleSubaccountActive(\''+a.id+'\')',a.active?'Désactiver':'Activer')+' '+BTN('brd bsm','deleteSubaccount(\''+a.id+'\')','Suppr.')+'</td></tr>';
  }).join('');
  return '<div class="cd"><div class="ch"><span class="ct2">🔑 Gestion des sous-comptes</span>'+BTN('bg bsm','openSubaccountModal()','+ Nouveau sous-compte')+'</div>' +
    '<p style="font-size:.82rem;color:var(--g4);margin-bottom:12px">Créez des accès limités pour votre équipe. Chaque sous-compte ne voit que les menus que vous autorisez, protégé par un code PIN.</p>' +
    (subs.length ? TW('<tr><th>Compte</th><th>Description</th><th>Statut</th><th>Permissions</th><th></th></tr>',rows) : ES('&#128101;','Aucun sous-compte créé','Ajoutez un accès pour votre équipe (réceptionniste, comptable, etc.)')) +
    '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--g2);display:flex;gap:8px;flex-wrap:wrap">' +
    BTN('bo bsm','openChangeAdminPinModal()','🔐 Modifier le PIN Administrateur') +
    (subs.length?BTN('bo bsm','reopenAccountPicker()','🔀 Changer de compte'):'') +
    '</div></div>';
}

export async function openSubaccountModal(id){
  var a = id ? S.data.subaccounts.find(function(x){return x.id===id;}) : null;
  var menus = detectSidebarMenus(); // toutes les permissions correspondent exactement aux menus existants de la sidebar
  var permChecks = menus.map(function(m){
    var checked = a ? (a.permissions||[]).indexOf(m.key)>=0 : false;
    return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:.82rem;font-weight:400"><input type="checkbox" class="subperm-cb" value="'+m.key+'"'+(checked?' checked':'')+'> '+m.label+'</label>';
  }).join('');
  openModal('<div class="mtt">'+(id?'Modifier le sous-compte':'Nouveau sous-compte')+'</div>' +
    '<div class="fg f1">' +
    '<div class="fi"><label>Nom *</label><input id="sa_nom" value="'+esc(a?a.nom:'')+'"></div>' +
    '<div class="fi"><label>Description (optionnelle)</label><input id="sa_desc" value="'+esc(a?a.description||'':'')+'" placeholder="ex: Réceptionniste, Comptable..."></div>' +
    '<div class="fi"><label>Avatar (emoji, optionnel)</label><input id="sa_avatar" value="'+esc(a?a.avatar||'':'')+'" placeholder="ex: 😊" maxlength="2"></div>' +
    '<div class="fi"><label>Code PIN'+(id?' (laisser vide pour ne pas changer)':' * (min. 6 chiffres)')+'</label><input id="sa_pin" type="password" inputmode="numeric" placeholder="••••••"></div>' +
    '<div class="fi"><label>Confirmer le PIN</label><input id="sa_pin2" type="password" inputmode="numeric" placeholder="••••••"></div>' +
    '<div class="fi"><label>Statut</label><select id="sa_active"><option value="1"'+(!a||a.active?' selected':'')+'>Actif</option><option value="0"'+(a&&!a.active?' selected':'')+'>Inactif</option></select></div>' +
    '</div>' +
    '<div style="margin-top:10px"><label style="font-weight:600;font-size:.82rem;display:block;margin-bottom:8px">Menus autorisés</label><div style="max-height:220px;overflow-y:auto;background:var(--g1);border-radius:8px;padding:10px">'+permChecks+'</div></div>' +
    '<div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveSubaccount(\''+(id||'')+'\')','Enregistrer')+'</div>');
}

export async function saveSubaccount(id){
  var nom = gv('sa_nom');
  if (!nom){ notify('Nom requis','error'); return; }
  var pin = gv('sa_pin'), pin2 = gv('sa_pin2');
  var ex = id ? S.data.subaccounts.find(function(x){return x.id===id;}) : null;
  var pinHash = ex ? ex.pinHash : null, pinSalt = ex ? ex.pinSalt : null;
  if (pin || !ex){
    if (!isValidPinFormat(pin)){ notify('Le PIN doit contenir au moins 6 chiffres','error'); return; }
    if (pin !== pin2){ notify('La confirmation du PIN ne correspond pas','error'); return; }
    pinSalt = genSalt();
    pinHash = await hashPin(pin, pinSalt);
  }
  var perms = Array.prototype.map.call(document.querySelectorAll('.subperm-cb:checked'), function(cb){return cb.value;});
  await persist('subaccounts', {id:id||uid(), nom:nom, role:'sub', isAdmin:false, description:gv('sa_desc'), avatar:gv('sa_avatar'), pinHash:pinHash, pinSalt:pinSalt, permissions:perms, active:gv('sa_active')==='1', attempts:0, lockedUntil:null, createdAt:ex?ex.createdAt:Date.now()});
  closeModal();
  notify((id?'✏️ Sous-compte mis à jour.':'🎉 Sous-compte "'+nom+'" créé avec succès !'),'success');
  pgParametrage(G('ct'));
}

export async function toggleSubaccountActive(id){
  var a = S.data.subaccounts.find(function(x){return x.id===id;});
  if (!a) return;
  a.active = !a.active;
  await persist('subaccounts', a);
  notify(a.active?'Sous-compte activé':'Sous-compte désactivé','success');
  pgParametrage(G('ct'));
}

export async function deleteSubaccount(id){
  var a = S.data.subaccounts.find(function(x){return x.id===id;});
  if (!a || !confirm('Supprimer le sous-compte "'+a.nom+'" ?')) return;
  await remove('subaccounts', id);
  notify('Sous-compte supprimé','success');
  pgParametrage(G('ct'));
}

export function openChangeAdminPinModal(){
  openModal('<div class="mtt">🔐 Modifier le PIN Administrateur</div>' +
    '<div class="fg f1">' +
    '<div class="fi"><label>PIN actuel</label><input id="ap_old" type="password" inputmode="numeric" placeholder="••••••"></div>' +
    '<div class="fi"><label>Nouveau PIN (min. 6 chiffres)</label><input id="ap_new" type="password" inputmode="numeric" placeholder="••••••"></div>' +
    '<div class="fi"><label>Confirmer le nouveau PIN</label><input id="ap_new2" type="password" inputmode="numeric" placeholder="••••••"></div>' +
    '</div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveAdminPin()','Enregistrer')+'</div>');
}

export async function saveAdminPin(){
  var admin = S.data.subaccounts.find(function(x){return x.id==='admin';});
  if (!admin) return;
  var oldPin = gv('ap_old'), newPin = gv('ap_new'), newPin2 = gv('ap_new2');
  var oldHash = await hashPin(oldPin, admin.pinSalt);
  if (oldHash !== admin.pinHash){ notify('PIN actuel incorrect','error'); return; }
  if (!isValidPinFormat(newPin)){ notify('Le nouveau PIN doit contenir au moins 6 chiffres','error'); return; }
  if (newPin !== newPin2){ notify('La confirmation ne correspond pas','error'); return; }
  admin.pinSalt = genSalt();
  admin.pinHash = await hashPin(newPin, admin.pinSalt);
  await persist('subaccounts', admin);
  closeModal();
  celebrate('🔐 PIN Administrateur mis à jour avec succès.');
}


// ════════════════════════════════════════════════════════════════════════
// CLOUD SYNC BYODB — Supabase PERSONNEL de l'église (optionnel)
// Distinct du Cloud Central (développeur) et de la sync Google Sheets déjà
// en place : ce canal supplémentaire permet à l'église de sauvegarder ses
// données sur SON PROPRE projet Supabase (aucune donnée ne transite jamais
// par un serveur du développeur). Nécessite d'avoir exécuté
// schema_byodb_client.sql sur ce projet, et activé "Anonymous sign-ins"
// dans Authentication → Providers de ce même projet Supabase.
// ════════════════════════════════════════════════════════════════════════
