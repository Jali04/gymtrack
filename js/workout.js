/* =============================================
   GYMTRACK — Workout (active session)
   ============================================= */

let currentWorkoutExIdx = null;
let currentExCategory   = 'strength';
let timerInterval       = null;

/* ---- Stopwatch state ---- */
let swInterval = null;
let swElapsed  = 0;
let swRunning  = false;

function _fmtSwSec(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const r = (s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

function _hiitBadge(s) {
  const label = { tabata: 'Tabata', emom: 'EMOM', amrap: 'AMRAP', custom: 'Custom' };
  const rest  = s.restSec > 0 ? `/${s.restSec}s` : '';
  const time  = _fmtSwSec(s.totalSec);
  return `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⚡ ${label[s.mode] || s.mode} · ${s.rounds}×${s.workSec}s${rest} · ${time}</span>`;
}

/* ---- Log page ---- */
function renderLog() {
  if (db.currentWorkout) {
    document.getElementById('quickStart').style.display    = 'none';
    document.getElementById('activeWorkout').style.display = 'block';
    renderActiveWorkout();
    startTimer();
    return;
  }
  document.getElementById('quickStart').style.display    = 'block';
  document.getElementById('activeWorkout').style.display = 'none';
  _renderRestConfig();

  const locale  = lang === 'de' ? 'de-DE' : 'en-GB';
  const recent  = document.getElementById('recentWorkouts');
  const ws      = [...db.workouts].reverse();

  if (ws.length === 0) {
    recent.innerHTML = `<div class="empty-state"><div class="empty-icon">🏋️</div><div class="empty-text">${t('noWorkoutYet')}</div></div>`;
    return;
  }

  recent.innerHTML = ws.map(w => {
    const d         = new Date(w.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    let durationHtml = '';
    if (w.endTime && w.startTime) {
      const mins = Math.round((w.endTime - w.startTime) / 60000);
      durationHtml = `<span class="tag" style="background:rgba(255,255,255,0.05);color:var(--muted);border-color:var(--border);">⏱ ${mins} min</span>`;
    }

    const exHtml = w.exercises.map(e => {
      const ex   = getEx(e.exId);
      const type = ex ? getCatType(ex.category) : 'strength';
      const name = getExName(e.exId);
      const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
      const catLabel = ex ? (t('cats')[ex.category] || ex.category) : '';
      let setsHtml = '';
      if (type === 'cardio')       setsHtml = e.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
      else if (type === 'stretch') setsHtml = e.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
      else                         setsHtml = e.sets.map(s => `<span class="set-badge">${s.weight}kg × ${s.reps}</span>`).join('');
      const hiitBadges = (e.hiitSets || []).map(_hiitBadge).join('');
      const timerBadge = e.timerSec ? `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';
      return `<div style="margin-bottom:10px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:6px;">${name}<span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}${hiitBadges}${timerBadge}</div>
        ${e.note ? `<div style="margin-top:5px;font-size:12px;color:var(--muted);">💬 ${e.note}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="history-entry">
      <div class="history-entry-header">
        <div>
          <div class="history-exercise-name">${d}</div>
          <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;">
            <span class="tag">${totalSets} ${t('sets')}</span>
            ${durationHtml}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:flex-start;">
          <button style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 10px;color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;" onclick="openEditWorkout('${w.id}')">✏️</button>
          <button class="close-btn" onclick="deleteLogWorkout('${w.id}')" style="color:var(--accent2);border-color:rgba(255,77,77,0.3);">🗑</button>
        </div>
      </div>
      <div style="margin-top:12px;">${exHtml}</div>
    </div>`;
  }).join('');
}

function deleteLogWorkout(id) {
  if (!confirm(t('confirmDeleteWorkout'))) return;
  db.workouts = db.workouts.filter(w => w.id !== id);
  save();
  renderLog();
  haptic('light');
}

function openNewWorkout() {
  db.currentWorkout = { id: uid(), date: Date.now(), startTime: Date.now(), exercises: [] };
  save();
  document.getElementById('quickStart').style.display    = 'none';
  document.getElementById('activeWorkout').style.display = 'block';
  renderActiveWorkout();
  startTimer();
  haptic('medium');
}

function renderActiveWorkout() {
  const container   = document.getElementById('workoutExercises');
  const cw          = db.currentWorkout;
  const btnFinish   = document.getElementById('btnFinishWorkout');
  const btnAdd      = document.getElementById('btnAddExercise');
  const btnCancel   = document.getElementById('btnCancelWorkout');
  const activeLabel = document.getElementById('activeWorkoutLabel');

  if (btnFinish)   btnFinish.textContent   = t('done');
  if (btnAdd)      btnAdd.textContent      = t('addExercise');
  if (btnCancel)   btnCancel.textContent   = t('cancelWorkout');
  if (activeLabel) activeLabel.textContent = t('activeWorkout');

  if (!cw || cw.exercises.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-text">${t('enterExercise')}</div></div>`;
    return;
  }

  container.innerHTML = cw.exercises.map((e, i) => {
    const ex       = getEx(e.exId);
    const name     = ex ? ex.name : t('noEntries');
    const type     = ex ? getCatType(ex.category) : 'strength';
    const catLabel = ex ? (t('cats')[ex.category] || ex.category) : '';
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';

    const hiits    = e.hiitSets || [];
    let setsHtml = '';
    if (e.sets.length > 0) {
      if (type === 'cardio')  setsHtml = e.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
      else if (type === 'stretch') setsHtml = e.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
      else setsHtml = e.sets.map(s => `<span class="set-badge">${s.weight}kg × ${s.reps}</span>`).join('');
    }
    const hiitBadges  = hiits.map(_hiitBadge).join('');
    const timerBadge  = e.timerSec ? `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';
    if (!setsHtml && !hiitBadges && !e.timerSec) setsHtml = `<span style="color:var(--muted);font-size:13px;">${t('noEntries')}</span>`;

    return `<div class="exercise-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="exercise-name">${name}<span class="cat-badge ${catClass}">${catLabel}</span></div>
        <button class="close-btn" onclick="removeWorkoutExercise(${i})">✕</button>
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}${hiitBadges}${timerBadge}</div>
      ${e.note ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);">💬 ${e.note}</div>` : ''}
      <button class="btn btn-secondary btn-sm" style="margin-top:10px;" onclick="openLogSets(${i})">
        ${e.sets.length > 0 ? t('editSets') : t('enterSets')}
      </button>
    </div>`;
  }).join('');

  initRipples();
}

function removeWorkoutExercise(idx) {
  db.currentWorkout.exercises.splice(idx, 1);
  save();
  renderActiveWorkout();
  haptic('light');
}

function finishWorkout() {
  const cw = db.currentWorkout;
  if (!cw) return;
  const hasData = cw.exercises.some(e => e.sets.length > 0 || e.timerSec > 0 || (e.hiitSets && e.hiitSets.length > 0));
  if (!hasData) { alert(t('minOneSet')); return; }
  cw.exercises = cw.exercises.filter(e => e.sets.length > 0 || e.timerSec > 0 || (e.hiitSets && e.hiitSets.length > 0));
  cw.endTime   = Date.now();
  db.workouts.push(cw);
  db.currentWorkout = null;
  stopTimer();
  swReset();
  save();
  document.getElementById('activeWorkout').style.display = 'none';
  document.getElementById('quickStart').style.display    = 'block';
  renderLog();
  renderHistory();
  haptic('success');
  flashWorkoutComplete();
  showToast(t('workoutDone'));
}

function cancelWorkout() {
  if (!confirm(t('confirmCancelWorkout'))) return;
  db.currentWorkout = null;
  stopTimer();
  swReset();
  save();
  document.getElementById('activeWorkout').style.display = 'none';
  document.getElementById('quickStart').style.display    = 'block';
  haptic('light');
}

/* ---- Timer ---- */
function startTimer() {
  stopTimer();
  const cw = db.currentWorkout;
  if (!cw) return;
  const display = document.getElementById('timerDisplay');
  display.classList.add('pulsing');
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - cw.startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    display.textContent = m + ':' + s;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  const display = document.getElementById('timerDisplay');
  if (display) display.classList.remove('pulsing');
}

/* ---- Workout Stopwatch ---- */
function swToggle() {
  if (swRunning) {
    clearInterval(swInterval);
    swInterval = null;
    swRunning  = false;
    const btn = document.getElementById('swToggleBtn');
    if (btn) { btn.textContent = '▶'; btn.style.background = 'var(--accent)'; btn.style.color = '#000'; }
    if (swElapsed > 0) { const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = ''; }
  } else {
    const startTs = Date.now() - swElapsed * 1000;
    swInterval = setInterval(() => { swElapsed = Math.floor((Date.now() - startTs) / 1000); _swUpdateDisplay(); }, 1000);
    swRunning = true;
    const btn = document.getElementById('swToggleBtn');
    if (btn) { btn.textContent = '⏸'; btn.style.background = 'var(--accent2)'; btn.style.color = '#fff'; }
    const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = 'none';
  }
  haptic('light');
}

function swReset() {
  clearInterval(swInterval); swInterval = null; swRunning = false; swElapsed = 0;
  _swUpdateDisplay();
  const btn = document.getElementById('swToggleBtn');
  if (btn) { btn.textContent = '▶'; btn.style.background = 'var(--accent)'; btn.style.color = '#000'; }
  const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = 'none';
  haptic('light');
}

function _swUpdateDisplay() {
  const el = document.getElementById('swDisplay'); if (el) el.textContent = _fmtSwSec(swElapsed);
}

function openLogTimerModal() {
  const cw = db.currentWorkout;
  if (!cw || cw.exercises.length === 0) { alert(t('swNoEx')); return; }
  document.getElementById('logTimerTimeDisplay').textContent = _fmtSwSec(swElapsed);
  const list = document.getElementById('logTimerExerciseList');
  list.innerHTML = cw.exercises.map((e, i) => {
    const ex       = getEx(e.exId);
    const name     = ex ? ex.name : '?';
    const type     = ex ? getCatType(ex.category) : 'strength';
    const catLabel = ex ? (t('cats')[ex.category] || ex.category) : '';
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    const logged   = e.timerSec ? `<span style="font-size:11px;color:var(--accent);margin-left:6px;">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';
    return `<div class="exercise-list-item" onclick="logTimerToExercise(${i})">
      <div class="exercise-list-name">${name} <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span>${logged}</div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
  openModal('logTimerModal');
}

function logTimerToExercise(idx) {
  db.currentWorkout.exercises[idx].timerSec = swElapsed;
  save();
  closeModal('logTimerModal');
  renderActiveWorkout();
  haptic('success');
  showToast('⏱ ' + _fmtSwSec(swElapsed) + ' ' + t('swSaved'));
}

/* ---- Exercise Picker ---- */
function openExercisePicker() {
  const list       = document.getElementById('exercisePickerList');
  const categories = [...new Set(db.exercises.map(e => e.category))];
  list.innerHTML   = categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type     = getCatType(cat);
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    const exs      = db.exercises.filter(e => e.category === cat);
    return `<div style="margin-bottom:8px;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${catLabel}</div>` +
      exs.map(e => `<div class="exercise-list-item" onclick="addExerciseToWorkout('${e.id}')">
        <div class="exercise-list-name">${e.name} <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>`).join('');
  }).join('<div class="divider"></div>');
  openModal('exercisePickerModal');
}

function addExerciseToWorkout(exId) {
  // HIIT-assign mode
  if (window._pickerMode === 'hiit') {
    const hiitSet = window._hiitPendingSet;
    window._pickerMode     = null;
    window._hiitPendingSet = null;
    if (!db.currentWorkout) return;
    let exEntry = db.currentWorkout.exercises.find(e => e.exId === exId);
    if (!exEntry) {
      exEntry = { exId, sets: [], hiitSets: [] };
      db.currentWorkout.exercises.push(exEntry);
    }
    if (!exEntry.hiitSets) exEntry.hiitSets = [];
    exEntry.hiitSets.push(hiitSet);
    save();
    closeModal('exercisePickerModal');
    closeHiitTimer();
    renderActiveWorkout();
    haptic('success');
    showToast('⚡ HIIT gespeichert');
    return;
  }
  // Edit-past-workout mode
  if (window._pickerMode === 'edit') {
    if (editingWorkoutCopy.exercises.find(e => e.exId === exId)) { alert(t('alreadyAdded')); return; }
    editingWorkoutCopy.exercises.push({ exId, sets: [] });
    window._pickerMode = null;
    closeModal('exercisePickerModal');
    openModal('editWorkoutModal');
    renderEditWorkout();
    return;
  }
  // Normal mode
  if (!db.currentWorkout) return;
  if (db.currentWorkout.exercises.find(e => e.exId === exId)) { alert(t('alreadyAdded')); return; }
  db.currentWorkout.exercises.push({ exId, sets: [] });
  save();
  closeModal('exercisePickerModal');
  renderActiveWorkout();
  haptic('light');
}

/* ---- Log Sets ---- */
function openLogSets(idx) {
  currentWorkoutExIdx = idx;
  const cw   = db.currentWorkout;
  const we   = cw.exercises[idx];
  const ex   = getEx(we.exId);
  const type = ex ? getCatType(ex.category) : 'strength';
  currentExCategory = type;
  document.getElementById('logSetsTitle').textContent = ex ? ex.name : '';

  _setupSetColHeaders(type);

  // Last performance + exercise notes
  const lastPerf = getLastPerformance(we.exId, cw.id);
  const lpDiv    = document.getElementById('lastPerformance');
  let lpHtml = '';

  if (ex && ex.notes) {
    lpHtml += `<div style="background:rgba(200,241,53,0.07);border:1px solid rgba(200,241,53,0.2);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);margin-bottom:10px;">📝 ${ex.notes}</div>`;
  }
  if (lastPerf && lastPerf.sets.length > 0) {
    let setsHtml = '';
    if (type === 'cardio')       setsHtml = lastPerf.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
    else if (type === 'stretch') setsHtml = lastPerf.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
    else                         setsHtml = lastPerf.sets.map(s => `<span class="set-badge">${s.weight}kg × ${s.reps}</span>`).join('');
    const lastNoteHtml = lastPerf.note ? `<div style="margin-top:6px;font-size:12px;color:var(--muted);">💬 ${lastPerf.note}</div>` : '';
    lpHtml += `<div class="exercise-last"><div class="label">${t('lastPerf')}</div><div class="sets-row">${setsHtml}</div>${lastNoteHtml}</div>`;
  }
  lpDiv.innerHTML = lpHtml;

  document.getElementById('sessionNote').value = we.note || '';

  const container  = document.getElementById('setsContainer');
  container.innerHTML = '';
  const setsToLoad = we.sets.length > 0 ? we.sets : (lastPerf ? lastPerf.sets : []);
  if (setsToLoad.length === 0) addSetRow();
  else setsToLoad.forEach(s => addSetRow(s));
  openModal('logSetsModal');
}

function getLastPerformance(exId, currentWorkoutId) {
  const relevant = db.workouts
    .filter(w => w.id !== currentWorkoutId && w.exercises.some(e => e.exId === exId))
    .sort((a, b) => b.date - a.date);
  if (relevant.length === 0) return null;
  return relevant[0].exercises.find(e => e.exId === exId);
}

function _setupSetColHeaders(type) {
  const colLabels = document.getElementById('setColLabels');
  const btnAddRow = document.getElementById('btnAddRow');
  if (type === 'cardio') {
    colLabels.className = 'set-col-labels cardio-labels';
    colLabels.innerHTML = `<div></div><div class="set-col-label">${t('colKm')}</div><div class="set-col-label">${t('colTime')}</div><div class="set-col-label">${t('colPace')}</div><div></div>`;
  } else if (type === 'stretch') {
    colLabels.className = 'set-col-labels stretch-labels';
    colLabels.innerHTML = `<div></div><div class="set-col-label">${t('colMin')}</div><div></div>`;
  } else {
    colLabels.className = 'set-col-labels';
    colLabels.innerHTML = `<div></div><div class="set-col-label">${t('kg')}</div><div class="set-col-label">${t('reps')}</div><div></div>`;
  }
  btnAddRow.textContent = t('addSet');
}

function addSetRow(data) {
  const container = document.getElementById('setsContainer');
  const idx       = container.children.length + 1;
  const row       = document.createElement('div');
  const type      = currentExCategory;

  const rmBtn = `<button class="remove-set" onclick="this.parentElement.remove();reindexSets();">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>`;

  if (type === 'cardio') {
    row.className = 'set-row cardio-row';
    const km = data ? data.km : '', time = data ? data.time : '', pace = data ? data.pace : '';
    row.innerHTML = `<span class="set-num">${idx}</span>
      <input class="set-input" type="number" placeholder="0.0" value="${km}" inputmode="decimal" oninput="recalcPace(this.parentElement)"/>
      <input class="set-input" type="text" placeholder="0:00" value="${time}" inputmode="numeric" oninput="recalcPace(this.parentElement)"/>
      <input class="set-input pace-display" type="text" placeholder="–" value="${pace}" readonly/>
      ${rmBtn}`;
  } else if (type === 'stretch') {
    row.className = 'set-row stretch-row';
    const min = data ? data.minutes : '';
    row.innerHTML = `<span class="set-num">${idx}</span>
      <input class="set-input" type="number" placeholder="2" value="${min}" inputmode="decimal" step="0.5" min="0.5"/>
      ${rmBtn}`;
  } else {
    row.className = 'set-row';
    const w = data ? data.weight : '', r = data ? data.reps : '';
    row.innerHTML = `<span class="set-num">${idx}</span>
      <input class="set-input" type="number" placeholder="0" value="${w}" inputmode="decimal"/>
      <input class="set-input" type="number" placeholder="0" value="${r}" inputmode="numeric"/>
      ${rmBtn}`;
  }
  row.style.animation = 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) backwards';
  container.appendChild(row);
}

function recalcPace(row) {
  const inputs  = row.querySelectorAll('.set-input');
  const km      = parseFloat(inputs[0].value);
  const timeStr = inputs[1].value.trim();
  const paceInput = inputs[2];
  if (!km || !timeStr || !timeStr.includes(':')) { paceInput.value = '–'; return; }
  const parts     = timeStr.split(':');
  const totalMins = parseInt(parts[0] || 0) + (parseInt(parts[1] || 0) / 60);
  if (km > 0 && totalMins > 0) {
    const pace = totalMins / km;
    const pm = Math.floor(pace);
    const ps = Math.round((pace - pm) * 60).toString().padStart(2, '0');
    paceInput.value = `${pm}:${ps}`;
  } else { paceInput.value = '–'; }
}

function reindexSets() {
  document.querySelectorAll('.set-row').forEach((r, i) => {
    const n = r.querySelector('.set-num');
    if (n) n.textContent = i + 1;
  });
}

function saveSets() {
  const rows = document.querySelectorAll('#setsContainer .set-row');
  const sets = [];
  const type = currentExCategory;

  rows.forEach(row => {
    const inputs = row.querySelectorAll('.set-input');
    if (type === 'cardio') {
      const km = parseFloat(inputs[0].value), time = inputs[1].value.trim(), pace = inputs[2].value;
      if (km > 0 && time) sets.push({ km, time, pace });
    } else if (type === 'stretch') {
      const minutes = parseFloat(inputs[0].value);
      if (minutes > 0) sets.push({ minutes });
    } else {
      const weight = parseFloat(inputs[0].value), reps = parseInt(inputs[1].value);
      if (!isNaN(weight) && !isNaN(reps) && reps > 0) sets.push({ weight, reps });
    }
  });

  if (sets.length === 0) { alert(t('minValidSet')); return; }

  // Edit-past-workout mode
  if (currentWorkoutExIdx === null && typeof editWorkoutSetIdx !== 'undefined' && editWorkoutSetIdx !== null) {
    editingWorkoutCopy.exercises[editWorkoutSetIdx].sets = sets;
    editingWorkoutCopy.exercises[editWorkoutSetIdx].note = document.getElementById('sessionNote').value.trim();
    editWorkoutSetIdx = null;
    closeModal('logSetsModal');
    openModal('editWorkoutModal');
    renderEditWorkout();
    return;
  }

  // Normal active-workout mode
  db.currentWorkout.exercises[currentWorkoutExIdx].sets = sets;
  db.currentWorkout.exercises[currentWorkoutExIdx].note = document.getElementById('sessionNote').value.trim();
  save();
  closeModal('logSetsModal');
  renderActiveWorkout();
  haptic('success');
  showToast('✓');
  startRestTimer();
}

/* ---- Rest Timer ---- */
let restTimerInterval = null;
let restTimerSec      = 0;
let restTimerMax      = 90;

/* ---- Rest Timer Config ---- */
function _getRestCfg() {
  if (!db.restTimer) db.restTimer = { enabled: true, sec: 90 };
  return db.restTimer;
}

function _renderRestConfig() {
  const cfg     = _getRestCfg();
  const toggle  = document.getElementById('restToggle');
  const durRow  = document.getElementById('restDurationRow');
  const display = document.getElementById('restDurationDisplay');
  if (toggle)  toggle.checked = cfg.enabled;
  if (durRow)  durRow.style.display = cfg.enabled ? 'flex' : 'none';
  if (display) {
    const m = Math.floor(cfg.sec / 60);
    const s = (cfg.sec % 60).toString().padStart(2, '0');
    display.textContent = `${m}:${s}`;
  }
}

function restTimerToggle(checked) {
  _getRestCfg().enabled = checked;
  save();
  _renderRestConfig();
  haptic('light');
}

function restTimerAdj(delta) {
  const cfg = _getRestCfg();
  cfg.sec   = Math.max(15, Math.min(600, cfg.sec + delta));
  save();
  _renderRestConfig();
  haptic('light');
}

function startRestTimer() {
  const cfg = _getRestCfg();
  if (!cfg.enabled) return;
  clearInterval(restTimerInterval);
  restTimerSec = cfg.sec;
  restTimerMax = cfg.sec;
  const overlay = document.getElementById('restTimerOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  _updateRestDisplay();
  restTimerInterval = setInterval(() => {
    restTimerSec--;
    if (restTimerSec <= 3 && restTimerSec > 0) haptic('light');
    if (restTimerSec <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      overlay.style.display = 'none';
      haptic('success');
      showToast('✓ ' + t('restDone'));
      return;
    }
    _updateRestDisplay();
  }, 1000);
}

function skipRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  const overlay = document.getElementById('restTimerOverlay');
  if (overlay) overlay.style.display = 'none';
  haptic('light');
}

function _updateRestDisplay() {
  const el = document.getElementById('restTimerCount');
  if (el) {
    if (restTimerSec >= 60) {
      const m = Math.floor(restTimerSec / 60);
      const s = (restTimerSec % 60).toString().padStart(2, '0');
      el.textContent = `${m}:${s}`;
    } else {
      el.textContent = restTimerSec;
    }
  }
  const arc = document.getElementById('restTimerArc');
  if (arc) {
    const pct = restTimerSec / (restTimerMax || 90);
    const c   = 2 * Math.PI * 26;
    arc.style.strokeDashoffset = c * (1 - pct);
  }
}
