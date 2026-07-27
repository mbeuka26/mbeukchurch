import { DB, S } from '../core/state.js';
import { BADGE, notify } from '../core/utils.js';
import { pgSync } from '../engines/settings.js';

export var STORAGE_MODE = 'detecting';  // 'sqlite' | 'indexeddb' | 'detecting'
export var SQL = null;          // SQLite WASM instance
export var SQLDB = null;        // Active SQLite database
export var OPFS_FILE = 'mbeukchurch_v1.db';
export var SQLITE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js';

// ─── SCHEMA ───────────────────────────────────────────────────────

export var STORES_SCHEMA = [
  'members','visitors','finances','events','ministries','messages',
  'sermons','users','marriages','baptisms','announcements','logs',
  'presences','prieres','budgets',
  'apiConfigs','commQueue','commHistory','aiHistory','subaccounts'
];


export var CREATE_TABLES = STORES_SCHEMA.map(function(t) {
  return 'CREATE TABLE IF NOT EXISTS ' + t + ' (' +
    'id TEXT PRIMARY KEY,' +
    'data TEXT NOT NULL,' +
    'updatedAt INTEGER DEFAULT 0' +
    ');';
}).join('\n') +
'\nCREATE INDEX IF NOT EXISTS idx_members_upd ON members(updatedAt);' +
'\nCREATE INDEX IF NOT EXISTS idx_finances_upd ON finances(updatedAt);' +
'\nCREATE INDEX IF NOT EXISTS idx_events_upd ON events(updatedAt);';

// ─── OPFS HELPERS ─────────────────────────────────────────────────

export var OPFSHelper = {
  supported: function() {
    return typeof navigator !== 'undefined' &&
           navigator.storage &&
           typeof navigator.storage.getDirectory === 'function';
  },

  async getFile() {
    var root = await navigator.storage.getDirectory();
    return await root.getFileHandle(OPFS_FILE, { create: true });
  },

  async readBytes() {
    try {
      var fh = await OPFSHelper.getFile();
      var f  = await fh.getFile();
      var ab = await f.arrayBuffer();
      return new Uint8Array(ab);
    } catch(e) {
      console.warn('[OPFS] read error:', e.message);
      return new Uint8Array(0);
    }
  },

  async writeBytes(uint8arr) {
    try {
      var fh     = await OPFSHelper.getFile();
      var writable = await fh.createWritable();
      await writable.write(uint8arr);
      await writable.close();
      return true;
    } catch(e) {
      console.error('[OPFS] write error:', e.message);
      return false;
    }
  },

  async deleteFile() {
    try {
      var root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_FILE);
    } catch(e) {}
  }
};

// ─── SQLITE ENGINE ────────────────────────────────────────────────

