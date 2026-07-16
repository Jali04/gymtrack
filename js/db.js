/* =============================================
   GYMTRACK — Data Layer
   ============================================= */

const CAT_TYPE = {
  Brust: 'strength', Rücken: 'strength', Schultern: 'strength',
  Arme: 'strength', Beine: 'strength', Core: 'strength',
  Cardio: 'cardio', Dehnen: 'stretch'
};
function getCatType(category) {
  if (db.customCategories && db.customCategories[category]) {
    return db.customCategories[category];
  }
  return CAT_TYPE[category] || 'strength';
}

const TYPE_COLORS = { 'N': 'var(--text)', 'W': '#f5a623', 'D': '#d0021b' };
function getCatClass(type) {
  return type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
}

let db = JSON.parse(localStorage.getItem('gymdb') || '{"exercises":[],"workouts":[],"currentWorkout":null}');
if (!db.exercises) db.exercises = [];
if (!db.workouts) db.workouts = [];
if (typeof db.currentWorkout === 'undefined') db.currentWorkout = null;
if (!db.templates) db.templates = [];
if (!db.measurements) db.measurements = [];
if (!db.progressPics) db.progressPics = [];
if (!db.programs) db.programs = [];
if (typeof db.activeProgram === 'undefined') db.activeProgram = null;
if (!db.achievements) db.achievements = [];
if (!db.weekStatus) db.weekStatus = { weekKey: 0, mode: 'normal' };
if (!db.supplements) db.supplements = [];
if (!db.supplementLog) db.supplementLog = [];
if (!db.customCategories) db.customCategories = {};
if (!db.settings) db.settings = {};
if (typeof db.settings.wakeLock === 'undefined') db.settings.wakeLock = true;
if (typeof db.settings.barWeight === 'undefined') db.settings.barWeight = 20;
if (!Array.isArray(db.settings.plates)) db.settings.plates = [25, 20, 15, 10, 5, 2.5, 1.25];
if (!db.nutritionGoals) db.nutritionGoals = { calories: 2000, protein: 150, carbs: 200, fat: 70 };
if (!db.nutritionLog) db.nutritionLog = [];
const DEFAULT_FOODS = [
  { id: 'f1', name: 'Haferflocken', calories: 370, protein: 13, carbs: 59, fat: 7, servingSize: 100, isCustom: false },
  { id: 'f2', name: 'Hähnchenbrust (roh)', calories: 110, protein: 23, carbs: 0, fat: 1.5, servingSize: 100, isCustom: false },
  { id: 'f3', name: 'Magerquark', calories: 68, protein: 12, carbs: 4, fat: 0.2, servingSize: 100, isCustom: false },
  { id: 'f4', name: 'Vollei (Größe M)', calories: 143, protein: 12.5, carbs: 0.7, fat: 9.9, servingSize: 100, isCustom: false },
  { id: 'f5', name: 'Whey Protein', calories: 375, protein: 78, carbs: 6, fat: 4, servingSize: 100, isCustom: false },
  { id: 'f6', name: 'Reis (ungekocht)', calories: 350, protein: 7, carbs: 77, fat: 0.6, servingSize: 100, isCustom: false },
  { id: 'f7', name: 'Erdnussbutter', calories: 620, protein: 25, carbs: 13, fat: 50, servingSize: 100, isCustom: false },
  { id: 'f8', name: 'Banane', calories: 90, protein: 1.1, carbs: 20, fat: 0.2, servingSize: 100, isCustom: false }
];
if (!db.foodLibrary || db.foodLibrary.length === 0) db.foodLibrary = DEFAULT_FOODS;

