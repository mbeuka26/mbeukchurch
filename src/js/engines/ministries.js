import { S, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, SCRD, TW, closeModal, esc, fmt, gv, notify, openModal, setA, td, uid } from '../core/utils.js';
import { dbPut } from '../engines/storage.js';

export function pgMinisteres(c){
  setA(BTN('bg','openAddMinistere()','+ Nouveau ministere'));
  var list=S.data.ministries;
  var html2=list.length?'<div class="mng">'+list.map(function(m){var cnt=S.data.members.filter(function(x){return x.ministere===m.nom;}).length;return '<div class="mnc"><div style="font-weight:700;font-size:.95rem;margin-bottom:5px">'+esc(m.nom)+'</div><div style="font-size:.76rem;color:var(--g3);margin-bottom:8px">'+esc(m.responsable||'-')+'</div><div style="font-size:.84rem;margin-bottom:10px">'+esc(m.description||'')+'</div><div style="display:flex;align-items:center;justify-content:space-between">'+BADGE('bbl',cnt+' membre'+(cnt!==1?'s':''))+'<div><button class="ai" onclick="openAddMinistere(\''+m.id+'\')">&#9999;</button><button class="ai" onclick="delMinistere(\''+m.id+'\')">&#128465;</button></div></div>'+(m.activites?'<div style="font-size:.73rem;color:var(--g3);margin-top:8px;padding-top:8px;border-top:1px solid var(--g2)">'+esc(m.activites)+'</div>':'')+'</div>';}).join('')+'</div>':ES('&#9962;','Aucun ministere');
  c.innerHTML=html2;
}

export function openAddMinistere(id){var m=id?S.data.ministries.find(function(x){return x.id===id;})||{}:{};openModal('<div class="mtt">'+(id?'Modifier':'Nouveau')+' Ministere</div><div class="fg f1"><div class="fi"><label>Nom *</label><input id="miN" value="'+esc(m.nom||'')+'"></div><div class="fi"><label>Responsable</label><input id="miR" value="'+esc(m.responsable||'')+'"></div><div class="fi"><label>Description</label><textarea id="miD">'+esc(m.description||'')+'</textarea></div><div class="fi"><label>Activites</label><textarea id="miA">'+esc(m.activites||'')+'</textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveMinistere(\''+(id||'')+'\')',' Enregistrer')+'</div>');}
export async function saveMinistere(id){var nom=gv('miN');if(!nom){notify('Nom requis','error');return;}var ex=id?S.data.ministries.find(function(x){return x.id===id;}):null;await persist('ministries',{id:id||uid(),nom:nom,responsable:gv('miR'),description:gv('miD'),activites:gv('miA'),createdAt:ex?ex.createdAt:Date.now()});closeModal();notify('Ministere enregistre','success');pgMinisteres(G('ct'));}
export async function delMinistere(id){if(!confirm('Supprimer ?'))return;await remove('ministries',id);pgMinisteres(G('ct'));}

// ── MARIAGES & BAPTEMES ──

export function pgMariages(c){
  setA(BTN('bo','openAddBaptism()','+ Bapteme')+' '+BTN('bg','openAddMarriage()','+ Mariage'));
  var mar=S.data.marriages,bap=S.data.baptisms;
  var marH=mar.length?TW('<tr><th>Epoux</th><th>Epouse</th><th>Date</th><th>Statut</th><th></th></tr>',mar.map(function(m){return '<tr><td>'+esc(m.epoux)+'</td><td>'+esc(m.epouse)+'</td><td>'+fmt(m.date)+'</td><td>'+BADGE('bod',m.statut||'Planifie')+'</td><td><button class="ai" onclick="delMarriage(\''+m.id+'\')">&#128465;</button></td></tr>';}).join('')):ES('&#128146;','Aucun mariage');
  var bapH=bap.length?TW('<tr><th>Candidat</th><th>Date</th><th>Officiant</th><th>Statut</th><th></th></tr>',bap.map(function(b){return '<tr><td>'+esc(b.nom)+'</td><td>'+fmt(b.date)+'</td><td>'+esc(b.officiant||'-')+'</td><td>'+BADGE('bbl',b.statut||'Planifie')+'</td><td><button class="ai" onclick="delBaptism(\''+b.id+'\')">&#128465;</button></td></tr>';}).join('')):ES('&#128167;','Aucun bapteme');
  c.innerHTML='<div class="tabs"><button class="tab on" id="mbA" onclick="mbTab(\'mar\')">Mariages ('+mar.length+')</button><button class="tab" id="mbB" onclick="mbTab(\'bap\')">Baptemes ('+bap.length+')</button></div><div id="mbL">'+marH+'</div>';
  window._marH=marH;window._bapH=bapH;
}
window.mbTab=function(t){G('mbA').classList.toggle('on',t==='mar');G('mbB').classList.toggle('on',t==='bap');G('mbL').innerHTML=t==='mar'?window._marH:window._bapH;};

