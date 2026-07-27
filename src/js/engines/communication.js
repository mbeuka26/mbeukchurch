import { AUTH, CFG } from '../core/auth.js';
import { showPage } from '../core/router.js';
import { S, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, TW, closeModal, esc, fmt, gv, lg, notify, openModal, sM, setA, td, uid } from '../core/utils.js';
import { API_PROVIDERS, getApiConfig, isApiConfigured } from '../services/api-keys.js';

export function openAddAnnouncement(){openModal('<div class="mtt">Nouvelle Annonce</div><div class="fg f1"><div class="fi"><label>Titre *</label><input id="ant"></div><div class="fi"><label>Contenu *</label><textarea id="anc" style="min-height:110px"></textarea></div><div class="fi"><label>Auteur</label><input id="ana" value="Admin"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveAnn()','Publier')+'</div>');}
export async function saveAnn(){var titre=gv('ant'),contenu=gv('anc');if(!titre||!contenu){notify('Requis','error');return;}await persist('announcements',{id:uid(),titre:titre,contenu:contenu,auteur:gv('ana'),date:td(),createdAt:Date.now()});closeModal();notify('Annonce publiee','success');pgCommunication(G('ct'));}
export async function delAnn(id){await remove('announcements',id);pgCommunication(G('ct'));}
export function openEditAnn(id) {
  var a = S.data.announcements.find(function(x){return x.id===id;});
  if (!a) return;
  openModal('<div class="mtt">Modifier Annonce</div><div class="fg f1"><div class="fi"><label>Titre *</label><input id="ant2" value="'+esc(a.titre||'')+'"></div><div class="fi"><label>Contenu *</label><textarea id="anc2" style="min-height:110px">'+esc(a.contenu||'')+'</textarea></div><div class="fi"><label>Auteur</label><input id="ana2" value="'+esc(a.auteur||'Admin')+'"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEditAnn(\''+id+'\')','Enregistrer')+'</div>');
}

export async function saveEditAnn(id) {
  var a = S.data.announcements.find(function(x){return x.id===id;});
  var titre=gv('ant2'),contenu=gv('anc2');
  if (!titre||!contenu) { notify('Requis','error'); return; }
  await persist('announcements', Object.assign({},a,{titre,contenu,auteur:gv('ana2')}));
  closeModal(); notify('Annonce modifiee','success'); pgCommunication(G('ct'));
}

export function openAddMessage(){openModal('<div class="mtt">Nouveau Message</div><div class="fg f1"><div class="fi"><label>De</label><input id="mgd" value="Admin"></div><div class="fi"><label>A</label><input id="mga" placeholder="Destinataire ou Tous"></div><div class="fi"><label>Message *</label><textarea id="mgm" style="min-height:90px"></textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveMsg()','Envoyer')+'</div>');}
export async function saveMsg(){var contenu=gv('mgm');if(!contenu){notify('Message vide','error');return;}await persist('messages',{id:uid(),de:gv('mgd'),a:gv('mga'),contenu:contenu,date:td(),createdAt:Date.now()});closeModal();notify('Message envoye','success');pgCommunication(G('ct'));}
export async function delMsg(id){await remove('messages',id);pgCommunication(G('ct'));}
export function openEditMsg(id) {
  var m = S.data.messages.find(function(x){return x.id===id;});
  if (!m) return;
  openModal('<div class="mtt">Modifier Message</div><div class="fg f1"><div class="fi"><label>De</label><input id="mgd2" value="'+esc(m.de||'')+'"></div><div class="fi"><label>A</label><input id="mga2" value="'+esc(m.a||'')+'"></div><div class="fi"><label>Message *</label><textarea id="mgm2" style="min-height:90px">'+esc(m.contenu||'')+'</textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEditMsg(\''+id+'\')','Enregistrer')+'</div>');
}

export async function saveEditMsg(id) {
  var m = S.data.messages.find(function(x){return x.id===id;});
  var contenu=gv('mgm2');
  if (!contenu) { notify('Requis','error'); return; }
  await persist('messages', Object.assign({},m,{de:gv('mgd2'),a:gv('mga2'),contenu}));
  closeModal(); notify('Message modifie','success'); pgCommunication(G('ct'));
}

// ── SERMONS ──