const DEFAULT_EXERCISES = [
  { id: 'e1',  name: 'Bankdrücken',     category: 'Brust' },
  { id: 'e2',  name: 'Kniebeugen',      category: 'Beine' },
  { id: 'e3',  name: 'Kreuzheben',      category: 'Rücken' },
  { id: 'e4',  name: 'Schulterdrücken', category: 'Schultern' },
  { id: 'e5',  name: 'Klimmzüge',       category: 'Rücken' },
  { id: 'e6',  name: 'Bizeps Curls',    category: 'Arme' },
  { id: 'e7',  name: 'Trizeps Dips',    category: 'Arme' },
  { id: 'e8',  name: 'Beinpresse',      category: 'Beine' },
  { id: 'e9',  name: 'Laufen',          category: 'Cardio' },
  { id: 'e10', name: 'Hüftbeuger',      category: 'Dehnen' },
];
if (db.exercises.length === 0) { db.exercises = DEFAULT_EXERCISES; }

/* =============================================
   A7 — Media store (IndexedDB) + quota-safe persistence
   Progress photos are heavy (JPEG DataURLs). Keeping them in the single
   `gymdb` localStorage blob blows the ~5 MB quota and makes save() throw —
   which could lose the running workout. We keep the photo bytes in IndexedDB
   and store only lightweight {id,date} in the localStorage blob.

   DATA-SAFETY INVARIANT: a photo's dataUrl is only stripped from the
   localStorage blob once it is CONFIRMED written to IndexedDB (_idbPhotoIds).
   Until then it stays inline, so the bytes are never in zero stores.
   If IndexedDB is unavailable, nothing is ever confirmed → everything stays
   inline exactly like before (safe fallback).
   ============================================= */
let _idbPhotoIds   = new Set();   // photo ids confirmed present in IndexedDB
let _quotaWarned   = false;
let _photoDbPromise = null;
let _photosReadyResolve;
const _photosReady = new Promise(res => { _photosReadyResolve = res; });
function _ensurePhotosReady() { return _photosReady; }