export function openAddMarriage(){openModal('<div class="mtt">Nouveau Mariage</div><div class="fg"><div class="fi"><label>Epoux *</label><input id="mepx"></div><div class="fi"><label>Epouse *</label><input id="meps"></div><div class="fi"><label>Date</label><input id="mdat" type="date"></div><div class="fi"><label>Statut</label><select id="msta"><option>Planifie</option><option>Celebre</option><option>En attente</option></select></div><div class="fi s2"><label>Notes</label><textarea id="mnot"></textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveMarriage()','Enregistrer')+'</div>');}
export async function saveMarriage(){var ep=gv('mepx'),es=gv('meps');if(!ep||!es){notify('Noms requis','error');return;}await persist('marriages',{id:uid(),epoux:ep,epouse:es,date:gv('mdat'),statut:gv('msta'),notes:gv('mnot'),createdAt:Date.now()});closeModal();notify('Mariage enregistre','success');pgMariages(G('ct'));}
export async function delMarriage(id){if(!confirm('Supprimer ?'))return;await remove('marriages',id);pgMariages(G('ct'));}
export function openAddBaptism(){openModal('<div class="mtt">Nouveau Bapteme</div><div class="fg"><div class="fi"><label>Candidat *</label><input id="bpn"></div><div class="fi"><label>Date</label><input id="bpd" type="date"></div><div class="fi"><label>Officiant</label><input id="bpo"></div><div class="fi"><label>Statut</label><select id="bps"><option>Planifie</option><option>Celebre</option></select></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveBaptism()','Enregistrer')+'</div>');}
export async function saveBaptism(){var nom=gv('bpn');if(!nom){notify('Nom requis','error');return;}await persist('baptisms',{id:uid(),nom:nom,date:gv('bpd'),officiant:gv('bpo'),statut:gv('bps'),createdAt:Date.now()});closeModal();notify('Bapteme enregistre','success');pgMariages(G('ct'));}
export async function delBaptism(id){if(!confirm('Supprimer ?'))return;await remove('baptisms',id);pgMariages(G('ct'));}

// ── PRIERE ──

export function pgPriere(c){
  setA(BTN('bg','openAddPriere()','+ Nouvelle demande'));
  var list=S.data.prieres;var enc=list.filter(function(p){return p.statut!=='exaucee';});var exa=list.filter(function(p){return p.statut==='exaucee';});
  function pCard(p){var ub=p.urgence==='haute'?'bdr':p.urgence==='moyenne'?'bod':'bgy';return '<div style="background:var(--wh);border-radius:var(--r);box-shadow:var(--sh);padding:15px;margin-bottom:11px;border-left:4px solid '+(p.statut==='exaucee'?'var(--gn2)':'var(--pp)')+'"><div style="display:flex;justify-content:space-between;gap:9px;flex-wrap:wrap"><div style="flex:1"><div style="font-weight:600">'+esc(p.nom)+'</div><div style="font-size:.84rem;color:var(--g4);margin:3px 0">'+esc(p.sujet)+'</div><div style="font-size:.73rem;color:var(--g3)">'+fmt(p.date)+' - '+esc(p.categorie||'General')+'</div></div><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">'+BADGE(ub,p.urgence||'normale')+(p.statut!=='exaucee'?BTN('bgn bsm','marquerExa(\''+p.id+'\')','Exaucee'):BADGE('bgr','Exaucee'))+'</div></div>'+(p.reponse?'<div style="background:rgba(46,125,50,.08);border-radius:7px;padding:7px;margin-top:7px;font-size:.79rem;color:var(--gn)">'+esc(p.reponse)+'</div>':'')+'<div style="display:flex;gap:5px;margin-top:7px"><button class="ai" onclick="openEditPriere(\''+p.id+'\')">&#9999;</button><button class="ai" onclick="delPriere(\''+p.id+'\')">&#128465;</button></div></div>';}
  var encH=enc.length?enc.map(pCard).join(''):ES('&#128591;','Aucune demande en cours');var exaH=exa.length?exa.map(pCard).join(''):ES('&#9989;','Aucune exaucee');
  c.innerHTML='<div class="sg" style="margin-bottom:18px">'+SCRD('Total',list.length,'','var(--pp)')+SCRD('En cours',enc.length,'','var(--or)')+SCRD('Exaucees',exa.length,'','var(--gn2)')+'</div><div class="tabs"><button class="tab on" id="piA" onclick="priTab(\'enc\')">En cours ('+enc.length+')</button><button class="tab" id="piB" onclick="priTab(\'exa\')">Exaucees ('+exa.length+')</button></div><div id="piL">'+encH+'</div>';
  window._encH=encH;window._exaH=exaH;
}
window.priTab=function(t){G('piA').classList.toggle('on',t==='enc');G('piB').classList.toggle('on',t==='exa');G('piL').innerHTML=t==='enc'?window._encH:window._exaH;};

