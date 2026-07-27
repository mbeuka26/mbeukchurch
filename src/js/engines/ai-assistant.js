import { AUTH, CFG } from '../core/auth.js';
import { showPage } from '../core/router.js';
import { S, persist } from '../core/state.js';
import { BADGE, BTN, ES, G, closeModal, esc, gv, notify, openModal, sM, uid } from '../core/utils.js';
import { API_PROVIDERS, getApiConfig, isApiConfigured } from '../services/api-keys.js';

export async function callGemini(cfg, prompt, system){
  var model = cfg.model || 'gemini-2.0-flash';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+encodeURIComponent(cfg.apiKey);
  var body = {contents:[{parts:[{text:(system?system+'\n\n':'')+prompt}]}]};
  var r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if (!r.ok) throw new Error('Gemini HTTP '+r.status);
  var j = await r.json();
  var text = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text;
  if (!text) throw new Error('Gemini: réponse vide');
  return text;
}

export async function callOpenRouter(cfg, prompt, system){
  var model = cfg.model || 'openai/gpt-4o-mini';
  var msgs = []; if (system) msgs.push({role:'system',content:system}); msgs.push({role:'user',content:prompt});
  var r = await fetch('https://openrouter.ai/api/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey}, body:JSON.stringify({model:model, messages:msgs})});
  if (!r.ok) throw new Error('OpenRouter HTTP '+r.status);
  var j = await r.json();
  var text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!text) throw new Error('OpenRouter: réponse vide');
  return text;
}

export async function callGrok(cfg, prompt, system){
  var model = cfg.model || 'grok-2-latest';
  var msgs = []; if (system) msgs.push({role:'system',content:system}); msgs.push({role:'user',content:prompt});
  var r = await fetch('https://api.x.ai/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey}, body:JSON.stringify({model:model, messages:msgs})});
  if (!r.ok) throw new Error('Grok HTTP '+r.status);
  var j = await r.json();
  var text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!text) throw new Error('Grok: réponse vide');
  return text;
}
// ── Cloud Central (optionnel, premium) : Claude IA hébergé par le développeur ──
// N'est utilisé QUE si S.cloudActive est vrai (accordé côté admin, voir CLOUD_CENTRAL.md).
// Ne remplace jamais le mode BYOK existant : simple option prioritaire, avec repli
// automatique sur la chaîne de fournisseurs habituelle en cas d'échec ou de refus serveur.

export async function callClaudeCentral(prompt, system){
  var token = AUTH && AUTH.token;
  if (!token) throw new Error('Session absente');
  var r = await fetch(CFG.CLOUD_CENTRAL_URL+'/functions/v1/api-proxy', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({provider:'claude_ia', prompt:prompt, system:system||''})
  });
  var j = await r.json().catch(function(){return {};});
  if (!r.ok) throw new Error(j.error || ('Claude Central HTTP '+r.status));
  if (!j.text) throw new Error('Claude Central: réponse vide');
  return j.text;
}


export var AI_CALLERS = { gemini: callGemini, grok: callGrok, openrouter: callOpenRouter };
export var AI_ORDER = ['gemini','openrouter','grok'];
export var AI = {
  ask: async function(prompt, system){
    var errors = [];
    // Option Cloud Central prioritaire si activée côté admin pour ce compte
    if (S.cloudActive){
      try{
        var text0 = await callClaudeCentral(prompt, system);
        return {text:text0, provider:'claude_central', fallbackFrom:null};
      }catch(e){ errors.push('claude_central: '+e.message); }
    }
    var order = AI_ORDER.filter(isApiConfigured);
    if (!order.length){
      if (errors.length) throw new Error('Cloud Central indisponible et aucune API IA personnelle configurée → '+errors.join(' | '));
      throw new Error('Aucune API IA configurée. Allez dans Paramètres → APIs Intelligence Artificielle.');
    }
    for (var i=0;i<order.length;i++){
      var id = order[i];
      try{
        var cfg = await getApiConfig(id);
        var text = await AI_CALLERS[id](cfg, prompt, system||'');
        return {text:text, provider:id, fallbackFrom: errors.length?errors.slice():null};
      }catch(e){ errors.push(id+': '+e.message); }
    }
    throw new Error('Tous les fournisseurs IA ont échoué → '+errors.join(' | '));
  }
};