export function getAllPeople(){
  var out=[];
  S.data.members.forEach(function(m){ out.push({store:'members',id:m.id,nom:(m.nom||'')+' '+(m.prenom||''),telephone:m.telephone,email:m.email,statut:m.statut,ministere:m.ministere,dateEntree:m.dateEntree}); });
  S.data.visitors.forEach(function(v){ out.push({store:'visitors',id:v.id,nom:v.nom,telephone:v.telephone,email:'',statut:v.converti==='oui'?'converti':'visiteur',dateVisite:v.dateVisite}); });
  S.data.users.forEach(function(u){ out.push({store:'users',id:u.id,nom:(u.nom||'')+' '+(u.prenom||''),telephone:u.telephone,email:u.email,statut:u.role}); });
  return out;
}

export var COMM_FILTERS = {
  members_all:         {label:'Tous les membres', fn:function(){ return getAllPeople().filter(function(p){return p.store==='members';}); }},
  members_leaders:     {label:'Leaders & pasteurs', fn:function(){ return getAllPeople().filter(function(p){return p.store==='members'&&(p.statut==='leader'||p.statut==='pasteur');}); }},
  members_new:         {label:'Nouveaux membres (30 j)', fn:function(){ var lim=Date.now()-30*864e5; return getAllPeople().filter(function(p){return p.store==='members'&&p.dateEntree&&new Date(p.dateEntree).getTime()>=lim;}); }},
  visitors_unconverted:{label:'Visiteurs non convertis', fn:function(){ return getAllPeople().filter(function(p){return p.store==='visitors'&&p.statut!=='converti';}); }},
  visitors_all:        {label:'Tous les visiteurs', fn:function(){ return getAllPeople().filter(function(p){return p.store==='visitors';}); }},
  users_all:           {label:'Tous les utilisateurs système', fn:function(){ return getAllPeople().filter(function(p){return p.store==='users';}); }},
  donors_month:        {label:'Donateurs du mois en cours', fn:function(){
                           var now=new Date(), names={};
                           S.data.finances.filter(function(x){return x.type!=='depense'&&sM(x.date,now)&&x.donateur;}).forEach(function(x){names[x.donateur]=true;});
                           return getAllPeople().filter(function(p){return names[p.nom];});
                        }}
};

export function composerMinistryFilters(){
  var out={};
  S.data.ministries.forEach(function(mi){
    out['ministry:'+mi.nom] = {label:'Ministère : '+mi.nom, fn:function(){ return getAllPeople().filter(function(p){return p.store==='members'&&p.ministere===mi.nom;}); }};
  });
  return out;
}

export function allFilters(){ return Object.assign({}, COMM_FILTERS, composerMinistryFilters()); }
export async function resolveRecipients(mode){
  var all = getAllPeople();
  if (mode==='individual'){
    var sel = G('cdest1'); if (!sel||!sel.value) return [];
    var parts = sel.value.split('::');
    return all.filter(function(p){return p.store===parts[0]&&p.id===parts[1];});
  }
  if (mode==='multi'){
    var boxes = document.querySelectorAll('.cdest-cb:checked');
    var keys = Array.prototype.map.call(boxes, function(b){return b.value;});
    return all.filter(function(p){return keys.indexOf(p.store+'::'+p.id)>=0;});
  }
  if (mode==='all'){
    var scope = G('cdestall') ? G('cdestall').value : 'members';
    if (scope==='everyone') return all;
    return all.filter(function(p){return p.store===scope;});
  }
  if (mode==='filter'){
    var key = G('cdestf') ? G('cdestf').value : '';
    var f = allFilters()[key];
    return f ? f.fn() : [];
  }
  return [];
}

// ── TEMPLATES INTELLIGENTS (domaine Église, détecté automatiquement) ──

