import { manualSync, showPage } from '../core/router.js';
import { S, STORES, VER } from '../core/state.js';
import { BADGE, BTN, G, SCRD, celebrate, esc, notify, setA, setSS, td, uid } from '../core/utils.js';
import { byodbCardHtml } from '../engines/cloud-sync.js';
import { exportFinancesExcel } from '../engines/finances.js';
import { IDBEngine, MigrationEngine, StorageAdapter, dbClr, dbPut, loadAll } from '../engines/storage.js';
import { subaccountsAdminCardHtml } from '../engines/subaccounts.js';
import { THEME, applyPreset } from '../engines/theme.js';
import { renderApiCard } from '../services/api-keys.js';

export function pgSyncBase(c){
  var ls=localStorage.getItem('ls');
  var stRows=STORES.map(function(s2){return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--g2);font-size:.82rem"><span style="text-transform:capitalize">'+s2+'</span>'+BADGE('bbl',(S.data[s2]||[]).length)+'</div>';}).join('');
  var code='function doPost(e) {\n  var data = JSON.parse(e.postData.contents);\n  var ss = SpreadsheetApp.getActiveSpreadsheet();\n  if (data.action === "sync" && data.data) {\n    Object.entries(data.data).forEach(([name, rows]) => {\n      var sheet = ss.getSheetByName(name) || ss.insertSheet(name);\n      sheet.clearContents();\n      if (rows.length > 0) {\n        var headers = Object.keys(rows[0]);\n        sheet.getRange(1,1,1,headers.length).setValues([headers]);\n        var vals = rows.map(r => headers.map(h => r[h] || ""));\n        sheet.getRange(2,1,vals.length,headers.length).setValues(vals);\n      }\n    });\n  }\n  if (data.action === "send_email") return sendEmail_(data.payload);\n  if (data.action === "send_sms") return sendSms_(data.payload);\n  if (data.action === "send_whatsapp") return sendWhatsApp_(data.payload);\n  return ContentService\n    .createTextOutput(JSON.stringify({status:"ok"}))\n    .setMimeType(ContentService.MimeType.JSON);\n}\n\n// ── Relais Communication : Brevo (Email) ──\nfunction sendEmail_(p) {\n  try {\n    var res = UrlFetchApp.fetch("https://api.brevo.com/v3/smtp/email", {\n      method: "post", contentType: "application/json",\n      headers: {"api-key": p.apiKey},\n      payload: JSON.stringify({\n        sender: {email: p.senderEmail, name: p.senderName || ""},\n        to: [{email: p.to}],\n        subject: p.subject,\n        htmlContent: "<p>" + String(p.body).replace(/\\n/g,"<br>") + "</p>"\n      }),\n      muteHttpExceptions: true\n    });\n    var ok = res.getResponseCode() < 300;\n    return ContentService.createTextOutput(JSON.stringify({status: ok ? "ok" : "error", code: res.getResponseCode(), body: res.getContentText()})).setMimeType(ContentService.MimeType.JSON);\n  } catch (err) {\n    return ContentService.createTextOutput(JSON.stringify({status:"error", error: err.message})).setMimeType(ContentService.MimeType.JSON);\n  }\n}\n\n// ── Relais Communication : Africa\\\'s Talking (SMS) ──\nfunction sendSms_(p) {\n  try {\n    var res = UrlFetchApp.fetch("https://api.africastalking.com/version1/messaging", {\n      method: "post",\n      headers: {"apiKey": p.apiKey, "Accept": "application/json"},\n      payload: {username: p.username, to: p.to, message: p.message, from: p.senderId || ""},\n      muteHttpExceptions: true\n    });\n    var ok = res.getResponseCode() < 300;\n    return ContentService.createTextOutput(JSON.stringify({status: ok ? "ok" : "error", body: res.getContentText()})).setMimeType(ContentService.MimeType.JSON);\n  } catch (err) {\n    return ContentService.createTextOutput(JSON.stringify({status:"error", error: err.message})).setMimeType(ContentService.MimeType.JSON);\n  }\n}\n\n// ── Relais Communication : Twilio (WhatsApp) ──\nfunction sendWhatsApp_(p) {\n  try {\n    var res = UrlFetchApp.fetch("https://api.twilio.com/2010-04-01/Accounts/" + p.accountSid + "/Messages.json", {\n      method: "post",\n      headers: {"Authorization": "Basic " + Utilities.base64Encode(p.accountSid + ":" + p.authToken)},\n      payload: {From: "whatsapp:" + p.from, To: "whatsapp:" + p.to, Body: p.message},\n      muteHttpExceptions: true\n    });\n    var ok = res.getResponseCode() < 300;\n    return ContentService.createTextOutput(JSON.stringify({status: ok ? "ok" : "error", body: res.getContentText()})).setMimeType(ContentService.MimeType.JSON);\n  } catch (err) {\n    return ContentService.createTextOutput(JSON.stringify({status:"error", error: err.message})).setMimeType(ContentService.MimeType.JSON);\n  }\n}';
  c.innerHTML='<div class="cd"><div class="ch"><span class="ct2">Google Sheets</span></div><p style="font-size:.84rem;color:var(--g4);margin-bottom:14px;line-height:1.6">Entrez l\'URL de votre Google Apps Script deploye pour synchroniser les donnees.</p><div class="fi" style="margin-bottom:14px"><label>URL Google Apps Script</label><input id="gsurl" value="'+esc(S.gsUrl)+'" placeholder="https://script.google.com/macros/s/YOUR_ID/exec" style="font-family:monospace;font-size:.79rem"></div>'+BTN('bg','saveGsUrl()','Sauvegarder URL')+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div class="cd"><div class="ch"><span class="ct2">Statut</span></div><div style="display:flex;align-items:center;gap:9px;margin-bottom:12px"><span class="dot '+S.ss+'" style="width:11px;height:11px"></span><strong style="text-transform:capitalize">'+S.ss+'</strong></div><div style="font-size:.81rem;color:var(--g4);margin-bottom:5px">Derniere sync: '+(ls?new Date(parseInt(ls)).toLocaleString('fr'):'Jamais')+'</div><div style="font-size:.81rem;color:var(--g4);margin-bottom:14px">En attente: <strong>'+S.sq.length+'</strong> op.</div><div style="display:flex;gap:7px;flex-wrap:wrap">'+BTN('bn','manualSync()','Synchroniser')+BTN('bo','setSS(navigator.onLine?\'online\':\'offline\');pgSync(G(\'ct\'))','Verifier')+'</div></div><div class="cd"><div class="ch"><span class="ct2">Donnees locales</span></div>'+stRows+'</div></div><div class="cd"><div class="ch"><span class="ct2">Code Apps Script</span></div><pre style="background:var(--nv);color:var(--gd2);padding:14px;border-radius:9px;font-size:.71rem;overflow-x:auto;line-height:1.5">'+esc(code)+'</pre><p style="font-size:.76rem;color:var(--g3);margin-top:9px">Sheets - Extensions - Apps Script - Coller - Deployer - Web App - Acces: Tout le monde</p></div><div class="cd"><div class="ch"><span class="ct2">Gestion donnees</span></div><div style="display:flex;gap:8px;flex-wrap:wrap">'+BTN('bo','importData()','Importer JSON')+BTN('bo','exportAll()','Exporter JSON')+BTN('brd','clearAll()','Vider donnees')+'</div></div>';
}

export function saveGsUrl(){S.gsUrl=G('gsurl').value.trim();localStorage.setItem('gsUrl',S.gsUrl);notify('URL sauvegardee','success');}

// ── PARAMETRAGE ──

export function pgParametrage(c) {
  setA('');
  var gsu = S.gsUrl || '';
  c.innerHTML =

  // ── GESTION DES SOUS-COMPTES (visible administrateur uniquement) ────────
  subaccountsAdminCardHtml() +

  // ── CLOUD SYNC BYODB — Supabase personnel de l'église (optionnel) ──────
  byodbCardHtml() +

  // ── APPARENCE & COULEURS ──────────────────────────────────────────────
  '<div class="cd" id="color-panel">' +
  '<div class="ch" style="margin-bottom:16px"><span class="ct2">🎨 Apparence & Couleurs</span></div>' +

  // Thèmes prédéfinis
  '<div style="margin-bottom:20px">' +
  '<div style="font-size:.78rem;font-weight:700;color:var(--g4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Thèmes prédéfinis</div>' +
  '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
  ['{"n":"Défaut","sb":"#0f2744","st":"rgba(255,255,255,.65)","sa":"#f0c96b","sc":"#c9a84c","mb":"#f2f4f7","mt":"#0f2744","tb":"#ffffff","tt":"#0f2744","cb":"#ffffff","ct":"#0f2744","pb":"#c9a84c","pt":"#0f2744","sb2":"#0f2744","st2":"#ffffff"}',
   '{"n":"Nuit Violette","sb":"#1a0533","st":"rgba(255,255,255,.65)","sa":"#d4a4f7","sc":"#9c27b0","mb":"#0d0d1a","mt":"#e8d5fb","tb":"#1a0533","tt":"#d4a4f7","cb":"#1e1040","ct":"#e8d5fb","pb":"#9c27b0","pt":"#ffffff","sb2":"#1a0533","st2":"#d4a4f7"}',
   '{"n":"Forêt","sb":"#1b3a2d","st":"rgba(255,255,255,.65)","sa":"#a8d8a8","sc":"#4caf50","mb":"#f0f7f0","mt":"#1b3a2d","tb":"#ffffff","tt":"#1b3a2d","cb":"#ffffff","ct":"#1b3a2d","pb":"#4caf50","pt":"#ffffff","sb2":"#1b3a2d","st2":"#ffffff"}',
   '{"n":"Soleil","sb":"#7a4100","st":"rgba(255,255,255,.7)","sa":"#ffe082","sc":"#ff9800","mb":"#fff8e1","mt":"#4a2800","tb":"#fff8e1","tt":"#4a2800","cb":"#ffffff","ct":"#4a2800","pb":"#ff9800","pt":"#ffffff","sb2":"#7a4100","st2":"#ffe082"}',
   '{"n":"Ardoise","sb":"#2d3748","st":"rgba(255,255,255,.65)","sa":"#90cdf4","sc":"#4299e1","mb":"#edf2f7","mt":"#1a202c","tb":"#ffffff","tt":"#2d3748","cb":"#ffffff","ct":"#2d3748","pb":"#4299e1","pt":"#ffffff","sb2":"#2d3748","st2":"#90cdf4"}',
   '{"n":"Clair","sb":"#f8f9fa","st":"#495057","sa":"#212529","sc":"#0f2744","mb":"#ffffff","mt":"#212529","tb":"#ffffff","tt":"#212529","cb":"#f8f9fa","ct":"#212529","pb":"#0f2744","pt":"#ffffff","sb2":"#f8f9fa","st2":"#212529"}'].map(function(th){
    var t=JSON.parse(th);
    return '<button class="btn bsm" onclick="applyPreset(\''+encodeURIComponent(th)+'\')" '+
      'style="background:'+t.sb+';color:'+t.sa+';border:2px solid '+t.sc+';border-radius:8px;padding:6px 12px;font-size:.75rem;font-weight:700;cursor:pointer;transition:transform .15s" '+
      'onmouseover="this.style.transform=\'scale(1.06)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
      t.n + '</button>';
  }).join('') +
  '</div></div>' +

  // Mode clair / sombre
  '<div style="margin-bottom:20px">' +
  '<div style="font-size:.78rem;font-weight:700;color:var(--g4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Mode</div>' +
  '<div style="display:flex;gap:8px">' +
  '<button class="btn bsm bo" onclick="THEME.setMode(\'light\')" id="tm-light" style="display:flex;align-items:center;gap:6px">☀️ Clair</button>' +
  '<button class="btn bsm bo" onclick="THEME.setMode(\'dark\')" id="tm-dark" style="display:flex;align-items:center;gap:6px">🌙 Sombre</button>' +
  '<button class="btn bsm bo" onclick="THEME.setMode(\'auto\')" id="tm-auto" style="display:flex;align-items:center;gap:6px">🖥️ Système</button>' +
  '</div></div>' +

  // Couleurs personnalisées - grid
  '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:20px">' +

  // Barre latérale
  _colorSection('🗂️ Barre latérale', [
    {id:'th-sidebar-bg',   label:'Fond sidebar',           prop:'--sidebar-bg'},
    {id:'th-sidebar-text', label:'Texte sidebar',          prop:'--sidebar-text'},
    {id:'th-sidebar-sa',   label:'Texte actif / accent',   prop:'--sidebar-text-active'},
    {id:'th-sidebar-acc',  label:'Barre active',           prop:'--sidebar-accent'},
  ]) +

  // Fond principal
  _colorSection('🏠 Zone principale', [
    {id:'th-main-bg',   label:'Fond principal',  prop:'--main-bg'},
    {id:'th-main-text', label:'Texte principal', prop:'--main-text'},
    {id:'th-tb-bg',     label:'Fond barre haut', prop:'--topbar-bg'},
    {id:'th-tb-text',   label:'Texte barre haut',prop:'--topbar-text'},
  ]) +

  // Cartes / boxes
  _colorSection('🃏 Cartes & Tableaux de bord', [
    {id:'th-card-bg',   label:'Fond des cartes',  prop:'--card-bg'},
    {id:'th-card-text', label:'Texte des cartes', prop:'--card-text'},
  ]) +

  // Boutons
  _colorSection('🔘 Boutons', [
    {id:'th-btn-pbg',  label:'Fond bouton principal',  prop:'--btn-primary-bg'},
    {id:'th-btn-ptxt', label:'Texte bouton principal', prop:'--btn-primary-text'},
    {id:'th-btn-sbg',  label:'Fond bouton secondaire', prop:'--btn-secondary-bg'},
    {id:'th-btn-stxt', label:'Texte bouton secondaire',prop:'--btn-secondary-text'},
  ]) +

  '</div>' + // end grid

  // Aperçu en temps réel
  '<div style="margin-bottom:20px">' +
  '<div style="font-size:.78rem;font-weight:700;color:var(--g4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Aperçu en temps réel</div>' +
  '<div id="theme-preview" style="border-radius:12px;overflow:hidden;border:1px solid var(--g2);box-shadow:var(--sh)">' +
    '<div style="background:var(--sidebar-bg);padding:14px 16px;display:flex;align-items:center;gap:10px">' +
      '<div style="font-weight:700;font-size:.88rem;color:var(--sidebar-text-active)">✝ MbeukChurch</div>' +
      '<div style="margin-left:auto;display:flex;gap:6px">' +
        ['Membres','Finances','Présences'].map(function(n,i){return '<div style="padding:4px 9px;border-radius:6px;font-size:.7rem;background:'+(i===0?'rgba(255,255,255,.12)':'none')+';color:'+(i===0?'var(--sidebar-text-active)':'var(--sidebar-text)')+'">'+(i===0?'▶ ':'')+n+'</div>';}).join('') +
      '</div>' +
    '</div>' +
    '<div style="background:var(--main-bg);padding:14px;display:flex;gap:10px;flex-wrap:wrap">' +
      ['Membres','Finances','Présences'].map(function(n){return '<div style="background:var(--card-bg);border-radius:8px;padding:10px 14px;flex:1;min-width:80px;box-shadow:0 1px 4px rgba(0,0,0,.1)"><div style="font-size:.65rem;color:var(--g4);text-transform:uppercase;letter-spacing:.5px">'+n+'</div><div style="font-size:1.2rem;font-weight:700;color:var(--card-text)">42</div></div>';}).join('') +
    '</div>' +
    '<div style="background:var(--main-bg);padding:0 14px 14px;display:flex;gap:8px">' +
      '<button class="btn bsm" style="background:var(--btn-primary-bg);color:var(--btn-primary-text);border:none;border-radius:6px;padding:7px 14px;font-size:.75rem;font-weight:600">Bouton principal</button>' +
      '<button class="btn bsm" style="background:var(--btn-secondary-bg);color:var(--btn-secondary-text);border:none;border-radius:6px;padding:7px 14px;font-size:.75rem;font-weight:600">Secondaire</button>' +
    '</div>' +
  '</div></div>' +

  // Actions
  '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
  '<button class="btn bg" onclick="THEME.save();notify(\'Thème sauvegardé\',\'success\')">💾 Sauvegarder</button>' +
  '<button class="btn bo" onclick="THEME.reset();pgParametrage(G(\'ct\'))">↺ Réinitialiser par défaut</button>' +
  '</div>' +
  '</div>' + // end color-panel card

  // ── APIs COMMUNICATION ───────────────────────────────────────────────
  '<div class="cd"><div class="ch"><span class="ct2">📡 APIs de Communication</span></div>' +
  '<p style="font-size:.84rem;color:var(--g4);margin-bottom:14px;line-height:1.6">Connectez vos propres comptes Email, SMS et WhatsApp. Vos clés restent chiffrées sur cet appareil et ne transitent jamais par un serveur tiers — uniquement vers votre propre Apps Script puis le fournisseur choisi.</p>' +
  '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">' +
  renderApiCard('brevo') + renderApiCard('africastalking') + renderApiCard('twilio_whatsapp') +
  '</div></div>' +

  // ── APIs INTELLIGENCE ARTIFICIELLE ──────────────────────────────────
  '<div class="cd"><div class="ch"><span class="ct2">🤖 APIs Intelligence Artificielle</span></div>' +
  '<p style="font-size:.84rem;color:var(--g4);margin-bottom:14px;line-height:1.6">Connectez vos propres clés IA (Gemini, Grok, OpenRouter) pour activer l\'Assistant IA. En cas d\'indisponibilité d\'un fournisseur, le système bascule automatiquement sur le suivant configuré.</p>' +
  '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">' +
  renderApiCard('gemini') + renderApiCard('grok') + renderApiCard('openrouter') +
  '</div></div>' +

  // ── GOOGLE SHEETS ─────────────────────────────────────────────────────
  '<div class="cd"><div class="ch"><span class="ct2">⚙️ Connexion Google Sheets</span></div>' +
  '<p style="font-size:.84rem;color:var(--g4);margin-bottom:14px;line-height:1.6">Connectez votre eglise a sa propre base Google Sheets via Apps Script (multi-tenant).</p>' +
  '<div class="fg"><div class="fi s2"><label>URL Google Apps Script</label><input id="gs_url" value="'+esc(gsu)+'" placeholder="https://script.google.com/macros/s/VOTRE_ID/exec" style="font-family:monospace;font-size:.79rem"></div></div>' +
  '<div class="ma" style="justify-content:flex-start;margin-top:12px">' +
  BTN('bg','saveGsUrlParam()','Sauvegarder') + ' ' +
  BTN('bo','testGsConn()','Tester connexion') + '</div>' +
  '<div id="gs_status" style="margin-top:10px;font-size:.81rem"></div></div>' +

  // ── EXPORT / IMPORT ───────────────────────────────────────────────────
  '<div class="cd"><div class="ch"><span class="ct2">📤 Export / Import Global</span></div>' +
  '<p style="font-size:.84rem;color:var(--g4);margin-bottom:14px">Export et import complet de toutes les donnees (membres, finances, presences, etc.)</p>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
  '<div style="background:var(--g1);border-radius:10px;padding:14px"><div style="font-weight:700;font-size:.85rem;margin-bottom:8px">📤 Export</div>' +
  BTN('bn','exportAll()','Export JSON complet') + '<br><br>' +
  BTN('bo','exportAllCSV()','Export CSV complet') + '<br><br>' +
  BTN('bo','exportFinancesExcel()','Export Finances CSV') + '</div>' +
  '<div style="background:var(--g1);border-radius:10px;padding:14px"><div style="font-weight:700;font-size:.85rem;margin-bottom:8px">📥 Import</div>' +
  BTN('bn','importData()','Importer JSON') + '<br><br>' +
  BTN('brd','clearAll()','⚠️ Vider TOUTES les donnees') + '</div>' +
  '</div></div>' +

  // ── STATS STOCKAGE ────────────────────────────────────────────────────
  '<div class="cd"><div class="ch"><span class="ct2">📊 Statistiques stockage</span></div>' +
  '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:9px">' +
  STORES.map(function(s2,i2){var _sp=['var(--nv)','var(--bl)','var(--gn2)','var(--rs)','var(--pp)','var(--tq)','var(--or)','var(--ig)'];return SCRD(s2,(S.data[s2]||[]).length+' entr.','',_sp[i2%_sp.length]);}).join('') +
  '</div></div>';

  // Synchroniser les color-pickers avec les valeurs actuelles
  THEME.syncPickers();
  THEME.updateModeButtons();
}

// ── Helper : génère une section de color-pickers ──────────────────────

export function _colorSection(title, fields) {
  return '<div style="background:var(--g1);border-radius:12px;padding:14px">' +
    '<div style="font-size:.78rem;font-weight:700;color:var(--g4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">' + title + '</div>' +
    fields.map(function(f) {
      var currentVal = THEME.getRawColor(f.prop);
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
        '<input type="color" id="' + f.id + '" value="' + currentVal + '" ' +
        'oninput="THEME.apply(\'' + f.prop + '\',this.value);THEME.syncPickersLive()" ' +
        'style="width:36px;height:36px;border:2px solid var(--g2);border-radius:8px;cursor:pointer;background:none;padding:2px;flex-shrink:0">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:.8rem;font-weight:600;color:var(--main-text)">' + f.label + '</div>' +
        '<div style="font-size:.68rem;color:var(--g3);font-family:monospace" id="' + f.id + '-val">' + currentVal + '</div>' +
        '</div>' +
        '</div>';
    }).join('') +
  '</div>';
}


export function saveGsUrlParam(){S.gsUrl=G('gs_url').value.trim();localStorage.setItem('gsUrl',S.gsUrl);notify('URL sauvegardee','success');var st=G('gs_status');if(st)st.innerHTML='<span style="color:var(--gn)">✓ URL enregistree</span>';}
export async function testGsConn(){
  var url=G('gs_url').value.trim();var st=G('gs_status');
  if(!url){if(st)st.innerHTML='<span style="color:var(--rd)">Entrez une URL d\'abord</span>';return;}
  if(st)st.innerHTML='<span style="color:var(--gd)">⏳ Test en cours...</span>';
  try{var r=await fetch(url+'?action=ping',{method:'GET',mode:'cors'});
    if(r.ok){if(st)st.innerHTML='<span style="color:var(--gn)">✅ Connexion reussie!</span>';}
    else{if(st)st.innerHTML='<span style="color:var(--rd)">❌ Erreur HTTP '+r.status+'</span>';}
  }catch(e){if(st)st.innerHTML='<span style="color:var(--rd)">❌ Echec: '+esc(e.message)+'</span>';}
}

export function exportAllCSV(){
  // Exporte chaque store en CSV separé dans un seul fichier ZIP-simulé (fichier texte multi-sections)
  var sections = STORES.map(function(s2){
    var rows = S.data[s2] || [];
    if (!rows.length) return '=== '+s2.toUpperCase()+' (vide) ===\n';
    var headers = Object.keys(rows[0]);
    var csv = headers.join(',') + '\n';
    rows.forEach(function(r){
      csv += headers.map(function(h){
        var v = String(r[h]===undefined?'':r[h]).replace(/"/g,'""');
        return '"'+v+'"';
      }).join(',') + '\n';
    });
    return '=== '+s2.toUpperCase()+' ('+rows.length+' enregistrements) ===\n' + csv;
  }).join('\n\n');
  var a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,\uFEFF' + encodeURIComponent(sections);
  a.download = 'mbeukchurch_export_'+td()+'.csv';
  a.click();
  notify('Export CSV complet pret','success');
}

// ════════════════════════════════════════════════════════════════════════
// THEME ENGINE — MbeukChurch v3.1
// Gestion complète de la personnalisation des couleurs
// Sauvegarde LocalStorage · Transitions fluides · Modes clair/sombre
// ════════════════════════════════════════════════════════════════════════

export function pgSync(c) {
  pgSyncBase(c);
  // Append SQLite section after existing sync content
  var sqlSection = document.createElement('div');
  sqlSection.className = 'cd';
  sqlSection.style.marginTop = '18px';
  var st = StorageAdapter.getStatus();
  sqlSection.innerHTML =
    '<div class="ch"><span class="ct2">&#9889; Stockage SQLite WASM + OPFS</span>' +
    '<span class="bdg ' + (st.mode==='sqlite'?'bgr':'bgy') + '">' + st.mode.toUpperCase() + '</span></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
      '<div style="background:var(--g1);border-radius:10px;padding:14px">' +
        '<div style="font-size:.72rem;color:var(--g3);margin-bottom:4px">MOTEUR DE STOCKAGE</div>' +
        '<div style="font-weight:700;color:' + (st.mode==='sqlite'?'var(--gn)':'var(--g4)') + '">' +
          (st.mode==='sqlite'?'⚡ SQLite WASM + OPFS':'💾 IndexedDB (fallback)') + '</div>' +
      '</div>' +
      '<div style="background:var(--g1);border-radius:10px;padding:14px">' +
        '<div style="font-size:.72rem;color:var(--g3);margin-bottom:4px">OPFS DISPONIBLE</div>' +
        '<div style="font-weight:700;color:' + (st.opfs?'var(--gn)':'var(--rd)') + '">' + (st.opfs?'✅ Oui':'❌ Non (Chrome requis)') + '</div>' +
      '</div>' +
    '</div>' +
    (st.mode==='sqlite' && st.tables ?
      '<div style="margin-bottom:14px"><div style="font-size:.72rem;color:var(--g3);margin-bottom:8px;font-weight:700">ENREGISTREMENTS EN BASE SQLite</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' +
      Object.keys(st.tables).map(function(t) {
        return '<div style="background:var(--g1);border-radius:8px;padding:8px;text-align:center">' +
          '<div style="font-size:.62rem;color:var(--g3);text-transform:uppercase">' + t + '</div>' +
          '<div style="font-weight:700;color:var(--nv)">' + st.tables[t] + '</div></div>';
      }).join('') + '</div></div>' : '') +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn bn" onclick="StorageAdapter.exportDB()">&#9889; Exporter .db SQLite</button>' +
      '<button class="btn bo" onclick="importSQLiteFile()">&#128228; Importer .db SQLite</button>' +
      (MigrationEngine.isNeeded() ?
        '<button class="btn bgn" onclick="forceMigration()">&#8651; Migrer IDB → SQLite</button>' : '') +
    '</div>';
  if (c) c.appendChild(sqlSection);
}

window.importSQLiteFile = function() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.db';
  inp.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var ok = await StorageAdapter.importDB(file);
    if (ok) { await loadAll(); showPage('dashboard'); }
  };
  inp.click();
};