function _photoDbOpen() {
  if (_photoDbPromise) return _photoDbPromise;
  _photoDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || !indexedDB) { reject(new Error('no-idb')); return; }
    let req;
    try { req = indexedDB.open('dscpln_media', 2); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains('photos'))  idb.createObjectStore('photos',  { keyPath: 'id' });
      if (!idb.objectStoreNames.contains('backups')) idb.createObjectStore('backups', { keyPath: 'id' }); // E3
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error || new Error('idb-open-failed'));
  });
  return _photoDbPromise;
}
function _photoStore(mode) {
  return _photoDbOpen().then(idb => idb.transaction('photos', mode).objectStore('photos'));
}
function _photoPut(rec) {
  return _photoStore('readwrite').then(store => new Promise((res, rej) => {
    const r = store.put(rec); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}
function _photoDelete(id) {
  return _photoStore('readwrite').then(store => new Promise((res, rej) => {
    const r = store.delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}
function _photoGetAll() {
  return _photoStore('readonly').then(store => new Promise((res, rej) => {
    const r = store.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
  }));
}

// Public: persist one photo to IndexedDB and mark it confirmed.
function photoStorePut(entry) {
  return _photoPut({ id: entry.id, date: entry.date, dataUrl: entry.dataUrl, note: entry.note || null })
    .then(() => { _idbPhotoIds.add(entry.id); })
    .catch(e => { console.warn('[Photos] IDB put failed, keeping inline:', e && e.message); });
}
function photoStoreDelete(id) {
  _idbPhotoIds.delete(id);
  return _photoDelete(id).catch(e => console.warn('[Photos] IDB delete failed:', e && e.message));
}

// Copy any not-yet-confirmed inline photos (fresh uploads, sync pulls, imports)
// into IndexedDB. Fire-and-forget; confirmation flips them to slim on next save.
function _reconcilePhotos() {
  if (!db.progressPics || !db.progressPics.length) return;
  db.progressPics.forEach(p => {
    if (p && p.dataUrl && !_idbPhotoIds.has(p.id)) {
      _photoPut({ id: p.id, date: p.date, dataUrl: p.dataUrl, note: p.note || null })
        .then(() => { _idbPhotoIds.add(p.id); })
        .catch(() => { /* stays inline — safe */ });
    }
  });
}

// Serialize db for localStorage, stripping dataUrl only for photos confirmed in IDB.
function _serializeDb() {
  if (!db.progressPics || !db.progressPics.length) return JSON.stringify(db);
  const slimPics = db.progressPics.map(p => {
    if (p && p.dataUrl && _idbPhotoIds.has(p.id)) {
      const { dataUrl, ...rest } = p;
      return rest;
    }
    return p;
  });
  const clone = Object.assign({}, db, { progressPics: slimPics });
  return JSON.stringify(clone);
}

function _isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                 e.code === 22 || e.code === 1014);
}

// Central persistence — quota-safe. All gymdb writes go through here.
function _persistDb() {
  _reconcilePhotos();
  try {
    localStorage.setItem('gymdb', _serializeDb());
    _quotaWarned = false;
    return true;
  } catch (e) {
    if (_isQuotaError(e)) {
      console.error('[Storage] localStorage quota exceeded:', e);
      if (!_quotaWarned && typeof showToast === 'function') {
        showToast('⚠️ Speicher fast voll — bitte ein Backup erstellen (Einstellungen).');
        _quotaWarned = true;
      }
    } else {
      console.error('[Storage] save failed:', e);
    }
    return false;
  }
}

// One-time boot: open IDB, hydrate in-memory dataUrls, migrate legacy inline
// photos into IDB, then slim the localStorage blob. Never destructive.
async function _initPhotoStore() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        if (!already) navigator.storage.persist().catch(() => {});
      } catch (e) { /* ignore */ }
    }
    let stored = [];
    try { stored = await _photoGetAll(); }
    catch (e) { _photoDbPromise = null; stored = []; }
    const map = new Map(stored.map(r => [r.id, r]));
    stored.forEach(r => _idbPhotoIds.add(r.id));

    (db.progressPics || []).forEach(p => {
      if (!p) return;
      if (!p.dataUrl && map.has(p.id)) {
        p.dataUrl = map.get(p.id).dataUrl;              // hydrate migrated photo into memory
      } else if (p.dataUrl && !_idbPhotoIds.has(p.id)) { // legacy inline photo -> migrate to IDB
        _photoPut({ id: p.id, date: p.date, dataUrl: p.dataUrl, note: p.note || null })
          .then(() => { _idbPhotoIds.add(p.id); _persistDb(); })
          .catch(() => {});
      }
    });

    _persistDb(); // slim now-confirmed inline photos out of the localStorage blob
    if (typeof renderProgressPics === 'function') { try { renderProgressPics(); } catch (e) {} }
  } catch (e) {
    console.warn('[Photos] init failed:', e && e.message);
  } finally {
    if (_photosReadyResolve) _photosReadyResolve();
  }
}

/* =============================================
   E3 — Silent automatic local backup (IndexedDB)
   A self-contained snapshot (incl. photos) is stored in IndexedDB weekly and
   after every 5th workout. Protects against the A7 quota / Safari-eviction
   scenarios and is restorable from Settings.
   ============================================= */
const _AUTOBACKUP_META_KEY = 'dscpln_autobackup_meta';

