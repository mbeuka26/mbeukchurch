import { S, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, SCRD, TW, closeModal, esc, fmt, gv, lg, mon, notify, openModal, setA, td, uid } from '../core/utils.js';

export function pgEvenements(c){
  setA(BTN('bg','openAddEvent()','+ Nouvel evenement'));
  var evs=S.data.events.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});var now=new Date();
  var up=evs.filter(function(e2){return new Date(e2.date)>=now;});var pa=evs.filter(function(e2){return new Date(e2.date)<now;});
  var tC={culte:'bbl',croisade:'bod',seminaire:'bpp',veilee:'btl',jeune:'bdr',autre:'bgy'};
  function renderEv(e2){var d2=new Date(e2.date);return '<div style="display:flex;gap:11px;background:var(--wh);box-shadow:var(--sh);border-radius:var(--r);padding:13px;margin-bottom:11px"><div class="ebox"><div class="eday">'+d2.getDate()+'</div><div class="emon">'+d2.toLocaleString('fr',{month:'short'})+'</div></div><div style="flex:1"><div style="font-weight:600">'+esc(e2.nom)+'</div><div style="font-size:.76rem;color:var(--g3);margin-top:3px">'+esc(e2.lieu||'-')+' &middot; '+esc(e2.predicateur||'-')+(e2.heure?' &middot; '+e2.heure:'')+'</div><div style="margin-top:5px">'+BADGE(tC[e2.type]||'bgy',e2.type||'autre')+'</div>'+(e2.theme?'<div style="font-size:.76rem;color:var(--g4);margin-top:4px">'+esc(e2.theme)+'</div>':'')+'</div><div><button class="ai" onclick="openAddEvent(\''+e2.id+'\')">&#9999;</button><button class="ai" onclick="delEvent(\''+e2.id+'\')">&#128465;</button></div></div>';}
  var upH=up.length?up.map(renderEv).join(''):ES('&#128197;','Aucun evenement a venir');var paH=pa.length?pa.map(renderEv).join(''):ES('&#128197;','Aucun evenement passe');
  c.innerHTML='<div class="tabs"><button class="tab on" id="etA" onclick="evTab(\'up\')">A venir ('+up.length+')</button><button class="tab" id="etB" onclick="evTab(\'past\')">Passes ('+pa.length+')</button></div><div id="evL">'+upH+'</div>';
  window._evUp=upH;window._evPa=paH;
}
window.evTab=function(t){G('etA').classList.toggle('on',t==='up');G('etB').classList.toggle('on',t==='past');G('evL').innerHTML=t==='up'?window._evUp:window._evPa;};

export function openAddEvent(id){
  var e2=id?S.data.events.find(function(x){return x.id===id;})||{}:{};
  var types=['culte','croisade','seminaire','veillee','jeune','autre'].map(function(t){return '<option value="'+t+'"'+(e2.type===t?' selected':'')+'>'+t+'</option>';}).join('');
  openModal('<div class="mtt">'+(id?'Modifier':'Nouvel')+' Evenement</div><div class="fg"><div class="fi s2"><label>Nom *</label><input id="en" value="'+esc(e2.nom||'')+'"></div><div class="fi"><label>Type</label><select id="ety">'+types+'</select></div><div class="fi"><label>Date *</label><input id="ed" type="date" value="'+(e2.date||'')+'"></div><div class="fi"><label>Heure</label><input id="eh" type="time" value="'+(e2.heure||'')+'"></div><div class="fi"><label>Lieu</label><input id="el" value="'+esc(e2.lieu||'')+'"></div><div class="fi"><label>Predicateur</label><input id="epr" value="'+esc(e2.predicateur||'')+'"></div><div class="fi s2"><label>Theme</label><input id="eth" value="'+esc(e2.theme||'')+'"></div><div class="fi s2"><label>Description</label><textarea id="ede">'+esc(e2.description||'')+'</textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEvent(\''+(id||'')+'\')',' Enregistrer')+'</div>');
}

export async function saveEvent(id){var nom=gv('en'),date=gv('ed');if(!nom||!date){notify('Nom et date requis','error');return;}var ex=id?S.data.events.find(function(x){return x.id===id;}):null;await persist('events',{id:id||uid(),nom:nom,type:gv('ety'),date:date,heure:gv('eh'),lieu:gv('el'),predicateur:gv('epr'),theme:gv('eth'),description:gv('ede'),createdAt:ex?ex.createdAt:Date.now()});lg('EVENT',nom);closeModal();notify('📅 "'+nom+'" a été ajouté à l\'agenda.','success');pgEvenements(G('ct'));}
export async function delEvent(id){if(!confirm('Supprimer ?'))return;await remove('events',id);pgEvenements(G('ct'));}

