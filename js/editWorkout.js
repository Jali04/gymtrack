/* =============================================
   GYMTRACK — Edit Past Workout
   ============================================= */

let editingWorkoutId   = null;
let editingWorkoutCopy = null;
let editWorkoutSetIdx  = null;

function openEditWorkout(workoutId) {
  const w = db.workouts.find(x => x.id === workoutId); if (!w) return;
  editingWorkoutId   = workoutId;
  editingWorkoutCopy = JSON.parse(JSON.stringify(w));
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const d      = new Date(w.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('editWorkoutTitle').textContent        = d;
  document.getElementById('btnEditWorkoutAddEx').textContent     = '+ ' + t('addExercise').replace('+ ', '');
  document.getElementById('btnSaveEditWorkout').textContent      = '✓ ' + t('saveChanges');
  renderEditWorkout();
  openModal('editWorkoutModal');
}

function renderEditWorkout() {
  const container = document.getElementById('editWorkoutExercises');
  const ex        = editingWorkoutCopy.exercises;
  if (!ex || ex.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 0;"><div class="empty-text">${t('enterExercise')}</div></div>`;
    return;
  }
  container.innerHTML = ex.map((e, i) => {
    const exDef    = getEx(e.exId);
    const name     = e.isCustom ? e.customName : (exDef ? exDef.name : t('noEntries'));
    const type     = e.isCustom ? getCatType(e.customCategory) : (exDef ? getCatType(exDef.category) : 'strength');
    const catLabel = e.isCustom ? (t('cats')[e.customCategory] || e.customCategory) : (exDef ? (t('cats')[exDef.category] || exDef.category) : '');
    const catClass = getCatClass(type);
    const hiits = e.hiitSets || [];
    let setsHtml = _renderSetBadges(e.sets, type);
    if (!setsHtml && !e.timerSec && hiits.length === 0) {
      setsHtml = `<span style="color:var(--muted);font-size:13px;">${t('noEntries')}</span>`;
    }
    const hiitsHtml = hiits.map(h => `<span class="set-badge" style="border-color:var(--accent);">⏱ ${h.duration}s${h.note?' ('+h.note+')':''}</span>`).join('');
    const timerBadge = e.timerSec ? `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';

    return `<div class="exercise-card" style="cursor:default;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="exercise-name">${name}<span class="cat-badge ${catClass}" style="margin-left:6px;">${catLabel}</span></div>
        <button class="close-btn" onclick="removeEditWorkoutExercise(${i})">✕</button>
      </div>
      ${e.note ? `<div style="font-size:12px;color:var(--muted);margin-top:6px;">💬 ${e.note}</div>` : ''}
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}${hiitsHtml}${timerBadge}</div>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px;" onclick="openEditWorkoutSets(${i})">
        ${e.sets.length > 0 ? t('editSets') : t('enterSets')}
      </button>
    </div>`;
  }).join('');
}

function removeEditWorkoutExercise(idx) {
  editingWorkoutCopy.exercises.splice(idx, 1);
  renderEditWorkout();
  haptic('light');
}

function openEditWorkoutSets(idx) {
  editWorkoutSetIdx   = idx;
  currentWorkoutExIdx = null; // signals saveSets that we're in edit mode
  const we   = editingWorkoutCopy.exercises[idx];
  const ex   = getEx(we.exId);
  const type = we.isCustom ? getCatType(we.customCategory) : (ex ? getCatType(ex.category) : 'strength');
  const name = we.isCustom ? we.customName : (ex ? ex.name : '');
  currentExCategory = type;
  document.getElementById('logSetsTitle').textContent = name;

  _setupSetColHeaders(type);

  const lpDiv = document.getElementById('lastPerformance');
  lpDiv.innerHTML = ex && ex.notes && !we.isCustom
    ? `<div style="background:rgba(200,241,53,0.07);border:1px solid rgba(200,241,53,0.2);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);">📝 ${ex.notes}</div>`
    : '';

  document.getElementById('sessionNote').value = we.note || '';
  const container = document.getElementById('setsContainer');
  container.innerHTML = '';
  if (we.sets.length === 0) addSetRow();
  else we.sets.forEach(s => addSetRow(s));
  openModal('logSetsModal');
}

function openExercisePickerForEdit() {
  window._pickerMode = 'edit';
  openExercisePicker();
}

function saveEditWorkout() {
  const idx = db.workouts.findIndex(x => x.id === editingWorkoutId); if (idx === -1) return;
  editingWorkoutCopy.exercises = editingWorkoutCopy.exercises.filter(e => e.sets.length > 0 || e.timerSec > 0);
  db.workouts[idx] = editingWorkoutCopy;
  save();
  closeModal('editWorkoutModal');
  renderLog(); renderHistory(); renderStats();
  editingWorkoutId = null; editingWorkoutCopy = null;
  showToast(t('saveChanges') + ' ✓');
}

function closeEditWorkout() {
  editingWorkoutId = null; editingWorkoutCopy = null; editWorkoutSetIdx = null;
  window._pickerMode = null;
  closeModal('editWorkoutModal');
}
