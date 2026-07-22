/* =============================================
   GYMTRACK — Modal System
   ============================================= */

const SUB_MODALS = ['logSetsModal', 'exercisePickerModal', 'addExerciseModal'];

function isEditOpen() {
  return document.getElementById('editWorkoutModal').classList.contains('open');
}

function isTimerLogOpen() {
  return document.getElementById('hiitLogModal').classList.contains('open') || 
         document.getElementById('logTimerModal').classList.contains('open');
}

// C3 — back-button / history integration.
// Each opened modal pushes a history entry so the Android/browser Back button
// (or back-swipe) closes the top-most modal instead of exiting the PWA.
let _modalPopSuppress = false;

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const wasOpen = el.classList.contains('open');

  // Dynamic Z-Index for nested modals
  const openModals = document.querySelectorAll('.modal-overlay.open');
  let maxZ = 1000;
  openModals.forEach(m => {
    const z = parseInt(window.getComputedStyle(m).zIndex, 10);
    if (!isNaN(z) && z > maxZ) maxZ = z;
  });

  el.style.zIndex = maxZ + 1;
  el.classList.add('open');

  // Prevent background scrolling
  document.body.classList.add('modal-open');

  // Push a history entry only when the modal newly opens.
  if (!wasOpen) {
    try { history.pushState({ dscplnModal: id }, ''); } catch (e) {}
  }
}

function closeModal(id, fromPop) {
  const el = document.getElementById(id);
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  el.classList.remove('open');
  el.style.zIndex = '';

  if (id === 'addExerciseModal') {
    window._openedFromPicker = false;
  }

  // Closing the picker while in swap mode must reset it, otherwise the
  // next normal "add exercise" would silently replace an exercise.
  if (id === 'exercisePickerModal' && window._pickerMode === 'replace') {
    window._pickerMode = null;
    window._swapIdx    = null;
  }

  // Restore background scrolling if no other modals are open
  const openModals = document.querySelectorAll('.modal-overlay.open');
  if (openModals.length === 0) {
    document.body.classList.remove('modal-open');
  }

  // Balance the history entry we pushed on open — unless this close was itself
  // triggered by the Back button (popstate). Guard on our own state so we can
  // never accidentally navigate the PWA away.
  if (wasOpen && !fromPop && !_modalPopSuppress &&
      history.state && history.state.dscplnModal) {
    _modalPopSuppress = true;
    try { history.back(); } catch (e) { _modalPopSuppress = false; }
  }
}

window.addEventListener('popstate', () => {
  // A close we initiated via history.back() — consume and reset the flag.
  if (_modalPopSuppress) { _modalPopSuppress = false; return; }
  // Back pressed with a modal open → close the top-most one (consume the pop).
  const open = document.querySelectorAll('.modal-overlay.open');
  if (!open.length) return;
  let top = null, maxZ = -Infinity;
  open.forEach(m => {
    const z = parseInt(window.getComputedStyle(m).zIndex, 10) || 0;
    if (z >= maxZ) { maxZ = z; top = m; }
  });
  if (!top) return;
  if (typeof SUB_MODALS !== 'undefined' && SUB_MODALS.includes(top.id)) closeSubModal(top.id, true);
  else closeModal(top.id, true);
});

/* ---- Styled confirm / alert (replace native confirm()/alert()) ---- */
let _confirmResolver = null;

function showConfirm(message, opts = {}) {
  // Returns a Promise<boolean>. Usage: if (!await showConfirm(msg)) return;
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    // Fallback to native confirm if the styled modal isn't in the DOM.
    if (!modal) { resolve(window.confirm(message)); return; }

    const titleEl = document.getElementById('confirmModalTitle');
    const textEl  = document.getElementById('confirmModalText');
    const yesBtn  = document.getElementById('confirmModalYes');
    const noBtn   = document.getElementById('confirmModalNo');

    const danger = opts.danger !== false; // destructive by default
    titleEl.textContent = opts.title || t('confirmTitle');
    textEl.textContent  = message || '';
    yesBtn.textContent  = opts.confirmText || t(danger ? 'confirmDeleteYes' : 'confirmYes');
    noBtn.textContent   = opts.cancelText || t('confirmNo');
    yesBtn.className     = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');

    // Resolve exactly once, then tear down listeners.
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      _confirmResolver = null;
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      modal.removeEventListener('click', onBackdrop);
      closeModal('confirmModal');
      try { haptic(result ? 'medium' : 'light'); } catch (e) {}
      resolve(result);
    };
    const onYes = () => finish(true);
    const onNo  = () => finish(false);
    const onBackdrop = (e) => { if (e.target === modal) finish(false); };

    _confirmResolver = onNo; // let a global "back"/escape cancel it

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
    modal.addEventListener('click', onBackdrop);

    openModal('confirmModal');
  });
}