// ── PRESENCES ──

export function pgPresences(c){
  setA(BTN('bg','openAddPresence()','+ Enregistrer presences'));
  var list=S.data.presences;var avg=list.length?Math.round(list.reduce(function(a,p){return a+(p.nombrePresents||0);},0)/list.length):0;var maxP=list.length?Math.max.apply(null,list.map(function(p){return p.nombrePresents||0;})):1;maxP=maxP||1;
  var l6=list.slice(-6);var pts=l6.map(function(p,i){return (30+i*58)+','+(85-Math.round((p.nombrePresents||0)/maxP*65));}).join(' ');
  var svgC=l6.length>1?'<div class="cd" style="margin-bottom:18px"><div class="ch"><span class="ct2">Tendance</span></div><svg viewBox="0 0 390 105" style="width:100%;height:auto"><polyline points="'+pts+'" fill="none" stroke="var(--nv)" stroke-width="2.5" stroke-linejoin="round"/>'+l6.map(function(p,i){var cx=30+i*58,cy=85-Math.round((p.nombrePresents||0)/maxP*65);return '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="var(--gd)"/><text x="'+cx+'" y="'+(cy-9)+'" text-anchor="middle" font-size="10" fill="var(--nv)">'+(p.nombrePresents||0)+'</text><text x="'+cx+'" y="102" text-anchor="middle" font-size="8.5" fill="#9ba3b4">'+fmt(p.date).slice(0,5)+'</text>';}).join('')+'</svg></div>':'';
  var rows=list.slice().reverse().map(function(p){return '<tr><td>'+fmt(p.date)+'</td><td>'+esc(p.eventName||'-')+'</td><td>'+BADGE('bbl',p.nombrePresents||0)+'</td><td>'+BADGE('bgy',p.nombreVisiteurs||0)+'</td><td class="ic">'+(p.offrande?mon(p.offrande):'-')+'</td><td><button class="ai" onclick="openEditPresence(\''+p.id+'\')">&#9999;</button><button class="ai" onclick="delPresence(\''+p.id+'\')">&#128465;</button></td></tr>';}).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--g3);padding:28px">Aucune presence</td></tr>';
  c.innerHTML='<div class="sg" style="margin-bottom:18px">'+SCRD('Fiches',list.length,'','var(--bl)')+SCRD('Moyenne',avg,'','var(--tq)')+SCRD('Record',maxP,'','var(--gn2)')+'</div>'+svgC+'<div class="cd"><div class="ch"><span class="ct2">Registre</span></div>'+TW('<tr><th>Date</th><th>Evenement</th><th>Presents</th><th>Visiteurs</th><th>Offrande</th><th></th></tr>',rows)+'</div>';
}

export function openAddPresence(){
  var evts=S.data.events.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  var opts=evts.map(function(e2){return '<option value="'+e2.id+'" data-n="'+esc(e2.nom)+'">'+esc(e2.nom)+' - '+fmt(e2.date)+'</option>';}).join('');
  openModal('<div class="mtt">Enregistrer Presences</div><div class="fg"><div class="fi s2"><label>Evenement</label><select id="prev"><option value="">-- Selectionner --</option>'+opts+'</select></div><div class="fi"><label>Presents *</label><input id="pnb" type="number" min="0"></div><div class="fi"><label>Dont visiteurs</label><input id="pvis" type="number" min="0"></div><div class="fi"><label>Date</label><input id="pdat" type="date" value="'+td()+'"></div><div class="fi"><label>Offrande (FCFA)</label><input id="poff" type="number" min="0"></div><div class="fi s2"><label>Notes</label><textarea id="pnot"></textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','savePresence()','Enregistrer')+'</div>');
}

export async function savePresence(){var nb=parseInt(gv('pnb'));if(isNaN(nb)){notify('Nombre requis','error');return;}var sel=G('prev');var evName=(sel.options[sel.selectedIndex]&&sel.options[sel.selectedIndex].dataset.n)||'Culte';var off=parseFloat(gv('poff'))||0;await persist('presences',{id:uid(),eventId:sel.value,eventName:evName,date:gv('pdat'),nombrePresents:nb,nombreVisiteurs:parseInt(gv('pvis'))||0,offrande:off,notes:gv('pnot'),createdAt:Date.now()});if(off>0)await persist('finances',{id:uid(),type:'offrande',montant:off,date:gv('pdat'),donateur:'Collecte culte',description:'Offrande - '+evName,createdAt:Date.now()});closeModal();notify('Presences enregistrees','success');pgPresences(G('ct'));}


