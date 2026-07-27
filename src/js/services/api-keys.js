import { S, persist } from '../core/state.js';
import { BTN, G, closeModal, esc, gv, notify, openModal } from '../core/utils.js';
import { AI_CALLERS, pgAssistant } from '../engines/ai-assistant.js';
import { pgCommunication } from '../engines/communication.js';
import { pgParametrage } from '../engines/settings.js';

export var Vault = (function(){
  var _key = null;
  async function getKey(){
    if (_key) return _key;
    var raw = localStorage.getItem('mbk_vk');
    if (raw) {
      var buf = Uint8Array.from(atob(raw), function(c){return c.charCodeAt(0);});
      _key = await crypto.subtle.importKey('raw', buf, {name:'AES-GCM'}, true, ['encrypt','decrypt']);
      return _key;
    }
    var key = await crypto.subtle.generateKey({name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
    var exp = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem('mbk_vk', btoa(String.fromCharCode.apply(null, new Uint8Array(exp))));
    _key = key;
    return key;
  }
  return {
    encrypt: async function(str){
      var key = await getKey();
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder().encode(str);
      var ct = await crypto.subtle.encrypt({name:'AES-GCM', iv:iv}, key, enc);
      return {iv: btoa(String.fromCharCode.apply(null, iv)), data: btoa(String.fromCharCode.apply(null, new Uint8Array(ct)))};
    },
    decrypt: async function(obj){
      if (!obj || !obj.data) return '';
      try{
        var key = await getKey();
        var iv = Uint8Array.from(atob(obj.iv), function(c){return c.charCodeAt(0);});
        var ct = Uint8Array.from(atob(obj.data), function(c){return c.charCodeAt(0);});
        var pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:iv}, key, ct);
        return new TextDecoder().decode(pt);
      }catch(e){ return ''; }
    }
  };
})();

// ── PROVIDERS ──────────────────────────────────────────────────────

export var API_PROVIDERS = {
  brevo:           {label:'Brevo — Email', icon:'✉️', type:'comm', fields:[
                       {k:'apiKey', l:'Clé API', type:'password'},
                       {k:'senderEmail', l:'Email expéditeur', type:'email'},
                       {k:'senderName', l:'Nom expéditeur', type:'text'}]},
  africastalking:  {label:"Africa's Talking — SMS", icon:'💬', type:'comm', fields:[
                       {k:'username', l:'Username', type:'text'},
                       {k:'apiKey', l:'Clé API', type:'password'},
                       {k:'senderId', l:'Sender ID', type:'text'}]},
  twilio_whatsapp: {label:'Twilio — WhatsApp', icon:'📱', type:'comm', fields:[
                       {k:'accountSid', l:'Account SID', type:'text'},
                       {k:'authToken', l:'Auth Token', type:'password'},
                       {k:'whatsappNumber', l:'Numéro WhatsApp', type:'text', ph:'+14155238886'},
                       {k:'webhookUrl', l:'Webhook URL (optionnel)', type:'text'}]},
  gemini:          {label:'Google Gemini', icon:'✨', type:'ia', fields:[
                       {k:'apiKey', l:'Clé API', type:'password'},
                       {k:'model', l:'Modèle', type:'text', ph:'gemini-2.0-flash'}]},
  grok:            {label:'xAI Grok', icon:'🧠', type:'ia', fields:[
                       {k:'apiKey', l:'Clé API', type:'password'},
                       {k:'model', l:'Modèle', type:'text', ph:'grok-2-latest'}]},
  openrouter:      {label:'OpenRouter', icon:'🌐', type:'ia', fields:[
                       {k:'apiKey', l:'Clé API', type:'password'},
                       {k:'model', l:'Modèle', type:'text', ph:'openai/gpt-4o-mini'}]}
};


export function apiConfigRecord(id){ return S.data.apiConfigs.find(function(x){return x.id===id;}); }
export function isApiConfigured(id){ var r=apiConfigRecord(id); return !!(r && r.enabled && r.enc); }
export async function getApiConfig(id){
  var r = apiConfigRecord(id);
  if (!r || !r.enabled || !r.enc) return null;
  var json = await Vault.decrypt(r.enc);
  try { return JSON.parse(json); } catch(e){ return null; }
}

