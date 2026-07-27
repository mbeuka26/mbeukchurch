import { TabSync } from '../core/state.js';
import { notify } from '../core/utils.js';

export var THEME = (function() {
  'use strict';

  var LS_KEY = 'mbk_theme_v2';

  // Mapping : variable CSS → id du color-picker
  var PROP_MAP = {
    '--sidebar-bg':          'th-sidebar-bg',
    '--sidebar-text':        'th-sidebar-text',
    '--sidebar-text-active': 'th-sidebar-sa',
    '--sidebar-accent':      'th-sidebar-acc',
    '--main-bg':             'th-main-bg',
    '--main-text':           'th-main-text',
    '--topbar-bg':           'th-tb-bg',
    '--topbar-text':         'th-tb-text',
    '--card-bg':             'th-card-bg',
    '--card-text':           'th-card-text',
    '--btn-primary-bg':      'th-btn-pbg',
    '--btn-primary-text':    'th-btn-ptxt',
    '--btn-secondary-bg':    'th-btn-sbg',
    '--btn-secondary-text':  'th-btn-stxt',
  };

  // Valeurs par défaut (thème MbeukChurch original)
  var DEFAULTS = {
    '--sidebar-bg':          '#0f2744',
    '--sidebar-text':        '#a0aec0',
    '--sidebar-text-active': '#f0c96b',
    '--sidebar-accent':      '#c9a84c',
    '--main-bg':             '#f2f4f7',
    '--main-text':           '#0f2744',
    '--topbar-bg':           '#ffffff',
    '--topbar-text':         '#0f2744',
    '--card-bg':             '#ffffff',
    '--card-text':           '#0f2744',
    '--btn-primary-bg':      '#c9a84c',
    '--btn-primary-text':    '#0f2744',
    '--btn-secondary-bg':    '#0f2744',
    '--btn-secondary-text':  '#ffffff',
  };

  // Thèmes mode sombre
  var DARK_THEME = {
    '--sidebar-bg':          '#111827',
    '--sidebar-text':        '#9ca3af',
    '--sidebar-text-active': '#f9fafb',
    '--sidebar-accent':      '#f0c96b',
    '--main-bg':             '#1f2937',
    '--main-text':           '#f9fafb',
    '--topbar-bg':           '#111827',
    '--topbar-text':         '#f9fafb',
    '--card-bg':             '#374151',
    '--card-text':           '#f9fafb',
    '--btn-primary-bg':      '#c9a84c',
    '--btn-primary-text':    '#111827',
    '--btn-secondary-bg':    '#4b5563',
    '--btn-secondary-text':  '#f9fafb',
  };

  var _current = {};
  var _mode = 'light'; // light | dark | auto

  // ── Chargement au démarrage ──────────────────────────────
  function load() {
    try {
      var saved = localStorage.getItem(LS_KEY);
      if (saved) {
        var data = JSON.parse(saved);
        _current = data.colors || {};
        _mode    = data.mode   || 'light';
      } else {
        _current = Object.assign({}, DEFAULTS);
        _mode    = 'light';
      }
    } catch(_) {
      _current = Object.assign({}, DEFAULTS);
    }
    _applyMode();
    _applyAll();
  }

  // ── Applique une variable CSS unique ─────────────────────
  function apply(prop, value) {
    _current[prop] = value;
    document.documentElement.style.setProperty(prop, value);
    // Mettre à jour la valeur affichée sous le picker
    var pickerId = PROP_MAP[prop];
    if (pickerId) {
      var valEl = document.getElementById(pickerId + '-val');
      if (valEl) valEl.textContent = value;
    }
  }

  // ── Applique toutes les variables sauvegardées ───────────
  function _applyAll() {
    var theme = _mode === 'dark' ? Object.assign({}, DARK_THEME, _current) :
                _mode === 'auto' && _prefersDark() ? Object.assign({}, DARK_THEME) :
                _current;
    Object.keys(theme).forEach(function(prop) {
      document.documentElement.style.setProperty(prop, theme[prop]);
    });
  }

  // ── Mode clair / sombre ──────────────────────────────────
  function setMode(mode) {
    _mode = mode;
    if (mode === 'auto') {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.onchange = function() { if (_mode === 'auto') _applyMode(); };
    }
    _applyMode();
    _applyAll();
    updateModeButtons();
    save();
  }

  function _applyMode() {
    if (_mode === 'dark' || (_mode === 'auto' && _prefersDark())) {
      var dark = Object.assign({}, DARK_THEME);
      Object.keys(dark).forEach(function(p) {
        document.documentElement.style.setProperty(p, dark[p]);
      });
    } else if (_mode === 'light') {
      var light = Object.assign({}, DEFAULTS, _current);
      Object.keys(light).forEach(function(p) {
        document.documentElement.style.setProperty(p, light[p]);
      });
    }
  }

  function _prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ── Synchronise les color-pickers avec les valeurs CSS ───
  function syncPickers() {
    Object.keys(PROP_MAP).forEach(function(prop) {
      var id  = PROP_MAP[prop];
      var el  = document.getElementById(id);
      var raw = getRawColor(prop);
      if (el)  el.value = _toHex(raw);
      var valEl = document.getElementById(id + '-val');
      if (valEl) valEl.textContent = raw;
    });
  }

  // Appelé à chaque changement picker (met à jour l'aperçu live)
  function syncPickersLive() {
    // Force repaint de l'aperçu en récupérant les variables CSS actuelles
    var preview = document.getElementById('theme-preview');
    if (preview) {
      preview.style.opacity = '0.98';
      setTimeout(function(){ preview.style.opacity = '1'; }, 50);
    }
  }

  // ── Sauvegarde dans LocalStorage ────────────────────────
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ colors: _current, mode: _mode }));
      if (typeof TabSync !== 'undefined') TabSync.emit('theme');
    } catch(_) {}
  }

  // ── Réinitialisation ─────────────────────────────────────
  function reset() {
    _current = Object.assign({}, DEFAULTS);
    _mode    = 'light';
    _applyAll();
    save();
    notify('Thème réinitialisé', 'success');
  }

  // ── Lire la valeur brute d'une variable CSS ──────────────
  function getRawColor(prop) {
    // Priorité : valeur sauvegardée > valeur CSS actuelle
    if (_current[prop]) return _current[prop];
    var val = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    return val || DEFAULTS[prop] || '#000000';
  }

  // ── Convertit rgba/rgb/named en hex pour le color-picker ─
  function _toHex(color) {
    if (!color) return '#000000';
    color = color.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(color)) {
      // Normaliser #abc → #aabbcc
      if (color.length === 4) {
        return '#' + color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
      }
      return color.slice(0,7); // ignorer alpha
    }
    // rgba/rgb → hex via canvas
    try {
      var cv  = document.createElement('canvas');
      cv.width = cv.height = 1;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0,0,1,1);
      var d = ctx.getImageData(0,0,1,1).data;
      return '#' + ('0'+d[0].toString(16)).slice(-2) +
                   ('0'+d[1].toString(16)).slice(-2) +
                   ('0'+d[2].toString(16)).slice(-2);
    } catch(_) { return '#000000'; }
  }

  // ── Mettre à jour les boutons mode actif ─────────────────
  function updateModeButtons() {
    ['light','dark','auto'].forEach(function(m) {
      var btn = document.getElementById('tm-' + m);
      if (!btn) return;
      btn.style.background     = _mode === m ? 'var(--btn-secondary-bg)' : '';
      btn.style.color          = _mode === m ? 'var(--btn-secondary-text)' : '';
      btn.style.borderColor    = _mode === m ? 'var(--btn-secondary-bg)' : '';
      btn.style.fontWeight     = _mode === m ? '700' : '';
    });
  }

  return { load, apply, save, reset, setMode, getRawColor, syncPickers, syncPickersLive, updateModeButtons };
})();