export function openEditPresence(id) {
  var p = S.data.presences.find(function(x){return x.id===id;});
  if (!p) return;
  openModal('<div class="mtt">Modifier Presences</div><div class="fg"><div class="fi s2"><label>Evenement</label><input id="prev2" value="'+esc(p.eventName||'')+'" readonly style="background:var(--g1)"></div><div class="fi"><label>Presents *</label><input id="pnb2" type="number" min="0" value="'+(p.nombrePresents||0)+'"></div><div class="fi"><label>Dont visiteurs</label><input id="pvis2" type="number" min="0" value="'+(p.nombreVisiteurs||0)+'"></div><div class="fi"><label>Date</label><input id="pdat2" type="date" value="'+(p.date||'')+'"></div><div class="fi"><label>Offrande (FCFA)</label><input id="poff2" type="number" min="0" value="'+(p.offrande||0)+'"></div><div class="fi s2"><label>Notes</label><textarea id="pnot2">'+esc(p.notes||'')+'</textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEditPresence(\''+id+'\')','Enregistrer')+'</div>');
}

export async function saveEditPresence(id) {
  var p = S.data.presences.find(function(x){return x.id===id;});
  if (!p) return;
  var nb = parseInt(gv('pnb2'));
  if (isNaN(nb)) { notify('Nombre requis','error'); return; }
  await persist('presences', Object.assign({}, p, {
    nombrePresents: nb,
    nombreVisiteurs: parseInt(gv('pvis2'))||0,
    date: gv('pdat2'),
    offrande: parseFloat(gv('poff2'))||0,
    notes: gv('pnot2'),
  }));
  closeModal();
  notify('Presence modifiee','success');
  pgPresences(G('ct'));
}

export async function delPresence(id){if(!confirm('Supprimer ?'))return;await remove('presences',id);pgPresences(G('ct'));}

// ── MINISTERES ──

export function pgAgenda(c){
  var year=S.ui.agY,month=S.ui.agM;var fd=new Date(year,month,1).getDay(),dim=new Date(year,month+1,0).getDate();var now=new Date(),evs=S.data.events;var mN=new Date(year,month,1).toLocaleString('fr',{month:'long',year:'numeric'});var dL=['Di','Lu','Ma','Me','Je','Ve','Sa'];
  var cells='';for(var i=0;i<fd;i++)cells+='<div></div>';for(var d2=1;d2<=dim;d2++){var ds=year+'-'+String(month+1).padStart(2,'0')+'-'+String(d2).padStart(2,'0');var hE=evs.some(function(e2){return e2.date===ds;});var iT=d2===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();cells+='<div class="cgd'+(iT?' tod':'')+(hE?' hev':'')+'" >'+d2+'</div>';}
  var mEvs=evs.filter(function(e2){var d2=new Date(e2.date);return d2.getMonth()===month&&d2.getFullYear()===year;}).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  c.innerHTML='<div style="display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start"><div class="cd" style="min-width:255px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><button class="ai" onclick="agNav(-1)">&#8249;</button><span style="font-weight:700;text-transform:capitalize;font-size:.9rem">'+mN+'</span><button class="ai" onclick="agNav(1)">&#8250;</button></div><div class="cgg">'+dL.map(function(l){return '<div class="cgh">'+l+'</div>';}).join('')+cells+'</div></div><div><div style="font-weight:700;margin-bottom:12px;text-transform:capitalize">'+mN+'</div>'+(mEvs.length?mEvs.map(function(e2){var d2=new Date(e2.date);return '<div class="ep" style="background:var(--wh);box-shadow:var(--sh);border-radius:11px"><div class="ebox"><div class="eday">'+d2.getDate()+'</div><div class="emon">'+d2.toLocaleString('fr',{month:'short'})+'</div></div><div class="einf"><div class="enam">'+esc(e2.nom)+'</div><div class="emet">'+esc(e2.lieu||'')+(e2.heure?' - '+e2.heure:'')+'</div></div></div>';}).join(''):ES('&#128197;','Aucun evenement ce mois'))+'</div></div>';
}
window.agNav=function(dir){S.ui.agM+=dir;if(S.ui.agM>11){S.ui.agM=0;S.ui.agY++;}if(S.ui.agM<0){S.ui.agM=11;S.ui.agY--;}pgAgenda(G('ct'));};

// ── UTILISATEURS ──