// Non-blocking replacement for alert() — informational toast.
function showAlert(message) {
  if (typeof showToast === 'function') showToast(message);
  else window.alert(message);
}

function closeSubModal(id, fromPop) {
  closeModal(id, fromPop);
  if (typeof editingWorkoutCopy !== 'undefined' && editingWorkoutCopy && isEditOpen()) {
    if (id === 'logSetsModal') editWorkoutSetIdx = null;
    if (id === 'exercisePickerModal') window._pickerMode = null;
    openModal('editWorkoutModal');
    renderEditWorkout();
  }
  if (isTimerLogOpen()) {
    if (id === 'exercisePickerModal' || id === 'addExerciseModal') {
      window._pickerMode = null;
      // Triggers a re-render of the timer modal via a global callback if defined
      if (typeof window._reRenderTimerLog === 'function') window._reRenderTimerLog();
    }
  }
}

/* ---- Compression helpers for share codes ---- */
async function compressPayload(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs     = new CompressionStream('gzip');
      const stream = new Blob([json], { type: 'application/json' }).stream().pipeThrough(cs);
      const buf    = await new Response(stream).arrayBuffer();
      const bytes  = new Uint8Array(buf);
      let binary   = '';
      for (let b of bytes) binary += String.fromCharCode(b);
      return 'gz:' + btoa(binary);
    } catch(e) {}
  }
  return btoa(unescape(encodeURIComponent(json)));
}

async function decompressPayload(code) {
  if (code.startsWith('gz:')) {
    const bin   = atob(code.slice(3));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream !== 'undefined') {
      const ds     = new DecompressionStream('gzip');
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      return JSON.parse(await new Response(stream).text());
    }
  }
  return JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
}

/* ---- Export / Import ---- */
function openSettingsHub() {
  // Sync training-setting toggles with current db state
  const wl = document.getElementById('settingWakeLock');
  if (wl) wl.checked = !(db.settings && db.settings.wakeLock === false);
  const rs = document.getElementById('settingRestSound');
  if (rs) rs.checked = !(db.restTimer && db.restTimer.sound === false);
  const rir = document.getElementById('settingRir');
  if (rir) rir.checked = !!(db.settings && db.settings.rir);
  const unitBtn = document.getElementById('btnSettingsUnit');
  if (unitBtn) unitBtn.textContent = (db.settings && db.settings.unit === 'lbs') ? 'lbs' : 'kg';
  // C4: localize the training-settings labels added this session for EN users.
  if (typeof lang !== 'undefined' && lang === 'en') {
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('lblSettingsWakeLock', 'Keep screen on during training');
    set('lblSettingsWakeLockDesc', 'Screen stays on during workouts & HIIT');
    set('lblSettingsRestSound', 'Rest-timer sound');
    set('lblSettingsRestSoundDesc', 'Beep at the end of a rest period');
    set('lblSettingsRir', 'Show RPE as RIR');
    set('lblSettingsRirDesc', 'Reps in Reserve instead of RPE (RIR = 10 − RPE)');
    set('lblSettingsUnit', 'Unit');
    set('lblSettingsUnitDesc', 'Show weights in kilograms or pounds');
    set('lblAutoBackup', 'Automatic backup');
  }
  if (typeof _refreshAutoBackupUI === 'function') _refreshAutoBackupUI();
  openModal('settingsHubModal');
}

function copyExport() {
  const text = document.getElementById('exportText');
  text.select();
  try { navigator.clipboard.writeText(text.value).catch(() => document.execCommand('copy')); }
  catch(e) { document.execCommand('copy'); }
  document.getElementById('copyConfirm').textContent = t('copied');
  document.getElementById('copyConfirm').style.display = 'block';
  showToast(t('copied'));
}

async function exportAsFile() {
  // Ensure photo dataUrls are hydrated back into db so the backup includes them.
  if (typeof _ensurePhotosReady === 'function') await _ensurePhotosReady();
  const json = JSON.stringify(db);
  const date = new Date().toISOString().split('T')[0];
  try {
    if (typeof CompressionStream !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const cs = new CompressionStream('gzip');
      const stream = blob.stream().pipeThrough(cs);
      const compressed = await new Response(stream).blob();
      _triggerDownload(compressed, `gymtrack_${date}.gymdata.gz`);
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      _triggerDownload(blob, `gymtrack_${date}.gymdata`);
    }
    showToast(t('exportFileSuccess'));
  } catch(e) { showToast(t('exportFileError')); }
}