export var CHURCH_TEMPLATES = [
  {id:'bienvenue', label:'Bienvenue nouveau membre', body:'Bonjour {nom},\n\nBienvenue dans la famille MbeukChurch ! Nous sommes heureux de vous compter parmi nous.\n\nN\'hésitez pas à nous contacter pour toute question.\n\nQue Dieu vous bénisse.'},
  {id:'rappel_evenement', label:'Rappel événement / culte', body:'Bonjour {nom},\n\nPetit rappel : un événement approche. Nous serions ravis de vous y retrouver.\n\nMbeukChurch'},
  {id:'remerciement_don', label:'Remerciement don / dîme', body:'Bonjour {nom},\n\nNous vous remercions sincèrement pour votre générosité envers notre église. Que Dieu vous bénisse abondamment.'},
  {id:'suivi_visiteur', label:'Suivi visiteur', body:'Bonjour {nom},\n\nMerci de votre visite à MbeukChurch ! Nous serions ravis de vous revoir très bientôt.'},
  {id:'convocation', label:'Convocation réunion', body:'Bonjour {nom},\n\nVous êtes convié(e) à notre prochaine réunion. Votre présence compte beaucoup pour nous.'},
  {id:'intercession', label:'Suivi demande de prière', body:'Bonjour {nom},\n\nNous continuons de porter votre demande de prière dans nos intercessions. Soyez béni(e).'},
  {id:'libre', label:'Message libre', body:''}
];

export function renderTemplate(str, ctx){
  return String(str||'').replace(/\{(\w+)\}/g, function(_,k){ return (ctx&&ctx[k]!=null&&ctx[k]!=='')?ctx[k]:''; });
}

// ── ENVOI VIA GOOGLE APPS SCRIPT (relais, évite CORS, reste local-first) ──

export var CHANNEL_PROVIDER = {email:'brevo', sms:'africastalking', whatsapp:'twilio_whatsapp'};
export async function commSendViaAppsScript(action, payload){
  if (!S.gsUrl) throw new Error('URL Google Apps Script non configurée (Synchronisation).');
  var r = await fetch(S.gsUrl, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:action, ts:Date.now(), payload:payload})});
  if (!r.ok) throw new Error('HTTP '+r.status);
  var j = {}; try{ j = await r.json(); }catch(e){}
  if (j && j.status && j.status!=='ok') throw new Error(j.error||('Erreur '+action));
  return j;
}

export async function sendEmailBrevo(cfg, to, subject, body){ return commSendViaAppsScript('send_email', {provider:'brevo', apiKey:cfg.apiKey, senderEmail:cfg.senderEmail, senderName:cfg.senderName, to:to, subject:subject, body:body}); }
export async function sendSmsAT(cfg, to, message){ return commSendViaAppsScript('send_sms', {provider:'africastalking', username:cfg.username, apiKey:cfg.apiKey, senderId:cfg.senderId, to:to, message:message}); }
export async function sendWhatsAppTwilio(cfg, to, message){ return commSendViaAppsScript('send_whatsapp', {provider:'twilio', accountSid:cfg.accountSid, authToken:cfg.authToken, from:cfg.whatsappNumber, to:to, message:message}); }


export async function sendEmailBrevoCentral(to, subject, body){
  var token = AUTH && AUTH.token;
  if (!token) throw new Error('Session absente');
  var r = await fetch(CFG.CLOUD_CENTRAL_URL+'/functions/v1/api-proxy', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({provider:'brevo', to:to, subject:subject, body:body})
  });
  var j = await r.json().catch(function(){return {};});
  if (!r.ok) throw new Error(j.error || ('Brevo Central HTTP '+r.status));
  return j;
}