function _backupTx(mode) {
  return _photoDbOpen().then(idb => idb.transaction('backups', mode).objectStore('backups'));
}
function _backupSave(rec) {
  return _backupTx('readwrite').then(store => new Promise((res, rej) => {
    const r = store.put(rec); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}
function _backupGet(id) {
  return _backupTx('readonly').then(store => new Promise((res, rej) => {
    const r = store.get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error);
  }));
}

function getAutoBackupMeta() {
  try { return JSON.parse(localStorage.getItem(_AUTOBACKUP_META_KEY) || 'null') || null; }
  catch (e) { return null; }
}

// force = true bypasses the weekly interval (used after every 5th workout).
async function maybeAutoBackup(force) {
  try {
    const meta = getAutoBackupMeta();
    const now  = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const due  = !!force || !meta || !meta.ts || (now - meta.ts) > weekMs;
    if (!due) return;
    if (typeof _ensurePhotosReady === 'function') await _ensurePhotosReady();
    const json = JSON.stringify(db); // full, self-contained (photos hydrated in memory)
    await _backupSave({ id: 'auto', ts: now, workoutCount: (db.workouts || []).length, size: json.length, json });
    localStorage.setItem(_AUTOBACKUP_META_KEY, JSON.stringify({ ts: now, workouts: (db.workouts || []).length, size: json.length }));
    console.log('[Backup] Auto-backup stored', new Date(now).toISOString());
    if (typeof _refreshAutoBackupUI === 'function') _refreshAutoBackupUI();
  } catch (e) {
    console.warn('[Backup] auto-backup failed:', e && e.message);
  }
}

async function restoreAutoBackup() {
  let rec;
  try { rec = await _backupGet('auto'); } catch (e) { rec = null; }
  if (!rec || !rec.json) {
    if (typeof showToast === 'function') showToast('Kein Auto-Backup vorhanden.');
    return;
  }
  const when = new Date(rec.ts).toLocaleString(typeof lang !== 'undefined' && lang === 'en' ? 'en-GB' : 'de-DE');
  const proceed = (typeof showConfirm === 'function')
    ? await showConfirm(`Auto-Backup (${when}) wiederherstellen? Deine aktuellen lokalen Daten werden ersetzt.`,
        { confirmText: (typeof t === 'function' ? (t('restore') || 'Wiederherstellen') : 'Wiederherstellen') })
    : window.confirm('Restore backup from ' + when + '?');
  if (!proceed) return;

  let imported;
  try { imported = JSON.parse(rec.json); }
  catch (e) { if (typeof showToast === 'function') showToast('Backup beschädigt.'); return; }

  db = imported;
  // Move restored photos into IndexedDB first so the slim blob fits the quota.
  _idbPhotoIds = new Set();
  if (Array.isArray(db.progressPics)) {
    for (const p of db.progressPics) {
      if (p && p.dataUrl && typeof photoStorePut === 'function') {
        try { await photoStorePut(p); } catch (e) { /* keeps inline */ }
      }
    }
  }
  try { runMigrations(db); } catch (e) {}
  _persistDb();
  if (typeof showToast === 'function') showToast('✓ Backup wiederhergestellt');
  setTimeout(() => location.reload(), 400);
}

const SCHEMA_VERSION = 4;

const MIGRATIONS = {
  1: (data) => {
    let changed = false;
    if (data.workouts) {
      data.workouts.forEach(w => {
        if (!w.date && w.startTime) {
          w.date = w.startTime;
          changed = true;
        }
      });
    }
    return changed;
  },
  2: (data) => {
    let changed = false;
    if (data.programs) {
      data.programs.forEach(p => {
        if (p.days && Array.isArray(p.days)) {
          p.schedule = {};
          const mapDays = [1, 2, 3, 4, 5, 6, 0];
          p.days.forEach((d, i) => {
            if (i < 7 && d.templateId) {
              p.schedule[mapDays[i]] = d.templateId;
            }
          });
          delete p.days;
          changed = true;
        }
      });
    }
    return changed;
  },
  3: (data) => {
    let changed = false;
    if (data.exercises) {
      if (!data.exercises.find(e => e.name === 'Seilspringen')) {
        data.exercises.push({ id: 'e11', name: 'Seilspringen', category: 'Cardio' });
        changed = true;
      }
    }
    return changed;
  },
  4: (data) => {
    let changed = false;
    if (data.activeProgram && data.activeProgram.id) {
      const orig = data.activeProgram.id;
      data.activeProgram.id = String(orig);
      if (data.activeProgram.id !== orig) changed = true;
    }
    if (data.templates) {
      data.templates.forEach(t => {
        if (t.id !== undefined && t.id !== null) {
          const orig = t.id;
          t.id = String(orig);
          if (t.id !== orig) changed = true;
        }
      });
    }
    if (data.programs) {
      data.programs.forEach(p => {
        if (p.id !== undefined && p.id !== null) {
          const orig = p.id;
          p.id = String(orig);
          if (p.id !== orig) changed = true;
        }
        if (p.schedule) {
          for (let day in p.schedule) {
            if (p.schedule[day] !== undefined && p.schedule[day] !== null) {
              const orig = p.schedule[day];
              p.schedule[day] = String(orig);
              if (p.schedule[day] !== orig) changed = true;
            }
          }
        }
      });
    }
    if (data.workouts) {
      data.workouts.forEach(w => {
        if (w.templateId !== undefined && w.templateId !== null) {
          const orig = w.templateId;
          w.templateId = String(orig);
          if (w.templateId !== orig) changed = true;
        }
        if (w.id !== undefined && w.id !== null) {
          const orig = w.id;
          w.id = String(orig);
          if (w.id !== orig) changed = true;
        }
      });
    }
    if (data.currentWorkout) {
      if (data.currentWorkout.templateId !== undefined && data.currentWorkout.templateId !== null) {
        const orig = data.currentWorkout.templateId;
        data.currentWorkout.templateId = String(orig);
        if (data.currentWorkout.templateId !== orig) changed = true;
      }
      if (data.currentWorkout.id !== undefined && data.currentWorkout.id !== null) {
        const orig = data.currentWorkout.id;
        data.currentWorkout.id = String(orig);
        if (data.currentWorkout.id !== orig) changed = true;
      }
    }
    return changed;
  }
};

function runMigrations(data) {
  let currentVersion = data.version || 0;
  let changed = false;

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v]) {
      const migrationChanged = MIGRATIONS[v](data);
      if (migrationChanged) {
        changed = true;
      }
      data.version = v;
      changed = true;
    }
  }

  // Also run migrations for merged/imported datasets to handle missing migrations
  for (let v = 1; v <= SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v](data)) {
      changed = true;
    }
  }

  return changed;
}