window.forceMigration = async function() {
  if (!confirm('Migrer toutes les données IndexedDB vers SQLite ?\n\nCela peut prendre quelques secondes.')) return;
  try {
    await IDBEngine.open();
    StorageAdapter._showMigrationToast();
    var result = await MigrationEngine.run();
    StorageAdapter._hideMigrationToast();
    await loadAll();
    celebrate('🏆 Migration terminée : ' + result.migrated + ' enregistrements transférés avec succès !');
    showPage('sync');
  } catch(e) {
    StorageAdapter._hideMigrationToast();
    notify('Erreur migration: ' + e.message, 'error');
  }
};


// SaaS boot handles init after license check


// ════════════════════════════════════════════════════════════════════════
// MODULE COMMUNICATION + ASSISTANT IA — MbeukChurch v1.0
// Email (Brevo) · SMS (Africa's Talking) · WhatsApp (Twilio)
// Assistant IA (Gemini · Grok · OpenRouter) avec routing/fallback
// Offline-first / local-first · clés API chiffrées localement (AES-GCM)
// Aucune centralisation propriétaire : les envois passent par le Google
// Apps Script personnel de l'utilisateur (voir Synchronisation) qui
// relaie directement vers le fournisseur choisi.
// ════════════════════════════════════════════════════════════════════════