export async function sendCommunication(){
  var canal = G('cchan').value;
  var mode = G('cdestmode').value;
  var subject = G('csub') ? gv('csub') : '';
  var rawMsg = gv('cmsg');
  if (!rawMsg) { notify('Message vide','error'); return; }
  var recipients = await resolveRecipients(mode);
  if (!recipients.length) { notify('Aucun destinataire trouvé pour cette sélection','error'); return; }
  var providerId = CHANNEL_PROVIDER[canal];
  var cfg = await getApiConfig(providerId);
  // Repli Cloud Central (premium) uniquement pour Email/Brevo, si aucune clé perso configurée
  var useCentral = !cfg && canal==='email' && S.cloudActive;
  if (!cfg && !useCentral) { notify('Configurez d\'abord l\'API '+API_PROVIDERS[providerId].label+' dans Paramètres','error'); return; }
  var ok=0, queued=0, fail=0;
  for (var i=0;i<recipients.length;i++){
    var r = recipients[i];
    var to = canal==='email' ? r.email : r.telephone;
    if (!to) { fail++; continue; }
    var content = renderTemplate(rawMsg, r);
    var base = {id:uid(), canal:canal, provider:useCentral?'brevo_central':providerId, destinataire:(r.nom||'')+' ('+to+')', contenu:content, createdAt:Date.now()};
    if (!navigator.onLine) {
      await persist('commQueue', {id:uid(), canal:canal, to:to, content:content, subject:subject, createdAt:Date.now()});
      await persist('commHistory', Object.assign({}, base, {statut:'en_attente'}));
      queued++; continue;
    }
    try{
      if (useCentral) await sendEmailBrevoCentral(to, subject||'MbeukChurch', content);
      else if (canal==='email') await sendEmailBrevo(cfg, to, subject||'MbeukChurch', content);
      else if (canal==='sms') await sendSmsAT(cfg, to, content);
      else await sendWhatsAppTwilio(cfg, to, content);
      await persist('commHistory', Object.assign({}, base, {statut:'envoye'}));
      ok++;
    }catch(e){
      await persist('commQueue', {id:uid(), canal:canal, to:to, content:content, subject:subject, createdAt:Date.now()});
      await persist('commHistory', Object.assign({}, base, {statut:'erreur', erreur:e.message}));
      fail++;
    }
  }
  lg('COMMUNICATION', canal+': '+ok+' envoyés, '+queued+' en attente, '+fail+' échecs');
  notify('Envoyés: '+ok+' · En attente: '+queued+' · Échecs: '+fail, fail?'error':'success');
  pgCommunication(G('ct'));
}

export async function processCommQueue(){
  if (!S.data.commQueue.length) { notify('File d\'attente vide','info'); return; }
  if (!navigator.onLine) { notify('Toujours hors ligne','error'); return; }
  var items = S.data.commQueue.slice();
  var done=0, fail=0;
  for (var i=0;i<items.length;i++){
    var it = items[i];
    var cfg = await getApiConfig(CHANNEL_PROVIDER[it.canal]);
    if (!cfg) { fail++; continue; }
    try{
      if (it.canal==='email') await sendEmailBrevo(cfg, it.to, it.subject||'MbeukChurch', it.content);
      else if (it.canal==='sms') await sendSmsAT(cfg, it.to, it.content);
      else await sendWhatsAppTwilio(cfg, it.to, it.content);
      await remove('commQueue', it.id);
      done++;
    }catch(e){ fail++; }
  }
  notify('File d\'attente : '+done+' envoyés, '+fail+' toujours en échec','success');
  if (S.page==='communication') pgCommunication(G('ct'));
}

// ── COMMUNICATION CENTER (remplace l'ancien module Communication) ──

export function pgCommunication(c){
  setA(BTN('bo','openAddMessage()','+ Message interne')+' '+BTN('bg','openAddAnnouncement()','+ Annonce'));
  var tabs = ['compose','hist','queue','ann','msg'];
  var labels = {compose:'✉️ Composer',hist:'🕑 Historique',queue:'⏳ File d\'attente ('+S.data.commQueue.length+')',ann:'📢 Annonces ('+S.data.announcements.length+')',msg:'💬 Messages internes ('+S.data.messages.length+')'};
  var active = S.ui.comTab || 'compose';
  var tabsHtml = '<div class="tabs">' + tabs.map(function(t){return '<button class="tab'+(t===active?' on':'')+'" onclick="setCommTab(\''+t+'\')">'+labels[t]+'</button>';}).join('') + '</div>';
  c.innerHTML = tabsHtml + '<div id="cL2"></div>';
  renderCommTab(active);
}
window.setCommTab = function(t){ S.ui.comTab = t; pgCommunication(G('ct')); };

export function renderCommTab(t){
  var el = G('cL2'); if (!el) return;
  if (t==='compose') { el.innerHTML = composerHtml(); updateDestPicker(); }
  else if (t==='hist') el.innerHTML = historyHtml();
  else if (t==='queue') el.innerHTML = queueHtml();
  else if (t==='ann') el.innerHTML = announcementsHtml();
  else el.innerHTML = messagesHtml();
}

export function announcementsHtml(){
  var anns = S.data.announcements.slice().reverse();
  return anns.length ? anns.map(function(a){return '<div class="anb"><div class="ant">'+esc(a.titre)+'</div><div class="anc">'+esc(a.contenu)+'</div><div class="and">'+fmt(a.date)+' - '+esc(a.auteur||'Admin')+'</div><div style="display:flex;gap:6px;margin-top:6px"><button class="ai" style="color:rgba(255,255,255,.7)" onclick="openEditAnn(\''+a.id+'\')">&#9999;</button><button class="ai" style="color:rgba(255,255,255,.5)" onclick="delAnn(\''+a.id+'\')">&#128465;</button></div></div>';}).join('') : ES('&#128226;','Aucune annonce');
}

