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

/* =============================================
   ABTEILUNGEN (Domains)
   Gym und Mobility teilen sich ein Datenmodell: Übungen, Vorlagen und Workouts
   tragen ein `domain`-Feld statt in getrennten Tabellen zu leben. Dadurch kann
   eine Gym-Session Mobility-Blöcke enthalten ('mixed'), und Progress, Kalender
   und AI Coach lesen beide Abteilungen ohne Sonderlogik.
   ============================================= */
const DOMAIN_GYM      = 'gym';
const DOMAIN_MOBILITY = 'mobility';
const DOMAIN_MIXED    = 'mixed';   // nur für Vorlagen/Workouts

// Kategorien, die inhaltlich zur Mobility-Abteilung gehören.
const MOBILITY_CATEGORIES = ['Dehnen', 'Mobility', 'Stretching'];

/* Die Abteilung einer Übung wird IMMER aus ihrer Kategorie hergeleitet, nie aus
   einem gespeicherten Feld gelesen. Sonst bliebe eine Übung, die der Nutzer von
   "Brust" nach "Dehnen" umkategorisiert, für immer in der Gym-Abteilung hängen.
   `ex.domain` ist nur die denormalisierte Kopie für SQL-Abfragen; save() hält
   sie über refreshExerciseDomains() nach.

   Eine eigene Kategorie vom Typ 'stretch' zählt ebenfalls als Mobility — so
   kann der Nutzer die Abteilung um eigene Kategorien erweitern. */
function getExerciseDomain(ex) {
  if (!ex) return DOMAIN_GYM;
  if (MOBILITY_CATEGORIES.includes(ex.category)) return DOMAIN_MOBILITY;
  if (getCatType(ex.category) === 'stretch') return DOMAIN_MOBILITY;
  return DOMAIN_GYM;
}

/* Gleicht die gespeicherte Kopie an die Herleitung an. updated_at wird nur
   angefasst, wenn sich wirklich etwas ändert — sonst würde jeder save() eine
   überflüssige Sync-Runde auslösen. */
function refreshExerciseDomains() {
  (db.exercises || []).forEach(ex => {
    const d = getExerciseDomain(ex);
    if (ex.domain !== d) {
      ex.domain = d;
      ex.updated_at = Date.now();
    }
  });
}

// Die Abteilung einer Sammlung von Übungs-IDs: 'gym', 'mobility' oder 'mixed'.
function resolveDomainForExerciseIds(exerciseIds) {
  let hasGym = false, hasMob = false;
  (exerciseIds || []).forEach(id => {
    const ex = (db.exercises || []).find(e => String(e.id) === String(id));
    if (!ex) return;
    if (getExerciseDomain(ex) === DOMAIN_MOBILITY) hasMob = true; else hasGym = true;
  });
  if (hasMob && hasGym) return DOMAIN_MIXED;
  if (hasMob) return DOMAIN_MOBILITY;
  return DOMAIN_GYM;
}

/* Die Abteilung eines Workouts aus seinen geloggten Blöcken.

   `intendedDomain` hält fest, aus welcher Abteilung die Einheit gestartet
   wurde. Sie zählt mit: eine frisch gestartete, noch leere Mobility-Session
   bleibt Mobility, und wer in einer Gym-Einheit eine Dehnübung loggt, bekommt
   'mixed' — die Einheit taucht dann in beiden Abteilungen auf. */
function resolveWorkoutDomain(workout) {
  if (!workout) return DOMAIN_GYM;
  const fromExercises = resolveDomainForExerciseIds((workout.exercises || []).map(e => e.exId));
  const intended = workout.intendedDomain;
  if (!intended || intended === DOMAIN_MIXED) {
    return (workout.exercises || []).length ? fromExercises : (intended || DOMAIN_GYM);
  }
  if (!(workout.exercises || []).length) return intended;
  if (fromExercises === DOMAIN_MIXED || fromExercises !== intended) return DOMAIN_MIXED;
  return intended;
}

/* Hält workout.domain aktuell. Wird bei jedem save() für die laufende Einheit
   aufgerufen, damit die Abteilung stimmt, egal über welchen Weg eine Übung
   hinzugekommen ist (Picker, Vorlage, HIIT-Timer, Programm). */