export var SQLiteEngine = {
  _saveTimer: null,
  _dirty: false,

  async init() {
    // Load sql.js WASM
    if (typeof initSqlJs === 'undefined') {
      await SQLiteEngine._loadScript(SQLITE_CDN);
    }
    SQL = await initSqlJs({ locateFile: function(f) {
      return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/' + f;
    }});

    // Try to load existing DB from OPFS
    var bytes = await OPFSHelper.readBytes();
    if (bytes.length > 0) {
      try {
        SQLDB = new SQL.Database(bytes);
        console.log('[SQLite] Loaded existing DB from OPFS (' + bytes.length + ' bytes)');
      } catch(e) {
        console.warn('[SQLite] Corrupted DB, creating fresh:', e.message);
        SQLDB = new SQL.Database();
      }
    } else {
      SQLDB = new SQL.Database();
      console.log('[SQLite] Created new DB');
    }

    // Create schema
    SQLDB.run(CREATE_TABLES);
    await SQLiteEngine.save();
    STORAGE_MODE = 'sqlite';
    console.log('[SQLite] Ready. Mode: sqlite+opfs');
    return true;
  },

  _loadScript(url) {
    return new Promise(function(res, rej) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = res;
      s.onerror = function() { rej(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  },

  // Throttled save — batches writes into one OPFS flush per 500ms
  scheduleSave() {
    SQLiteEngine._dirty = true;
    if (SQLiteEngine._saveTimer) return;
    SQLiteEngine._saveTimer = setTimeout(async function() {
      SQLiteEngine._saveTimer = null;
      if (SQLiteEngine._dirty) await SQLiteEngine.save();
    }, 500);
  },

  async save() {
    if (!SQLDB) return false;
    try {
      var data = SQLDB.export();
      var ok   = await OPFSHelper.writeBytes(data);
      SQLiteEngine._dirty = false;
      return ok;
    } catch(e) {
      console.error('[SQLite] save failed:', e.message);
      return false;
    }
  },

  // ── CRUD ──────────────────────────────────────────────────────
  getAll(table) {
    if (!SQLDB) return [];
    try {
      var res = SQLDB.exec('SELECT data FROM ' + table + ' ORDER BY updatedAt DESC');
      if (!res.length || !res[0].values.length) return [];
      return res[0].values.map(function(row) {
        try { return JSON.parse(row[0]); } catch(e) { return null; }
      }).filter(Boolean);
    } catch(e) {
      console.error('[SQLite] getAll(' + table + '):', e.message);
      return [];
    }
  },

  put(table, obj) {
    if (!SQLDB) return false;
    try {
      var json = JSON.stringify(obj);
      var ts   = obj.updatedAt || Date.now();
      SQLDB.run(
        'INSERT OR REPLACE INTO ' + table + ' (id, data, updatedAt) VALUES (?,?,?)',
        [obj.id, json, ts]
      );
      SQLiteEngine.scheduleSave();
      return true;
    } catch(e) {
      console.error('[SQLite] put(' + table + '):', e.message);
      return false;
    }
  },

  del(table, id) {
    if (!SQLDB) return false;
    try {
      SQLDB.run('DELETE FROM ' + table + ' WHERE id=?', [id]);
      SQLiteEngine.scheduleSave();
      return true;
    } catch(e) {
      console.error('[SQLite] del(' + table + '):', e.message);
      return false;
    }
  },

  clr(table) {
    if (!SQLDB) return false;
    try {
      SQLDB.run('DELETE FROM ' + table);
      SQLiteEngine.scheduleSave();
      return true;
    } catch(e) {
      console.error('[SQLite] clr(' + table + '):', e.message);
      return false;
    }
  },

  count(table) {
    if (!SQLDB) return 0;
    try {
      var res = SQLDB.exec('SELECT COUNT(*) FROM ' + table);
      return res[0] ? res[0].values[0][0] : 0;
    } catch(e) { return 0; }
  },

  // Full-text search across all JSON data in a table
  search(table, field, value) {
    if (!SQLDB) return [];
    try {
      var res = SQLDB.exec(
        "SELECT data FROM " + table + " WHERE json_extract(data, '$." + field + "') LIKE ?",
        ['%' + value + '%']
      );
      if (!res.length) return [];
      return res[0].values.map(function(r) {
        try { return JSON.parse(r[0]); } catch(e) { return null; }
      }).filter(Boolean);
    } catch(e) { return []; }
  },

  // Backup: export the whole DB as base64 string
  exportBase64() {
    if (!SQLDB) return null;
    var bytes = SQLDB.export();
    var bin   = '';
    bytes.forEach(function(b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  },

  // Restore from base64
  importBase64(b64) {
    try {
      var bin   = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      SQLDB = new SQL.Database(bytes);
      SQLiteEngine.scheduleSave();
      return true;
    } catch(e) {
      console.error('[SQLite] importBase64 failed:', e.message);
      return false;
    }
  }
};

// ─── MIGRATION: IndexedDB → SQLite ────────────────────────────────

export var MigrationEngine = {
  async run() {
    console.log('[Migration] Starting IndexedDB → SQLite migration...');
    var migrated = 0, errors = 0;

    for (var store of STORES_SCHEMA) {
      try {
        var rows = await IDBEngine.getAll(store);
        if (!rows.length) continue;
        SQLDB.run('BEGIN TRANSACTION');
        for (var obj of rows) {
          if (obj && obj.id) {
            try {
              SQLiteEngine.put(store, obj);
              migrated++;
            } catch(e) { errors++; }
          }
        }
        SQLDB.run('COMMIT');
        console.log('[Migration] ' + store + ': ' + rows.length + ' rows migrated');
      } catch(e) {
        try { SQLDB.run('ROLLBACK'); } catch(re) {}
        console.warn('[Migration] ' + store + ' failed:', e.message);
        errors++;
      }
    }

    await SQLiteEngine.save();
    localStorage.setItem('_migrated_v1', '1');
    console.log('[Migration] Complete: ' + migrated + ' records, ' + errors + ' errors');
    return { migrated, errors };
  },

  isNeeded() {
    return !localStorage.getItem('_migrated_v1');
  }
};

// ─── FALLBACK IndexedDB ENGINE ────────────────────────────────────

export var IDBEngine = {
  db: null,

  open() {
    return new Promise(function(ok, fail) {
      var r = indexedDB.open('mbk5', 3);
      r.onupgradeneeded = function(e) {
        var d = e.target.result;
        STORES_SCHEMA.forEach(function(n) {
          if (!d.objectStoreNames.contains(n))
            d.createObjectStore(n, { keyPath: 'id' });
        });
      };
      r.onsuccess = function(e) { IDBEngine.db = e.target.result; ok(IDBEngine.db); };
      r.onerror   = function() { fail(); };
    });
  },

  getAll(store) {
    return new Promise(function(ok) {
      if (!IDBEngine.db) { ok([]); return; }
      try {
        var tx  = IDBEngine.db.transaction(store, 'readonly');
        var req = tx.objectStore(store).getAll();
        req.onsuccess = function() { ok(req.result || []); };
        req.onerror   = function() { ok([]); };
      } catch(e) { ok([]); }
    });
  },

  put(store, obj) {
    return new Promise(function(ok) {
      if (!IDBEngine.db) { ok(); return; }
      try {
        var tx = IDBEngine.db.transaction(store, 'readwrite');
        tx.objectStore(store).put(obj);
        tx.oncomplete = ok; tx.onerror = ok;
      } catch(e) { ok(); }
    });
  },

  del(store, id) {
    return new Promise(function(ok) {
      if (!IDBEngine.db) { ok(); return; }
      try {
        var tx = IDBEngine.db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = ok; tx.onerror = ok;
      } catch(e) { ok(); }
    });
  },

  clr(store) {
    return new Promise(function(ok) {
      if (!IDBEngine.db) { ok(); return; }
      try {
        var tx = IDBEngine.db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = ok; tx.onerror = ok;
      } catch(e) { ok(); }
    });
  }
};

// ─── UNIFIED STORAGE ADAPTER ─────────────────────────────────────
// This is a drop-in replacement for the original DB functions.
// The existing app calls: openDB / dbAll / dbPut / dbDel / dbClr
// These are now re-routed through the adapter.


export var StorageAdapter = {
  mode: 'detecting',  // 'sqlite' | 'idb'

  async initialize() {
    var opfsOk   = OPFSHelper.supported();
    var sqliteOk = false;

    if (opfsOk) {
      try {
        sqliteOk = await SQLiteEngine.init();
      } catch(e) {
        console.warn('[StorageAdapter] SQLite init failed, falling back to IDB:', e.message);
      }
    } else {
      console.warn('[StorageAdapter] OPFS not supported, using IndexedDB');
    }

    if (sqliteOk) {
      StorageAdapter.mode = 'sqlite';
      // Run migration from IDB if needed
      if (MigrationEngine.isNeeded()) {
        try {
          await IDBEngine.open();
          var hasData = false;
          for (var s of STORES_SCHEMA) {
            var rows = await IDBEngine.getAll(s);
            if (rows.length > 0) { hasData = true; break; }
          }
          if (hasData) {
            StorageAdapter._showMigrationToast();
            await MigrationEngine.run();
            StorageAdapter._hideMigrationToast();
          } else {
            localStorage.setItem('_migrated_v1', '1');
          }
        } catch(e) {
          console.warn('[StorageAdapter] Migration skipped:', e.message);
          localStorage.setItem('_migrated_v1', '1');
        }
      }
    } else {
      StorageAdapter.mode = 'idb';
      await IDBEngine.open();
    }

    console.log('[StorageAdapter] Mode:', StorageAdapter.mode);
    return StorageAdapter.mode;
  },

  _showMigrationToast() {
    var el = document.createElement('div');
    el.id  = 'migration-toast';
    el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0f2744;color:#f0c96b;padding:14px 24px;border-radius:12px;font-size:.85rem;font-weight:600;z-index:9999;border:1px solid rgba(201,168,76,.3);box-shadow:0 4px 20px rgba(0,0,0,.4)';
    el.textContent = '⚡ Migration vers SQLite en cours... Ne fermez pas l\'application.';
    document.body.appendChild(el);
  },

  _hideMigrationToast() {
    var el = document.getElementById('migration-toast');
    if (el) el.remove();
  },

  // ── Public API (same as original DB functions) ──
  getAll(store) {
    if (StorageAdapter.mode === 'sqlite') {
      return Promise.resolve(SQLiteEngine.getAll(store));
    }
    return IDBEngine.getAll(store);
  },

  put(store, obj) {
    if (StorageAdapter.mode === 'sqlite') {
      SQLiteEngine.put(store, obj);
      return Promise.resolve();
    }
    return IDBEngine.put(store, obj);
  },

  del(store, id) {
    if (StorageAdapter.mode === 'sqlite') {
      SQLiteEngine.del(store, id);
      return Promise.resolve();
    }
    return IDBEngine.del(store, id);
  },

  clr(store) {
    if (StorageAdapter.mode === 'sqlite') {
      SQLiteEngine.clr(store);
      return Promise.resolve();
    }
    return IDBEngine.clr(store);
  },

  // Extra power: native SQL query
  query(sql, params) {
    if (StorageAdapter.mode === 'sqlite' && SQLDB) {
      try {
        var res = SQLDB.exec(sql, params || []);
        return res.length ? res[0].values : [];
      } catch(e) { console.error('[StorageAdapter] query:', e.message); return []; }
    }
    return [];
  },

  // Force save to OPFS now
  async flush() {
    if (StorageAdapter.mode === 'sqlite') {
      return SQLiteEngine.save();
    }
    return true;
  },

  // Export SQLite DB as downloadable file
  exportDB() {
    if (StorageAdapter.mode !== 'sqlite' || !SQLDB) {
      notify('Export SQLite non disponible en mode IndexedDB', 'error');
      return;
    }
    var bytes = SQLDB.export();
    var blob  = new Blob([bytes], { type: 'application/octet-stream' });
    var url   = URL.createObjectURL(blob);
    var a     = document.createElement('a');
    a.href    = url;
    a.download = 'mbeukchurch_' + new Date().toISOString().slice(0,10) + '.db';
    a.click();
    URL.revokeObjectURL(url);
    notify('Base SQLite exportée ✓', 'success');
  },

  // Import a .db file
  async importDB(file) {
    if (!SQL) { notify('SQLite non disponible', 'error'); return false; }
    try {
      var ab    = await file.arrayBuffer();
      var bytes = new Uint8Array(ab);
      SQLDB     = new SQL.Database(bytes);
      await SQLiteEngine.save();
      notify('Base SQLite importée ✓', 'success');
      return true;
    } catch(e) {
      notify('Fichier .db invalide', 'error');
      return false;
    }
  },

  // Status info
  getStatus() {
    var status = {
      mode:  StorageAdapter.mode,
      opfs:  OPFSHelper.supported(),
      sqlite: !!SQLDB,
    };
    if (StorageAdapter.mode === 'sqlite' && SQLDB) {
      status.tables = {};
      STORES_SCHEMA.forEach(function(t) {
        status.tables[t] = SQLiteEngine.count(t);
      });
    }
    return status;
  }
};

// ─── OVERRIDE ORIGINAL DB FUNCTIONS ──────────────────────────────
// Silently replace the original IndexedDB functions with the adapter.
// All existing app code continues to work unchanged.


export async function openDB() {
  await StorageAdapter.initialize();
  // Return a dummy object for compatibility
  return StorageAdapter;
}


export function dbAll(store) {
  return StorageAdapter.getAll(store);
}


export function dbPut(store, obj) {
  return StorageAdapter.put(store, obj);
}


export function dbDel(store, id) {
  return StorageAdapter.del(store, id);
}


export function dbClr(store) {
  return StorageAdapter.clr(store);
}

// Override loadAll to use adapter

export async function loadAll() {
  for (var s of STORES_SCHEMA) {
    S.data[s] = await StorageAdapter.getAll(s);
  }
}

// ─── AUTO-SAVE ON PAGE CLOSE ──────────────────────────────────────
window.addEventListener('beforeunload', function() {
  if (StorageAdapter.mode === 'sqlite' && SQLiteEngine._dirty) {
    SQLiteEngine.save();  // best-effort synchronous-ish
  }
});

// Save every 30 seconds as safety net
setInterval(async function() {
  if (StorageAdapter.mode === 'sqlite' && SQLiteEngine._dirty) {
    await SQLiteEngine.save();
  }
}, 30000);

// ─── STORAGE STATUS BADGE ────────────────────────────────────────

export function renderStorageBadge() {
  var st = StorageAdapter.getStatus();
  var existing = document.getElementById('storage-badge');
  if (existing) existing.remove();
  var badge = document.createElement('div');
  badge.id = 'storage-badge';
  badge.style.cssText = 'position:fixed;bottom:10px;right:10px;background:' +
    (st.mode==='sqlite'?'#0f2744':'#6b7280') +
    ';color:'+(st.mode==='sqlite'?'#f0c96b':'#fff') +
    ';padding:4px 10px;border-radius:20px;font-size:.68rem;font-weight:700;z-index:500;border:1px solid rgba(201,168,76,.3);cursor:pointer';
  badge.textContent = st.mode === 'sqlite' ? '⚡ SQLite+OPFS' : '💾 IndexedDB';
  badge.title = 'Mode: ' + st.mode + (st.sqlite ? '\nOpfs: Actif' : '');
  badge.onclick = function() {
    var info = StorageAdapter.getStatus();
    var msg  = 'Mode: ' + info.mode.toUpperCase() + '\nOPFS: ' + (info.opfs?'Oui':'Non') + '\nSQLite: ' + (info.sqlite?'Actif':'Inactif');
    if (info.tables) {
      msg += '\n\nEnregistrements:';
      Object.keys(info.tables).forEach(function(t) { msg += '\n  ' + t + ': ' + info.tables[t]; });
    }
    alert(msg);
  };
  document.body.appendChild(badge);
}

// ─── HOOK INTO EXISTING pgSync PAGE ──────────────────────────────
// Add SQLite export/import buttons to the existing sync page
