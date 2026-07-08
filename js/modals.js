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

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  
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
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
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
}

function closeSubModal(id) {
  closeModal(id);
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
    showToast('✓ Verlauf kopiert!');
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
    save(); closeModal('importModal'); renderTemplates(); renderExercises();
    if (typeof renderPrograms === 'function') renderPrograms();
    showToast('✓ Programm importiert!');
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
  save(); closeModal('importModal'); renderStats(); renderHistory();
  showToast(t('importSuccess'));
}

async function doImport() {
  const raw = document.getElementById('importText').value.trim();
  if (!raw) { alert(t('enterExportCode')); return; }
  try {
    const imported = await decompressPayload(raw);
    _mergeImportedDb(imported);
  } catch(e) { alert(t('importError')); }
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
  } catch(e) { alert(t('importError')); }
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