// E4: CSV export of all logged sets (Datum, Übung, Satz, kg, Wdh, RPE, …).
function exportWorkoutsCsv() {
  const de = lang !== 'en';
  const esc = v => {
    const s = (v == null ? '' : String(v));
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = de
    ? ['Datum', 'Uhrzeit', 'Übung', 'Kategorie', 'Satz', 'Typ', 'kg', 'Wdh', 'RPE', 'km', 'Zeit', 'Minuten', 'Haltezeit (s)']
    : ['Date', 'Time', 'Exercise', 'Category', 'Set', 'Type', 'kg', 'Reps', 'RPE', 'km', 'Time', 'Minutes', 'Hold (s)'];
  const rows = [header.join(';')];
  const fmtDate = ts => { const d = new Date(ts); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; };
  const fmtTime = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

  const sorted = [...(db.workouts || [])].sort((a, b) => (a.startTime || a.date || 0) - (b.startTime || b.date || 0));
  sorted.forEach(w => {
    const ts = w.startTime || w.date;
    (w.exercises || []).forEach(e => {
      const exObj = e.isCustom ? null : getEx(e.exId);
      const exName = e.isCustom ? e.customName : (exObj ? exObj.name : e.exId);
      const cat = e.isCustom ? e.customCategory : (exObj ? exObj.category : '');
      (e.sets || []).forEach((s, i) => {
        rows.push([
          fmtDate(ts), fmtTime(ts), esc(exName), esc(cat), i + 1,
          s.type || 'N',
          s.weight != null ? s.weight : '',
          s.reps != null ? s.reps : '',
          s.rpe != null ? s.rpe : '',
          s.km != null ? s.km : '',
          s.time || '',
          s.minutes != null ? s.minutes : '',
          s.secs != null ? s.secs : ''
        ].join(';'));
      });
    });
  });

  if (rows.length <= 1) { showToast(de ? 'Keine Workouts zum Exportieren' : 'No workouts to export'); return; }
  const csv = '﻿' + rows.join('\r\n'); // BOM for Excel
  const date = new Date().toISOString().split('T')[0];
  _triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `dscpln_workouts_${date}.csv`);
  showToast(de ? '✓ CSV exportiert' : '✓ CSV exported');
}

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function shareToNotes() {
  // Prepare backup code first (fills hidden textarea)
  if (typeof _ensurePhotosReady === 'function') await _ensurePhotosReady();
  const payload = await compressPayload(db);
  document.getElementById('exportText').value = payload;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'GymTrack Backup', text: payload });
    } catch(e) {
      if (e.name !== 'AbortError') copyExport();
    }
  } else {
    copyExport();
  }
}

async function exportToNotesReadable() {
  const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const fmt = ts => {
    const d = new Date(ts);
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const fmtTime = ts => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const sorted = [...db.workouts].sort((a, b) =>
    new Date(b.date || b.startTime) - new Date(a.date || a.startTime)
  );

  let lines = ['DSCPLN — Trainings-Verlauf', `Exportiert: ${fmt(Date.now())}`, ''];

  sorted.forEach(w => {
    const dateStr = fmt(w.date || w.startTime);
    const from = fmtTime(w.startTime);
    const to   = fmtTime(w.endTime);
    const dur  = (w.startTime && w.endTime)
      ? ` (${Math.round((w.endTime - w.startTime) / 60000)} min)`
      : '';
    lines.push(`▶ ${dateStr}${from ? '  ' + from + (to ? '–' + to : '') : ''}${dur}`);
    if (w.note) lines.push(`  Notiz: ${w.note}`);

    (w.exercises || []).forEach(ex => {
      const exObj = db.exercises.find(e => e.id === ex.exId);
      const exName = exObj ? exObj.name : ex.exId;
      lines.push(`  • ${exName}`);
      (ex.sets || []).forEach((st, si) => {
        let setLine = `    ${si + 1}.`;
        if (st.type && st.type !== 'N') setLine += ` [${st.type}]`;
        if (st.weight != null && st.reps != null) setLine += ` ${st.weight} kg × ${st.reps} Wdh`;
        else if (st.distance != null) setLine += ` ${st.distance} km`;
        if (st.time != null) setLine += ` / ${st.time} min`;
        if (st.rpe != null) setLine += `  RPE ${st.rpe}`;
        lines.push(setLine);
      });
    });
    lines.push('');
  });

  const text = lines.join('\n');

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Meine Trainings', text });
      return;
    } catch(e) {
      if (e.name === 'AbortError') return;
    }
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    showToast(lang==='en'?'✓ History copied!':'✓ Verlauf kopiert!');
  } catch(e) { showToast('Fehler beim Kopieren'); }
}