// ── Appliquer un preset ───────────────────────────────────────────────

export function applyPreset(encoded) {
  try {
    var t = JSON.parse(decodeURIComponent(encoded));
    var map = {
      sb:'--sidebar-bg', st:'--sidebar-text', sa:'--sidebar-text-active',
      sc:'--sidebar-accent', mb:'--main-bg', mt:'--main-text',
      tb:'--topbar-bg', tt:'--topbar-text', cb:'--card-bg', ct:'--card-text',
      pb:'--btn-primary-bg', pt:'--btn-primary-text',
      sb2:'--btn-secondary-bg', st2:'--btn-secondary-text',
    };
    Object.keys(map).forEach(function(k) {
      if (t[k]) THEME.apply(map[k], t[k]);
    });
    THEME.save();
    THEME.syncPickers();
    notify('Thème "'+t.n+'" appliqué', 'success');
  } catch(e) { notify('Erreur preset', 'error'); }
}

// ── Démarrage : charger le thème sauvegardé ───────────────────────────
(function() {
  // Appliquer le thème AVANT le premier rendu pour éviter le flash
  try {
    var saved = localStorage.getItem('mbk_theme_v2');
    if (saved) {
      var data = JSON.parse(saved);
      var colors = data.colors || {};
      Object.keys(colors).forEach(function(p) {
        document.documentElement.style.setProperty(p, colors[p]);
      });
    }
  } catch(_) {}
})();

// ── PAGES MAP ──