// ── VAULT : chiffrement local des clés API ──────────────────────────

export function exportAll(){var a=document.createElement('a');a.href='data:application/json,'+encodeURIComponent(JSON.stringify(Object.assign({},S.data,{exportedAt:new Date().toISOString(),version:VER}),null,2));a.download='mbeukchurch_'+td()+'.json';a.click();notify('Donnees exportees','success');}
export function exportFinances(){var a=document.createElement('a');a.href='data:application/json,'+encodeURIComponent(JSON.stringify({finances:S.data.finances,exportedAt:new Date().toISOString()},null,2));a.download='finances_'+td()+'.json';a.click();}
export function importData(){var inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=async function(e2){var file=e2.target.files[0];if(!file)return;try{var text=await file.text();var data=JSON.parse(text);for(var s2 of STORES){if(data[s2]){await dbClr(s2);for(var o of data[s2])await dbPut(s2,o);S.data[s2]=data[s2];}}notify('Donnees importees','success');showPage(S.page);}catch(err){notify('Fichier JSON invalide','error');}};inp.click();}
export async function clearAll(){if(!confirm('Supprimer TOUTES les donnees? Irreversible!'))return;for(var s2 of STORES){await dbClr(s2);S.data[s2]=[];}notify('Donnees effacees','success');showPage(S.page);}