function refreshWorkoutDomain(workout) {
  if (!workout) return;
  workout.domain = resolveWorkoutDomain(workout);
}

// Zählt ein Workout für die angegebene Abteilung? 'mixed' zählt für beide —
// genau das macht den Interconnect aus.
/* =============================================
   ERNÄHRUNGSPLÄNE
   Zugriff läuft ausschliesslich über diese Helfer, damit der Plan in
   `db.mealPlans` liegt (und damit synchronisiert wird) statt im alten,
   rein lokalen `db.mealPlanText`.
   ============================================= */
function getMealPlans() {
  if (!Array.isArray(db.mealPlans)) db.mealPlans = [];
  return db.mealPlans;
}

// Der aktive Plan, oder der erste vorhandene. Gibt null zurück, wenn der Nutzer
// noch keinen Plan angelegt hat.
function getActiveMealPlan() {
  const plans = getMealPlans();
  return plans.find(p => p && p.active) || plans[0] || null;
}

function getActiveMealPlanText() {
  const plan = getActiveMealPlan();
  return plan ? (plan.content || '') : '';
}

// Schreibt den Text in den aktiven Plan und legt ihn an, falls noch keiner
// existiert. Ruft save() NICHT selbst auf — der Aufrufer entscheidet, wann
// gespeichert wird.
function setActiveMealPlanText(text) {
  const plans = getMealPlans();
  let plan = getActiveMealPlan();
  if (!plan) {
    plan = {
      id: 'mp_' + uid(),
      name: 'Mein Plan',
      active: true,
      sortOrder: 0,
      content: ''
    };
    plans.push(plan);
  }
  plan.content = text;
  plan.active = true;
  plan.updated_at = Date.now();
  return plan;
}

function workoutMatchesDomain(workout, domain) {
  if (!domain || domain === 'all') return true;
  const d = workout && workout.domain ? workout.domain : resolveWorkoutDomain(workout);
  return d === domain || d === DOMAIN_MIXED;
}

const TYPE_COLORS = { 'N': 'var(--text)', 'W': '#f5a623', 'D': '#d0021b' };
function getCatClass(type) {
  return type === 'cardio' ? 'cat-cardio'
       : type === 'stretch' ? 'cat-stretch'
       : type === 'isometric' ? 'cat-isometric'
       : type === 'time' ? 'cat-time'
       : 'cat-strength';
}

/* Duration helpers for the time-only exercise type ("Zeit"): sets store a plain
   number of seconds in `secs` (same field as an isometric hold), but a pure
   time exercise can easily run minutes, so it is shown/entered as m:ss. */
