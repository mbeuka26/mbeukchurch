import { S, persist } from '../core/state.js';

export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
export function fmt(d){return d?new Date(d).toLocaleDateString('fr-FR'):'-';}
export function mon(n){return(Number(n)||0).toLocaleString('fr-FR')+' FCFA';}
export function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
export function td(){return new Date().toISOString().slice(0,10);}
export function gv(id){var e=document.getElementById(id);return e?e.value.trim():'';}
export function G(id){return document.getElementById(id);}
export function sM(ds,ref){if(!ds)return false;var d=new Date(ds);return d.getMonth()===ref.getMonth()&&d.getFullYear()===ref.getFullYear();}
export var _successPhrases=['✅ Enregistré avec succès.','🎉 Parfait, c\'est fait !','👏 Bien joué, tout est à jour.','🏆 Excellent, opération réussie.','✨ Terminé avec succès.'];
export function notify(msg,type,isCelebration){type=type||'info';var el=document.createElement('div');el.className='nf '+(type==='success'?'ok':type==='error'?'er':'')+(isCelebration?' cel':'');var icon=type==='success'?(isCelebration?'&#127881;':'&#9989;'):type==='error'?'&#10060;':'&#8505;';el.innerHTML='<span>'+icon+'</span><span>'+esc(msg)+'</span>';G('nc').appendChild(el);setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},isCelebration?4200:3500);}
export function celebrate(msg){notify(msg,'success',true);}
export function randomSuccess(){return _successPhrases[Math.floor(Math.random()*_successPhrases.length)];}
export function showWelcomeMessage(name){
  if (sessionStorage.getItem('mbk_welcomed')) return;
  sessionStorage.setItem('mbk_welcomed','1');
  var h=new Date().getHours();
  var greet=h<12?'☀️ Bonjour':h<18?'👋 Bon après-midi':'🌙 Bonsoir';
  var variants=[
    greet+', '+name+' ! Passez une excellente journée.',
    '🎯 Ravi de vous retrouver, '+name+'. Voici un aperçu de vos activités.',
    '🚀 Tout est prêt, '+name+'. Continuons là où vous vous êtes arrêté(e).',
    '🎉 Heureux de vous revoir parmi nous, '+name+' !'
  ];
  notify(variants[Math.floor(Math.random()*variants.length)],'success');
}

export function ES(icon,msg,sub,cta){return '<div class="es"><div class="esi">'+icon+'</div><div class="esm">'+msg+'</div>'+(sub?'<div class="ess">'+sub+'</div>':'')+(cta?'<div style="margin-top:14px">'+cta+'</div>':'')+'</div>';}
export function SCRD(lbl,val,sub,bc,trend){
  var parts=String(lbl||'').trim().split(/\s+/);
  var icon='',label=lbl;
  if(parts.length>1 && /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(parts[0])){icon=parts.shift();label=parts.join(' ');}
  var trendHtml=trend?'<span class="bdg '+(trend.up?'bgr':'bdr')+'" style="margin-left:6px">'+(trend.up?'▲':'▼')+' '+esc(trend.label)+'</span>':'';
  return '<div class="sc" style="--accent:'+(bc||'var(--nv)')+'">'+(icon?'<div class="sci">'+icon+'</div>':'')+'<div class="sl2">'+label+trendHtml+'</div><div class="sv">'+val+'</div>'+(sub?'<div class="ss2">'+sub+'</div>':'')+'</div>';
}

export function lg(a,d){persist('logs',{id:uid(),action:a,detail:d||'',user:'Admin',ts:Date.now()});}
export function setA(h){G('tba').innerHTML=h;}

// ── HTML HELPERS (string concat only, no nested backticks) ──

export function H(tag,attrs,inner){return '<'+tag+(attrs?' '+attrs:'')+'>'+inner+'</'+tag+'>';}
export function DIV(cls,inner){return '<div class="'+cls+'">'+inner+'</div>';}
export function BADGE(cls,txt){return '<span class="bdg '+cls+'">'+esc(String(txt))+'</span>';}
export function BTN(cls,fn,lbl){return '<button class="btn '+cls+'" onclick="'+fn+'">'+lbl+'</button>';}
export function TW(head,body){return '<div class="tw"><table class="dt"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';}
export function AV(name){return '<div style="width:30px;height:30px;border-radius:50%;background:var(--nv);color:var(--gd);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0">'+(name||'?')[0].toUpperCase()+'</div>';}
export function EVPILL(e2){var d2=new Date(e2.date);return '<div class="ep"><div class="ebox"><div class="eday">'+d2.getDate()+'</div><div class="emon">'+d2.toLocaleString('fr',{month:'short'})+'</div></div><div class="einf"><div class="enam">'+esc(e2.nom)+'</div><div class="emet">'+esc(e2.lieu||'')+(e2.predicateur?' &middot; '+esc(e2.predicateur):'')+'</div></div></div>';}

// ── SYNC ──

export function setSS(s){S.ss=s;var dot=G('dot'),txt=G('stxt');if(!dot)return;dot.className='dot '+s;txt.textContent={online:'En ligne',offline:'Hors ligne',syncing:'Sync...',error:'Erreur'}[s]||s;}
export function toggleSB(){G('sb').classList.toggle('op');G('ov').classList.toggle('op');}
export function closeSB(){G('sb').classList.remove('op');G('ov').classList.remove('op');}
export function openModal(h){G('mc').innerHTML=h;G('mo').classList.add('op');}
export function closeModal(){G('mo').classList.remove('op');}
G('mo').addEventListener('click',function(e2){if(e2.target===G('mo'))closeModal();});

// ── DASHBOARD ──
