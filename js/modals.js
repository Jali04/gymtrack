/* =============================================
   GYMTRACK — Modal System
   ============================================= */

const SUB_MODALS = ['logSetsModal', 'exercisePickerModal', 'addExerciseModal'];

function isEditOpen() {
  return document.getElementById('editWorkoutModal').classList.contains('open');
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (SUB_MODALS.includes(id) && isEditOpen()) {
    el.classList.add('overlay-top');
  } else {
    el.classList.remove('overlay-top');
  }
  el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.classList.remove('overlay-top');
}

function closeSubModal(id) {
  closeModal(id);
  if (typeof editingWorkoutCopy !== 'undefined' && editingWorkoutCopy) {
    if (id === 'logSetsModal') editWorkoutSetIdx = null;
    if (id === 'exercisePickerModal') window._pickerMode = null;
    openModal('editWorkoutModal');
    renderEditWorkout();
  }
}

/* ---- Export / Import ---- */
function openExportModal() {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(db))));
  document.getElementById('exportText').value = payload;
  document.getElementById('copyConfirm').style.display = 'none';
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

function openImportModal() {
  document.getElementById('importText').value = '';
  openModal('importModal');
}

function doImport() {
  const raw = document.getElementById('importText').value.trim();
  if (!raw) { alert(t('enterExportCode')); return; }
  try {
    const imported = JSON.parse(decodeURIComponent(escape(atob(raw))));
    // Template-share format: {v:'t', t:{...}, e:[...]}
    if (imported.v === 't' && imported.t && imported.e) {
      imported.e.forEach(ex => { if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex); });
      if (!db.templates.find(x => x.id === imported.t.id)) db.templates.push(imported.t);
      save(); closeModal('importModal'); renderTemplates(); renderExercises();
      showToast(t('tmplImportSuccess'));
      return;
    }
    if (!imported.exercises || !imported.workouts) throw new Error();
    imported.exercises.forEach(ex => { if (!db.exercises.find(e => e.id === ex.id)) db.exercises.push(ex); });
    imported.workouts.forEach(w  => { if (!db.workouts.find(x  => x.id === w.id))  db.workouts.push(w); });
    if (imported.templates) {
      imported.templates.forEach(tmpl => { if (!db.templates.find(x => x.id === tmpl.id)) db.templates.push(tmpl); });
    }
    save(); closeModal('importModal'); renderStats(); renderHistory();
    showToast(t('importSuccess'));
  } catch(e) { alert(t('importError')); }
}

/* ---- Template Share ---- */
function openTemplateShare(tmplId) {
  const tmpl = db.templates.find(x => x.id === tmplId);
  if (!tmpl) return;
  // Only include exercises referenced by this template
  const exercises = tmpl.exerciseIds
    .map(id => db.exercises.find(e => e.id === id))
    .filter(Boolean)
    .map(({ id, name, category, notes }) => ({ id, name, category, ...(notes ? { notes } : {}) }));
  const payload = { v: 't', t: { id: tmpl.id, name: tmpl.name, exerciseIds: tmpl.exerciseIds }, e: exercises };
  const code    = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
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