// Run migrations on startup
if (runMigrations(db)) {
  _persistDb();
}

// Startup migrations for supplements and logs
let dbNeedsSave = false;
if (db.supplements) {
  db.supplements.forEach(s => {
    if (!s.createdAt) {
      s.createdAt = s.updated_at || Date.now();
      dbNeedsSave = true;
    }
  });
}
if (db.supplementLog) {
  db.supplementLog.forEach(l => {
    if (!l.id) {
      l.id = 'suplog_' + uid();
      dbNeedsSave = true;
    }
  });
}

// One-time fix: bump updated_at on supplements & logs to force re-sync
// with corrected field mapping (dosageUnit, timeOfDay, color, notes, etc.)
if (!localStorage.getItem('supp_sync_fix_v1')) {
  const now = Date.now();
  if (db.supplements) {
    db.supplements.forEach(s => {
      s.updated_at = now;
    });
  }
  if (db.supplementLog) {
    db.supplementLog.forEach(l => {
      l.updated_at = now;
    });
  }
  localStorage.setItem('supp_sync_fix_v1', '1');
  dbNeedsSave = true;
}

if (dbNeedsSave) {
  _persistDb();
}

// Boot the media store (async, non-blocking). Migrates photos to IndexedDB
// and slims the localStorage blob once they are safely stored.
_initPhotoStore();
// Weekly silent auto-backup (E3). Deferred so it never blocks first paint.
setTimeout(() => { try { maybeAutoBackup(false); } catch (e) {} }, 3000);

