import { S, SCAT, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, closeModal, esc, fmt, gv, notify, openModal, setA, uid } from '../core/utils.js';

export function pgSermons(c){
  setA(BTN('bg','openAddSermon()','+ Nouveau sermon'));
  var q=S.ui.ss2.toLowerCase(),cat=S.ui.sc;
  var list=S.data.sermons.filter(function(s2){return(!q||(s2.titre+(s2.predicateur||'')+(s2.resume||'')).toLowerCase().indexOf(q)>=0)&&(!cat||s2.categorie===cat);});
  var catOpts=SCAT.map(function(sc){return '<option value="'+sc+'"'+(cat===sc?' selected':'')+'>'+sc+'</option>';}).join('');
  var cards=list.length?'<div class="smg">'+list.map(function(s2){return '<div class="smc"><div class="smb"><div class="smtt">'+esc(s2.titre)+'</div><div class="sms">'+esc(s2.predicateur||'-')+' - '+fmt(s2.date)+'</div></div><div class="smbd">'+BADGE('bpp',s2.categorie||'General')+(s2.type?' '+BADGE('bbl',s2.type):'')+(s2.lien?'<div style="margin-top:7px"><a href="'+esc(s2.lien)+'" target="_blank" style="color:var(--bl);font-size:.76rem">Voir media</a></div>':'')+(s2.resume?'<div style="font-size:.79rem;color:var(--g4);margin-top:7px">'+esc(s2.resume.slice(0,100))+(s2.resume.length>100?'...':'')+'</div>':'')+'<div style="margin-top:9px;display:flex;gap:5px"><button class="ai" onclick="openAddSermon(\''+s2.id+'\')">&#9999;</button><button class="ai" onclick="delSermon(\''+s2.id+'\')">&#128465;</button></div></div></div>';}).join('')+'</div>':ES('&#128214;','Aucun sermon');
  c.innerHTML='<div class="srb"><input placeholder="Rechercher sermon..." value="'+esc(S.ui.ss2)+'" oninput="S.ui.ss2=this.value;pgSermons(G(\'ct\'))"><select onchange="S.ui.sc=this.value;pgSermons(G(\'ct\'))"><option value="">Toutes categories</option>'+catOpts+'</select></div>'+cards;
}

export function openAddSermon(id){
  var s2=id?S.data.sermons.find(function(x){return x.id===id;})||{}:{};
  var cats=SCAT.map(function(sc){return '<option value="'+sc+'"'+(s2.categorie===sc?' selected':'')+'>'+sc+'</option>';}).join('');
  openModal('<div class="mtt">'+(id?'Modifier':'Nouveau')+' Enseignement</div><div class="fg"><div class="fi s2"><label>Titre *</label><input id="sti" value="'+esc(s2.titre||'')+'"></div><div class="fi"><label>Predicateur</label><input id="spr" value="'+esc(s2.predicateur||'')+'"></div><div class="fi"><label>Date</label><input id="sda" type="date" value="'+(s2.date||'')+'"></div><div class="fi"><label>Categorie</label><select id="sca">'+cats+'</select></div><div class="fi"><label>Type</label><select id="sty"><option value="texte"'+(s2.type==='texte'?' selected':'')+'>Texte</option><option value="audio"'+(s2.type==='audio'?' selected':'')+'>Audio</option><option value="video"'+(s2.type==='video'?' selected':'')+'>Video</option></select></div><div class="fi s2"><label>Lien media (URL)</label><input id="sli" value="'+esc(s2.lien||'')+'"></div><div class="fi s2"><label>Resume</label><textarea id="sre">'+esc(s2.resume||'')+'</textarea></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveSermon(\''+(id||'')+'\')',' Enregistrer')+'</div>');
}

export async function saveSermon(id){var titre=gv('sti');if(!titre){notify('Titre requis','error');return;}var ex=id?S.data.sermons.find(function(x){return x.id===id;}):null;await persist('sermons',{id:id||uid(),titre:titre,predicateur:gv('spr'),date:gv('sda'),categorie:gv('sca'),type:gv('sty'),lien:gv('sli'),resume:gv('sre'),createdAt:ex?ex.createdAt:Date.now()});closeModal();notify('Sermon enregistre','success');pgSermons(G('ct'));}
export async function delSermon(id){if(!confirm('Supprimer ?'))return;await remove('sermons',id);pgSermons(G('ct'));}

// ── AGENDA ──
