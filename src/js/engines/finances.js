import { S, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, SCRD, TW, celebrate, closeModal, esc, fmt, gv, lg, mon, notify, openModal, setA, td, uid } from '../core/utils.js';
import { exportFinances } from '../engines/settings.js';

export function pgFinances(c){
  setA(BTN('bo','printFinanceReport()','&#128424;')+' '+BTN('bo bsm','exportFinancesExcel()','&#128196; Excel')+' '+BTN('bg','openAddFinance()','+ Transaction'));
  var f=S.data.finances;var rev=f.filter(function(x){return x.type!=='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);var dep=f.filter(function(x){return x.type==='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);
  var rows=f.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);}).map(function(t){var bc=t.type==='depense'?'bdr':t.type==='dime'?'bod':t.type==='offrande'?'bbl':'bgr';return '<tr><td>'+fmt(t.date)+'</td><td>'+BADGE(bc,t.type)+'</td><td>'+esc(t.description||'-')+'</td><td class="'+(t.type==='depense'?'ec':'ic')+'">'+(t.type==='depense'?'-':'+')+mon(t.montant)+'</td><td>'+esc(t.donateur||'-')+'</td><td><button class="ai" onclick="openAddFinance(\''+t.id+'\')">&#9999;</button><button class="ai" onclick="delFinance(\''+t.id+'\')">&#128465;</button></td></tr>';}).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--g3);padding:28px">Aucune transaction</td></tr>';
  c.innerHTML='<div class="f3">'+SCRD('Revenus','<span style="color:var(--gn)">'+mon(rev)+'</span>','','var(--gn2)')+SCRD('Depenses','<span style="color:var(--rd)">'+mon(dep)+'</span>','','var(--rd)')+SCRD('Solde','<span style="color:'+(rev-dep>=0?'var(--gn)':'var(--rd)')+'">'+mon(rev-dep)+'</span>','',rev-dep>=0?'var(--gd)':'var(--rd)')+'</div><div class="cd"><div class="ch"><span class="ct2">Historique</span>'+BTN('bo bsm','exportFinances()','Export')+'</div>'+TW('<tr><th>Date</th><th>Type</th><th>Description</th><th>Montant</th><th>Source</th><th></th></tr>',rows)+'</div>';
}

export function openAddFinance(id){
  var t=id?S.data.finances.find(function(x){return x.id===id;})||{}:{};
  var mbs=S.data.members.map(function(m){return '<option>'+esc(m.nom)+'</option>';}).join('');
  var types=['dime','offrande','don','budget','depense'];
  var typeOpts=types.map(function(tp){return '<option value="'+tp+'"'+(t.type===tp?' selected':'')+'>'+tp+'</option>';}).join('');
  openModal('<div class="mtt">'+(id?'Modifier':'Nouvelle')+' Transaction</div><div class="fg"><div class="fi"><label>Type *</label><select id="ft">'+typeOpts+'</select></div><div class="fi"><label>Montant (FCFA) *</label><input id="fm" type="number" min="0" value="'+(t.montant||'')+'"></div><div class="fi"><label>Date</label><input id="fd" type="date" value="'+(t.date||td())+'"></div><div class="fi"><label>Source</label><input id="fsrc" value="'+esc(t.donateur||'')+'" list="mbl"><datalist id="mbl">'+mbs+'</datalist></div><div class="fi s2"><label>Description</label><input id="fde" value="'+esc(t.description||'')+'"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveFinance(\''+(id||'')+'\')',' Enregistrer')+'</div>');
}

export async function saveFinance(id){var montant=parseFloat(gv('fm'));if(!montant||montant<=0){notify('Montant requis','error');return;}var type=gv('ft');var ex=id?S.data.finances.find(function(x){return x.id===id;}):null;await persist('finances',{id:id||uid(),type:type,montant:montant,date:gv('fd'),donateur:gv('fsrc'),description:gv('fde'),createdAt:ex?ex.createdAt:Date.now()});lg(id?'MODIF_FINANCE':'FINANCE',type);closeModal();if(['dime','offrande','don'].indexOf(type)>=0)celebrate('🙏 Merci ! Contribution de '+mon(montant)+' enregistrée.');else notify('💾 Transaction enregistrée avec succès.','success');pgFinances(G('ct'));}
// Export Excel/CSV des finances