function fmtDurSec(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
// Accepts "90", "1:30", "1:30,5" — anything else yields null.
function parseDurSec(v) {
  if (v == null) return null;
  const str = String(v).trim().replace(',', '.');
  if (!str) return null;
  if (str.includes(':')) {
    const p = str.split(':');
    const m = parseInt(p[0], 10) || 0;
    const s = parseFloat(p[1]) || 0;
    return Math.round(m * 60 + s);
  }
  const n = parseFloat(str);
  return isNaN(n) ? null : Math.round(n);
}

// Isometric holds track Load (weight, kg) × Hold time (seconds). Formats a set
// like "20 kg · 45s", or just "45s" for a bodyweight hold.
function _fmtIsoSet(s) {
  const secs = (s && s.secs != null && s.secs !== '') ? `${Number(s.secs)}s` : '';
  const w = Number(s && s.weight) || 0;
  const load = w > 0 ? (typeof fmtWeight === 'function' ? fmtWeight(w) : `${w} kg`) : '';
  return load ? `${load} · ${secs || '0s'}` : (secs || '0s');
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
if (!db.exerciseFlags) db.exerciseFlags = {}; // F4: local-only per-exercise flags (bodyweight, …)
if (!db.settings) db.settings = {};
if (typeof db.settings.wakeLock === 'undefined') db.settings.wakeLock = true;
if (typeof db.settings.barWeight === 'undefined') db.settings.barWeight = 20;
if (!Array.isArray(db.settings.plates)) db.settings.plates = [25, 20, 15, 10, 5, 2.5, 1.25];
if (typeof db.settings.rir === 'undefined') db.settings.rir = false;
if (db.settings.unit !== 'lbs' && db.settings.unit !== 'kg') db.settings.unit = 'kg';
if (!db.nutritionGoals) db.nutritionGoals = { calories: 2000, protein: 150, carbs: 200, fat: 70 };
if (!db.nutritionLog) db.nutritionLog = [];
// Ernährungspläne der Ernährungs-Abteilung. Ersetzt das frühere, rein lokale
// `db.mealPlanText` (siehe Migration 5) und wird mit Supabase synchronisiert.
if (!db.mealPlans) db.mealPlans = [];
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
  catch (e) { if (typeof showToast === 'function') showToast((typeof lang!=='undefined'&&lang==='en')?'Backup corrupted.':'Backup beschädigt.'); return; }

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
  try { runMigrations(db, true); } catch (e) {}
  _persistDb();
  if (typeof showToast === 'function') showToast((typeof lang!=='undefined'&&lang==='en')?'✓ Backup restored':'✓ Backup wiederhergestellt');
  setTimeout(() => location.reload(), 400);
}

const SCHEMA_VERSION = 6;

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
  },

  /* -------------------------------------------------------------
     5 — Persistenz-Lücken schließen.

     Diese Werte lagen bisher ausserhalb von `db.settings` bzw. nur im
     localStorage und wurden deshalb NIE in die Cloud synchronisiert: beim
     Gerätewechsel oder Leeren des Caches waren sie weg. `db.settings` landet
     über syncUserProfile() in profiles.settings — alles, was hier hineinzieht,
     ist ab sofort gesichert.

     Der API-Key des AI-Coaches bleibt bewusst rein lokal: ein Geheimnis gehört
     nicht in eine synchronisierte Profilspalte.
     ------------------------------------------------------------- */
  5: (data) => {
    let changed = false;
    if (!data.settings) data.settings = {};

    // Rest-Timer lag als Top-Level-Key neben settings statt darin.
    if (data.restTimer && typeof data.settings.restTimer === 'undefined') {
      data.settings.restTimer = data.restTimer;
      changed = true;
    }

    // Ernährungsplan: einzelner lokaler Textblock -> synchronisierte Liste.
    if (typeof data.mealPlanText === 'string' && data.mealPlanText.trim()) {
      if (!Array.isArray(data.mealPlans)) data.mealPlans = [];
      const alreadyMigrated = data.mealPlans.some(p => p && p.migratedFromText);
      if (!alreadyMigrated) {
        data.mealPlans.push({
          id: 'mp_' + (typeof uid === 'function' ? uid() : Date.now().toString(36)),
          name: 'Mein Plan',
          content: data.mealPlanText,
          active: true,
          sortOrder: 0,
          migratedFromText: true,
          updated_at: Date.now()
        });
        changed = true;
      }
    }

    // Einstellungen, die nur im localStorage lagen. Nur übernehmen, wenn in
    // settings noch nichts steht — sonst überschreibt ein alter lokaler Wert
    // bei jedem Boot die frisch aus der Cloud gezogene Einstellung.
    if (typeof localStorage !== 'undefined') {
      const pull = (lsKey, settingsKey) => {
        if (typeof data.settings[settingsKey] !== 'undefined') return;
        const v = localStorage.getItem(lsKey);
        if (v === null) return;
        data.settings[settingsKey] = v;
        changed = true;
      };
      pull('gymtrack_theme',    'theme');
      pull('gymLang',           'lang');
      pull('gym_ai_provider',   'aiProvider');
      pull('gym_ai_model',      'aiModel');
      pull('gym_ai_custom_model','aiCustomModel');
      pull('gym_ai_persona',    'aiPersona');
    }

    return changed;
  },

  /* -------------------------------------------------------------
     6 — Abteilungen: `domain` auf Übungen, Vorlagen und Workouts.

     Bestehende Dehn-Übungen wandern in die Mobility-Abteilung; alles andere
     bleibt Gym. Historische Workouts behalten ihre Sätze unverändert, sie
     bekommen nur ihre Abteilung angeheftet, damit Progress und Kalender sie
     ohne Neuberechnung filtern können.

     Läuft bei jedem Start über den Catch-up-Pass und muss darum idempotent
     sein: gesetzt wird ausschliesslich, was noch kein `domain` trägt.
     ------------------------------------------------------------- */
  6: (data) => {
    let changed = false;

    (data.exercises || []).forEach(ex => {
      if (ex && !ex.domain) {
        ex.domain = MOBILITY_CATEGORIES.includes(ex.category) ? DOMAIN_MOBILITY : DOMAIN_GYM;
        changed = true;
      }
    });

    // Vorlagen und Workouts leiten ihre Abteilung aus ihren Übungen ab. Die
    // Übungen oben tragen an dieser Stelle bereits ein domain.
    const domainOfIds = (ids) => {
      let hasGym = false, hasMob = false;
      (ids || []).forEach(id => {
        const ex = (data.exercises || []).find(e => String(e.id) === String(id));
        if (!ex) return;
        if (ex.domain === DOMAIN_MOBILITY) hasMob = true; else hasGym = true;
      });
      if (hasMob && hasGym) return DOMAIN_MIXED;
      if (hasMob) return DOMAIN_MOBILITY;
      return DOMAIN_GYM;
    };

    (data.templates || []).forEach(t => {
      if (t && !t.domain) {
        t.domain = domainOfIds(t.exerciseIds);
        changed = true;
      }
    });

    (data.workouts || []).forEach(w => {
      if (w && !w.domain) {
        w.domain = domainOfIds((w.exercises || []).map(e => e.exId));
        changed = true;
      }
    });

    if (data.currentWorkout && !data.currentWorkout.domain) {
      data.currentWorkout.domain = domainOfIds((data.currentWorkout.exercises || []).map(e => e.exId));
      changed = true;
    }

    return changed;
  }
};

