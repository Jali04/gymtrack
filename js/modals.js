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
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.style.zIndex = '';
  
  if (id === 'addExerciseModal') {
    window._openedFromPicker = false;
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
function openExportModal() {
  openModal('exportModal');
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
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(db))));
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

function _mergeImportedDb(imported) {
  // Template-share format: {v:'t', t:{...}, e:[...]}
  if (imported.v === 't' && imported.t && imported.e) {
    imported.e.forEach(ex => { if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex); });
    if (!db.templates.find(x => x.id === imported.t.id)) db.templates.push(imported.t);
    save(); closeModal('importModal'); renderTemplates(); renderExercises();
    showToast(t('tmplImportSuccess'));
    return;
  }
  // Program-share format: {v:'p', p:{...}, t:[...], e:[...]}
  if (imported.v === 'p' && imported.p && imported.t && imported.e) {
    imported.e.forEach(ex => { if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex); });
    imported.t.forEach(tmpl => { if (!db.templates.find(x => x.id === tmpl.id)) db.templates.push(tmpl); });
    if (!db.programs) db.programs = [];
    if (!db.programs.find(x => x.id === imported.p.id)) db.programs.push(imported.p);
    save(); closeModal('importModal'); renderTemplates(); renderExercises();
    if (typeof renderPrograms === 'function') renderPrograms();
    showToast('✓ Programm importiert!');
    return;
  }
  if (!imported.exercises || !imported.workouts) throw new Error('invalid');
  imported.exercises.forEach(ex => { if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex); });
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