export function exportFinancesExcel(){
  var f=S.data.finances.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  var rev=f.filter(function(x){return x.type!=='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);
  var dep=f.filter(function(x){return x.type==='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);
  var header='Date,Type,Description,Montant,Source\n';
  var rows=f.map(function(t){return [fmt(t.date),t.type,'"'+(t.description||'').replace(/"/g,'""')+'"',(t.type==='depense'?-1:1)*(+t.montant||0),'"'+(t.donateur||'').replace(/"/g,'""')+'"'].join(',');}).join('\n');
  var totals='\n\nTotal Revenus,'+rev+'\nTotal Depenses,'+dep+'\nSolde Net,'+(rev-dep);
  var csv='\uFEFF'+header+rows+totals; // BOM pour Excel
  var a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='finances_mbeukchurch_'+td()+'.csv';
  a.click();
  notify('Export Excel/CSV prêt','success');
}

export async function delFinance(id){if(!confirm('Supprimer ?'))return;await remove('finances',id);pgFinances(G('ct'));}

// ── DONS ──

export function printFinanceReport(){var f=S.data.finances;var rev=f.filter(function(x){return x.type!=='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);var dep=f.filter(function(x){return x.type==='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);var rows=f.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);}).map(function(t){return '<tr><td>'+fmt(t.date)+'</td><td>'+esc(t.type)+'</td><td>'+esc(t.description||'-')+'</td><td>'+esc(t.donateur||'-')+'</td><td class="'+(t.type==='depense'?'r':'g')+'">'+(t.type==='depense'?'-':'+')+mon(t.montant)+'</td></tr>';}).join('');var w=window.open('','_blank');w.document.write('<!DOCTYPE html><html><head><title>Rapport Financier</title><style>body{font-family:Georgia,serif;max-width:680px;margin:36px auto;color:#0f2744}h1{color:#c9a84c;border-bottom:2px solid #c9a84c;padding-bottom:7px}table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#0f2744;color:#f0c96b;padding:8px}td{padding:7px;border:1px solid #ddd;font-size:.88em}.t{font-weight:bold;background:#f8f4ec}.g{color:green}.r{color:red}@media print{button{display:none}}</style></head><body><h1>Rapport Financier - MbeukChurch</h1><p>Genere le '+new Date().toLocaleDateString('fr-FR')+'</p><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin:14px 0;text-align:center"><div style="border:2px solid green;padding:11px;border-radius:7px"><div>REVENUS</div><strong class="g">'+mon(rev)+'</strong></div><div style="border:2px solid red;padding:11px;border-radius:7px"><div>DEPENSES</div><strong class="r">'+mon(dep)+'</strong></div><div style="border:2px solid #c9a84c;padding:11px;border-radius:7px"><div>SOLDE</div><strong style="color:'+(rev-dep>=0?'green':'red')+'">'+mon(rev-dep)+'</strong></div></div><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Source</th><th>Montant</th></tr></thead><tbody>'+rows+'<tr class="t"><td colspan="4">TOTAL REVENUS</td><td class="g">'+mon(rev)+'</td></tr><tr class="t"><td colspan="4">TOTAL DEPENSES</td><td class="r">'+mon(dep)+'</td></tr><tr class="t"><td colspan="4">SOLDE NET</td><td style="color:'+(rev-dep>=0?'green':'red')+'">'+mon(rev-dep)+'</td></tr></tbody></table><div style="text-align:center;margin-top:14px"><button onclick="window.print()">Imprimer</button></div></body></html>');w.document.close();}
export function pgDons(c){
  var f=S.data.finances.filter(function(x){return x.type!=='depense';});var byM={};f.forEach(function(t){if(t.donateur){if(!byM[t.donateur])byM[t.donateur]={total:0,cnt:0};byM[t.donateur].total+=+t.montant||0;byM[t.donateur].cnt++;}});
  var sorted=Object.keys(byM).map(function(k){return{nom:k,d:byM[k]};}).sort(function(a,b){return b.d.total-a.d.total;});var mx=sorted.length?sorted[0].d.total:1;
  var rows=sorted.length?sorted.map(function(item,i){return '<tr><td style="color:var(--gd);font-weight:700">'+(i+1)+'</td><td><strong>'+esc(item.nom)+'</strong></td><td>'+item.d.cnt+'</td><td class="ic">'+mon(item.d.total)+'</td><td><div class="pb" style="width:100px"><div class="pf" style="width:'+Math.round(item.d.total/mx*100)+'%"></div></div></td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--g3)">Aucun don</td></tr>';
  var typColors={dime:'var(--gn2)',offrande:'var(--bl)',don:'var(--rs)',budget:'var(--tq)'};
  var typCards=['dime','offrande','don','budget'].map(function(tp){var tot=S.data.finances.filter(function(x){return x.type===tp;}).reduce(function(a,b){return a+(+b.montant||0);},0);var cnt=S.data.finances.filter(function(x){return x.type===tp;}).length;return SCRD(tp.toUpperCase(),mon(tot),cnt+' trans.',typColors[tp]||'var(--gd)');}).join('');
  c.innerHTML='<div class="cd"><div class="ch"><span class="ct2">Top Donateurs</span></div>'+TW('<tr><th>#</th><th>Donateur</th><th>Dons</th><th>Total</th><th>Engagement</th></tr>',rows)+'</div><div class="cd"><div class="ch"><span class="ct2">Par type</span></div><div class="sg">'+typCards+'</div></div>';
}

// ── BUDGET ──

export function pgBudget(c){
  setA(BTN('bg','openAddBudget()','+ Ligne budgetaire'));
  var buds=S.data.budgets,f=S.data.finances,yr=new Date().getFullYear();
  var annTot=buds.filter(function(b){return b.periode==='annuel'&&b.annee===yr;}).reduce(function(a,b){return a+(+b.montant||0);},0);
  var totDep=f.filter(function(x){return x.type==='depense';}).reduce(function(a,b){return a+(+b.montant||0);},0);
  var pct=annTot?Math.min(100,Math.round(totDep/annTot*100)):0;
  var progBar=annTot>0?'<div class="cd" style="margin-bottom:18px"><div class="ch"><span class="ct2">Progression '+yr+'</span></div><div class="pb" style="height:16px;margin-bottom:7px"><div class="pf" style="width:'+pct+'%;background:'+(totDep>annTot?'var(--rd)':'var(--nv)')+'"></div></div><div style="display:flex;justify-content:space-between;font-size:.77rem;color:var(--g4)"><span>Depense: '+mon(totDep)+'</span><span>'+pct+'%</span><span>Budget: '+mon(annTot)+'</span></div></div>':'';
  var rows=buds.length?buds.map(function(b){return '<tr><td><strong>'+esc(b.categorie)+'</strong></td><td>'+BADGE('bbl',b.periode)+'</td><td class="ic">'+mon(b.montant)+'</td><td>'+(b.annee||'-')+'</td><td><button class="ai" onclick="openAddBudget(\''+b.id+'\')">&#9999;</button><button class="ai" onclick="delBudget(\''+b.id+'\')">&#128465;</button></td></tr>';}).join(''):'';
  c.innerHTML='<div class="f3">'+SCRD('Budget '+yr,mon(annTot),'','var(--nv)')+SCRD('Utilisation',pct+'%','',totDep<=annTot?'var(--gn2)':'var(--rd)')+SCRD('Restant',mon(annTot-totDep),'','var(--tq)')+'</div>'+progBar+'<div class="cd"><div class="ch"><span class="ct2">Lignes budgetaires</span></div>'+(buds.length?TW('<tr><th>Categorie</th><th>Periode</th><th>Montant</th><th>Annee</th><th></th></tr>',rows):ES('&#128203;','Aucune ligne'))+'</div>';
}

export function openAddBudget(id){
  var b=id?S.data.budgets.find(function(x){return x.id===id;})||{}:{};
  openModal('<div class="mtt">'+(id?'Modifier':'Nouvelle')+' Ligne Budgetaire</div><div class="fg"><div class="fi s2"><label>Categorie *</label><input id="bcat" placeholder="Evangelisation, Maintenance..." value="'+esc(b.categorie||'')+'"></div><div class="fi"><label>Montant (FCFA) *</label><input id="bmnt" type="number" min="0" value="'+(b.montant||'')+'"></div><div class="fi"><label>Periode</label><select id="bper"><option value="annuel"'+(b.periode==='annuel'?' selected':'')+'>Annuel</option><option value="mensuel"'+(b.periode==='mensuel'?' selected':'')+'>Mensuel</option></select></div><div class="fi"><label>Annee</label><input id="byr" type="number" value="'+(b.annee||new Date().getFullYear())+'"></div><div class="fi"><label>Notes</label><input id="bnot" value="'+esc(b.notes||'')+'"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveBudget(\''+(id||'')+'\')',' Enregistrer')+'</div>');
}

export async function saveBudget(id){var cat=gv('bcat'),montant=parseFloat(gv('bmnt'));if(!cat||!montant){notify('Requis','error');return;}var ex=id?S.data.budgets.find(function(x){return x.id===id;}):null;await persist('budgets',{id:id||uid(),categorie:cat,montant:montant,periode:gv('bper'),annee:parseInt(gv('byr'))||new Date().getFullYear(),notes:gv('bnot'),createdAt:ex?ex.createdAt:Date.now()});closeModal();notify('Ligne enregistree','success');pgBudget(G('ct'));}
export async function delBudget(id){if(!confirm('Supprimer ?'))return;await remove('budgets',id);pgBudget(G('ct'));}

// ── EVENEMENTS ──