export async function saveApiConfig(id, obj){
  var enc = await Vault.encrypt(JSON.stringify(obj));
  await persist('apiConfigs', {id:id, enc:enc, enabled:true, updatedAt:Date.now()});
}

export async function disableApiConfig(id){
  var r = apiConfigRecord(id);
  if (r) { r.enabled = false; await persist('apiConfigs', r); }
  notify('API désactivée','success');
  if (S.page==='parametrage') pgParametrage(G('ct'));
}

export function renderApiCard(id){
  var p = API_PROVIDERS[id];
  var configured = isApiConfigured(id);
  return '<div style="background:var(--g1);border-radius:11px;padding:14px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
    '<div style="font-weight:700;font-size:.85rem">'+p.icon+' '+p.label+'</div>' +
    (configured?'<span class="bdg bgr">Connecté</span>':'<span class="bdg bgy">Non configuré</span>') +
    '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
    BTN('bo bsm','openApiConfigModal(\''+id+'\')',configured?'Modifier':'Configurer') +
    (configured?BTN('bo bsm','testApiConnection(\''+id+'\')','Tester'):'') +
    (configured?BTN('brd bsm','disableApiConfig(\''+id+'\')','Désactiver'):'') +
    '</div></div>';
}

export async function openApiConfigModal(id){
  var p = API_PROVIDERS[id];
  var cfg = await getApiConfig(id) || {};
  var fieldsHtml = p.fields.map(function(f){
    return '<div class="fi"><label>'+f.l+'</label><input id="apf_'+f.k+'" type="'+(f.type==='password'?'password':f.type==='email'?'email':'text')+'" value="'+esc(cfg[f.k]||'')+'" placeholder="'+esc(f.ph||'')+'"></div>';
  }).join('');
  openModal('<div class="mtt">'+p.icon+' '+p.label+'</div><div class="fg f1">'+fieldsHtml+'</div>' +
    '<p style="font-size:.74rem;color:var(--g3);margin-top:8px">🔒 Chiffré localement (AES-GCM) sur cet appareil. Jamais envoyé à un serveur tiers propriétaire.</p>' +
    '<div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveApiConfigFromModal(\''+id+'\')','Enregistrer')+'</div>');
}

export async function saveApiConfigFromModal(id){
  var p = API_PROVIDERS[id];
  var obj = {}, missing = false;
  p.fields.forEach(function(f){
    var v = gv('apf_'+f.k);
    if (!v && f.k!=='webhookUrl' && f.k!=='model') missing = true;
    obj[f.k] = v;
  });
  if (missing) { notify('Veuillez remplir tous les champs requis','error'); return; }
  await saveApiConfig(id, obj);
  closeModal();
  notify(p.label+' connecté ✓','success');
  if (S.page==='parametrage') pgParametrage(G('ct'));
  if (S.page==='assistant') pgAssistant(G('ct'));
  if (S.page==='communication') pgCommunication(G('ct'));
}

export async function testApiConnection(id){
  var p = API_PROVIDERS[id];
  var cfg = await getApiConfig(id);
  if (!cfg) { notify('Configurez d\'abord cette API','error'); return; }
  if (p.type==='comm') {
    if (!S.gsUrl) { notify('Configurez l\'URL Google Apps Script (Synchronisation) pour activer l\'envoi.','error'); return; }
    notify(p.label+' : configuration complète ✓ — envoyez un message test depuis Communication pour vérifier le fournisseur.','success');
    return;
  }
  notify('Test de connexion '+p.label+'...','info');
  try{
    await AI_CALLERS[id](cfg, 'Réponds uniquement par le mot OK.', '');
    notify(p.label+' : connexion réussie ✅','success');
  }catch(e){
    notify(p.label+' : échec — '+e.message,'error');
  }
}

// ── DESTINATAIRES : analyse automatique des entités communicables ──