export function openAddPriere(){openModal('<div class="mtt">Demande de Priere</div><div class="fg"><div class="fi"><label>Nom *</label><input id="pin"></div><div class="fi"><label>Date</label><input id="pid" type="date" value="'+td()+'"></div><div class="fi"><label>Categorie</label><select id="pic"><option>Sante</option><option>Famille</option><option>Finances</option><option>Travail</option><option>Spirituel</option><option>Autre</option></select></div><div class="fi"><label>Urgence</label><select id="piu"><option value="normale">Normale</option><option value="moyenne">Moyenne</option><option value="haute">Haute</option></select></div><div class="fi s2"><label>Sujet *</label><textarea id="pis" style="min-height:90px"></textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','savePriere()','Soumettre')+'</div>');}
export async function savePriere(){var nom=gv('pin'),sujet=gv('pis');if(!nom||!sujet){notify('Requis','error');return;}await persist('prieres',{id:uid(),nom:nom,sujet:sujet,date:gv('pid'),categorie:gv('pic'),urgence:gv('piu'),statut:'en_cours',createdAt:Date.now()});closeModal();notify('Demande enregistree','success');pgPriere(G('ct'));}
export async function marquerExa(id){var p=S.data.prieres.find(function(x){return x.id===id;});if(!p)return;var rep=prompt('Temoignage (optionnel):');p.statut='exaucee';p.reponse=rep||'';p.dateReponse=Date.now();await dbPut('prieres',p);notify('Gloire a Dieu!','success');pgPriere(G('ct'));}
export async function delPriere(id){if(!confirm('Supprimer ?'))return;await remove('prieres',id);pgPriere(G('ct'));}
export function openEditPriere(id) {
  var p = S.data.prieres.find(function(x){return x.id===id;});
  if (!p) return;
  openModal('<div class="mtt">Modifier Intercession</div><div class="fg"><div class="fi"><label>Nom *</label><input id="pin2" value="'+esc(p.nom||'')+'"></div><div class="fi"><label>Date</label><input id="pid2" type="date" value="'+(p.date||'')+'"></div><div class="fi"><label>Categorie</label><select id="pic2"><option'+(p.categorie==='Sante'?' selected':'')+'>Sante</option><option'+(p.categorie==='Famille'?' selected':'')+'>Famille</option><option'+(p.categorie==='Finances'?' selected':'')+'>Finances</option><option'+(p.categorie==='Travail'?' selected':'')+'>Travail</option><option'+(p.categorie==='Spirituel'?' selected':'')+'>Spirituel</option><option'+((!p.categorie||p.categorie==='Autre')?' selected':'')+'>Autre</option></select></div><div class="fi"><label>Urgence</label><select id="piu2"><option value="normale"'+(p.urgence==='normale'?' selected':'')+'>Normale</option><option value="moyenne"'+(p.urgence==='moyenne'?' selected':'')+'>Moyenne</option><option value="haute"'+(p.urgence==='haute'?' selected':'')+'>Haute</option></select></div><div class="fi s2"><label>Sujet *</label><textarea id="pis2" style="min-height:90px">'+esc(p.sujet||'')+'</textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEditPriere(\''+id+'\')','Enregistrer')+'</div>');
}

export async function saveEditPriere(id) {
  var p = S.data.prieres.find(function(x){return x.id===id;});
  if (!p) return;
  var nom=gv('pin2'), sujet=gv('pis2');
  if (!nom||!sujet) { notify('Requis','error'); return; }
  await persist('prieres', Object.assign({}, p, { nom, sujet, date:gv('pid2'), categorie:gv('pic2'), urgence:gv('piu2') }));
  closeModal(); notify('Intercession modifiee','success'); pgPriere(G('ct'));
}

// ── COMMUNICATION ──