// ── SERVICE WORKER ──

export function regSW(){if(!('serviceWorker' in navigator))return;var code="self.addEventListener('install',function(){self.skipWaiting();});self.addEventListener('activate',function(){self.clients.claim();});self.addEventListener('fetch',function(e2){e2.respondWith(fetch(e2.request).catch(function(){return new Response('Offline',{status:503});}));});";navigator.serviceWorker.register(URL.createObjectURL(new Blob([code],{type:'text/javascript'}))).catch(function(){});}

// ── SEED DATA ──

export async function seedDemo(){
  if(S.data.members.length>0)return;
  var n=Date.now(),day=864e5;
  var rows={
    members:[{id:uid(),nom:'Konan',prenom:'Amos',age:'45',sexe:'M',telephone:'+225 07 12 34 56',statut:'pasteur',adresse:'Abidjan, Cocody',dateEntree:'2018-01-15',ministere:'Intercession',baptise:'oui',dateBapteme:'2005-06-12',historique:'Pasteur fondateur',createdAt:n-130*day},{id:uid(),nom:'Traore',prenom:'Marie',age:'32',sexe:'F',telephone:'+225 05 98 76 54',statut:'leader',adresse:'Abidjan, Yopougon',dateEntree:'2019-03-10',ministere:'Chorale',baptise:'oui',dateBapteme:'2015-04-05',historique:'Responsable chorale',createdAt:n-80*day},{id:uid(),nom:'Bamba',prenom:'Oumar',age:'38',sexe:'M',telephone:'+225 01 23 45 67',statut:'membre',adresse:'Abidjan, Abobo',dateEntree:'2020-07-22',ministere:'Evangelisation',baptise:'oui',dateBapteme:'2020-09-12',historique:'',createdAt:n-50*day},{id:uid(),nom:'Diallo',prenom:'Fatou',age:'26',sexe:'F',telephone:'+225 07 65 43 21',statut:'membre',adresse:'Bouake',dateEntree:'2021-01-08',ministere:'Jeunesse',baptise:'oui',dateBapteme:'2021-03-21',historique:'',createdAt:n-25*day},{id:uid(),nom:'Koffi',prenom:'Jean',age:'29',sexe:'M',telephone:'+225 05 11 22 33',statut:'membre',adresse:'Abidjan, Marcory',dateEntree:'2022-05-14',ministere:'',baptise:'non',dateBapteme:'',historique:'Candidat bapteme',createdAt:n-8*day}],
    finances:[{id:uid(),type:'dime',montant:150000,date:td(),donateur:'Konan Amos',description:'Dime mensuelle',createdAt:n},{id:uid(),type:'offrande',montant:85000,date:td(),donateur:'Traore Marie',description:'Offrande du culte',createdAt:n},{id:uid(),type:'depense',montant:45000,date:td(),donateur:'Admin',description:'Electricite et eau',createdAt:n},{id:uid(),type:'don',montant:200000,date:new Date(n-7*day).toISOString().slice(0,10),donateur:'Bamba Oumar',description:'Don special campagne',createdAt:n},{id:uid(),type:'dime',montant:120000,date:new Date(n-30*day).toISOString().slice(0,10),donateur:'Diallo Fatou',description:'Dime',createdAt:n}],
    events:[{id:uid(),nom:'Culte Dominical',type:'culte',date:new Date(n+7*day).toISOString().slice(0,10),heure:'09:00',lieu:'Temple Principal',predicateur:'Pasteur Konan Amos',theme:'La grace de Dieu',description:'',createdAt:n},{id:uid(),nom:'Croisade Evangelisation',type:'croisade',date:new Date(n+14*day).toISOString().slice(0,10),heure:'18:00',lieu:'Stade Municipal',predicateur:'Evangeliste Dupont',theme:'Venez a moi',description:'Grande croisade',createdAt:n},{id:uid(),nom:'Seminaire Leadership',type:'seminaire',date:new Date(n+21*day).toISOString().slice(0,10),heure:'08:30',lieu:'Salle Annexe',predicateur:'Pasteur Konan Amos',theme:'Servir avec excellence',description:'',createdAt:n}],
    ministries:[{id:uid(),nom:'Chorale',responsable:'Traore Marie',description:'Ministere de louange',activites:'Repetition sam 14h',createdAt:n},{id:uid(),nom:'Jeunesse',responsable:'Diallo Fatou',description:'15-30 ans',activites:'Reunion ven soir',createdAt:n},{id:uid(),nom:'Intercession',responsable:'Konan Amos',description:'Priere et intercession',activites:'Priere mat 6h',createdAt:n},{id:uid(),nom:'Evangelisation',responsable:'Bamba Oumar',description:'Temoignage',activites:'Sorties bi-hebdo',createdAt:n}],
    sermons:[{id:uid(),titre:'La foi qui deplace les montagnes',predicateur:'Pasteur Konan Amos',date:td(),categorie:'Foi',type:'texte',lien:'',resume:'Message sur la foi pour surmonter les obstacles de la vie',createdAt:n},{id:uid(),titre:'Servir Dieu avec excellence',predicateur:'Pasteur Konan Amos',date:new Date(n-7*day).toISOString().slice(0,10),categorie:'Leadership',type:'video',lien:'https://youtube.com',resume:'Honorer Dieu par l excellence dans notre service',createdAt:n}],
    announcements:[{id:uid(),titre:'Bienvenue dans MbeukChurch',contenu:'Notre nouveau systeme de gestion est maintenant actif. Que Dieu soit loue!',auteur:'Admin',date:td(),createdAt:n},{id:uid(),titre:'Culte de priere ce mercredi',contenu:'Tous les membres sont invites au culte de priere a 18h au temple principal.',auteur:'Pasteur Konan',date:new Date(n-3*day).toISOString().slice(0,10),createdAt:n}],
    presences:[{id:uid(),eventId:'',eventName:'Culte Dominical',date:new Date(n-7*day).toISOString().slice(0,10),nombrePresents:145,nombreVisiteurs:12,offrande:75000,notes:'',createdAt:n},{id:uid(),eventId:'',eventName:'Culte Dominical',date:new Date(n-14*day).toISOString().slice(0,10),nombrePresents:132,nombreVisiteurs:8,offrande:68000,notes:'',createdAt:n},{id:uid(),eventId:'',eventName:'Culte Dominical',date:new Date(n-21*day).toISOString().slice(0,10),nombrePresents:158,nombreVisiteurs:15,offrande:82000,notes:'',createdAt:n}],
    prieres:[{id:uid(),nom:'Marie Traore',sujet:'Guerison de ma mere malade',date:td(),categorie:'Sante',urgence:'haute',statut:'en_cours',createdAt:n},{id:uid(),nom:'Oumar Bamba',sujet:'Nouveau travail et provision financiere',date:new Date(n-5*day).toISOString().slice(0,10),categorie:'Finances',urgence:'moyenne',statut:'exaucee',reponse:'Embauche comme comptable. Gloire a Dieu!',createdAt:n}],
    budgets:[{id:uid(),categorie:'Evangelisation',montant:500000,periode:'annuel',annee:new Date().getFullYear(),notes:'',createdAt:n},{id:uid(),categorie:'Maintenance',montant:300000,periode:'annuel',annee:new Date().getFullYear(),notes:'',createdAt:n},{id:uid(),categorie:'Jeunesse',montant:200000,periode:'annuel',annee:new Date().getFullYear(),notes:'',createdAt:n}]
  };
  for(var store in rows){var items=rows[store];for(var j=0;j<items.length;j++){await dbPut(store,items[j]);S.data[store].push(items[j]);}}
  notify('Donnees de demo chargees','success');
}

// ── INIT ──