function openImportModal() {
  document.getElementById('importText').value = '';
  const fi = document.getElementById('importFileInput');
  if (fi) fi.value = '';
  openModal('importModal');
}

function _registerCustomCategory(category) {
  if (!category) return;
  const standardCategories = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Dehnen'];
  if (!standardCategories.includes(category)) {
    if (!db.customCategories) db.customCategories = {};
    if (!db.customCategories[category]) {
      let type = 'strength';
      const catLower = category.toLowerCase();
      if (catLower.includes('cardio') || catLower.includes('lauf') || catLower.includes('ausdauer') || catLower.includes('run') || catLower.includes('hiit') || catLower.includes('ausd')) {
        type = 'cardio';
      } else if (catLower.includes('dehnen') || catLower.includes('stretch') || catLower.includes('yoga') || catLower.includes('flex')) {
        type = 'stretch';
      }
      db.customCategories[category] = type;
    }
  }
}

function _mergeImportedDb(imported) {
  // Merge customCategories if present in the imported backup
  if (imported.customCategories) {
    if (!db.customCategories) db.customCategories = {};
    Object.assign(db.customCategories, imported.customCategories);
  }

  // Template-share format: {v:'t', t:{...}, e:[...]}
  if (imported.v === 't' && imported.t && imported.e) {
    imported.e.forEach(ex => {
      _registerCustomCategory(ex.category);
      if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex);
    });
    if (imported.t.id !== undefined && imported.t.id !== null) {
      imported.t.id = String(imported.t.id);
    }
    if (!db.templates.find(x => String(x.id) === String(imported.t.id))) db.templates.push(imported.t);
    if (typeof runMigrations === 'function') runMigrations(db, true);
    save(); closeModal('importModal'); renderTemplates(); renderExercises();
    showToast(t('tmplImportSuccess'));
    return;
  }
  // Program-share format: {v:'p', p:{...}, t:[...], e:[...]}
  if (imported.v === 'p' && imported.p && imported.t && imported.e) {
    imported.e.forEach(ex => {
      _registerCustomCategory(ex.category);
      if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex);
    });
    imported.t.forEach(tmpl => {
      if (tmpl.id !== undefined && tmpl.id !== null) {
        tmpl.id = String(tmpl.id);
      }
      if (!db.templates.find(x => String(x.id) === String(tmpl.id))) db.templates.push(tmpl);
    });
    if (imported.p.id !== undefined && imported.p.id !== null) {
      imported.p.id = String(imported.p.id);
    }
    if (imported.p.schedule) {
      for (let day in imported.p.schedule) {
        if (imported.p.schedule[day] !== undefined && imported.p.schedule[day] !== null) {
          imported.p.schedule[day] = String(imported.p.schedule[day]);
        }
      }
    }
    if (!db.programs) db.programs = [];
    if (!db.programs.find(x => String(x.id) === String(imported.p.id))) db.programs.push(imported.p);
    if (typeof runMigrations === 'function') runMigrations(db, true);
    save(); closeModal('importModal'); renderTemplates(); renderExercises();
    if (typeof renderPrograms === 'function') renderPrograms();
    showToast(lang==='en'?'✓ Program imported!':'✓ Programm importiert!');
    return;
  }
  if (!imported.exercises || !imported.workouts) throw new Error('invalid');
  imported.exercises.forEach(ex => {
    _registerCustomCategory(ex.category);
    if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex);
  });
  imported.workouts.forEach(w  => { if (!db.workouts.find(x  => x.id === w.id))  db.workouts.push(w); });
  if (imported.templates) {
    imported.templates.forEach(tmpl => { if (!db.templates.find(x => x.id === tmpl.id)) db.templates.push(tmpl); });
  }
  if (imported.programs) {
    if (!db.programs) db.programs = [];
    imported.programs.forEach(p => { if (!db.programs.find(x => x.id === p.id)) db.programs.push(p); });
  }
  if (imported.measurements) {
    if (!db.measurements) db.measurements = [];
    imported.measurements.forEach(m => { if (!db.measurements.find(x => x.id === m.id)) db.measurements.push(m); });
  }
  // Progress photos: restore image bytes into IndexedDB so they survive and
  // don't bloat the localStorage blob. (Previously photos were dropped on import.)
  if (imported.progressPics) {
    if (!db.progressPics) db.progressPics = [];
    imported.progressPics.forEach(p => {
      if (!p || db.progressPics.find(x => x.id === p.id)) return;
      db.progressPics.push(p);
      if (p.dataUrl && typeof photoStorePut === 'function') photoStorePut(p);
    });
    db.progressPics.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  if (imported.supplements) {
    if (!db.supplements) db.supplements = [];
    imported.supplements.forEach(s => { if (!db.supplements.find(x => x.id === s.id)) db.supplements.push(s); });
  }
  if (imported.supplementLog) {
    if (!db.supplementLog) db.supplementLog = [];
    imported.supplementLog.forEach(l => {
      if (!db.supplementLog.find(x => x.date === l.date && x.supId === l.supId)) {
        if (!l.id) l.id = 'suplog_' + uid();
        db.supplementLog.push(l);
      }
    });
  }
  if (typeof runMigrations === 'function') runMigrations(db, true);
  save(); closeModal('importModal'); renderStats(); renderHistory();
  showToast(t('importSuccess'));
}