// ── ASSISTANT IA CENTER : page + actions rapides contextuelles ──────
// ── SYSTÈME : l'assistant doit maîtriser la Bible (AT + NT) ──────────

export var CHURCH_SYSTEM_PROMPT = 'Tu es un assistant pastoral et théologique pour une administration d\'église chrétienne (MbeukChurch). ' +
  'Tu maîtrises l\'ensemble de la Bible — Ancien Testament (Loi, Prophètes, Écrits) et Nouveau Testament (Évangiles, Actes, Épîtres, Apocalypse) — ' +
  'ainsi que leur contexte historique, littéraire et culturel, les grandes lignes des langues originales (hébreu, araméen, grec), ' +
  'la théologie systématique de base et les principaux courants d\'interprétation chrétienne (sans jamais dénigrer une tradition en particulier). ' +
  'Quand on te demande d\'expliquer, d\'interpréter ou de commenter un verset ou un passage biblique, structure ta réponse ainsi : ' +
  '1) Contexte (livre, auteur, époque, destinataires) ; 2) Sens littéral du texte ; 3) Portée théologique ; ' +
  '4) Références croisées pertinentes, en veillant à citer aussi bien l\'Ancien que le Nouveau Testament quand c\'est pertinent ; ' +
  '5) Application pastorale concrète. Cite toujours les références bibliques avec précision (Livre chapitre:verset). ' +
  'Pour toute autre demande (administrative, pastorale, rédactionnelle), réponds en français, de façon concise, pratique et bienveillante.';