// F10: `full` runs the catch-up pass over ALL migrations — needed only on
// startup and after import/merge (imported items may lack past migrations).
// Regular save() passes full=false, so once db.version === SCHEMA_VERSION the
// work is O(1) instead of O(n·migrations) on every single save.
function runMigrations(data, full) {
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

  // Catch-up pass for merged/imported datasets to handle missing migrations.
  if (full) {
    for (let v = 1; v <= SCHEMA_VERSION; v++) {
      if (MIGRATIONS[v](data)) {
        changed = true;
      }
    }
  }

  return changed;
}

// Run migrations on startup (full catch-up once).
if (runMigrations(db, true)) {
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

// Snapshot the template name onto template-based workouts so history and the
// per-day comparisons keep the real name even if the template is later deleted
// or its id is lost on a cloud sync (was showing "Freies Training").
// Deliberately NOT gated by a one-time flag: on a fresh install this runs
// before the first cloud pull, so anything pulled afterwards would never get a
// name. It is a cheap no-op once every workout carries one, and syncAll() calls
// it again after each pull.
// `touch` also bumps updated_at so the name is pushed to the cloud on the next
// cycle — only safe right after a pull, when the local rows are current.
function backfillTemplateNames(touch) {
  let changed = false;
  (db.workouts || []).forEach(w => {
    if (w && w.templateId && !w.templateName) {
      const tmpl = (db.templates || []).find(x => String(x.id) === String(w.templateId));
      if (tmpl && tmpl.name) {
        w.templateName = tmpl.name;
        if (touch) w.updated_at = Date.now();
        changed = true;
      }
    }
  });
  return changed;
}
if (backfillTemplateNames()) dbNeedsSave = true;

if (dbNeedsSave) {
  _persistDb();
}

// Boot the media store (async, non-blocking). Migrates photos to IndexedDB
// and slims the localStorage blob once they are safely stored.
_initPhotoStore();
// Weekly silent auto-backup (E3). Deferred so it never blocks first paint.
setTimeout(() => { try { maybeAutoBackup(false); } catch (e) {} }, 3000);

function save() {
  runMigrations(db); // fast path: no-op once already at SCHEMA_VERSION (F10)
  // Abteilungen nachziehen, bevor irgendetwas weggeschrieben wird: eine
  // umkategorisierte Übung wechselt so sofort die Abteilung, und die laufende
  // Einheit trägt immer die Abteilung ihrer tatsächlichen Blöcke.
  refreshExerciseDomains();
  refreshWorkoutDomain(db.currentWorkout);
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

/* ---- Trainingstag ("day") of a workout -------------------------------------
   A day is the template the workout was started from; everything logged
   without a template shares one free-training bucket. Progress trends and the
   "letztes Mal" ghost text both compare inside a single day, because the same
   exercise behaves differently depending on the day it sits in (fresh on an
   Upper day vs. late on a Pull day). */
const PROG_FREE_DAY = '__free__';

function _woDayKey(w) {
  return (w && w.templateId != null && w.templateId !== '') ? String(w.templateId) : PROG_FREE_DAY;
}

// Same day? Falls back to the snapshotted template name, so a workout whose
// template link was lost on an old cloud sync still matches its own day.
function _woSameDay(a, b) {
  if (!a || !b) return false;
  const ka = _woDayKey(a), kb = _woDayKey(b);
  if (ka === kb && ka !== PROG_FREE_DAY) return true;
  if (a.templateName && b.templateName) return a.templateName === b.templateName;
  return ka === kb;
}

function getEx(id) {
  return db.exercises.find(x => x.id === id);
}

/* =============================================
   EDITING CATEGORIES & EXERCISES WITHOUT LOSING TRACKING

   A set only means something together with the type it was logged in: 82.5 is
   kilos for a strength exercise, seconds for a hold, kilometres for cardio.
   The type is derived from the exercise's category, so re-categorising an
   exercise — or giving a category a new type — would silently re-read every
   set that was ever logged for it.

   Fix: whenever such a change touches data that already exists, the old
   entries get stamped with `exType`, the type they were actually logged in.
   Everything that renders history asks getEntryType() instead of the category,
   so the past keeps its units while new sessions use the new type.
   ============================================= */
const STD_CATEGORIES = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Dehnen'];
// Types whose sets are pure durations — only those convert into each other
// without inventing numbers that were never measured.
const DURATION_TYPES = ['time', 'isometric', 'stretch'];

function getEntryType(we) {
  if (!we) return 'strength';
  if (we.exType) return we.exType;
  if (we.isCustom) return getCatType(we.customCategory);
  const ex = getEx(we.exId);
  return ex ? getCatType(ex.category) : 'strength';
}

function isStdCategory(cat) { return STD_CATEGORIES.includes(cat); }

// Standard categories first (in their fixed order), then custom ones A→Z.
// A standard category that only carries a type override must not show twice.
function getAllCategories() {
  const custom = db.customCategories ? Object.keys(db.customCategories) : [];
  return STD_CATEGORIES.concat(custom.filter(c => !isStdCategory(c)).sort((a, b) => a.localeCompare(b)));
}

// A category's type lives in customCategories for custom AND standard ones;
// a standard category put back on its native type drops the override again.
function setCategoryType(cat, type) {
  if (!db.customCategories) db.customCategories = {};
  if (isStdCategory(cat) && CAT_TYPE[cat] === type) delete db.customCategories[cat];
  else db.customCategories[cat] = type;
}

/* ---- Logged entries ---- */
function _entryHasData(e) {
  return !!(e && ((e.sets && e.sets.length) || (e.hiitSets && e.hiitSets.length) || e.timerSec));
}

// Past workouts plus the running one — a change mid-session must reach it too.
function _allWorkoutsIncludingCurrent() {
  const wos = (db.workouts || []).slice();
  if (db.currentWorkout) wos.push(db.currentWorkout);
  return wos;
}

// How many logged entries a change would touch. `match` gets a workout exercise.
function countLoggedEntries(match) {
  let n = 0;
  _allWorkoutsIncludingCurrent().forEach(w => {
    (w.exercises || []).forEach(e => { if (match(e) && _entryHasData(e)) n++; });
  });
  return n;
}

// Freeze the type of everything already logged, so it keeps its old units.
function stampEntryType(match, type) {
  let n = 0;
  _allWorkoutsIncludingCurrent().forEach(w => {
    (w.exercises || []).forEach(e => {
      if (!match(e) || e.exType || !_entryHasData(e)) return;
      e.exType = type;
      n++;
    });
  });
  return n;
}

function _setSeconds(s) {
  if (!s) return 0;
  if (s.secs != null && s.secs !== '') return Math.round(Number(s.secs) || 0);
  if (s.minutes != null && s.minutes !== '') return Math.round((Number(s.minutes) || 0) * 60);
  if (s.time) {
    const p = String(s.time).split(':');
    if (p.length === 2) return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }
  return 0;
}

// Converting is only offered where the measured value survives the move:
// hold time ↔ pure duration ↔ stretch minutes. kg × reps or km simply have no
// counterpart in seconds, so those changes keep their history stamped instead.
function canConvertType(from, to) {
  return from !== to && DURATION_TYPES.includes(from) && DURATION_TYPES.includes(to);
}

function convertSetToType(s, from, to) {
  if (!s || from === to) return s;
  const secs = _setSeconds(s);
  if (to === 'time')    return { secs };
  if (to === 'stretch') return { minutes: Math.round((secs / 60) * 10) / 10 };
  if (to === 'isometric') {
    const out = { weight: Number(s.weight) || 0, secs };
    if (s.type) out.type = s.type;
    if (s.rpe != null) out.rpe = s.rpe;
    return out;
  }
  return s;
}

// Rewrite what can be rewritten into the new type and drop those stamps, so
// the history is read in one unit again. An entry whose values have no
// counterpart in the new type (kg × reps, kilometres) is never flattened —
// it keeps its own type instead, exactly as the "keep" answer would leave it.
function convertEntrySets(match, to) {
  let n = 0;
  _allWorkoutsIncludingCurrent().forEach(w => {
    (w.exercises || []).forEach(e => {
      if (!match(e)) return;
      const from = getEntryType(e);
      if (from === to) {
        if (e.exType) { delete e.exType; n++; }
      } else if (canConvertType(from, to)) {
        if (e.sets && e.sets.length) e.sets = e.sets.map(s => convertSetToType(s, from, to));
        if (e.exType) delete e.exType;
        n++;
      } else if (!e.exType && _entryHasData(e)) {
        e.exType = from;
      }
    });
  });
  return n;
}

// Matchers for the two things that can be re-typed.
function matchExerciseEntry(exId) {
  return e => !e.isCustom && e.exId === exId;
}
function matchCategoryEntry(cat) {
  const ids = (db.exercises || []).filter(x => x.category === cat).map(x => x.id);
  return e => e.isCustom ? e.customCategory === cat : ids.includes(e.exId);
}

/* ---- Archiving ----
   Retiring an exercise must never delete it: its sets are part of past
   workouts. An archived exercise disappears from the pickers and from the
   GymLab list, and stays readable everywhere its history is shown. */
function isArchivedEx(exId) {
  return !!(db.exerciseFlags && db.exerciseFlags[exId] && db.exerciseFlags[exId].archived);
}
function setArchivedEx(exId, on) {
  if (!exId) return;
  if (!db.exerciseFlags) db.exerciseFlags = {};
  if (on) db.exerciseFlags[exId] = Object.assign({}, db.exerciseFlags[exId], { archived: true });
  else if (db.exerciseFlags[exId]) delete db.exerciseFlags[exId].archived;
}
function activeExercises() {
  return (db.exercises || []).filter(e => !isArchivedEx(e.id));
}

/* ---- Category edits (data only — the UI lives in categories.js) ---- */
function renameCategory(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return 0;
  let n = 0;
  (db.exercises || []).forEach(e => { if (e.category === oldName) { e.category = newName; n++; } });
  _allWorkoutsIncludingCurrent().forEach(w => {
    (w.exercises || []).forEach(e => { if (e.isCustom && e.customCategory === oldName) e.customCategory = newName; });
  });
  if (db.customCategories && db.customCategories[oldName] != null) {
    const type = db.customCategories[oldName];
    delete db.customCategories[oldName];
    setCategoryType(newName, type);
  }
  return n;
}

// Moves every exercise of `cat` to `targetCat`, then drops the category.
// An empty category can be dropped without a target.
function deleteCategory(cat, targetCat) {
  if (!cat) return 0;
  let n = 0;
  if (targetCat && targetCat !== cat) {
    (db.exercises || []).forEach(e => { if (e.category === cat) { e.category = targetCat; n++; } });
    _allWorkoutsIncludingCurrent().forEach(w => {
      (w.exercises || []).forEach(e => { if (e.isCustom && e.customCategory === cat) e.customCategory = targetCat; });
    });
  }
  if (db.customCategories) delete db.customCategories[cat];
  return n;
}

/* =============================================
   F2 — kg / lbs unit system.
   Weights are ALWAYS stored in kg. These helpers convert only for display and
   input, so switching units never rewrites stored data.
   ============================================= */
const LB_PER_KG = 2.2046226218;
function unitLabel() { return (db.settings && db.settings.unit === 'lbs') ? 'lbs' : 'kg'; }
function _isLbs() { return unitLabel() === 'lbs'; }
// kg -> display-unit number (for input value fields; no label).
function fmtWeightNum(kg) {
  if (kg == null || kg === '') return '';
  const v = _isLbs() ? (Number(kg) * LB_PER_KG) : Number(kg);
  if (isNaN(v)) return '';
  return parseFloat(v.toFixed(_isLbs() ? 1 : 2));
}
// kg -> "82.5 kg" / "182 lbs" (opts.noUnit strips the label).
function fmtWeight(kg, opts) {
  opts = opts || {};
  const n = Number(kg) || 0;
  const v = _isLbs() ? (n * LB_PER_KG) : n;
  const rounded = _isLbs() ? Math.round(v * 10) / 10 : Math.round(v * 10) / 10;
  const numStr = (Math.round(rounded * 10) / 10).toString();
  return opts.noUnit ? numStr : `${numStr} ${unitLabel()}`;
}
// kg -> locale-grouped big number with unit, for volume totals ("1.000 kg").
function fmtWeightBig(kg) {
  const n = Number(kg) || 0;
  const v = _isLbs() ? (n * LB_PER_KG) : n;
  const loc = (typeof lang !== 'undefined' && lang === 'en') ? 'en-GB' : 'de-DE';
  return `${Math.round(v).toLocaleString(loc)} ${unitLabel()}`;
}
// display-unit input -> kg (accepts comma decimals). Returns null if invalid.
function toKg(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n)) return null;
  return _isLbs() ? (n / LB_PER_KG) : n;
}

