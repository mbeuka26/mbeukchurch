import { S } from '../core/state.js';
import { BTN, G, celebrate, esc, gv, notify } from '../core/utils.js';
import { pgParametrage } from '../engines/settings.js';
import { STORES_SCHEMA } from '../engines/storage.js';

// ── Démarrage : restaurer la configuration BYODB sauvegardée ──────────
// NOTE ARCHITECTURE : ceci était une IIFE auto-exécutée à l'import dans la
// version monolithique d'origine. En modules ES, ce fichier fait partie
// d'un cycle d'import réel (state.js → subaccounts.js → settings.js →
// cloud-sync.js → state.js) : une exécution immédiate au chargement du
// module risquerait de s'exécuter AVANT que state.js ait fini d'assigner
// `S`. On expose donc une fonction explicite, appelée une seule fois par
// main.js au tout début du démarrage — comportement final identique,
// juste sans dépendre de l'ordre d'évaluation des modules.
export function initByodbState(){
  try{ S.byodb = JSON.parse(localStorage.getItem('mbk_byodb')||'null') || {url:'',anonKey:'',enabled:false}; }
  catch(e){ S.byodb = {url:'',anonKey:'',enabled:false}; }
}

export function saveByodbLocal(){ localStorage.setItem('mbk_byodb', JSON.stringify(S.byodb)); }


export async function byodbAuthenticate(){
  // Connexion anonyme au projet Supabase de l'église : donne un auth.uid()
  // stable pour que les RLS (auth.uid() = user_id) fonctionnent, sans avoir
  // à gérer un second système d'email/mot de passe.
  if (S.byodb.token) return S.byodb.token;
  var cached = null;
  try{ cached = JSON.parse(localStorage.getItem('mbk_byodb_session')||'null'); }catch(e){}
  if (cached && cached.access_token){ S.byodb.token = cached.access_token; return cached.access_token; }
  var r = await fetch(S.byodb.url+'/auth/v1/signup', {
    method:'POST',
    headers:{'apikey':S.byodb.anonKey,'Content-Type':'application/json'},
    body: JSON.stringify({})
  });
  var j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(j.msg || j.error_description || 'Échec de connexion anonyme — vérifiez que "Anonymous sign-ins" est activé sur ce projet Supabase.');
  localStorage.setItem('mbk_byodb_session', JSON.stringify(j));
  S.byodb.token = j.access_token;
  return j.access_token;
}


export async function byodbCall(path, method, body){
  var token = await byodbAuthenticate();
  var r = await fetch(S.byodb.url+'/rest/v1/'+path, {
    method: method||'GET',
    headers:{
      'apikey': S.byodb.anonKey,
      'Authorization':'Bearer '+token,
      'Content-Type':'application/json',
      'Prefer': method==='POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=representation'
    },
    body: body?JSON.stringify(body):undefined
  });
  if (!r.ok){ var t=await r.text(); throw new Error('HTTP '+r.status+' — '+t.slice(0,200)); }
  return r.status===204 ? null : await r.json();
}


export async function testByodbConnection(){
  var url = gv('byodb_url'), key = gv('byodb_key');
  if (!url || !key){ notify('URL et clé anon requises','error'); return; }
  S.byodb.url = url.replace(/\/$/,''); S.byodb.anonKey = key; S.byodb.token = null;
  notify('Test de connexion en cours...','info');
  try{
    await byodbAuthenticate();
    await byodbCall('church_records?limit=1','GET');
    saveByodbLocal();
    notify('✅ Connexion réussie à votre Supabase personnel.','success');
    pgParametrage(G('ct'));
  }catch(e){
    notify('Échec : '+e.message,'error');
  }
}

export function disableByodb(){
  S.byodb = {url:'',anonKey:'',enabled:false,token:null};
  localStorage.removeItem('mbk_byodb'); localStorage.removeItem('mbk_byodb_session');
  notify('Cloud Sync BYODB désactivé (données locales conservées).','success');
  pgParametrage(G('ct'));
}

export async function byodbPushAll(){
  if (!S.byodb.url || !S.byodb.anonKey){ notify('Configurez d\'abord votre Supabase personnel','error'); return; }
  notify('Envoi en cours vers votre Supabase...','info');
  try{
    await byodbAuthenticate();
    var total=0;
    for (var i=0;i<STORES_SCHEMA.length;i++){
      var store = STORES_SCHEMA[i];
      var rows = (S.data[store]||[]).map(function(obj){ return {store:store, record_id:String(obj.id), data:obj, deleted:false}; });
      if (!rows.length) continue;
      // Supabase REST n'accepte pas de user_id explicite (RLS le déduit d'auth.uid() via un DEFAULT côté colonne
      // OU on filtre côté trigger). À défaut de trigger, on l'injecte ici depuis le JWT décodé localement :
      var uidLocal = S.byodb._uid || (S.byodb._uid = decodeJwtSub(S.byodb.token));
      rows.forEach(function(r){ r.user_id = uidLocal; });
      await byodbCall('church_records','POST', rows);
      total += rows.length;
    }
    S.byodb.enabled = true; saveByodbLocal();
    celebrate('☁️ '+total+' enregistrements sauvegardés sur votre Supabase personnel.');
  }catch(e){
    notify('Erreur de synchronisation : '+e.message,'error');
  }
}

export function decodeJwtSub(token){
  try{
    var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.sub;
  }catch(e){ return null; }
}

export function byodbCardHtml(){
  if (S.activeAccount && !S.activeAccount.isAdmin) return ''; // configuration réservée à l'administrateur
  var connected = !!(S.byodb && S.byodb.url && S.byodb.anonKey);
  return '<div class="cd"><div class="ch"><span class="ct2">☁️ Cloud Sync BYODB (votre propre Supabase)</span>'+(connected?'<span class="bdg bgr">Connecté</span>':'<span class="bdg bgy">Non configuré</span>')+'</div>' +
    '<p style="font-size:.82rem;color:var(--g4);margin-bottom:12px">Sauvegardez vos données sur VOTRE PROPRE projet Supabase (gratuit) — indépendant du développeur, aucune donnée ne quitte votre contrôle. Nécessite d\'avoir exécuté <code>schema_byodb_client.sql</code> et activé "Anonymous sign-ins" sur ce projet.</p>' +
    '<div class="fg f1">' +
    '<div class="fi"><label>URL du projet Supabase</label><input id="byodb_url" value="'+esc(S.byodb.url||'')+'" placeholder="https://xxxx.supabase.co"></div>' +
    '<div class="fi"><label>Clé anon (publique)</label><input id="byodb_key" type="password" value="'+esc(S.byodb.anonKey||'')+'" placeholder="eyJhbGciOi..."></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
    BTN('bo bsm','testByodbConnection()','Tester la connexion') +
    (connected?BTN('bg bsm','byodbPushAll()','☁️ Sauvegarder maintenant'):'') +
    (connected?BTN('brd bsm','disableByodb()','Désactiver'):'') +
    '</div></div>';
}


// ═══════════════════════════════════════════════════
// MODULE GUIDE D'UTILISATION — MbeukChurch
// Guide complet A → Z avec illustrations SVG
// ═══════════════════════════════════════════════════

