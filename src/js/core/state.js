import { G } from '../core/utils.js';
import { PAGES } from '../core/router.js';
import { dbDel, dbPut, loadAll } from '../engines/storage.js';
import { applyAccountPermissions } from '../engines/subaccounts.js';
import { THEME } from '../engines/theme.js';

export var VER='2.2',DBNM='mbk5',DBVR=3;
export var STORES=['members','visitors','finances','events','ministries','messages','sermons','users','marriages','baptisms','announcements','logs','presences','prieres','budgets','apiConfigs','commQueue','commHistory','aiHistory','subaccounts'];
export var PTITLES={dashboard:'Dashboard',membres:'Membres',visiteurs:'Visiteurs',finances:'Finances',dons:'Dons & Dimes',budget:'Budget',evenements:'Evenements',presences:'Presences',ministeres:'Ministeres',mariages:'Mariages & Baptemes',priere:'Intercession',communication:'Communication',sermons:'Enseignements',agenda:'Agenda',utilisateurs:'Utilisateurs',rapports:'Rapports',recherche:'Recherche',sync:'Synchronisation',guide:'Guide d\'utilisation complet',parametrage:'Parametrage Avance',assistant:'Assistant IA'};
export var SCAT=['Foi','Leadership','Famille','Vie chretienne','Evangelisation'];
export var DB=null;
export var S={page:'dashboard',ss:'online',sq:[],gsUrl:localStorage.getItem('gsUrl')||'',activeAccount:null,cloudActive:false,
  data:{members:[],visitors:[],finances:[],events:[],ministries:[],messages:[],sermons:[],users:[],marriages:[],baptisms:[],announcements:[],logs:[],presences:[],prieres:[],budgets:[],apiConfigs:[],commQueue:[],commHistory:[],aiHistory:[],subaccounts:[]},
  ui:{ms:'',mst:'tous',ss2:'',sc:'',gs:'',agY:new Date().getFullYear(),agM:new Date().getMonth(),cdestmode:'filter',cchan:'email',aiChat:[]}
};

// ── DB ──

export var TabSync = (function(){
  var ch = null;
  try{ ch = new BroadcastChannel('mbk_sync'); }catch(e){ ch = null; }
  function emit(type, payload){ if (ch){ try{ ch.postMessage({type:type, payload:payload||null, ts:Date.now()}); }catch(e){} } }
  function listen(){
    if (!ch) return;
    ch.onmessage = async function(ev){
      var msg = ev.data || {};
      if (msg.type === 'theme'){ THEME.load(); }
      else if (msg.type === 'logout'){ location.reload(); }
      else if (msg.type === 'login'){ location.reload(); }
      else if (msg.type === 'data'){
        try{ await loadAll(); }catch(e){}
        if (msg.payload && msg.payload.store === 'subaccounts'){ applyAccountPermissions(); }
        var fn = PAGES[S.page]; if (fn) fn(G('ct'));
      }
    };
  }
  return { emit: emit, listen: listen };
})();

export async function persist(store,obj){obj.updatedAt=Date.now();S.data[store]=S.data[store].filter(function(x){return x.id!==obj.id;});S.data[store].push(obj);await dbPut(store,obj);S.sq.push({store:store,id:obj.id,ts:Date.now()});localStorage.setItem('sq',JSON.stringify(S.sq));if(store==='apiConfigs'||store==='subaccounts')TabSync.emit('data',{store:store});}
export async function remove(store,id){S.data[store]=S.data[store].filter(function(x){return x.id!==id;});await dbDel(store,id);if(store==='apiConfigs'||store==='subaccounts')TabSync.emit('data',{store:store});}

// ── UTILS ──
