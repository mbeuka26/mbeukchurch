import { S } from '../core/state.js';
import { BTN, G, esc, mon, notify, setA, td } from '../core/utils.js';
import { detectSidebarMenus } from '../engines/subaccounts.js';

export function pgGuide(c) {
  setA(BTN('bo bsm','printGuide()','&#128424; Imprimer / PDF') + ' ' + BTN('bo bsm','exportGuideMarkdown()','&#11015; Exporter (.md)'));
  var chapters = getGuideChapters();
  var activeChap = window._guideChap || 0;
  var activeSec  = window._guideSec  || 0;
  var chap = chapters[activeChap];
  var sec  = chap.sections[activeSec];

  var chapNav = chapters.map(function(ch, i) {
    var isActive = i === activeChap;
    return '<button onclick="guideNav(' + i + ',0)" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.83rem;font-weight:600;width:100%;text-align:left;transition:all .2s;background:' + (isActive ? 'var(--gd)' : 'rgba(255,255,255,.04)') + ';color:' + (isActive ? 'var(--nv)' : 'rgba(255,255,255,.7)') + ';border:1px solid ' + (isActive ? 'var(--gd)' : 'rgba(255,255,255,.06)') + ';margin-bottom:4px">'
      + '<span style="font-size:1.1rem">' + ch.icon + '</span>'
      + '<span>' + ch.title + '</span>'
      + '</button>';
  }).join('');

  var secNav = chap.sections.map(function(s, i) {
    var isActive = i === activeSec;
    return '<button onclick="guideNav(' + activeChap + ',' + i + ')" style="padding:7px 12px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:.78rem;font-weight:600;background:' + (isActive ? 'var(--nv)' : 'rgba(255,255,255,.06)') + ';color:' + (isActive ? '#fff' : 'rgba(255,255,255,.6)') + ';margin-right:6px;margin-bottom:6px;transition:all .2s">'
      + (i+1) + '. ' + s.label
      + '</button>';
  }).join('');

  var totalSecs = chap.sections.length;
  var hasPrev = activeSec > 0 || activeChap > 0;
  var hasNext = activeSec < totalSecs - 1 || activeChap < chapters.length - 1;

  var prevFn = activeSec > 0 ? 'guideNav(' + activeChap + ',' + (activeSec-1) + ')' : 'guideNav(' + (activeChap-1) + ',' + (chapters[activeChap-1]? chapters[activeChap-1].sections.length-1 : 0) + ')';
  var nextFn = activeSec < totalSecs-1 ? 'guideNav(' + activeChap + ',' + (activeSec+1) + ')' : 'guideNav(' + (activeChap+1) + ',0)';

  c.innerHTML = '<div style="display:grid;grid-template-columns:220px 1fr;gap:20px;min-height:calc(100vh - 100px)">'

    // Sidebar
    + '<div style="background:rgba(15,39,68,.8);border-radius:var(--r);padding:16px;border:1px solid rgba(255,255,255,.06);position:sticky;top:0;align-self:start;max-height:calc(100vh - 120px);overflow-y:auto">'
    + '<input id="guideSearchInput" oninput="guideSearch(this.value)" placeholder="&#128269; Rechercher dans le guide..." style="width:100%;padding:9px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-size:.78rem;margin-bottom:12px;box-sizing:border-box">'
    + '<div id="guideSearchResults"></div>'
    + '<div id="guideChapList">'
    + '<div style="font-size:.65rem;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;font-weight:700">&#128218; CHAPITRES</div>'
    + chapNav
    + '<div style="margin-top:16px;padding:12px;background:rgba(201,168,76,.1);border-radius:10px;border:1px solid rgba(201,168,76,.2)">'
    + '<div style="font-size:.7rem;color:var(--gd);font-weight:700;margin-bottom:4px">&#128202; PROGRESSION</div>'
    + '<div style="font-size:.8rem;color:rgba(255,255,255,.6)">' + (activeChap+1) + '/' + chapters.length + ' chapitres</div>'
    + '<div style="background:rgba(255,255,255,.1);border-radius:20px;height:5px;margin-top:6px"><div style="background:var(--gd);height:5px;border-radius:20px;width:' + Math.round((activeChap+1)/chapters.length*100) + '%"></div></div>'
    + '</div></div></div>'

    // Content
    + '<div>'
    + guideStalenessNotice()
    + '<div style="background:var(--wh);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;margin-bottom:16px">'

    // Chapter header
    + '<div style="background:linear-gradient(135deg,var(--nv) 0%,var(--nv2) 100%);padding:24px 28px;border-bottom:3px solid var(--gd)">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">'
    + '<span style="font-size:2rem">' + chap.icon + '</span>'
    + '<div><div style="color:var(--gd);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px">Chapitre ' + (activeChap+1) + ' / ' + chapters.length + '</div>'
    + '<div style="color:#fff;font-size:1.3rem;font-weight:700;margin-top:2px">' + chap.title + '</div></div></div>'
    + '<div style="color:rgba(255,255,255,.6);font-size:.84rem">' + chap.description + '</div>'
    + '</div>'

    // Section tabs
    + '<div style="padding:14px 24px;background:var(--g1);border-bottom:1px solid var(--g2);flex-wrap:wrap">' + secNav + '</div>'

    // Section content
    + '<div style="padding:28px">'
    + '<div style="font-size:1rem;font-weight:700;color:var(--nv);margin-bottom:20px;display:flex;align-items:center;gap:8px">'
    + '<span style="background:var(--nv);color:var(--gd);width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0">' + (activeSec+1) + '</span>'
    + sec.label + '</div>'
    + sec.content
    + '</div></div>'

    // Navigation buttons
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0">'
    + (hasPrev ? '<button onclick="' + prevFn + '" style="padding:11px 20px;background:var(--nv);color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:600">&#8592; Précédent</button>' : '<div></div>')
    + '<div style="font-size:.78rem;color:var(--g3)">Section ' + (activeSec+1) + ' / ' + totalSecs + '</div>'
    + (hasNext ? '<button onclick="' + nextFn + '" style="padding:11px 20px;background:var(--gd);color:var(--nv);border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:700">Suivant &#8594;</button>' : '<button style="padding:11px 20px;background:var(--gn2);color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:700">&#9989; Guide terminé!</button>')
    + '</div>'
    + '</div>';
}

window.guideNav = function(chap, sec) {
  window._guideChap = chap;
  window._guideSec = sec;
  var input = G('guideSearchInput'); if (input) input.value = '';
  pgGuide(G('ct'));
  G('ct').scrollTop = 0;
};

// ── RECHERCHE INSTANTANÉE DANS LE GUIDE ──

export function guideSearch(query) {
  var box = G('guideSearchResults'), chapList = G('guideChapList');
  if (!query || query.trim().length < 2) {
    if (box) box.innerHTML = '';
    if (chapList) chapList.style.display = '';
    return;
  }
  if (chapList) chapList.style.display = 'none';
  var chapters = getGuideChapters();
  var q = query.toLowerCase();
  var results = [];
  chapters.forEach(function(ch, ci) {
    ch.sections.forEach(function(s, si) {
      var plain = (ch.title + ' ' + s.label + ' ' + s.content).replace(/<[^>]+>/g, ' ').toLowerCase();
      if (plain.indexOf(q) >= 0) results.push({ci: ci, si: si, chTitle: ch.title, sLabel: s.label, icon: ch.icon});
    });
  });
  if (!box) return;
  if (!results.length) {
    box.innerHTML = '<div style="padding:10px;color:rgba(255,255,255,.5);font-size:.78rem">Aucun résultat pour "' + esc(query) + '"</div>';
    return;
  }
  box.innerHTML = '<div style="font-size:.65rem;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:700">' + results.length + ' RÉSULTAT(S)</div>'
    + results.map(function(r) {
      return '<button onclick="guideNav(' + r.ci + ',' + r.si + ')" style="display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:rgba(255,255,255,.05);color:#fff;border-radius:8px;margin-bottom:5px;cursor:pointer;font-family:inherit;font-size:.76rem;line-height:1.4">'
        + r.icon + ' <strong>' + esc(r.chTitle) + '</strong><br><span style="opacity:.6">' + esc(r.sLabel) + '</span></button>';
    }).join('');
}

// ── EXPORT MARKDOWN ──

