import { PTITLES, S } from '../core/state.js';
import { ES, G, closeSB, notify, setSS } from '../core/utils.js';
import { hasPermission } from '../engines/subaccounts.js';

export async function manualSync(){if(!S.gsUrl){showPage('sync');return;}if(!navigator.onLine){notify('Hors ligne','error');return;}setSS('syncing');try{var body={action:'sync',ts:Date.now(),data:{members:S.data.members,visitors:S.data.visitors,finances:S.data.finances,events:S.data.events,ministries:S.data.ministries,messages:S.data.messages,sermons:S.data.sermons,subaccounts:S.data.subaccounts}};var r=await fetch(S.gsUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('HTTP '+r.status);S.sq=[];localStorage.setItem('sq','[]');localStorage.setItem('ls',Date.now().toString());setSS('online');notify('Synchronisation reussie','success');}catch(e2){setSS('error');notify('Erreur: '+e2.message,'error');}}

// Table de routage : {pageKey: renderFn}. Déclarée ici (le routeur), peuplée
// depuis main.js une fois toutes les fonctions pgX importées — un objet est
// une référence mutable, donc renderPage() ci-dessous voit toujours la
// version à jour même si elle est remplie après le chargement de ce module.
export const PAGES = {};

// ── NAV ──
// ── ROUTEUR CENTRAL (URLs par module : #/dashboard, #/finances, ...) ──
// showPage() reste l'API utilisée partout dans le code existant : elle
// délègue maintenant à navigateTo() pour que chaque page ait sa propre URL,
// fonctionne avec nouvel onglet / bouton retour / lien copié, sans qu'aucun
// appel existant à showPage('x') n'ait besoin d'être modifié.

export function showPage(name){ navigateTo(name); }
export function navigateTo(name){
  if (location.hash === '#/'+name) { handleRoute(); }
  else { location.hash = '#/'+name; }
}

export function handleRoute(){
  var name = (location.hash||'').replace(/^#\/?/,'') || localStorage.getItem('mbk_last_page') || 'dashboard';
  renderPage(name);
}
window.addEventListener('hashchange', handleRoute);

export function renderPage(name){if(!hasPermission(name)){G('ct').innerHTML=ES('&#128274;','Accès refusé','Permission insuffisante pour accéder à ce module.');closeSB();return;}S.page=name;localStorage.setItem('mbk_last_page',name);document.querySelectorAll('.ni').forEach(function(b){b.classList.toggle('on',b.dataset.p===name);});G('pttl').textContent=PTITLES[name]||name;G('tba').innerHTML='';closeSB();var fn=PAGES[name];if(fn)fn(G('ct'));else G('ct').innerHTML=ES('&#128679;','Module en construction');}