async function doImport() {
  const raw = document.getElementById('importText').value.trim();
  if (!raw) { showAlert(t('enterExportCode')); return; }
  try {
    const imported = await decompressPayload(raw);
    _mergeImportedDb(imported);
  } catch(e) { showAlert(t('importError')); }
}

async function importFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    let text;
    if (file.name.endsWith('.gz') && typeof DecompressionStream !== 'undefined') {
      const buf = await file.arrayBuffer();
      const ds = new DecompressionStream('gzip');
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      text = await new Response(stream).text();
    } else {
      text = await file.text();
    }
    let imported;
    try { imported = JSON.parse(text); }
    catch { imported = JSON.parse(decodeURIComponent(escape(atob(text.trim())))); }
    _mergeImportedDb(imported);
  } catch(e) { showAlert(t('importError')); }
  event.target.value = '';
}

/* ---- Template Share ---- */
async function openTemplateShare(tmplId) {
  const tmpl = db.templates.find(x => x.id === tmplId);
  if (!tmpl) return;
  const exercises = tmpl.exerciseIds
    .map(id => db.exercises.find(e => e.id === id))
    .filter(Boolean)
    .map(({ id, name, category, notes }) => ({ id, name, category, ...(notes ? { notes } : {}) }));
  const payload = { v: 't', t: { id: tmpl.id, name: tmpl.name, exerciseIds: tmpl.exerciseIds }, e: exercises };
  const code    = await compressPayload(payload);
  document.getElementById('tmplShareCode').value = code;
  document.getElementById('tmplShareName').textContent = tmpl.name;
  document.getElementById('tmplShareCopyConfirm').style.display = 'none';
  openModal('tmplShareModal');
}

function copyTemplateShare() {
  const text = document.getElementById('tmplShareCode');
  text.select();
  try { navigator.clipboard.writeText(text.value).catch(() => document.execCommand('copy')); }
  catch(e) { document.execCommand('copy'); }
  document.getElementById('tmplShareCopyConfirm').style.display = 'block';
  showToast(t('copied'));
}

async function shareTemplateNative() {
  const code = document.getElementById('tmplShareCode').value;
  const name = document.getElementById('tmplShareName').textContent;
  if (navigator.share) {
    try {
      await navigator.share({ title: `GymTrack: ${name}`, text: code });
    } catch(e) {
      if (e.name !== 'AbortError') copyTemplateShare();
    }
  } else {
    copyTemplateShare();
  }
}

// Swipe down to close gesture for all modals
document.addEventListener('DOMContentLoaded', () => {
  initSwipeToClose();
});

function initSwipeToClose() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    const handle = modal.querySelector('.modal-handle');
    if (!handle) return;
    
    const overlay = modal.closest('.modal-overlay');
    if (!overlay) return;
    const modalId = overlay.id;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    handle.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      isDragging = true;
      modal.style.transition = 'none'; // Disable transition during active drag
    }, { passive: true });

    handle.addEventListener('touchmove', e => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const diffY = currentY - startY;
      
      if (diffY > 0) {
        modal.style.transform = `translateY(${diffY}px)`;
      }
    }, { passive: true });

    handle.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      modal.style.transition = ''; // Reset transition style

      const diffY = currentY - startY;
      if (diffY > 120) {
        // Dragged down far enough - animate slide down and close
        modal.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
          if (SUB_MODALS.includes(modalId)) {
            closeSubModal(modalId);
          } else {
            closeModal(modalId);
          }
          // Reset styles after modal closing is triggered
          modal.style.transition = '';
          modal.style.transform = '';
        }, 220);
      } else {
        // Snap back up
        modal.style.transform = '';
      }
      startY = 0;
      currentY = 0;
    });
  });
}