function save() {
  runMigrations(db);
  _persistDb();

  if (typeof syncProfileUpdate === 'function') {
    syncProfileUpdate();
  }
  if (typeof syncNutritionGoalsUpdate === 'function') {
    syncNutritionGoalsUpdate();
  }
  
  if (typeof detectAndSyncChanges === 'function') {
    detectAndSyncChanges();
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getEx(id) {
  return db.exercises.find(x => x.id === id);
}

function getExName(id) {
  const e = db.exercises.find(x => x.id === id);
  return e ? e.name : (typeof lang !== 'undefined' && lang === 'en' ? 'Unknown' : 'Unbekannt');
}

// Builds an SVG line chart. points = [{x: label, y: number}], returns SVG string.
function _buildLineChart(points, opts) {
  if (!points || points.length < 2) return '';
  opts = opts || {};
  const W = opts.width  || 300;
  const H = opts.height || 140;
  const color  = opts.color  || 'var(--accent)';
  const pad    = { top: 20, right: 12, bottom: 28, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top  - pad.bottom;

  const ys    = points.map(p => p.y);
  const minY  = Math.min(...ys);
  const maxY  = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  const toX = i => pad.left + (i / (points.length - 1)) * innerW;
  const toY = v => pad.top  + innerH - ((v - minY) / rangeY) * innerH;

  // Grid lines
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (innerH / 4) * i;
    const val = maxY - (rangeY / 4) * i;
    grid += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2" opacity="0.6"/>`;
    grid += `<text x="${pad.left - 6}" y="${y + 3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="'DM Sans', sans-serif">${val % 1 === 0 ? val : val.toFixed(1)}</text>`;
  }

  // Polyline
  const polyPts = points.map((p, i) => `${toX(i)},${toY(p.y)}`).join(' ');

  // Filled area under line
  const areaFirst = `${toX(0)},${pad.top + innerH}`;
  const areaLast  = `${toX(points.length - 1)},${pad.top + innerH}`;
  const areaPath  = `${areaFirst} ${polyPts} ${areaLast}`;

  // Unique IDs for SVG gradients and filters to prevent overlap conflicts
  const randId = Math.floor(Math.random() * 1000000);
  const gradId = `chartGrad-${randId}`;
  const glowId = `chartGlow-${randId}`;

  // Dots + X labels
  let dots = '', xLabels = '';
  points.forEach((p, i) => {
    const cx = toX(i), cy = toY(p.y);
    const isLast = i === points.length - 1;
    dots += `<circle cx="${cx}" cy="${cy}" r="${isLast ? 4.5 : 3}" fill="${isLast ? color : 'var(--bg)'}" stroke="${color}" stroke-width="2"/>`;
    if (i === 0 || i === points.length - 1 || (points.length <= 6)) {
      xLabels += `<text x="${cx}" y="${H - 6}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="'DM Sans', sans-serif">${p.x}</text>`;
    }
    if (isLast) {
      dots += `<text x="${cx}" y="${cy - 9}" font-size="10.5" fill="${color}" font-weight="700" text-anchor="middle" font-family="'DM Sans', sans-serif" style="text-shadow: 0 1px 4px rgba(0,0,0,0.8);">${p.y % 1 === 0 ? p.y : p.y.toFixed(1)}</text>`;
    }
  });

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible;">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
      <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    ${grid}
    <polygon points="${areaPath}" fill="url(#${gradId})"/>
    <polyline points="${polyPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#${glowId})"/>
    ${dots}
    ${xLabels}
  </svg>`;
}

// Renders set badges HTML for a given sets array and exercise type.
// Returns empty string if no sets.
function _renderSetBadges(sets, type) {
  if (!sets || sets.length === 0) return '';
  if (type === 'cardio') {
    return sets.map(s => {
      const tBadge = (s.type && s.type !== 'N') ? `<span style="color:${TYPE_COLORS[s.type]};font-weight:700;margin-right:4px;">${s.type}</span>` : '';
      const rBadge = s.rpe ? `<span style="opacity:0.6;margin-left:4px;">@${s.rpe}</span>` : '';
      return `<span class="set-badge">${tBadge}${s.km}km ${s.time} (${s.pace})${rBadge}</span>`;
    }).join('');
  }
  if (type === 'stretch') {
    return sets.map(s => `<span class="set-badge">${s.minutes} ${typeof t === 'function' ? t('colMin') : 'min'}</span>`).join('');
  }
  return sets.map(s => {
    const tBadge = (s.type && s.type !== 'N') ? `<span style="color:${TYPE_COLORS[s.type]};font-weight:700;margin-right:4px;">${s.type}</span>` : '';
    const rBadge = s.rpe ? `<span style="opacity:0.6;margin-left:4px;">@${s.rpe}</span>` : '';
    return `<span class="set-badge">${tBadge}${s.weight}kg × ${s.reps}${rBadge}</span>`;
  }).join('');
}