export function messagesHtml(){
  var msgs = S.data.messages.slice().reverse();
  return msgs.length ? msgs.map(function(m){return '<div class="msb"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="msf">'+esc(m.de||'Anonyme')+' vers '+esc(m.a||'Tous')+'</div><div class="msc">'+esc(m.contenu)+'</div><div class="mst">'+fmt(m.date)+'</div></div><div style="display:flex;gap:5px"><button class="ai" onclick="openEditMsg(\''+m.id+'\')">&#9999;</button><button class="ai" onclick="delMsg(\''+m.id+'\')">&#128465;</button></div></div></div>';}).join('') : ES('&#128172;','Aucun message');
}

export function historyHtml(){
  var h = S.data.commHistory.slice().sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}).slice(0,100);
  if (!h.length) return ES('&#128337;','Aucun envoi pour le moment');
  var bs = {envoye:'bgr',en_attente:'bod',erreur:'bdr'}, lbl = {envoye:'Envoyé',en_attente:'En attente',erreur:'Erreur'};
  var rows = h.map(function(x){return '<tr><td>'+new Date(x.createdAt).toLocaleString('fr')+'</td><td>'+BADGE(x.canal==='email'?'bbl':x.canal==='sms'?'bod':'bgr',x.canal)+'</td><td>'+esc(x.destinataire||'-')+'</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.contenu||'')+'</td><td>'+BADGE(bs[x.statut]||'bgy',lbl[x.statut]||x.statut)+(x.erreur?'<div style="font-size:.66rem;color:var(--rd);margin-top:2px">'+esc(x.erreur)+'</div>':'')+'</td></tr>';}).join('');
  return '<div class="cd"><div class="ch"><span class="ct2">Historique des envois</span></div>'+TW('<tr><th>Date</th><th>Canal</th><th>Destinataire</th><th>Message</th><th>Statut</th></tr>',rows)+'</div>';
}

export function queueHtml(){
  var q = S.data.commQueue.slice().sort(function(a,b){return a.createdAt-b.createdAt;});
  var top = '<div class="cd"><div class="ch"><span class="ct2">File d\'attente offline ('+q.length+')</span>'+BTN('bg bsm','processCommQueue()','&#8635; Réessayer maintenant')+'</div>';
  if (!q.length) return top + ES('&#9989;','Aucun message en attente') + '</div>';
  var rows = q.map(function(x){return '<tr><td>'+new Date(x.createdAt).toLocaleString('fr')+'</td><td>'+BADGE('bod',x.canal)+'</td><td>'+esc(x.to)+'</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.content||'')+'</td></tr>';}).join('');
  return top + TW('<tr><th>Ajouté le</th><th>Canal</th><th>Destinataire</th><th>Message</th></tr>',rows) + '</div>';
}

export function composerHtml(){
  var configuredComm = ['brevo','africastalking','twilio_whatsapp'].filter(isApiConfigured);
  var emailViaCentral = !isApiConfigured('brevo') && S.cloudActive;
  if (!configuredComm.length && !emailViaCentral) {
    return '<div class="cd">'+ES('&#9888;','Aucune API de communication configurée') +
      '<div style="text-align:center">'+BTN('bg','showPage(\'parametrage\')','Configurer maintenant')+'</div></div>';
  }
  var availChans = configuredComm.slice(); if (emailViaCentral) availChans.push('brevo');
  if (availChans.indexOf(CHANNEL_PROVIDER[S.ui.cchan])<0) S.ui.cchan = {brevo:'email',africastalking:'sms',twilio_whatsapp:'whatsapp'}[availChans[0]];
  var chanOpts = [
    {v:'email',l:'✉️ Email (Brevo)'+(emailViaCentral?' — Cloud ☁️':''),ok:isApiConfigured('brevo')||emailViaCentral},
    {v:'sms',l:'💬 SMS (Africa\'s Talking)',ok:isApiConfigured('africastalking')},
    {v:'whatsapp',l:'📱 WhatsApp (Twilio)',ok:isApiConfigured('twilio_whatsapp')}
  ].filter(function(o){return o.ok;}).map(function(o){return '<option value="'+o.v+'"'+(S.ui.cchan===o.v?' selected':'')+'>'+o.l+'</option>';}).join('');
  var tplOpts = CHURCH_TEMPLATES.map(function(t){return '<option value="'+t.id+'">'+t.label+'</option>';}).join('');
  return '<div class="cd"><div class="ch"><span class="ct2">Nouveau message</span></div><div class="fg">' +
    '<div class="fi"><label>Canal</label><select id="cchan" onchange="S.ui.cchan=this.value;renderCommTab(\'compose\')">'+chanOpts+'</select></div>' +
    '<div class="fi"><label>Destinataires</label><select id="cdestmode" onchange="S.ui.cdestmode=this.value;updateDestPicker()">' +
      '<option value="filter"'+(S.ui.cdestmode==='filter'?' selected':'')+'>Par filtre</option>' +
      '<option value="individual"'+(S.ui.cdestmode==='individual'?' selected':'')+'>Individuel</option>' +
      '<option value="multi"'+(S.ui.cdestmode==='multi'?' selected':'')+'>Sélection multiple</option>' +
      '<option value="all"'+(S.ui.cdestmode==='all'?' selected':'')+'>Envoi global</option>' +
    '</select></div>' +
    '<div class="fi s2" id="cdestpicker"></div>' +
    (S.ui.cchan==='email' ? '<div class="fi s2"><label>Objet</label><input id="csub" value="MbeukChurch"></div>' : '') +
    '<div class="fi s2"><label>Modèle</label><select id="ctpl" onchange="applyTemplate(this.value)"><option value="">— Message libre —</option>'+tplOpts+'</select></div>' +
    '<div class="fi s2"><label>Message — variables disponibles : {nom} {telephone} {email} {statut} {ministere}</label><textarea id="cmsg" style="min-height:120px"></textarea></div>' +
    '</div><div class="ma" style="justify-content:flex-start">'+BTN('bg','sendCommunication()','&#128228; Envoyer')+'</div></div>';
}
window.applyTemplate = function(id){ var t = CHURCH_TEMPLATES.find(function(x){return x.id===id;}); if (t && G('cmsg')) G('cmsg').value = t.body; };

export function updateDestPicker(){
  var mode = S.ui.cdestmode || 'filter';
  var el = G('cdestpicker'); if (!el) return;
  if (mode==='filter'){
    var filters = allFilters();
    var opts = Object.keys(filters).map(function(k){return '<option value="'+k+'">'+filters[k].label+' ('+filters[k].fn().length+')</option>';}).join('');
    el.innerHTML = '<label>Filtre</label><select id="cdestf">'+opts+'</select>';
  } else if (mode==='individual'){
    var all = getAllPeople().filter(function(p){return p.telephone||p.email;});
    var opts2 = all.map(function(p){return '<option value="'+p.store+'::'+p.id+'">'+esc(p.nom)+' ('+(p.store==='members'?'Membre':p.store==='visitors'?'Visiteur':'Utilisateur')+')</option>';}).join('');
    el.innerHTML = '<label>Personne</label><select id="cdest1">'+opts2+'</select>';
  } else if (mode==='multi'){
    var all2 = getAllPeople().filter(function(p){return p.telephone||p.email;});
    var boxes = all2.map(function(p){return '<label style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:.8rem;font-weight:400"><input type="checkbox" class="cdest-cb" value="'+p.store+'::'+p.id+'"> '+esc(p.nom)+'</label>';}).join('');
    el.innerHTML = '<label>Sélectionner</label><div style="max-height:160px;overflow-y:auto;background:var(--wh);border:1.5px solid var(--g2);border-radius:8px;padding:8px">'+(boxes||'Aucun contact')+'</div>';
  } else if (mode==='all'){
    el.innerHTML = '<label>Groupe</label><select id="cdestall"><option value="members">Tous les membres ('+S.data.members.length+')</option><option value="visitors">Tous les visiteurs ('+S.data.visitors.length+')</option><option value="users">Tous les utilisateurs ('+S.data.users.length+')</option><option value="everyone">Absolument tout le monde</option></select>';
  }
}

// ── ASSISTANT IA : appels providers + routing/fallback ──────────────