export function exportGuideMarkdown() {
  var chapters = getGuideChapters();
  var md = '# Guide d\'utilisation — MbeukChurch\n\n';
  chapters.forEach(function(ch, i) {
    md += '## ' + (i+1) + '. ' + ch.title + '\n\n' + ch.description + '\n\n';
    ch.sections.forEach(function(s, j) {
      md += '### ' + (i+1) + '.' + (j+1) + ' ' + s.label + '\n\n';
      var text = s.content
        .replace(/<[^>]+>/g, '\n')
        .replace(/&#(\d+);/g, function(_, n) { return String.fromCodePoint(parseInt(n,10)); })
        .replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
        .replace(/\n{3,}/g, '\n\n').trim();
      md += text + '\n\n';
    });
  });
  var blob = new Blob([md], {type: 'text/markdown;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'guide-utilisation-mbeukchurch.md';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  notify('📄 Guide exporté en Markdown avec succès !', 'success');
}

// ── IMPRESSION / EXPORT PDF (via la boîte de dialogue d'impression du navigateur) ──

export function printGuide() {
  var chapters = getGuideChapters();
  var html = chapters.map(function(ch, i) {
    return '<h2 style="color:#0f2744;border-bottom:2px solid #c9a84c;padding-bottom:6px;margin-top:30px">' + (i+1) + '. ' + ch.title + '</h2>'
      + '<p style="color:#666;font-style:italic">' + ch.description + '</p>'
      + ch.sections.map(function(s, j) {
          return '<h3 style="color:#c9a84c;margin-top:16px">' + (i+1) + '.' + (j+1) + ' ' + s.label + '</h3><div>' + s.content + '</div>';
        }).join('');
  }).join('');
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Guide d\'utilisation - MbeukChurch</title>'
    + '<style>body{font-family:Georgia,serif;max-width:760px;margin:30px auto;color:#222;line-height:1.6;padding:0 16px}'
    + 'table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ddd;padding:6px 8px;font-size:.85em}'
    + '@media print{button{display:none}}</style></head><body>'
    + '<h1 style="color:#0f2744">📘 Guide d\'utilisation complet — MbeukChurch</h1>'
    + '<p style="color:#999;font-size:.85em">Généré le ' + new Date().toLocaleDateString('fr-FR') + '</p>'
    + html
    + '<div style="text-align:center;margin:24px 0"><button onclick="window.print()" style="padding:11px 22px;background:#0f2744;color:#f0c96b;border:none;border-radius:8px;cursor:pointer;font-size:.9rem">Imprimer / Enregistrer en PDF</button></div>'
    + '</body></html>');
  w.document.close();
}

// ── DÉTECTION DE MISE À JOUR (avertit l'administrateur si un menu n'a pas encore de chapitre) ──

export var GUIDE_COVERED_PAGES = ['dashboard','membres','visiteurs','finances','dons','budget','evenements','presences','ministeres','mariages','priere','communication','assistant','sermons','agenda','rapports','sync','utilisateurs','parametrage','recherche','guide'];
export function guideStalenessNotice() {
  if (S.activeAccount && !S.activeAccount.isAdmin) return '';
  var all = (typeof detectSidebarMenus === 'function') ? detectSidebarMenus().map(function(m){return m.key;}) : [];
  var missing = all.filter(function(k){ return GUIDE_COVERED_PAGES.indexOf(k) < 0; });
  if (!missing.length) return '';
  return '<div style="background:rgba(255,152,0,.1);border:1px solid rgba(255,152,0,.3);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.78rem;color:#e65100">'
    + '<strong>&#9888;&#65039; Guide à mettre à jour :</strong> ces menus n\'ont pas encore de chapitre dédié : ' + missing.join(', ') + '.'
    + '</div>';
}

// ── HELPER RENDERERS ──

export function gStep(num, title, desc, icon) {
  return '<div style="display:flex;gap:14px;margin-bottom:20px;padding:16px;background:var(--g1);border-radius:12px;border-left:3px solid var(--gd)">'
    + '<div style="width:36px;height:36px;border-radius:50%;background:var(--nv);color:var(--gd);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem;flex-shrink:0">' + num + '</div>'
    + '<div><div style="font-weight:700;color:var(--nv);margin-bottom:4px">' + (icon||'') + ' ' + title + '</div><div style="font-size:.84rem;color:var(--g4);line-height:1.6">' + desc + '</div></div></div>';
}


export function gWarn(msg) {
  return '<div style="background:rgba(229,57,53,.08);border:1.5px solid rgba(229,57,53,.25);border-radius:12px;padding:14px 16px;margin:14px 0;display:flex;gap:10px;align-items:flex-start">'
    + '<span style="font-size:1.2rem;flex-shrink:0">&#9888;&#65039;</span>'
    + '<div><div style="font-weight:700;color:var(--rd);font-size:.83rem;margin-bottom:3px">ERREUR À ÉVITER</div><div style="font-size:.82rem;color:#c62828;line-height:1.5">' + msg + '</div></div></div>';
}


export function gTip(msg) {
  return '<div style="background:rgba(46,125,50,.08);border:1.5px solid rgba(67,160,71,.25);border-radius:12px;padding:14px 16px;margin:14px 0;display:flex;gap:10px;align-items:flex-start">'
    + '<span style="font-size:1.2rem;flex-shrink:0">&#128161;</span>'
    + '<div><div style="font-weight:700;color:var(--gn);font-size:.83rem;margin-bottom:3px">CONSEIL PRATIQUE</div><div style="font-size:.82rem;color:#1b5e20;line-height:1.5">' + msg + '</div></div></div>';
}


export function gInfo(msg) {
  return '<div style="background:rgba(21,101,192,.08);border:1.5px solid rgba(21,101,192,.25);border-radius:12px;padding:14px 16px;margin:14px 0;display:flex;gap:10px;align-items:flex-start">'
    + '<span style="font-size:1.2rem;flex-shrink:0">&#8505;&#65039;</span>'
    + '<div style="font-size:.82rem;color:#0d47a1;line-height:1.5">' + msg + '</div></div>';
}


export function gFaq(pairs) {
  return '<div style="display:flex;flex-direction:column;gap:10px">' + pairs.map(function(p, i) {
    var qid = 'faq_' + Math.random().toString(36).slice(2, 8) + '_' + i;
    return '<div style="border:1px solid var(--g2);border-radius:10px;overflow:hidden">'
      + '<button onclick="var b=document.getElementById(\'' + qid + '\');b.style.display=b.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.faqarrow\').textContent=b.style.display===\'none\'?\'▸\':\'▾\';" style="width:100%;text-align:left;padding:13px 16px;background:var(--g1);border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:.85rem;color:var(--nv);display:flex;justify-content:space-between;align-items:center;gap:10px">'
      + '<span>&#10067; ' + p[0] + '</span><span class="faqarrow" style="flex-shrink:0;color:var(--gd)">▸</span></button>'
      + '<div id="' + qid + '" style="display:none;padding:14px 16px;font-size:.83rem;color:var(--g4);line-height:1.6;background:var(--wh)">' + p[1] + '</div>'
      + '</div>';
  }).join('') + '</div>';
}


export function gScreen(svgContent, caption) {
  return '<div style="margin:20px 0;border-radius:14px;overflow:hidden;box-shadow:var(--sh2);border:2px solid var(--g2)">'
    + '<div style="background:var(--nv);padding:8px 14px;display:flex;align-items:center;gap:6px">'
    + '<span style="width:10px;height:10px;border-radius:50%;background:#e53935;display:inline-block"></span>'
    + '<span style="width:10px;height:10px;border-radius:50%;background:#fb8c00;display:inline-block"></span>'
    + '<span style="width:10px;height:10px;border-radius:50%;background:#43a047;display:inline-block"></span>'
    + '<span style="color:rgba(255,255,255,.4);font-size:.72rem;margin-left:8px">MbeukChurch</span></div>'
    + '<div style="background:#fff;padding:20px">' + svgContent + '</div>'
    + (caption ? '<div style="background:var(--g1);padding:8px 14px;font-size:.75rem;color:var(--g3);font-style:italic">&#128247; ' + caption + '</div>' : '')
    + '</div>';
}


export function gBadge(label, color) {
  color = color || 'var(--nv)';
  return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:.72rem;font-weight:700;background:' + color + ';color:#fff;margin:2px">' + label + '</span>';
}


export function gTable(headers, rows) {
  var th = headers.map(function(h){ return '<th style="background:var(--nv);color:var(--gd);padding:10px 12px;text-align:left;font-size:.78rem">' + h + '</th>'; }).join('');
  var tr = rows.map(function(r){ return '<tr>' + r.map(function(cell,i){ return '<td style="padding:9px 12px;border-bottom:1px solid var(--g2);font-size:.83rem;color:' + (i===0?'var(--nv)':'var(--g4)') + ';' + (i===0?'font-weight:600':'') + '">' + cell + '</td>'; }).join('') + '</tr>'; }).join('');
  return '<div style="overflow-x:auto;border-radius:10px;border:1px solid var(--g2);margin:14px 0"><table style="width:100%;border-collapse:collapse"><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>';
}

// ── SVG ILLUSTRATIONS ──

export function svgDashboard() {
  return '<svg viewBox="0 0 600 280" style="width:100%;max-width:600px">'
  // Background
  + '<rect width="600" height="280" fill="#f2f4f7" rx="8"/>'
  // Sidebar
  + '<rect x="0" y="0" width="140" height="280" fill="#0f2744" rx="8"/>'
  + '<rect x="12" y="16" width="116" height="30" fill="rgba(201,168,76,.2)" rx="6"/>'
  + '<text x="70" y="36" text-anchor="middle" fill="#f0c96b" font-size="11" font-weight="bold">MbeukChurch</text>'
  + '<rect x="12" y="56" width="116" height="24" fill="rgba(201,168,76,.3)" rx="5"/>'
  + '<text x="22" y="72" fill="#f0c96b" font-size="9" font-weight="bold">&#128202; Dashboard</text>'
  + '<text x="22" y="100" fill="rgba(255,255,255,.5)" font-size="9">&#128101; Membres</text>'
  + '<text x="22" y="118" fill="rgba(255,255,255,.5)" font-size="9">&#128587; Visiteurs</text>'
  + '<text x="22" y="136" fill="rgba(255,255,255,.5)" font-size="9">&#128176; Finances</text>'
  + '<text x="22" y="154" fill="rgba(255,255,255,.5)" font-size="9">&#128197; Evenements</text>'
  + '<text x="22" y="172" fill="rgba(255,255,255,.5)" font-size="9">&#9962; Ministeres</text>'
  + '<text x="22" y="190" fill="rgba(255,255,255,.5)" font-size="9">&#128591; Intercession</text>'
  // Top bar
  + '<rect x="140" y="0" width="460" height="40" fill="#fff"/>'
  + '<text x="155" y="25" fill="#0f2744" font-size="12" font-weight="bold">Dashboard</text>'
  // Stat cards
  + '<rect x="148" y="48" width="90" height="60" fill="#fff" rx="8"/>'
  + '<text x="158" y="65" fill="#6b7280" font-size="7">MEMBRES</text>'
  + '<text x="158" y="85" fill="#0f2744" font-size="18" font-weight="bold">248</text>'
  + '<text x="158" y="98" fill="#9ba3b4" font-size="7">12 visiteurs</text>'
  + '<rect x="248" y="48" width="90" height="60" fill="#fff" rx="8"/>'
  + '<text x="258" y="65" fill="#6b7280" font-size="7">CE MOIS</text>'
  + '<text x="258" y="82" fill="#2e7d32" font-size="10" font-weight="bold">485K FCFA</text>'
  + '<text x="258" y="98" fill="#9ba3b4" font-size="7">Total: 2.4M</text>'
  + '<rect x="348" y="48" width="90" height="60" fill="#fff" rx="8"/>'
  + '<text x="358" y="65" fill="#6b7280" font-size="7">EVENEMENTS</text>'
  + '<text x="358" y="85" fill="#0f2744" font-size="18" font-weight="bold">12</text>'
  + '<text x="358" y="98" fill="#9ba3b4" font-size="7">3 a venir</text>'
  + '<rect x="448" y="48" width="90" height="60" fill="#fff" rx="8"/>'
  + '<text x="458" y="65" fill="#6b7280" font-size="7">SOLDE</text>'
  + '<text x="458" y="82" fill="#2e7d32" font-size="10" font-weight="bold">1.8M FCFA</text>'
  + '<text x="458" y="98" fill="#9ba3b4" font-size="7">Dep: 620K</text>'
  // Chart area
  + '<rect x="148" y="118" width="240" height="100" fill="#fff" rx="8"/>'
  + '<text x="158" y="133" fill="#0f2744" font-size="8" font-weight="bold">Revenus vs Depenses</text>'
  + '<rect x="160" y="155" width="20" height="45" fill="#2e7d32" rx="2"/>'
  + '<rect x="183" y="20" width="20" height="45" fill="#e53935" rx="2" transform="translate(0,135)"/>'
  + '<rect x="215" y="145" width="20" height="55" fill="#2e7d32" rx="2"/>'
  + '<rect x="238" y="155" width="20" height="45" fill="#e53935" rx="2"/>'
  + '<rect x="270" y="138" width="20" height="62" fill="#2e7d32" rx="2"/>'
  + '<rect x="293" y="150" width="20" height="50" fill="#e53935" rx="2"/>'
  // Events
  + '<rect x="398" y="118" width="140" height="100" fill="#fff" rx="8"/>'
  + '<text x="408" y="133" fill="#0f2744" font-size="8" font-weight="bold">Prochains evenements</text>'
  + '<rect x="408" y="140" width="30" height="30" fill="#0f2744" rx="5"/>'
  + '<text x="423" y="153" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">18</text>'
  + '<text x="423" y="164" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="6">JAN</text>'
  + '<text x="447" y="153" fill="#0f2744" font-size="8" font-weight="bold">Culte Dominical</text>'
  + '<text x="447" y="164" fill="#9ba3b4" font-size="7">Temple Principal</text>'
  + '<rect x="408" y="180" width="30" height="30" fill="#0f2744" rx="5"/>'
  + '<text x="423" y="193" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">25</text>'
  + '<text x="423" y="204" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="6">JAN</text>'
  + '<text x="447" y="193" fill="#0f2744" font-size="8" font-weight="bold">Seminaire</text>'
  + '<text x="447" y="204" fill="#9ba3b4" font-size="7">Salle Annexe</text>'
  + '</svg>';
}


export function svgMembre() {
  return '<svg viewBox="0 0 580 240" style="width:100%;max-width:580px">'
  + '<rect width="580" height="240" fill="#f2f4f7" rx="8"/>'
  // Form modal
  + '<rect x="40" y="20" width="500" height="200" fill="#fff" rx="12" filter="drop-shadow(0 4px 20px rgba(0,0,0,.15))"/>'
  + '<text x="60" y="50" fill="#0f2744" font-size="13" font-weight="bold">Nouveau Membre</text>'
  // Fields row 1
  + '<rect x="60" y="62" width="200" height="28" fill="#f2f4f7" rx="6" stroke="#e4e7ed" stroke-width="1"/>'
  + '<text x="70" y="73" fill="#9ba3b4" font-size="8">NOM</text>'
  + '<text x="70" y="85" fill="#0f2744" font-size="9" font-weight="500">Konan Amos</text>'
  + '<rect x="278" y="62" width="200" height="28" fill="#f2f4f7" rx="6" stroke="#e4e7ed" stroke-width="1"/>'
  + '<text x="288" y="73" fill="#9ba3b4" font-size="8">PRENOM</text>'
  + '<text x="288" y="85" fill="#0f2744" font-size="9" font-weight="500">Jean</text>'
  // Fields row 2
  + '<rect x="60" y="100" width="130" height="28" fill="#f2f4f7" rx="6" stroke="#e4e7ed" stroke-width="1"/>'
  + '<text x="70" y="111" fill="#9ba3b4" font-size="8">AGE</text>'
  + '<text x="70" y="123" fill="#0f2744" font-size="9">35</text>'
  + '<rect x="200" y="100" width="130" height="28" fill="#f2f4f7" rx="6" stroke="#e4e7ed" stroke-width="1"/>'
  + '<text x="210" y="111" fill="#9ba3b4" font-size="8">TELEPHONE</text>'
  + '<text x="210" y="123" fill="#0f2744" font-size="9">+237 6XX XXX XXX</text>'
  + '<rect x="340" y="100" width="138" height="28" fill="#f2f4f7" rx="6" stroke="#1565c0" stroke-width="1.5"/>'
  + '<text x="350" y="111" fill="#9ba3b4" font-size="8">STATUT</text>'
  + '<text x="350" y="123" fill="#1565c0" font-size="9" font-weight="700">membre ▾</text>'
  // Statut badge info
  + '<rect x="60" y="140" width="400" height="22" fill="rgba(21,101,192,.06)" rx="6" stroke="rgba(21,101,192,.2)" stroke-width="1"/>'
  + '<text x="70" y="154" fill="#1565c0" font-size="8">Statuts disponibles: visiteur | membre | leader | pasteur</text>'
  // Buttons
  + '<rect x="340" y="175" width="80" height="28" fill="#f2f4f7" rx="8"/>'
  + '<text x="380" y="193" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">Annuler</text>'
  + '<rect x="432" y="175" width="100" height="28" fill="#c9a84c" rx="8"/>'
  + '<text x="482" y="193" text-anchor="middle" fill="#0f2744" font-size="9" font-weight="700">Enregistrer</text>'
  + '</svg>';
}


export function svgFinance() {
  return '<svg viewBox="0 0 580 260" style="width:100%;max-width:580px">'
  + '<rect width="580" height="260" fill="#f2f4f7" rx="8"/>'
  // 3 summary cards
  + '<rect x="20" y="14" width="168" height="65" fill="#fff" rx="10" stroke="rgba(46,125,50,.3)" stroke-width="1.5"/>'
  + '<text x="33" y="33" fill="#6b7280" font-size="7" font-weight="700">REVENUS TOTAUX</text>'
  + '<text x="33" y="55" fill="#2e7d32" font-size="16" font-weight="800">2 450 000</text>'
  + '<text x="33" y="68" fill="#9ba3b4" font-size="7">FCFA</text>'
  + '<rect x="204" y="14" width="168" height="65" fill="#fff" rx="10" stroke="rgba(229,57,53,.3)" stroke-width="1.5"/>'
  + '<text x="217" y="33" fill="#6b7280" font-size="7" font-weight="700">DEPENSES TOTALES</text>'
  + '<text x="217" y="55" fill="#e53935" font-size="16" font-weight="800">620 000</text>'
  + '<text x="217" y="68" fill="#9ba3b4" font-size="7">FCFA</text>'
  + '<rect x="388" y="14" width="172" height="65" fill="#fff" rx="10" stroke="rgba(201,168,76,.5)" stroke-width="1.5"/>'
  + '<text x="401" y="33" fill="#6b7280" font-size="7" font-weight="700">SOLDE NET</text>'
  + '<text x="401" y="55" fill="#0f2744" font-size="16" font-weight="800">1 830 000</text>'
  + '<text x="401" y="68" fill="#9ba3b4" font-size="7">FCFA</text>'
  // Table
  + '<rect x="20" y="90" width="540" height="158" fill="#fff" rx="10"/>'
  + '<text x="33" y="108" fill="#0f2744" font-size="9" font-weight="bold">Historique des transactions</text>'
  // Header
  + '<rect x="20" y="115" width="540" height="22" fill="#f2f4f7"/>'
  + '<text x="33" y="129" fill="#6b7280" font-size="7" font-weight="700">DATE</text>'
  + '<text x="100" y="129" fill="#6b7280" font-size="7" font-weight="700">TYPE</text>'
  + '<text x="180" y="129" fill="#6b7280" font-size="7" font-weight="700">DESCRIPTION</text>'
  + '<text x="380" y="129" fill="#6b7280" font-size="7" font-weight="700">MONTANT</text>'
  + '<text x="480" y="129" fill="#6b7280" font-size="7" font-weight="700">SOURCE</text>'
  // Rows
  + '<text x="33" y="148" fill="#0f2744" font-size="8">15/01/2025</text>'
  + '<rect x="95" y="138" width="32" height="14" fill="rgba(201,168,76,.2)" rx="4"/>'
  + '<text x="111" y="148" text-anchor="middle" fill="#7a5c10" font-size="7" font-weight="700">dime</text>'
  + '<text x="180" y="148" fill="#6b7280" font-size="8">Dime mensuelle</text>'
  + '<text x="380" y="148" fill="#2e7d32" font-size="8" font-weight="700">+150 000 FCFA</text>'
  + '<text x="480" y="148" fill="#6b7280" font-size="8">Konan A.</text>'

  + '<text x="33" y="166" fill="#0f2744" font-size="8">15/01/2025</text>'
  + '<rect x="95" y="156" width="38" height="14" fill="rgba(21,101,192,.1)" rx="4"/>'
  + '<text x="114" y="166" text-anchor="middle" fill="#1565c0" font-size="7" font-weight="700">offrande</text>'
  + '<text x="180" y="166" fill="#6b7280" font-size="8">Offrande du culte</text>'
  + '<text x="380" y="166" fill="#2e7d32" font-size="8" font-weight="700">+85 000 FCFA</text>'
  + '<text x="480" y="166" fill="#6b7280" font-size="8">Traore M.</text>'

  + '<text x="33" y="184" fill="#0f2744" font-size="8">14/01/2025</text>'
  + '<rect x="95" y="174" width="36" height="14" fill="rgba(229,57,53,.1)" rx="4"/>'
  + '<text x="113" y="184" text-anchor="middle" fill="#e53935" font-size="7" font-weight="700">depense</text>'
  + '<text x="180" y="184" fill="#6b7280" font-size="8">Electricite et eau</text>'
  + '<text x="380" y="184" fill="#e53935" font-size="8" font-weight="700">-45 000 FCFA</text>'
  + '<text x="480" y="184" fill="#6b7280" font-size="8">Admin</text>'
  + '</svg>';
}


export function svgEvenement() {
  return '<svg viewBox="0 0 580 240" style="width:100%;max-width:580px">'
  + '<rect width="580" height="240" fill="#f2f4f7" rx="8"/>'
  // Event cards
  + '<rect x="20" y="14" width="530" height="65" fill="#fff" rx="10" filter="drop-shadow(0 2px 8px rgba(0,0,0,.08))"/>'
  + '<rect x="20" y="14" width="55" height="65" fill="#0f2744" rx="10 0 0 10"/>'
  + '<text x="47" y="43" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">18</text>'
  + '<text x="47" y="56" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="8">JAN</text>'
  + '<text x="85" y="35" fill="#0f2744" font-size="11" font-weight="700">Culte Dominical</text>'
  + '<text x="85" y="50" fill="#9ba3b4" font-size="8">Temple Principal · Pasteur Konan Amos · 09:00</text>'
  + '<rect x="85" y="57" width="28" height="13" fill="rgba(21,101,192,.1)" rx="4"/>'
  + '<text x="99" y="67" text-anchor="middle" fill="#1565c0" font-size="7" font-weight="700">culte</text>'
  + '<text x="400" y="50" fill="#9ba3b4" font-size="8">La grace de Dieu</text>'

  + '<rect x="20" y="89" width="530" height="65" fill="#fff" rx="10"/>'
  + '<rect x="20" y="89" width="55" height="65" fill="#0f2744" rx="10 0 0 10"/>'
  + '<text x="47" y="118" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">25</text>'
  + '<text x="47" y="131" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="8">JAN</text>'
  + '<text x="85" y="110" fill="#0f2744" font-size="11" font-weight="700">Croisade Evangelisation</text>'
  + '<text x="85" y="125" fill="#9ba3b4" font-size="8">Stade Municipal · 18:00</text>'
  + '<rect x="85" y="132" width="36" height="13" fill="rgba(201,168,76,.2)" rx="4"/>'
  + '<text x="103" y="142" text-anchor="middle" fill="#7a5c10" font-size="7" font-weight="700">croisade</text>'

  + '<rect x="20" y="164" width="530" height="65" fill="#fff" rx="10"/>'
  + '<rect x="20" y="164" width="55" height="65" fill="#0f2744" rx="10 0 0 10"/>'
  + '<text x="47" y="193" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">02</text>'
  + '<text x="47" y="206" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="8">FEV</text>'
  + '<text x="85" y="185" fill="#0f2744" font-size="11" font-weight="700">Seminaire Leadership</text>'
  + '<text x="85" y="200" fill="#9ba3b4" font-size="8">Salle Annexe · 08:30</text>'
  + '<rect x="85" y="207" width="38" height="13" fill="rgba(106,27,154,.1)" rx="4"/>'
  + '<text x="104" y="217" text-anchor="middle" fill="#6a1b9a" font-size="7" font-weight="700">seminaire</text>'
  + '</svg>';
}


export function svgPresence() {
  return '<svg viewBox="0 0 580 260" style="width:100%;max-width:580px">'
  + '<rect width="580" height="260" fill="#f2f4f7" rx="8"/>'
  // Stat cards
  + '<rect x="20" y="14" width="163" height="60" fill="#fff" rx="10" stroke="rgba(21,101,192,.2)" stroke-width="1.5"/>'
  + '<text x="33" y="33" fill="#6b7280" font-size="7" font-weight="700">FICHES PRESENCES</text>'
  + '<text x="33" y="55" fill="#0f2744" font-size="20" font-weight="800">24</text>'
  + '<rect x="195" y="14" width="163" height="60" fill="#fff" rx="10" stroke="rgba(201,168,76,.3)" stroke-width="1.5"/>'
  + '<text x="208" y="33" fill="#6b7280" font-size="7" font-weight="700">MOYENNE PRESENTS</text>'
  + '<text x="208" y="55" fill="#0f2744" font-size="20" font-weight="800">143</text>'
  + '<rect x="370" y="14" width="190" height="60" fill="#fff" rx="10" stroke="rgba(46,125,50,.2)" stroke-width="1.5"/>'
  + '<text x="383" y="33" fill="#6b7280" font-size="7" font-weight="700">RECORD</text>'
  + '<text x="383" y="55" fill="#0f2744" font-size="20" font-weight="800">218</text>'
  // Trend chart
  + '<rect x="20" y="85" width="540" height="110" fill="#fff" rx="10"/>'
  + '<text x="33" y="103" fill="#0f2744" font-size="9" font-weight="bold">Tendance des presences (6 derniers cultes)</text>'
  // SVG line chart simulation
  + '<polyline points="60,168 150,155 240,145 330,160 420,135 510,140" fill="none" stroke="#0f2744" stroke-width="2.5" stroke-linejoin="round"/>'
  + '<circle cx="60" cy="168" r="5" fill="#c9a84c"/><text x="60" y="180" text-anchor="middle" fill="#0f2744" font-size="8">132</text>'
  + '<circle cx="150" cy="155" r="5" fill="#c9a84c"/><text x="150" y="180" text-anchor="middle" fill="#0f2744" font-size="8">145</text>'
  + '<circle cx="240" cy="145" r="5" fill="#c9a84c"/><text x="240" y="180" text-anchor="middle" fill="#0f2744" font-size="8">158</text>'
  + '<circle cx="330" cy="160" r="5" fill="#c9a84c"/><text x="330" y="180" text-anchor="middle" fill="#0f2744" font-size="8">138</text>'
  + '<circle cx="420" cy="135" r="5" fill="#c9a84c"/><text x="420" y="180" text-anchor="middle" fill="#0f2744" font-size="8">178</text>'
  + '<circle cx="510" cy="140" r="5" fill="#c9a84c"/><text x="510" y="180" text-anchor="middle" fill="#0f2744" font-size="8">172</text>'
  + '<text x="60" y="195" text-anchor="middle" fill="#9ba3b4" font-size="7">15 Nov</text>'
  + '<text x="150" y="195" text-anchor="middle" fill="#9ba3b4" font-size="7">22 Nov</text>'
  + '<text x="240" y="195" text-anchor="middle" fill="#9ba3b4" font-size="7">29 Nov</text>'
  + '<text x="330" y="195" text-anchor="middle" fill="#9ba3b4" font-size="7">6 Dec</text>'
  + '<text x="420" y="195" text-anchor="middle" fill="#9ba3b4" font-size="7">13 Dec</text>'
  + '<text x="510" y="195" text-anchor="middle" fill="#9ba3b4" font-size="7">20 Dec</text>'
  + '</svg>';
}


export function svgPriere() {
  return '<svg viewBox="0 0 580 250" style="width:100%;max-width:580px">'
  + '<rect width="580" height="250" fill="#f2f4f7" rx="8"/>'
  // Stat cards
  + '<rect x="20" y="14" width="163" height="55" fill="#fff" rx="10" stroke="rgba(106,27,154,.2)" stroke-width="1.5"/>'
  + '<text x="33" y="31" fill="#6b7280" font-size="7">TOTAL DEMANDES</text>'
  + '<text x="33" y="52" fill="#0f2744" font-size="20" font-weight="800">18</text>'
  + '<rect x="195" y="14" width="163" height="55" fill="#fff" rx="10" stroke="rgba(201,168,76,.3)" stroke-width="1.5"/>'
  + '<text x="208" y="31" fill="#6b7280" font-size="7">EN COURS</text>'
  + '<text x="208" y="52" fill="#0f2744" font-size="20" font-weight="800">14</text>'
  + '<rect x="370" y="14" width="190" height="55" fill="#fff" rx="10" stroke="rgba(46,125,50,.2)" stroke-width="1.5"/>'
  + '<text x="383" y="31" fill="#6b7280" font-size="7">EXAUCEES</text>'
  + '<text x="383" y="52" fill="#0f2744" font-size="20" font-weight="800">4</text>'
  // Prayer card - haute urgence
  + '<rect x="20" y="80" width="540" height="75" fill="#fff" rx="10" style="" stroke="rgba(229,57,53,.15)" stroke-width="1"/>'
  + '<rect x="20" y="80" width="4" height="75" fill="#e53935" rx="4 0 0 4"/>'
  + '<text x="35" y="100" fill="#0f2744" font-size="9" font-weight="700">Marie Traore</text>'
  + '<text x="35" y="114" fill="#6b7280" font-size="8">Guerison de ma mere malade depuis 3 mois</text>'
  + '<text x="35" y="128" fill="#9ba3b4" font-size="7">14/01/2025 · Sante</text>'
  + '<rect x="430" y="86" width="30" height="13" fill="rgba(229,57,53,.1)" rx="4"/>'
  + '<text x="445" y="96" text-anchor="middle" fill="#e53935" font-size="7" font-weight="700">haute</text>'
  + '<rect x="470" y="84" width="80" height="22" fill="#43a047" rx="6"/>'
  + '<text x="510" y="98" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">Exaucee</text>'
  // Prayer card - exaucee
  + '<rect x="20" y="165" width="540" height="72" fill="#fff" rx="10" stroke="rgba(46,125,50,.15)" stroke-width="1"/>'
  + '<rect x="20" y="165" width="4" height="72" fill="#43a047" rx="4 0 0 4"/>'
  + '<text x="35" y="185" fill="#0f2744" font-size="9" font-weight="700">Oumar Bamba</text>'
  + '<text x="35" y="199" fill="#6b7280" font-size="8">Nouveau travail et provision financiere</text>'
  + '<text x="35" y="213" fill="#9ba3b4" font-size="7">10/01/2025 · Finances</text>'
  + '<rect x="430" y="171" width="30" height="13" fill="rgba(201,168,76,.2)" rx="4"/>'
  + '<text x="445" y="181" text-anchor="middle" fill="#7a5c10" font-size="7" font-weight="700">moy.</text>'
  + '<rect x="380" y="168" width="40" height="15" fill="rgba(46,125,50,.15)" rx="5"/>'
  + '<text x="400" y="179" text-anchor="middle" fill="#2e7d32" font-size="7" font-weight="700">Exaucee</text>'
  + '<rect x="35" y="218" width="510" height="13" fill="rgba(46,125,50,.08)" rx="5"/>'
  + '<text x="45" y="228" fill="#2e7d32" font-size="7">Embauche comme comptable apres 2 semaines - Gloire a Dieu!</text>'
  + '</svg>';
}


export function svgSync() {
  return '<svg viewBox="0 0 580 220" style="width:100%;max-width:580px">'
  + '<rect width="580" height="220" fill="#f2f4f7" rx="8"/>'
  // App
  + '<rect x="30" y="60" width="130" height="100" fill="#fff" rx="10" filter="drop-shadow(0 2px 8px rgba(0,0,0,.1))"/>'
  + '<rect x="30" y="60" width="130" height="25" fill="#0f2744" rx="10 10 0 0"/>'
  + '<text x="95" y="76" text-anchor="middle" fill="#f0c96b" font-size="8" font-weight="bold">MbeukChurch</text>'
  + '<text x="95" y="100" text-anchor="middle" fill="#0f2744" font-size="8" font-weight="bold">Donnees locales</text>'
  + '<text x="95" y="115" text-anchor="middle" fill="#6b7280" font-size="7">membres: 248</text>'
  + '<text x="95" y="128" text-anchor="middle" fill="#6b7280" font-size="7">finances: 120</text>'
  + '<text x="95" y="141" text-anchor="middle" fill="#6b7280" font-size="7">sermons: 45</text>'
  // Arrows
  + '<text x="220" y="105" text-anchor="middle" fill="#c9a84c" font-size="22" font-weight="800">⇄</text>'
  + '<rect x="190" y="80" width="80" height="22" fill="rgba(201,168,76,.2)" rx="8"/>'
  + '<text x="230" y="91" text-anchor="middle" fill="#7a5c10" font-size="7" font-weight="700">SYNC AUTO</text>'
  + '<text x="230" y="101" text-anchor="middle" fill="#7a5c10" font-size="7">toutes 5 min</text>'
  // Google Sheets box
  + '<rect x="280" y="45" width="130" height="55" fill="#fff" rx="10" filter="drop-shadow(0 2px 8px rgba(0,0,0,.1))"/>'
  + '<text x="345" y="68" text-anchor="middle" fill="#0f2744" font-size="8" font-weight="bold">Google Sheets</text>'
  + '<text x="345" y="82" text-anchor="middle" fill="#6b7280" font-size="7">Backup en ligne</text>'
  + '<circle cx="345" cy="90" r="5" fill="#43a047"/>'
  + '<text x="354" y="94" fill="#43a047" font-size="7">Connecte</text>'
  // Offline badge
  + '<rect x="280" y="115" width="130" height="50" fill="#fff" rx="10"/>'
  + '<rect x="292" y="125" width="105" height="28" fill="rgba(229,57,53,.06)" rx="6" stroke="rgba(229,57,53,.2)" stroke-width="1"/>'
  + '<text x="345" y="138" text-anchor="middle" fill="#e53935" font-size="8" font-weight="700">Mode HORS LIGNE</text>'
  + '<text x="345" y="150" text-anchor="middle" fill="#9ba3b4" font-size="7">sync au retour</text>'
  // Status dot
  + '<circle cx="480" cy="90" r="20" fill="rgba(67,160,71,.1)" stroke="#43a047" stroke-width="2"/>'
  + '<circle cx="480" cy="90" r="7" fill="#43a047"/>'
  + '<text x="480" y="120" text-anchor="middle" fill="#43a047" font-size="7" font-weight="700">En ligne</text>'
  + '<text x="480" y="131" text-anchor="middle" fill="#9ba3b4" font-size="6">Derniere sync: 5min</text>'
  + '</svg>';
}

// ═══════════════════════════════════════════════════
// GUIDE CHAPTERS DATA
// ═══════════════════════════════════════════════════

export function getGuideChapters() {
  return [
  // ────────── CHAPITRE 0: Introduction ──────────
  {
    icon: '&#127968;',
    title: 'Bienvenue dans MbeukChurch',
    description: 'Découvrez votre système de gestion d\'église — présentation générale et navigation',
    sections: [
      {
        label: 'Présentation générale',
        content: gScreen(svgDashboard(), 'Le tableau de bord principal de MbeukChurch')
          + '<p style="margin:16px 0 8px;font-size:.9rem;color:var(--nv);font-weight:600">MbeukChurch est votre système complet de gestion d\'église. Il fonctionne même sans internet et synchronise vos données automatiquement.</p>'
          + gTable(['Module','Rôle dans l\'application','Accès rapide'],
            [['Dashboard','Vue d\'ensemble : membres, finances, événements','Menu ▸ Principal'],['Membres','Fiches complètes de chaque fidèle','Menu ▸ Principal'],['Finances','Dîmes, offrandes, dépenses, budget','Menu ▸ Finances'],['Événements','Cultes, croisades, séminaires','Menu ▸ Église'],['Présences','Registre d\'assiduité aux cultes','Menu ▸ Église'],['Intercession','Demandes et réponses de prière','Menu ▸ Pastoral'],['Sermons','Bibliothèque des enseignements','Menu ▸ Pastoral'],['Rapports','Statistiques et graphiques','Menu ▸ Système']])
          + gTip('Commencez toujours par remplir les Membres et les Ministères avant d\'utiliser les autres modules — cela vous permettra de lier les données entre elles.')
      },
      {
        label: 'Navigation & interface',
        content: '<p style="margin-bottom:14px;font-size:.85rem;color:var(--g4)">L\'interface est divisée en 3 zones principales :</p>'
          + gStep(1,'La barre latérale (sidebar)','La colonne de gauche avec le menu de navigation. Cliquez sur n\'importe quel module pour y accéder. Sur mobile, appuyez sur ☰ pour l\'ouvrir.','&#9776;')
          + gStep(2,'La barre supérieure (topbar)','Affiche le nom du module actif. Les boutons d\'action (ex: "+ Ajouter membre") apparaissent à droite selon le module.','&#9776;')
          + gStep(3,'La zone de contenu','La partie principale où s\'affichent les tableaux, fiches et formulaires.','&#128230;')
          + gWarn('Ne jamais recharger la page brutalement (F5) sans avoir sauvegardé — les formulaires ouverts seront perdus.')
          + gTip('Le point coloré en bas à gauche indique l\'état de connexion : vert = en ligne, gris = hors ligne, orange = synchronisation en cours.')
      },
      {
        label: 'Connexion & licence',
        content: gStep(1,'Créer votre compte','Cliquez "Créer un compte", remplissez : nom, téléphone, email, mot de passe (minimum 6 caractères).','&#128100;')
          + gStep(2,'Activer votre licence','Après la création du compte, entrez votre clé MBK-XXXX-XXXX-XXXX et cliquez "Activer". La clé vous a été fournie lors de l\'achat.','&#127981;')
          + gStep(3,'Essai gratuit','Si vous n\'avez pas encore de licence, cliquez "ESSAYER GRATUITEMENT" pour 3 jours d\'accès complet.','&#127381;')
          + gWarn('L\'essai gratuit est lié à votre email. Créer un nouveau compte avec un autre email pour contourner la limite est une violation des conditions d\'utilisation.')
          + gInfo('Votre session reste active 1 heure. Après expiration, vous devrez vous reconnecter. Vos données sont conservées en local.')
      }
    ]
  },

  // ────────── CHAPITRE 0bis: Démarrage rapide ──────────
  {
    icon: '&#128640;',
    title: 'Démarrage rapide (5 minutes)',
    description: 'Prenez en main l\'essentiel de MbeukChurch en 5 minutes chrono',
    sections: [
      {
        label: 'Les 5 premières étapes',
        content: '<p style="margin-bottom:16px;font-size:.9rem;color:var(--nv);font-weight:600">Suivez cet ordre pour démarrer efficacement — chaque étape prépare la suivante.</p>'
          + gStep(1,'Créer vos ministères','Menu ▸ Ministères — créez d\'abord les groupes existants (Chorale, Jeunesse, Intercession...). Ils seront utilisés pour classer vos membres.','&#9962;')
          + gStep(2,'Ajouter vos premiers membres','Menu ▸ Membres ▸ "+ Ajouter" — commencez par l\'équipe pastorale et les leaders, puis complétez au fur et à mesure.','&#128101;')
          + gStep(3,'Enregistrer une transaction financière','Menu ▸ Finances ▸ "+ Ajouter" — testez avec une dîme ou une offrande récente pour voir le calcul automatique du solde.','&#128176;')
          + gStep(4,'Planifier votre prochain événement','Menu ▸ Événements — ajoutez votre prochain culte ou activité pour le voir apparaître sur le Dashboard.','&#128197;')
          + gStep(5,'Personnaliser l\'apparence','Paramétrage ▸ Apparence & Couleurs — choisissez le mode clair/sombre et vos couleurs.','&#127912;')
          + gTip('Une fois ces 5 étapes terminées, explorez les chapitres de ce guide dans l\'ordre pour découvrir Communication, Assistant IA et les rapports.')
          + gWarn('Ne passez pas directement aux fonctions avancées (Sous-comptes, APIs, Synchronisation) avant d\'avoir des données de base — le guide s\'appuie sur des exemples concrets.')
      }
    ]
  },

  // ────────── CHAPITRE 1: Membres ──────────
  {
    icon: '&#128101;',
    title: 'Gestion des Membres',
    description: 'Ajouter, modifier, rechercher et gérer les fiches complètes de chaque fidèle',
    sections: [
      {
        label: 'Ajouter un membre',
        content: gScreen(svgMembre(), 'Formulaire d\'ajout d\'un nouveau membre')
          + gStep(1,'Accéder au module','Cliquez sur "Membres" dans le menu de gauche.','&#128101;')
          + gStep(2,'Ouvrir le formulaire','Cliquez sur le bouton jaune "+ Ajouter membre" en haut à droite.','&#10133;')
          + gStep(3,'Remplir les champs obligatoires','Le champ "Nom" est obligatoire. Remplissez au maximum : prénom, âge, sexe, téléphone, adresse.','&#128221;')
          + gStep(4,'Choisir le statut','4 statuts disponibles : <b>visiteur</b> (pas encore membre), <b>membre</b> (baptisé et engagé), <b>leader</b> (responsable de groupe), <b>pasteur</b>.','&#127981;')
          + gStep(5,'Assigner un ministère','Sélectionnez le ministère d\'appartenance (Chorale, Jeunesse, etc.). Les ministères doivent être créés au préalable.','&#9962;')
          + gStep(6,'Enregistrer','Cliquez "Enregistrer". Le membre apparaît immédiatement dans la liste.','&#128190;')
          + gWarn('Ne pas créer de doublons : vérifiez toujours si le membre existe déjà en utilisant la recherche avant d\'ajouter.')
          + gTip('Remplissez le champ "Historique spirituel" pour noter le baptême, l\'engagement, ou des informations pastorales importantes.')
      },
      {
        label: 'Rechercher & filtrer',
        content: gStep(1,'Utiliser la barre de recherche','Tapez le nom, prénom ou numéro de téléphone dans le champ de recherche. La liste se filtre en temps réel.','&#128269;')
          + gStep(2,'Filtrer par statut','Utilisez le menu déroulant pour n\'afficher que les visiteurs, membres, leaders ou pasteurs.','&#128203;')
          + gTable(['Filtre','Ce qu\'il affiche'],
            [['tous','Tous les membres sans distinction'],['visiteur','Personnes qui viennent mais ne sont pas encore membres'],['membre','Membres actifs de l\'église'],['leader','Responsables de cellules/groupes'],['pasteur','L\'équipe pastorale']])
          + gTip('Utilisez "Recherche Globale" (menu ▸ Recherche) pour chercher simultanément dans les membres, visiteurs, sermons et finances.')
      },
      {
        label: 'Modifier & supprimer',
        content: gStep(1,'Voir la fiche complète','Cliquez l\'icône &#128065; (œil) sur la ligne du membre pour voir tous ses détails.','&#128065;')
          + gStep(2,'Modifier un membre','Cliquez l\'icône ✏️ pour ouvrir le formulaire pré-rempli. Modifiez les champs et cliquez "Enregistrer".','&#9999;')
          + gStep(3,'Imprimer la fiche','Dans la vue détaillée, cliquez "🖨️ Imprimer" pour générer une fiche imprimable.','&#128424;')
          + gStep(4,'Supprimer un membre','Cliquez l\'icône 🗑️. Une confirmation est demandée. Cette action est irréversible.','&#128465;')
          + gWarn('La suppression d\'un membre est définitive et ne peut pas être annulée. En cas de doute, changez simplement son statut plutôt que de le supprimer.')
          + gInfo('Si un membre quitte l\'église, il vaut mieux conserver sa fiche avec le statut "visiteur" plutôt que de la supprimer — cela préserve l\'historique.')
      }
    ]
  },

  // ────────── CHAPITRE 2: Visiteurs ──────────
  {
    icon: '&#128587;',
    title: 'Visiteurs & Conversions',
    description: 'Enregistrer les nouveaux visiteurs et les convertir en membres',
    sections: [
      {
        label: 'Enregistrer un visiteur',
        content: gStep(1,'Accéder au module','Menu ▸ Visiteurs','&#128587;')
          + gStep(2,'Ajouter','Bouton "+ Nouveau visiteur"','&#10133;')
          + gStep(3,'Remplir le formulaire','Nom (obligatoire), téléphone, date de visite, source de découverte (bouche à oreille, famille, réseaux sociaux).','&#128221;')
          + gStep(4,'Notes de suivi','Notez les besoins, les sujets de prière ou les informations de relance dans le champ "Notes".','&#128221;')
          + gTip('Enregistrez le visiteur le jour même de sa visite — ne pas attendre la semaine suivante, les informations seront moins précises.')
          + gWarn('Ne pas confondre "visiteur" (personne qui vient pour la première fois) et "membre" (personne engagée). Le module Visiteurs est pour le suivi avant l\'engagement.')
      },
      {
        label: 'Convertir en membre',
        content: gStep(1,'Trouver le visiteur','Dans la liste des visiteurs, repérez le visiteur à convertir.','&#128269;')
          + gStep(2,'Cliquer ✅','Cliquez l\'icône ✅ sur la ligne du visiteur. Une confirmation apparaît.','&#9989;')
          + gStep(3,'Confirmation','Confirmez "Convertir [nom] en membre ?" — l\'application crée automatiquement une fiche membre avec le statut "membre".','&#9989;')
          + gStep(4,'Compléter la fiche','Allez dans le module Membres pour compléter la fiche du nouveau membre (ministère, date d\'entrée, baptême...).','&#128101;')
          + gInfo('La conversion est automatique : le visiteur garde son statut "Converti" dans la liste des visiteurs ET une nouvelle fiche membre est créée. Il n\'y a pas de doublon de données.')
          + gWarn('Ne pas créer manuellement un membre si la personne est déjà dans la liste des visiteurs — utilisez toujours le bouton ✅ de conversion.')
      }
    ]
  },

  // ────────── CHAPITRE 3: Finances ──────────
  {
    icon: '&#128176;',
    title: 'Finances & Budget',
    description: 'Gérer les dîmes, offrandes, dépenses et suivre la santé financière de l\'église',
    sections: [
      {
        label: 'Enregistrer une transaction',
        content: gScreen(svgFinance(), 'Vue du module finances avec les 3 indicateurs clés')
          + gStep(1,'Accéder','Menu ▸ Finances puis bouton "+ Transaction"','&#128176;')
          + gStep(2,'Choisir le type','5 types disponibles :','&#127995;')
          + gTable(['Type','Usage','Signe sur le solde'],
            [['dime','Dîme mensuelle d\'un fidèle','+'],['offrande','Collecte lors d\'un culte','+'],['don','Don spécial (construction, mission...)','+'],['budget','Entrée budgétaire prévue','+'],['depense','Sortie d\'argent (loyer, électricité...)','-']])
          + gStep(3,'Saisir le montant','Entrez le montant en FCFA (chiffres uniquement, sans espace ni point).','&#128176;')
          + gStep(4,'Indiquer la date','Par défaut la date du jour. Modifiez si vous enregistrez une transaction passée.','&#128197;')
          + gStep(5,'Source / Donateur','Tapez le nom du donateur. L\'application suggère les membres existants.','&#128100;')
          + gWarn('Ne jamais oublier de saisir les dépenses — un solde positif affiché sans les dépenses donnera une image fausse de la situation financière.')
          + gTip('Enregistrez les transactions immédiatement après chaque culte pour ne rien oublier. Désignez une personne responsable de cette saisie.')
      },
      {
        label: 'Dons & Dîmes par membre',
        content: gStep(1,'Accéder','Menu ▸ Dons & Dîmes','&#127873;')
          + '<p style="margin:14px 0;font-size:.84rem;color:var(--g4)">Ce module affiche automatiquement le classement des donateurs et la répartition par type de transaction.</p>'
          + gTable(['Indicateur','Signification'],
            [['Total contribué','Somme de toutes les transactions positives liées au donateur'],['Nombre de dons','Nombre de fois que ce donateur a contribué'],['Barre d\'engagement','Comparaison visuelle avec le plus grand donateur']])
          + gTip('Utilisez ce classement avec prudence et discrétion — ne pas afficher publiquement sans l\'accord des membres.')
          + gWarn('Le classement est basé sur le champ "Donateur" des transactions. Si vous écrivez le même nom différemment ("Konan" vs "Konan A."), les totaux seront séparés.')
      },
      {
        label: 'Budget annuel & mensuel',
        content: gStep(1,'Accéder','Menu ▸ Budget','&#128203;')
          + gStep(2,'Créer une ligne','Bouton "+ Ligne budgétaire". Donnez une catégorie (ex: "Évangélisation"), le montant prévu, et la période (annuel ou mensuel).','&#10133;')
          + gStep(3,'Suivre la progression','Le graphique de progression compare le budget prévu aux dépenses réelles de même catégorie.','&#128200;')
          + gInfo('La correspondance entre les lignes budgétaires et les dépenses se fait par le champ "Description" des transactions. Soyez cohérent dans les noms.')
          + gWarn('Un budget non mis à jour ne sert à rien. Révisez votre budget trimestriellement et ajoutez les nouvelles lignes selon les projets de l\'église.')
          + gStep(4,'Exporter','Bouton "Imprimer" dans le module Finances pour générer un rapport PDF imprimable.','&#128424;')
      }
    ]
  },

  // ────────── CHAPITRE 4: Événements ──────────
  {
    icon: '&#128197;',
    title: 'Événements & Cultes',
    description: 'Planifier et gérer tous les événements de l\'église',
    sections: [
      {
        label: 'Créer un événement',
        content: gScreen(svgEvenement(), 'Liste des événements avec date, lieu et type')
          + gStep(1,'Accéder','Menu ▸ Événements','&#128197;')
          + gStep(2,'Créer','Bouton "+ Nouvel événement"','&#10133;')
          + gStep(3,'Remplir les informations',
            gTable(['Champ','Description','Obligatoire ?'],
              [['Nom','Titre de l\'événement','Oui'],['Type','culte / croisade / séminaire / veillée / jeûne / autre','Non'],['Date','Date de l\'événement','Oui'],['Heure','Heure de début','Non'],['Lieu','Lieu de l\'événement','Non'],['Prédicateur','Nom du prédicateur ou officiant','Non'],['Thème','Thème de prédication','Non']]),'&#128221;')
          + gWarn('Ne pas créer plusieurs fois le même événement récurrent (ex: culte dominical toutes les semaines). Créez-les individuellement quand vous voulez enregistrer la présence.')
          + gTip('Après avoir créé un événement, allez dans "Présences" pour enregistrer l\'assiduité à cet événement.')
      },
      {
        label: 'Onglets À venir / Passés',
        content: gStep(1,'Onglet "À venir"','Affiche tous les événements dont la date est future. Utilisez cet onglet pour planifier.','&#128197;')
          + gStep(2,'Onglet "Passés"','Affiche les événements dont la date est dépassée. Vous pouvez toujours les modifier ou les supprimer.','&#128465;')
          + gInfo('Les événements sont automatiquement classés par date. Un événement créé aujourd\'hui pour demain apparaît dans "À venir", et basculera dans "Passés" le lendemain.')
          + gTip('Planifiez les événements à l\'avance (croisades, séminaires) pour avoir une vision claire du calendrier de l\'église. Les membres peuvent consulter l\'Agenda.')
      }
    ]
  },

  // ────────── CHAPITRE 5: Présences ──────────
  {
    icon: '&#128221;',
    title: 'Registre des Présences',
    description: 'Enregistrer et analyser l\'assiduité aux cultes',
    sections: [
      {
        label: 'Enregistrer les présences',
        content: gScreen(svgPresence(), 'Graphique de tendance des présences sur 6 cultes')
          + gStep(1,'Accéder','Menu ▸ Présences','&#128221;')
          + gStep(2,'Ouvrir le formulaire','Bouton "+ Enregistrer présences"','&#10133;')
          + gStep(3,'Sélectionner l\'événement','Choisissez le culte ou l\'événement dans la liste déroulante.','&#128197;')
          + gStep(4,'Saisir les chiffres','Nombre total de présents (adultes + enfants), dont combien de visiteurs.','&#128101;')
          + gStep(5,'Saisir l\'offrande','Si une collecte a été faite, entrez le montant. Il sera automatiquement ajouté aux finances.','&#128176;')
          + gWarn('Si vous enregistrez l\'offrande ici ET dans le module Finances, vous aurez un doublon. Choisissez l\'un ou l\'autre.')
          + gTip('Désignez un secrétaire qui remplit ce registre immédiatement après chaque culte, pendant que les chiffres sont encore frais.')
      },
      {
        label: 'Analyser les tendances',
        content: gStep(1,'Graphique de tendance','Le graphique montre l\'évolution sur les 6 derniers cultes enregistrés. Une courbe montante = croissance.','&#128200;')
          + gStep(2,'Indicateurs clés','3 chiffres en haut : nombre total de fiches, moyenne de présents, record de présence.','&#128202;')
          + gStep(3,'Registre détaillé','Le tableau en bas liste chaque fiche avec date, événement, nombre de présents, visiteurs et offrande.','&#128203;')
          + gInfo('Pour un suivi précis, enregistrez les présences à chaque culte sans exception — même quand le nombre est faible. C\'est la régularité qui donne la tendance.')
      }
    ]
  },

  // ────────── CHAPITRE 6: Ministères ──────────
  {
    icon: '&#9962;',
    title: 'Ministères',
    description: 'Créer et gérer les différents ministères de l\'église',
    sections: [
      {
        label: 'Créer un ministère',
        content: gStep(1,'Accéder','Menu ▸ Ministères','&#9962;')
          + gStep(2,'Créer','Bouton "+ Nouveau ministère"','&#10133;')
          + gStep(3,'Remplir','Nom du ministère (ex: "Chorale"), responsable, description, activités principales.','&#128221;')
          + gTip('Créez vos ministères EN PREMIER, avant d\'ajouter les membres. Ainsi, lors de l\'ajout d\'un membre, le menu déroulant "Ministère" sera déjà alimenté.')
          + gTable(['Exemple de ministère','Responsable suggéré','Activités types'],
            [['Chorale','Chef de chœur','Répétitions samedi, animation culte'],['Jeunesse','Responsable jeunes','Réunion vendredi, camps'],['Intercession','Pasteur / Leader','Prière matinale, veillée'],['Évangélisation','Évangéliste','Sorties terrain, distribution'],['Accueil','Diacre','Placement, accueil visiteurs']])
      },
      {
        label: 'Assigner des membres',
        content: gStep(1,'Lors de l\'ajout d\'un membre','Dans le formulaire membre, sélectionnez le ministère dans le menu déroulant "Ministère".','&#128101;')
          + gStep(2,'Modifier un membre existant','Ouvrez la fiche du membre (icône ✏️) et changez le champ "Ministère".','&#9999;')
          + gStep(3,'Voir le nombre de membres','Dans la liste des ministères, chaque carte affiche le nombre de membres assignés.','&#128202;')
          + gWarn('Un membre ne peut être dans qu\'un seul ministère principal. S\'il participe à plusieurs, notez-le dans son historique spirituel.')
          + gInfo('La carte du ministère affiche automatiquement le compte des membres assignés — ce chiffre est calculé en temps réel.')
      }
    ]
  },

  // ────────── CHAPITRE 7: Intercession ──────────
  {
    icon: '&#128591;',
    title: 'Intercession & Prières',
    description: 'Gérer les demandes de prière et célébrer les réponses de Dieu',
    sections: [
      {
        label: 'Soumettre une demande',
        content: gScreen(svgPriere(), 'Liste des demandes de prière avec niveaux d\'urgence')
          + gStep(1,'Accéder','Menu ▸ Intercession','&#128591;')
          + gStep(2,'Nouvelle demande','Bouton "+ Nouvelle demande"','&#10133;')
          + gStep(3,'Remplir','Nom du demandeur, date, catégorie (Santé, Famille, Finances...), niveau d\'urgence, sujet détaillé.','&#128221;')
          + gTable(['Urgence','Couleur','Signification'],
            [['haute','Rouge','Nécessite une intercession immédiate'],['moyenne','Orange','Important mais pas urgent'],['normale','Gris','Demande générale de prière']])
          + gTip('Gardez une confidentialité absolue sur les demandes de prière. Ne partagez qu\'avec l\'équipe d\'intercession.')
      },
      {
        label: 'Marquer une prière exaucée',
        content: gStep(1,'Trouver la demande','Dans l\'onglet "En cours", repérez la demande concernée.','&#128269;')
          + gStep(2,'Cliquer "Exaucée"','Cliquez le bouton vert "Exaucée" sur la carte de la demande.','&#9989;')
          + gStep(3,'Saisir le témoignage','Une boîte de dialogue vous demande de saisir comment Dieu a répondu. Ce témoignage sera affiché sur la carte.','&#128221;')
          + gStep(4,'Consulter les exaucées','Cliquez l\'onglet "Exaucées" pour voir toutes les prières auxquelles Dieu a répondu — source d\'édification pour l\'équipe.','&#9989;')
          + gInfo('Les témoignages peuvent être partagés en cellule ou lors des cultes pour encourager la foi de la communauté.')
      }
    ]
  },

  // ────────── CHAPITRE 8: Communication ──────────
  {
    icon: '&#128226;',
    title: 'Communication',
    description: 'Publier des annonces et envoyer des messages internes',
    sections: [
      {
        label: 'Publier une annonce',
        content: gStep(1,'Accéder','Menu ▸ Communication','&#128226;')
          + gStep(2,'Nouvelle annonce','Bouton "+ Annonce"','&#10133;')
          + gStep(3,'Remplir','Titre percutant, contenu clair, auteur.','&#128221;')
          + gStep(4,'Publier','Bouton "Publier". L\'annonce apparaît en haut du fil d\'annonces.','&#128226;')
          + gTip('Les annonces les plus récentes apparaissent en premier. Publiez les annonces importantes quelques jours avant l\'événement concerné.')
          + gWarn('Une annonce publiée ne peut pas être éditée — seulement supprimée. Relisez attentivement avant de cliquer "Publier".')
      },
      {
        label: 'Messages internes',
        content: gStep(1,'Créer un message','Onglet "Messages", bouton "+ Message"','&#128172;')
          + gStep(2,'Remplir','De (expéditeur), À (destinataire ou "Tous"), contenu du message.','&#128221;')
          + gStep(3,'Envoyer','Bouton "Envoyer". Le message apparaît dans le fil "Messages".','&#128228;')
          + gInfo('Les messages sont visibles par tous les utilisateurs ayant accès à l\'application. Pour les messages confidentiels, utilisez WhatsApp ou un autre canal privé.')
          + gTip('Utilisez le champ "À" pour préciser clairement le destinataire : "Pasteur Konan", "Équipe jeunesse", "Tous les leaders"...')
      },
      {
        label: 'Envoyer Email / SMS / WhatsApp',
        content: '<p style="margin-bottom:16px;font-size:.85rem;color:var(--g4)">L\'onglet <strong>Composer</strong> permet d\'envoyer un vrai message (Email via Brevo, SMS via Africa\'s Talking, ou WhatsApp via Twilio) à un ou plusieurs destinataires détectés automatiquement dans l\'application.</p>'
          + gStep(1,'Configurer au moins une API','Paramétrage ▸ APIs de Communication — connectez Brevo (Email), Africa\'s Talking (SMS) et/ou Twilio (WhatsApp) avant de pouvoir envoyer.','&#9881;')
          + gStep(2,'Choisir le canal','Menu déroulant "Canal" dans l\'onglet Composer — seuls les canaux configurés apparaissent.','&#128231;')
          + gStep(3,'Choisir les destinataires',
              gTable(['Mode','Utilisation'],
                [['Par filtre','Groupes intelligents : tous les membres, leaders, visiteurs non convertis, donateurs du mois, par ministère...'],['Individuel','Une seule personne (membre, visiteur ou utilisateur)'],['Sélection multiple','Cocher plusieurs personnes dans une liste'],['Envoi global','Tous les membres, tous les visiteurs, ou absolument tout le monde']]),
              '&#127919;')
          + gStep(4,'Choisir un modèle (optionnel)','7 modèles prêts à l\'emploi (bienvenue, rappel événement, remerciement don, suivi visiteur, convocation, intercession...) avec variables automatiques comme {nom}, {telephone}, {statut}.','&#128221;')
          + gStep(5,'Envoyer','Bouton "Envoyer" — le message est personnalisé pour chaque destinataire puis expédié.','&#128228;')
          + gInfo('Les envois Email/SMS/WhatsApp passent par votre propre Google Apps Script (voir Synchronisation) pour éviter les blocages de sécurité des navigateurs — vos clés API ne transitent jamais par un serveur tiers.')
          + gWarn('Si vous êtes hors connexion au moment de l\'envoi, les messages sont automatiquement placés dans la <strong>file d\'attente</strong> (onglet "File d\'attente") et renvoyés dès que la connexion revient.')
          + gTip('Consultez l\'onglet "Historique" pour vérifier le statut (envoyé / en attente / erreur) de chaque message déjà expédié.')
      }
    ]
  },

  // ────────── CHAPITRE 8bis: Assistant IA ──────────
  {
    icon: '&#129302;',
    title: 'Assistant IA & Étude biblique',
    description: 'Un assistant intelligent spécialisé en administration d\'église et en étude de la Bible',
    sections: [
      {
        label: 'Configurer l\'Assistant IA',
        content: gStep(1,'Accéder','Menu ▸ Assistant IA','&#129302;')
          + gStep(2,'Connecter une API','Paramétrage ▸ APIs Intelligence Artificielle — Gemini, Grok (xAI) et/ou OpenRouter. Une seule API suffit pour démarrer.','&#9881;')
          + gStep(3,'Fallback automatique','Si plusieurs APIs sont connectées, l\'assistant bascule automatiquement sur la suivante en cas d\'indisponibilité (Gemini → OpenRouter → Grok).','&#128260;')
          + gInfo('Vos clés API sont chiffrées localement (AES-GCM) et ne sont jamais envoyées à un serveur tiers propriétaire.')
      },
      {
        label: 'Actions rapides',
        content: '<p style="margin-bottom:14px;font-size:.85rem;color:var(--g4)">Des raccourcis génèrent automatiquement un contenu utile à partir de vos vraies données :</p>'
          + gTable(['Action rapide','Ce qu\'elle génère'],
            [['Message de bienvenue','Un message pastoral personnalisé pour le dernier membre inscrit'],['Résumer les demandes de prière','Synthèse des 10 dernières intercessions avec thèmes récurrents'],['Résumé financier du mois','Revenus, dépenses et solde du mois en cours, prêts à présenter au conseil'],['Plan de suivi des visiteurs','Un plan d\'action pour reconnecter les visiteurs non convertis'],['Plan de prédication','Introduction, 3 points, conclusion et appel à l\'action'],['Rédiger une annonce','Une annonce engageante pour le prochain événement à venir']])
          + gTip('Le résultat d\'une action rapide peut être copié directement dans le module Communication pour l\'envoyer aux membres.')
      },
      {
        label: 'Étude biblique (Ancien & Nouveau Testament)',
        content: '<p style="margin-bottom:14px;font-size:.85rem;color:var(--g4)">L\'assistant maîtrise l\'ensemble de la Bible et peut interpréter n\'importe quel passage :</p>'
          + gStep(1,'Expliquer un verset','Saisissez une référence (ex: "Jean 3:16") — l\'assistant donne le contexte, le sens littéral, la portée théologique et des références croisées AT + NT.','&#128220;')
          + gStep(2,'Références croisées','Trouve les passages liés dans l\'Ancien ET le Nouveau Testament pour un verset donné.','&#128279;')
          + gStep(3,'Étude thématique biblique','Saisissez un thème (ex: "la grâce") — génère une étude complète avec versets, questions de discussion et application pratique, prête pour un groupe de maison.','&#128218;')
          + gTip('Vous pouvez aussi poser directement une question biblique dans la zone de discussion libre, par exemple : "Que signifie Romains 8:28 ?"')
      }
    ]
  },

  // ────────── CHAPITRE 9: Sermons ──────────
  {
    icon: '&#128214;',
    title: 'Enseignements & Sermons',
    description: 'Constituer et consulter la bibliothèque des sermons',
    sections: [
      {
        label: 'Ajouter un sermon',
        content: gStep(1,'Accéder','Menu ▸ Enseignements','&#128214;')
          + gStep(2,'Nouveau sermon','Bouton "+ Nouveau sermon"','&#10133;')
          + gStep(3,'Remplir les informations',
            gTable(['Champ','Description'],
              [['Titre','Titre du sermon (obligatoire)'],['Prédicateur','Nom de l\'orateur'],['Date','Date de la prédication'],['Catégorie','Foi / Leadership / Famille / Vie chrétienne / Évangélisation'],['Type','Texte / Audio / Vidéo'],['Lien media','URL YouTube, SoundCloud, Drive...'],['Résumé','Résumé en quelques lignes']]),'&#128221;')
          + gTip('Pour les sermons audio/vidéo, hébergez d\'abord le fichier sur YouTube ou Google Drive, puis copiez le lien dans le champ "Lien media".')
          + gWarn('Ne pas ajouter de liens qui expirent (Wetransfer, liens temporaires). Préférez YouTube (public ou non-répertorié) ou Google Drive partagé.')
      },
      {
        label: 'Rechercher & filtrer',
        content: gStep(1,'Barre de recherche','Tapez un mot du titre, le nom du prédicateur ou un extrait du résumé.','&#128269;')
          + gStep(2,'Filtre par catégorie','Sélectionnez une catégorie dans le menu déroulant pour filtrer la bibliothèque.','&#128203;')
          + gStep(3,'Accéder au media','Cliquez "Voir media" sur la carte du sermon pour ouvrir le lien dans un nouvel onglet.','&#128279;')
          + gInfo('La bibliothèque de sermons est consultable hors ligne si les données ont été chargées. Mais les liens media (YouTube, Drive) nécessitent une connexion internet.')
      }
    ]
  },

  // ────────── CHAPITRE 10: Agenda ──────────
  {
    icon: '&#128467;',
    title: 'Agenda & Calendrier',
    description: 'Visualiser tous les événements sur un calendrier mensuel',
    sections: [
      {
        label: 'Naviguer dans l\'agenda',
        content: gStep(1,'Accéder','Menu ▸ Agenda','&#128467;')
          + gStep(2,'Naviguer entre les mois','Utilisez les flèches ‹ et › pour passer au mois précédent ou suivant.','&#9664;')
          + gStep(3,'Identifier les jours','Un point doré sous une date indique qu\'un événement est planifié ce jour-là.','&#9679;')
          + gStep(4,'Liste du mois','La colonne de droite liste tous les événements du mois avec leur heure et lieu.','&#128203;')
          + gTip('L\'agenda est en lecture seule — pour ajouter ou modifier un événement, allez dans le module "Événements".')
          + gInfo('La date du jour est surlignée en bleu marine pour vous situer facilement dans le mois.')
      }
    ]
  },

  // ────────── CHAPITRE 11: Rapports ──────────
  {
    icon: '&#128200;',
    title: 'Rapports & Analytiques',
    description: 'Analyser la croissance et la santé financière de l\'église',
    sections: [
      {
        label: 'Lire les rapports',
        content: gStep(1,'Accéder','Menu ▸ Rapports','&#128200;')
          + gStep(2,'Indicateurs clés','6 statistiques en haut : membres, visiteurs, taux de conversion, événements, sermons, solde.','&#128202;')
          + gStep(3,'Graphique de croissance','Courbe de l\'évolution du nombre de membres sur 6 mois.','&#128200;')
          + gStep(4,'Graphique financier','Barres des revenus par type (dîme, offrande, don, dépense).','&#128176;')
          + gStep(5,'Résumé complet','Tableau récapitulatif : membres actifs, baptisés, convertis, mariages, prières exaucées, revenus, dépenses.','&#128203;')
          + gTip('Consultez ce rapport mensuellement en équipe de direction pour évaluer la croissance de l\'église et ajuster les priorités.')
      },
      {
        label: 'Exporter les données',
        content: gStep(1,'Export JSON complet','Bouton "Export JSON" en haut du module Rapports. Télécharge toutes les données en format .json.','&#128228;')
          + gStep(2,'Export finances','Dans le module Finances, bouton "Export" pour les transactions uniquement.','&#128176;')
          + gStep(3,'Rapport financier imprimable','Bouton "Imprimer Finances" pour un rapport PDF avec tableau de toutes les transactions et totaux.','&#128424;')
          + gWarn('Les fichiers JSON exportés contiennent toutes les données de votre église. Stockez-les dans un endroit sécurisé (Google Drive chiffré, pas sur des messageries).')
          + gTip('Faites un export mensuel comme backup. En cas de perte de données, vous pourrez les réimporter via le module Synchronisation.')
      }
    ]
  },

  // ────────── CHAPITRE 12: Synchronisation ──────────
  {
    icon: '&#9729;',
    title: 'Synchronisation & Sauvegarde',
    description: 'Comprendre le mode hors ligne et sauvegarder vos données',
    sections: [
      {
        label: 'Mode hors ligne',
        content: gScreen(svgSync(), 'Schéma de synchronisation entre l\'app, Google Sheets et l\'indicateur de statut')
          + gStep(1,'Fonctionnement offline','L\'application fonctionne entièrement sans internet. Toutes vos données sont sauvegardées localement dans le navigateur (IndexedDB).','&#128062;')
          + gStep(2,'Indicateur de statut','Le point coloré en bas à gauche : vert = en ligne, gris = hors ligne, orange clignotant = synchronisation.','&#9679;')
          + gStep(3,'Sync automatique','Quand internet revient, la synchronisation se déclenche automatiquement en arrière-plan.','&#8635;')
          + gWarn('Ne pas utiliser l\'application sur deux appareils en même temps sans synchronisation — les données pourraient se désynchroniser. Finissez sur un appareil avant de passer à l\'autre.')
          + gTip('Pour partager les données avec un autre responsable, exportez en JSON puis importez sur l\'autre appareil via le bouton "Importer JSON".')
      },
      {
        label: 'Google Sheets & Backup',
        content: gStep(1,'Configurer Google Sheets','Menu ▸ Synchronisation. Entrez l\'URL de votre Google Apps Script déployé (voir guide d\'installation).','&#9729;')
          + gStep(2,'Sync manuelle','Cliquez le badge de statut en bas à gauche ou allez dans Synchronisation → "Synchroniser" pour forcer une sync immédiate.','&#8635;')
          + gStep(3,'Importer des données','Bouton "Importer JSON" pour charger un fichier de sauvegarde précédemment exporté.','&#128228;')
          + gStep(4,'Vider les données','Bouton rouge "Vider données" — ATTENTION : supprime tout le contenu local de manière irréversible.','&#128465;')
          + gWarn('Le bouton "Vider données" efface TOUTES les données locales sans confirmation secondaire. Ne cliquez jamais dessus par erreur. Faites un export avant toute action sur les données.')
          + gInfo('La synchronisation Google Sheets est optionnelle. L\'application fonctionne parfaitement en mode local uniquement. Activez-la si vous souhaitez un backup automatique en ligne.')
      }
    ]
  },

  // ────────── CHAPITRE 13: Mariages & Baptêmes ──────────
  {
    icon: '&#128146;',
    title: 'Mariages & Baptêmes',
    description: 'Planifier et archiver les cérémonies de l\'église',
    sections: [
      {
        label: 'Enregistrer un mariage',
        content: gStep(1,'Accéder','Menu ▸ Mariages & Baptêmes','&#128146;')
          + gStep(2,'Créer','Bouton "+ Mariage"','&#10133;')
          + gStep(3,'Remplir','Nom de l\'époux, nom de l\'épouse, date de cérémonie, statut (Planifié / Célébré), notes.','&#128221;')
          + gStep(4,'Statut','Créez le mariage avec le statut "Planifié", puis revenez après la cérémonie pour le passer à "Célébré".','&#9989;')
          + gTip('Ajoutez les noms complets dans les champs Époux et Épouse pour faciliter la recherche future.')
          + gWarn('Ce module enregistre uniquement les informations de base. Pour un acte de mariage officiel, consultez un officier d\'état civil.')
      },
      {
        label: 'Enregistrer un baptême',
        content: gStep(1,'Créer','Bouton "+ Baptême" dans l\'onglet Baptêmes','&#10133;')
          + gStep(2,'Remplir','Nom du candidat, date prévue, nom de l\'officiant (pasteur), statut.','&#128221;')
          + gStep(3,'Après la cérémonie','Revenez modifier la fiche et passez le statut à "Célébré".','&#9989;')
          + gInfo('Pour un suivi complet, mettez également à jour la fiche du membre concerné : cochez "Baptisé = Oui" et renseignez la date de baptême.')
          + gTip('Créez l\'événement du baptême dans le module Événements (type : culte) pour qu\'il apparaisse dans l\'Agenda.')
      }
    ]
  },

  // ────────── CHAPITRE 14: Utilisateurs & Sécurité ──────────
  {
    icon: '&#128272;',
    title: 'Utilisateurs & Sécurité',
    description: 'Gérer les accès et consulter l\'historique d\'activité',
    sections: [
      {
        label: 'Ajouter un utilisateur',
        content: gStep(1,'Accéder','Menu ▸ Utilisateurs','&#128272;')
          + gStep(2,'Ajouter','Bouton "+ Ajouter utilisateur"','&#10133;')
          + gStep(3,'Choisir le rôle',
            gTable(['Rôle','Accès recommandé'],
              [['admin','Accès complet — réservé au responsable principal'],['pasteur','Accès complet sauf gestion des utilisateurs'],['tresorier','Accès Finances, Budget, Rapports principalement'],['secretaire','Accès Membres, Visiteurs, Communication'],['membre','Consultation uniquement']]), '&#127981;')
          + gWarn('Ne créez pas de compte admin pour chaque personne — limitez les accès admin au strict minimum (1 ou 2 personnes maximum).')
          + gTip('Cette gestion des utilisateurs est locale. Pour une gestion sécurisée des accès, configurez Supabase Auth (voir guide d\'installation).')
      },
      {
        label: 'Journal d\'activité',
        content: gStep(1,'Consulter le journal','La section "Journal d\'activité" affiche les 30 dernières actions effectuées dans l\'application.','&#128203;')
          + gTable(['Action enregistrée','Ce qu\'elle signifie'],
            [['AJOUT','Un nouvel élément a été créé'],['MODIF','Une fiche existante a été modifiée'],['SUPPR','Un élément a été supprimé'],['CONVERSION','Un visiteur a été converti en membre'],['FINANCE','Une transaction financière a été enregistrée'],['EVENT','Un événement a été planifié']])
          + gInfo('Le journal est un outil de transparence — en cas de problème de données, il permet de retracer qui a fait quoi et quand.')
          + gTip('Consultez le journal régulièrement pour détecter toute erreur ou modification non autorisée.')
      },
      {
        label: 'Sous-comptes & Codes PIN',
        content: '<p style="margin-bottom:14px;font-size:.85rem;color:var(--g4)">Donnez à votre équipe un accès limité à certains menus seulement, protégé par un code PIN — sans toucher à votre compte Administrateur.</p>'
          + gStep(1,'Accéder','Paramétrage ▸ Gestion des sous-comptes (visible uniquement par l\'Administrateur).','&#128273;')
          + gStep(2,'Créer un sous-compte','Bouton "+ Nouveau sous-compte" — nom, description, avatar, code PIN (6 chiffres minimum).','&#10133;')
          + gStep(3,'Cocher les menus autorisés','Une liste de tous les menus de l\'application s\'affiche — cochez uniquement ceux dont ce sous-compte a besoin (ex: Réceptionniste = Membres + Visiteurs + Agenda).','&#9745;')
          + gStep(4,'Connexion du sous-compte','Dès qu\'un sous-compte existe, un écran de sélection de compte apparaît après connexion. La personne choisit son compte puis saisit son PIN.','&#128274;')
          + gWarn('Après 5 tentatives de PIN incorrectes, le compte est automatiquement bloqué pendant 5 minutes.')
          + gTip('Le compte Administrateur possède toujours tous les accès et ne peut pas être limité. Son PIN par défaut (000000) doit être changé dès la première utilisation via "Modifier le PIN Administrateur".')
      }
    ]
  },

  // ────────── CHAPITRE 15: Paramétrage avancé ──────────
  {
    icon: '&#9881;',
    title: 'Paramétrage avancé',
    description: 'Thème, APIs de communication/IA, synchronisation cloud et sous-comptes',
    sections: [
      {
        label: 'Apparence & couleurs',
        content: gStep(1,'Accéder','Paramétrage ▸ Apparence & Couleurs','&#127912;')
          + gStep(2,'Choisir un mode','Clair ou Sombre — s\'applique instantanément à toute l\'application.','&#127769;')
          + gStep(3,'Personnaliser','Modifiez les couleurs principales (navigation, boutons, cartes) selon l\'identité visuelle de votre église.','&#127912;')
          + gTip('Le thème choisi est sauvegardé sur cet appareil et se synchronise automatiquement entre les onglets ouverts.')
      },
      {
        label: 'APIs de Communication',
        content: '<p style="margin-bottom:14px;font-size:.85rem;color:var(--g4)">Connectez vos propres comptes pour activer l\'envoi Email/SMS/WhatsApp (voir chapitre Communication).</p>'
          + gTable(['Service','Utilisé pour','Où l\'obtenir'],
            [['Brevo','Envoi d\'emails','Créer un compte gratuit sur brevo.com'],['Africa\'s Talking','Envoi de SMS','Créer un compte sur africastalking.com'],['Twilio','Envoi de WhatsApp','Créer un compte sur twilio.com']])
          + gWarn('Sans URL Google Apps Script configurée (onglet Synchronisation), les envois Email/SMS/WhatsApp ne peuvent pas fonctionner — c\'est ce relais qui évite les blocages de sécurité du navigateur.')
      },
      {
        label: 'APIs Intelligence Artificielle',
        content: gStep(1,'Accéder','Paramétrage ▸ APIs Intelligence Artificielle','&#129302;')
          + gStep(2,'Choisir un ou plusieurs fournisseurs','Gemini (Google), Grok (xAI), OpenRouter — une seule clé API suffit pour démarrer.','&#128273;')
          + gInfo('Plus vous connectez de fournisseurs, plus l\'Assistant IA est fiable grâce au basculement automatique en cas de panne de l\'un d\'eux.')
      },
      {
        label: 'Synchronisation cloud (Sheets & Supabase)',
        content: '<p style="margin-bottom:14px;font-size:.85rem;color:var(--g4)">Deux options de sauvegarde cloud, indépendantes et optionnelles :</p>'
          + gTable(['Option','Fonctionnement'],
            [['Google Sheets','Synchronise vos données vers votre propre Google Sheet via Apps Script — gratuit, simple à mettre en place'],['Cloud Sync BYODB (Supabase)','Connecte votre propre projet Supabase pour une sauvegarde structurée multi-appareils']])
          + gWarn('Dans les deux cas, vos données restent votre propriété — aucune donnée ne transite par un serveur du développeur de l\'application.')
      }
    ]
  },

  // ────────── CHAPITRE 16: FAQ ──────────
  {
    icon: '&#10067;',
    title: 'Questions fréquentes (FAQ)',
    description: 'Les réponses aux questions les plus posées par les utilisateurs',
    sections: [
      {
        label: 'Général & démarrage',
        content: gFaq([
          ['L\'application fonctionne-t-elle sans internet ?','Oui. MbeukChurch est conçu "offline-first" : toutes les données sont stockées localement (IndexedDB/SQLite) sur votre appareil et fonctionnent sans aucune connexion.'],
          ['Que se passe-t-il quand la connexion revient ?','Toute action effectuée hors ligne (messages, synchronisation) est automatiquement mise en file d\'attente puis envoyée dès que la connexion est rétablie.'],
          ['Puis-je utiliser l\'application sur plusieurs appareils ?','Oui, en configurant la synchronisation Google Sheets ou Cloud Sync Supabase dans Paramétrage — vos données seront alors disponibles sur tous vos appareils.'],
          ['L\'application fonctionne-t-elle sur téléphone ?','Oui, l\'interface est entièrement responsive (mobile, tablette, ordinateur) et peut être installée comme une application (PWA).'],
          ['Comment installer l\'application sur mon téléphone ?','Ouvrez l\'application dans votre navigateur puis choisissez "Ajouter à l\'écran d\'accueil" (Android) ou "Sur l\'écran d\'accueil" (iPhone, via le bouton de partage Safari).']
        ])
      },
      {
        label: 'Membres, visiteurs & finances',
        content: gFaq([
          ['Comment retrouver un membre rapidement ?','Utilisez Menu ▸ Recherche, ou la barre de recherche de la page Membres — la recherche fonctionne dès les 3 premières lettres du nom.'],
          ['Comment transformer un visiteur en membre ?','Depuis la fiche du visiteur, cliquez sur "Convertir en membre" — une nouvelle fiche membre est créée automatiquement avec les informations du visiteur.'],
          ['Puis-je annuler une transaction financière ?','Oui, ouvrez la transaction et cliquez sur "Supprimer". Pensez à vérifier le solde après suppression.'],
          ['Le solde financier est faux, que faire ?','Vérifiez que chaque transaction a le bon type (dîme/offrande/don pour les revenus, "depense" pour les sorties) — un mauvais type fausse le calcul du solde.'],
          ['Comment imprimer un reçu ou un rapport ?','Utilisez le bouton "Imprimer" présent sur la fiche membre ou le rapport financier — il ouvre un aperçu prêt à imprimer ou à enregistrer en PDF via votre navigateur.']
        ])
      },
      {
        label: 'Communication & Assistant IA',
        content: gFaq([
          ['Pourquoi ne puis-je pas envoyer d\'email/SMS ?','Vérifiez que l\'API correspondante (Brevo, Africa\'s Talking ou Twilio) est configurée dans Paramétrage, et qu\'une URL Google Apps Script est renseignée dans Synchronisation.'],
          ['Mes clés API sont-elles en sécurité ?','Oui — elles sont chiffrées localement sur votre appareil (AES-GCM) et ne sont jamais envoyées à un serveur tiers propriétaire.'],
          ['L\'Assistant IA ne répond pas, pourquoi ?','Vérifiez qu\'au moins une API IA (Gemini, Grok ou OpenRouter) est connectée dans Paramétrage, et que votre clé est valide.'],
          ['L\'Assistant IA peut-il se tromper sur un verset biblique ?','Comme tout assistant IA, il peut occasionnellement se tromper — vérifiez toujours les références bibliques importantes dans votre propre Bible avant de les utiliser publiquement.'],
          ['Puis-je envoyer un message à un seul destinataire ?','Oui, choisissez le mode "Individuel" dans le module Communication ▸ Composer.']
        ])
      },
      {
        label: 'Sécurité, sous-comptes & licence',
        content: gFaq([
          ['J\'ai oublié le PIN d\'un sous-compte, que faire ?','Seul l\'Administrateur peut réinitialiser le PIN d\'un sous-compte, depuis Paramétrage ▸ Gestion des sous-comptes ▸ Modifier.'],
          ['Le compte est bloqué après plusieurs essais de PIN, que faire ?','Patientez 5 minutes — le blocage est temporaire et automatique après 5 tentatives incorrectes.'],
          ['Comment changer le PIN de l\'Administrateur ?','Paramétrage ▸ Gestion des sous-comptes ▸ "Modifier le PIN Administrateur" — le PIN actuel est requis pour confirmer le changement.'],
          ['Que se passe-t-il si mon essai gratuit ou ma licence expire ?','L\'application se verrouille et demande une nouvelle licence — vos données restent intactes et redeviennent accessibles dès la licence renouvelée.'],
          ['Puis-je utiliser l\'application sur plusieurs appareils avec la même licence ?','Cela dépend du nombre d\'appareils autorisés par votre licence — au-delà de cette limite, un message "Appareil non autorisé" s\'affiche.']
        ])
      }
    ]
  },

  // ────────── CHAPITRE 17: Erreurs fréquentes ──────────
  {
    icon: '&#128994;',
    title: 'Erreurs fréquentes à éviter',
    description: 'Les 10 erreurs les plus courantes et comment les éviter',
    sections: [
      {
        label: 'Erreurs de saisie',
        content: '<p style="margin-bottom:16px;font-size:.85rem;color:var(--g4)">Ces erreurs sont les plus fréquentes chez les nouveaux utilisateurs :</p>'
          + gWarn('<strong>Doublons de membres :</strong> Toujours rechercher avant d\'ajouter. Si "Jean Konan" existe déjà, ne pas créer "Konan Jean".')
          + gWarn('<strong>Montants sans vérification :</strong> Vérifiez que 150 000 FCFA est bien 150000 et non 1500000. Une erreur de zéro fausse tout le rapport financier.')
          + gWarn('<strong>Mauvais type de transaction :</strong> Une dépense d\'électricité doit être de type "depense" et NON "offrande". Le type détermine le signe sur le solde.')
          + gWarn('<strong>Date incorrecte :</strong> Vérifiez toujours la date avant de sauvegarder — la date par défaut est aujourd\'hui, mais si vous saisissez une transaction du mois dernier, modifiez-la.')
          + gWarn('<strong>Nom du donateur incohérent :</strong> "Konan" vs "Konan A." vs "A. Konan" créent 3 entrées séparées dans les statistiques des dons. Standardisez les noms.')
      },
      {
        label: 'Erreurs de gestion',
        content: gWarn('<strong>Supprimer au lieu d\'archiver :</strong> Ne supprimez jamais un membre qui quitte l\'église — changez son statut en "visiteur" pour conserver l\'historique.')
          + gWarn('<strong>Oublier les dépenses :</strong> Un solde de 2 millions FCFA peut être trompeur si les dépenses du mois ne sont pas encore saisies.')
          + gWarn('<strong>Deux appareils simultanément :</strong> Ne pas travailler simultanément sur deux appareils sans synchroniser entre les deux — risque de perte de données.')
          + gWarn('<strong>Pas de backup régulier :</strong> Exportez vos données au moins une fois par mois. En cas de problème navigateur, vous pouvez les réimporter.')
          + gWarn('<strong>Partager les identifiants :</strong> Ne donnez jamais votre email et mot de passe à quelqu\'un d\'autre. Créez un compte séparé avec le bon rôle.')
          + gWarn('<strong>Ignorer les statuts des événements :</strong> Après un baptême ou un mariage, mettez à jour le statut à "Célébré" et mettez à jour la fiche du membre concerné.')
          + gTip('Organisez une session de 30 minutes avec votre équipe administrative pour présenter ces règles. La qualité des données dépend de la rigueur de la saisie.')
      },
      {
        label: 'FAQ & Résolution rapide',
        content: gTable(['Problème','Cause probable','Solution'],
            [
              ['Les données ont disparu','Cache du navigateur vidé','Réimporter le dernier backup JSON'],
              ['Le solde est négatif alors qu\'il ne devrait pas','Des dépenses sont saisies comme revenus','Vérifier les types de transaction'],
              ['Un membre n\'apparaît pas dans le ministère','Le ministère n\'est pas encore créé','Créer le ministère d\'abord'],
              ['La recherche ne trouve rien','Faute de frappe ou nom différent','Essayer avec juste les 3 premières lettres'],
              ['L\'application est lente','Trop de données en mémoire','Recharger la page et se reconnecter'],
              ['Le graphique ne s\'affiche pas','Aucune donnée enregistrée','Ajouter au moins 2 transactions ou présences'],
              ['La sync échoue','URL Google Sheets incorrecte','Vérifier l\'URL dans Synchronisation > Config'],
              ['Licence expirée','Compte en essai arrivé à terme','Acheter une licence et l\'activer'],
            ])
          + gInfo('Pour toute autre question ou problème non listé ici, contactez le support via WhatsApp ou Facebook (liens dans la page de connexion).')
      }
    ]
  }

  ]; // end chapters
}