// F4: bodyweight flag is kept in a local-only map (not in the synced exercises
// array) so a cloud pull can never clobber it and no remote schema is needed.
function isBodyweightEx(exId) {
  return !!(db.exerciseFlags && db.exerciseFlags[exId] && db.exerciseFlags[exId].bodyweight);
}
function setBodyweightEx(exId, on) {
  if (!exId) return;
  if (!db.exerciseFlags) db.exerciseFlags = {};
  if (on) db.exerciseFlags[exId] = Object.assign({}, db.exerciseFlags[exId], { bodyweight: true });
  else if (db.exerciseFlags[exId]) delete db.exerciseFlags[exId].bodyweight;
}

// F4: most recent measured body weight (kg), 0 if none logged.
function _latestBodyweight() {
  if (!db.measurements || !db.measurements.length) return 0;
  let best = null;
  db.measurements.forEach(m => {
    if (m.weight == null) return;
    if (!best || new Date(m.date) > new Date(best.date)) best = m;
  });
  return best ? (Number(best.weight) || 0) : 0;
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
  if (type === 'isometric') {
    return sets.map(s => {
      const tBadge = (s.type && s.type !== 'N') ? `<span style="color:${TYPE_COLORS[s.type]};font-weight:700;margin-right:4px;">${s.type}</span>` : '';
      const rBadge = s.rpe ? `<span style="opacity:0.6;margin-left:4px;">@${s.rpe}</span>` : '';
      return `<span class="set-badge">${tBadge}${_fmtIsoSet(s)}${rBadge}</span>`;
    }).join('');
  }
  if (type === 'time') {
    return sets.map(s => `<span class="set-badge">⏱ ${fmtDurSec(s.secs)}</span>`).join('');
  }
  return sets.map(s => {
    const tBadge = (s.type && s.type !== 'N') ? `<span style="color:${TYPE_COLORS[s.type]};font-weight:700;margin-right:4px;">${s.type}</span>` : '';
    const rBadge = s.rpe ? `<span style="opacity:0.6;margin-left:4px;">@${s.rpe}</span>` : '';
    return `<span class="set-badge">${tBadge}${fmtWeight(s.weight)} × ${s.reps}${rBadge}</span>`;
  }).join('');
}