export var AI_QUICK_ACTIONS = [
  {id:'welcome', icon:'👋', label:'Message de bienvenue', build:function(){
    var m = S.data.members.slice().sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);})[0];
    return 'Rédige un message de bienvenue chaleureux et pastoral (4-5 phrases) pour '+(m?(m.nom+' '+(m.prenom||'')):'un nouveau membre')+' qui vient de rejoindre notre église MbeukChurch.';
  }},
  {id:'verse_explain', icon:'📜', label:'Expliquer un verset', needsInput:true, inputLabel:'Référence biblique', inputPh:'ex: Jean 3:16 ou Ésaïe 53:5', promptFn:function(q){
    return 'Explique en détail le verset ou passage biblique suivant : '+q+'. Contexte (livre, auteur, époque, destinataires), sens littéral, portée théologique, références croisées pertinentes dans l\'Ancien ET le Nouveau Testament (avec leurs références exactes), et une application pastorale concrète pour notre église.';
  }},
  {id:'cross_ref', icon:'🔗', label:'Références croisées', needsInput:true, inputLabel:'Référence biblique', inputPh:'ex: Romains 8:28', promptFn:function(q){
    return 'Donne les références croisées les plus pertinentes, dans l\'Ancien ET le Nouveau Testament, pour le passage '+q+'. Pour chaque référence, cite le texte (traduction courante) et explique en une phrase le lien thématique ou théologique avec le passage de départ.';
  }},
  {id:'bible_study', icon:'📚', label:'Étude thématique biblique', needsInput:true, inputLabel:'Thème', inputPh:'ex: la grâce, le pardon, la foi', promptFn:function(q){
    return 'Prépare une étude biblique complète sur le thème "'+q+'", pour un groupe de maison ou une école du dimanche. Inclus 4 à 6 versets clés avec leurs références exactes en couvrant à la fois l\'Ancien et le Nouveau Testament, une explication théologique de chaque verset, 3 questions de discussion, et une application pratique pour la semaine.';
  }},
  {id:'prayer', icon:'🙏', label:'Résumer les demandes de prière', build:function(){
    var p = S.data.prieres.slice(-10).map(function(x){return '- '+(x.sujet||'')+(x.categorie?' ('+x.categorie+')':'');}).join('\n') || 'Aucune donnée.';
    return 'Voici les demandes de prière récentes de notre église:\n'+p+'\n\nFais une synthèse pastorale en 5 points maximum, en identifiant les thèmes récurrents, un axe d\'intercession commun, et un verset biblique d\'encouragement pertinent pour chaque thème.';
  }},
  {id:'finance', icon:'💰', label:'Résumé financier du mois', build:function(){
    var now = new Date();
    var f = S.data.finances.filter(function(x){return sM(x.date,now);});
    var rev = f.filter(function(x){return x.type!=='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);
    var dep = f.filter(function(x){return x.type==='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);
    return 'Chiffres du mois en cours : Revenus='+rev+' FCFA, Dépenses='+dep+' FCFA, Solde='+(rev-dep)+' FCFA sur '+f.length+' transactions. Rédige un court résumé exécutif clair à destination du conseil de l\'église.';
  }},
  {id:'visitors', icon:'🚪', label:'Plan de suivi des visiteurs', build:function(){
    var v = S.data.visitors.filter(function(x){return x.converti!=='oui';}).slice(-10).map(function(x){return '- '+x.nom+(x.dateVisite?' (visite du '+x.dateVisite+')':'');}).join('\n') || 'Aucun visiteur en attente.';
    return 'Voici les visiteurs pas encore convertis en membres:\n'+v+'\n\nPropose un plan de suivi personnalisé et actionnable pour les reconnecter à l\'église.';
  }},
  {id:'sermon', icon:'📖', label:'Plan de prédication', build:function(){
    return 'Propose un plan de prédication structuré (introduction, 3 points principaux avec références bibliques précises tirées de l\'Ancien et/ou du Nouveau Testament, conclusion et appel à l\'action) sur un thème d\'édification chrétienne actuel et pertinent pour une église locale.';
  }},
  {id:'announcement', icon:'📢', label:'Rédiger une annonce', build:function(){
    var ev = S.data.events.filter(function(x){return new Date(x.date)>=new Date();}).sort(function(a,b){return new Date(a.date)-new Date(b.date);})[0];
    return ev ? ('Rédige une annonce engageante (3-4 phrases) pour l\'événement "'+ev.nom+'" prévu le '+ev.date+(ev.lieu?' à '+ev.lieu:'')+'.') : 'Rédige une annonce générale engageante pour notre église.';
  }}
];

export function pgAssistant(c){
  var configured = AI_ORDER.filter(isApiConfigured);
  var statusHtml = AI_ORDER.map(function(id){return BADGE(configured.indexOf(id)>=0?'bgr':'bgy', API_PROVIDERS[id].label);}).join(' ');
  if (!configured.length){
    c.innerHTML = '<div class="cd">'+ES('&#129302;','Assistant IA non configuré') +
      '<p style="text-align:center;color:var(--g4);font-size:.84rem;margin-bottom:14px">Connectez au moins une API IA (Gemini, Grok ou OpenRouter) pour activer l\'assistant — spécialisé en administration d\'église et en étude biblique (Ancien &amp; Nouveau Testament).</p>' +
      '<div style="text-align:center">'+BTN('bg','showPage(\'parametrage\')','Configurer maintenant')+'</div></div>';
    return;
  }
  var quickHtml = '<div class="mng">' + AI_QUICK_ACTIONS.map(function(q){
    return '<div class="mnc" style="cursor:pointer" onclick="runAiQuickAction(\''+q.id+'\')"><div style="font-size:1.5rem;margin-bottom:6px">'+q.icon+'</div><div style="font-weight:700;font-size:.82rem">'+q.label+'</div></div>';
  }).join('') + '</div>';
  c.innerHTML =
    '<div class="cd"><div class="ch"><span class="ct2">🤖 Assistant IA</span><span style="font-size:.72rem">'+statusHtml+'</span></div>' +
    '<p style="font-size:.8rem;color:var(--g4)">Fallback automatique : '+configured.map(function(id){return API_PROVIDERS[id].label;}).join(' → ')+'. Spécialisé en administration pastorale et en étude biblique (Ancien &amp; Nouveau Testament).</p></div>' +
    '<div class="cd"><div class="ch"><span class="ct2">Actions rapides</span></div>'+quickHtml+'</div>' +
    '<div class="cd"><div class="ch"><span class="ct2">Discussion libre</span>'+BTN('bo bsm','clearAiChat()','Effacer')+'</div>' +
    '<div id="aiChatBox" style="max-height:340px;overflow-y:auto;margin-bottom:12px">'+renderAiChat()+'</div>' +
    '<div style="display:flex;gap:8px"><input id="aiInput" placeholder="Posez une question (biblique, théologique, pastorale, administrative...)" style="flex:1" onkeydown="if(event.key===\'Enter\')sendAiMessage()">'+BTN('bg','sendAiMessage()','Envoyer')+'</div></div>';
}

export function renderAiChat(){
  if (!S.ui.aiChat.length) return ES('&#128172;','Posez votre première question à l\'assistant');
  return S.ui.aiChat.map(function(m){
    var isUser = m.role==='user';
    return '<div class="msb" style="background:'+(isUser?'var(--g1)':'rgba(201,168,76,.12)')+'"><div class="msf">'+(isUser?'Vous':'🤖 Assistant'+(m.provider?' ('+m.provider+')':''))+'</div><div class="msc" style="white-space:pre-wrap">'+esc(m.content)+'</div></div>';
  }).join('');
}
window.clearAiChat = function(){ S.ui.aiChat=[]; pgAssistant(G('ct')); };

export async function askAiAndRender(userLabel, prompt){
  S.ui.aiChat.push({role:'user',content:userLabel});
  await persist('aiHistory',{id:uid(),role:'user',content:userLabel,ts:Date.now()});
  var box = G('aiChatBox'); if (box) box.innerHTML = renderAiChat() + '<div class="es" style="padding:8px">⏳ Génération en cours...</div>';
  try{
    var res = await AI.ask(prompt, CHURCH_SYSTEM_PROMPT);
    S.ui.aiChat.push({role:'assistant',content:res.text,provider:res.provider});
    await persist('aiHistory',{id:uid(),role:'assistant',content:res.text,provider:res.provider,ts:Date.now()});
    notify('Réponse générée par '+API_PROVIDERS[res.provider].label,'success');
  }catch(e){
    S.ui.aiChat.push({role:'assistant',content:'⚠️ '+e.message});
    notify('Erreur IA: '+e.message,'error');
  }
  pgAssistant(G('ct'));
}

export async function sendAiMessage(){
  var input = G('aiInput'); var text = input.value.trim();
  if (!text) return;
  input.value='';
  await askAiAndRender(text, text);
}

export function runAiQuickAction(id){
  var q = AI_QUICK_ACTIONS.find(function(x){return x.id===id;});
  if (!q) return;
  if (q.needsInput) { openBibleQuery(id); return; }
  var prompt = q.build();
  if (!prompt) return;
  askAiAndRender('['+q.label+']', prompt);
}

export function openBibleQuery(id){
  var q = AI_QUICK_ACTIONS.find(function(x){return x.id===id;});
  if (!q) return;
  openModal('<div class="mtt">'+q.icon+' '+q.label+'</div><div class="fg f1"><div class="fi"><label>'+q.inputLabel+'</label><input id="bibleq" placeholder="'+esc(q.inputPh||'')+'" onkeydown="if(event.key===\'Enter\')submitBibleQuery(\''+id+'\')"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','submitBibleQuery(\''+id+'\')','Demander à l\'assistant')+'</div>');
}

export async function submitBibleQuery(id){
  var q = AI_QUICK_ACTIONS.find(function(x){return x.id===id;});
  var val = gv('bibleq');
  if (!val) { notify('Veuillez saisir une valeur','error'); return; }
  closeModal();
  var prompt = q.promptFn(val);
  await askAiAndRender('['+q.label+' — '+val+']', prompt);
}


// ════════════════════════════════════════════════════════════════════════
// MODULE SOUS-COMPTES + PERMISSIONS + CODE PIN — MbeukChurch
// Aucun nouveau module métier créé : les permissions correspondent
// exactement aux menus déjà présents dans la sidebar (détection automatique).
// L'application, sa navigation et son design restent strictement identiques.
// PIN jamais stocké en clair (hash SHA-256 + sel), stockage offline-first
// (IndexedDB/SQLite via le pipeline persist() existant) + sync Sheets optionnelle.
// ════════════════════════════════════════════════════════════════════════

// ── Hachage PIN (Web Crypto, one-way — jamais réversible) ──
