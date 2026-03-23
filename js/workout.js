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
  _renderStreakBanner();
  if (typeof renderWeekStatusBanner === 'function') renderWeekStatusBanner();

  const locale  = lang === 'de' ? 'de-DE' : 'en-GB';
  const recent  = document.getElementById('recentWorkouts');
  const ws      = [...db.workouts].reverse();

  if (ws.length === 0) {
    recent.innerHTML = `<div class="empty-state"><div class="empty-icon">🏋️</div><div class="empty-text">${t('noWorkoutYet')}</div></div>`;
    return;
  }

  recent.innerHTML = ws.map(w => {
    const d         = new Date(w.date || w.startTime).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    let durationHtml = '';
    if (w.endTime && w.startTime) {
      const mins = Math.round((w.endTime - w.startTime) / 60000);
      durationHtml = `<span class="tag" style="background:rgba(255,255,255,0.05);color:var(--muted);border-color:var(--border);">⏱ ${mins} min</span>`;
    }

    const exHtml = w.exercises.map(e => {
      const ex       = getEx(e.exId);
      const name     = e.isCustom ? e.customName : (ex ? ex.name : t('noEntries'));
      const type     = e.isCustom ? getCatType(e.customCategory) : (ex ? getCatType(ex.category) : 'strength');
      const catLabel = e.isCustom ? (t('cats')[e.customCategory] || e.customCategory) : (ex ? (t('cats')[ex.category] || ex.category) : '');
      const catClass = getCatClass(type);

      let setsHtml = _renderSetBadges(e.sets, type);
      const hiitBadges = (e.hiitSets || []).map(_hiitBadge).join('');
      const timerBadge = e.timerSec ? `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';
      return `<div style="margin-bottom:10px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:6px;">${name}<span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span>${e.supersetGroup ? '<span style="background:rgba(200,241,53,0.15);border:1px solid rgba(200,241,53,0.4);border-radius:5px;font-size:10px;padding:1px 5px;color:var(--accent);font-weight:700;margin-left:5px;">SS</span>' : ''}</div>
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
  if (typeof revokeCountAchievements === 'function') revokeCountAchievements();
  if (typeof renderAchievements === 'function') renderAchievements();
  renderLog();
  haptic('light');
}

function openStartOptionsModal() {
  const btnProg = document.getElementById('btnStartProgOpt');
  if (db.activeProgram && db.activeProgram.id) {
    btnProg.style.display = 'block';
  } else {
    btnProg.style.display = 'none';
  }
  openModal('startOptionsModal');
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
      const name     = e.isCustom ? e.customName : (ex ? ex.name : t('noEntries'));
      const type     = e.isCustom ? getCatType(e.customCategory) : (ex ? getCatType(ex.category) : 'strength');
      const catLabel = e.isCustom ? (t('cats')[e.customCategory] || e.customCategory) : (ex ? (t('cats')[ex.category] || ex.category) : '');
      const catClass = getCatClass(type);

    const hiits    = e.hiitSets || [];
    let setsHtml = _renderSetBadges(e.sets, type);
    const hiitBadges  = hiits.map(_hiitBadge).join('');
    const timerBadge  = e.timerSec ? `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';
    if (!setsHtml && !hiitBadges && !e.timerSec) setsHtml = `<span style="color:var(--muted);font-size:13px;">${t('noEntries')}</span>`;

    // Superset indicator
    const hasSS = !!e.supersetGroup;
    const ssPartner = hasSS ? cw.exercises.findIndex((x, j) => j !== i && x.supersetGroup === e.supersetGroup) : -1;
    const ssLabel = hasSS
      ? `<span style="background:rgba(200,241,53,0.15);border:1px solid rgba(200,241,53,0.4);border-radius:6px;font-size:10px;padding:2px 6px;color:var(--accent);font-weight:700;margin-left:6px;">⟨ SS ⟩</span>`
      : '';
    const ssBtn = hasSS
      ? `<button class="btn btn-secondary btn-sm" style="margin-top:6px;margin-right:4px;font-size:11px;padding:4px 8px;color:var(--accent2);" onclick="unlinkSuperset(${i})">🔗 Superset lösen</button>`
      : `<button class="btn btn-secondary btn-sm" style="margin-top:6px;margin-right:4px;font-size:11px;padding:4px 8px;" onclick="startSupersetLink(${i})">🔗 Superset</button>`;

    return `<div class="exercise-card${hasSS ? ' superset-card' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="exercise-name">${name}<span class="cat-badge ${catClass}">${catLabel}</span>${ssLabel}</div>
        <button class="close-btn" onclick="removeWorkoutExercise(${i})">✕</button>
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}${hiitBadges}${timerBadge}</div>
      ${e.note ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);">💬 ${e.note}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
        ${ssBtn}
        <button class="btn btn-secondary btn-sm" style="margin-top:6px;" onclick="openLogSets(${i})">
          ${e.sets.length > 0 ? t('editSets') : t('enterSets')}
        </button>
      </div>
    </div>`;
  }).join('');

  initRipples();
}

function removeWorkoutExercise(idx) {
  // If part of a superset, clean up the link
  const e = db.currentWorkout.exercises[idx];
  if (e.supersetGroup) unlinkSuperset(idx, true);
  db.currentWorkout.exercises.splice(idx, 1);
  save();
  renderActiveWorkout();
  haptic('light');
}

/* ---- Supersets ---- */
let _supersetLinkSource = null; // index of the exercise waiting to be linked

function startSupersetLink(idx) {
  const cw = db.currentWorkout;
  if (!cw || cw.exercises.length < 2) {
    showToast('Mindestens 2 Übungen für Superset nötig');
    return;
  }
  _supersetLinkSource = idx;
  showToast('Tippe eine andere Übung an, um sie zu verknüpfen');
  // Highlight all other cards as clickable targets
  const cards = document.querySelectorAll('#workoutExercises .exercise-card');
  cards.forEach((card, i) => {
    if (i !== idx) {
      card.style.border = '2px dashed var(--accent)';
      card.style.cursor = 'pointer';
      card.setAttribute('data-ss-target', i);
      card.addEventListener('click', _supersetTargetClick, { once: true });
    } else {
      card.style.border = '2px solid var(--accent)';
    }
  });
}

function _supersetTargetClick(e) {
  const targetIdx = parseInt(this.getAttribute('data-ss-target'));
  _finalizeSupersetLink(targetIdx);
}

function _finalizeSupersetLink(targetIdx) {
  // Reset visual state
  document.querySelectorAll('#workoutExercises .exercise-card').forEach(card => {
    card.style.border = '';
    card.style.cursor = '';
    card.removeEventListener('click', _supersetTargetClick);
  });

  if (_supersetLinkSource === null) return;
  const srcIdx = _supersetLinkSource;
  _supersetLinkSource = null;

  const cw = db.currentWorkout;
  const groupId = uid();
  cw.exercises[srcIdx].supersetGroup    = groupId;
  cw.exercises[targetIdx].supersetGroup = groupId;
  save();
  renderActiveWorkout();
  haptic('success');
  showToast('⟨ SS ⟩ Superset verknüpft');
}

function unlinkSuperset(idx, silent) {
  const cw = db.currentWorkout;
  if (!cw) return;
  const groupId = cw.exercises[idx].supersetGroup;
  if (!groupId) return;
  cw.exercises.forEach(e => {
    if (e.supersetGroup === groupId) delete e.supersetGroup;
  });
  save();
  if (!silent) {
    renderActiveWorkout();
    haptic('light');
    showToast('Superset gelöst');
  }
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
  
  if (typeof checkAchievements === 'function') {
    checkAchievements(cw);
  }
  if (typeof showWorkoutTrophyToast === 'function') {
    showWorkoutTrophyToast(2); // 2 pts per workout
  }
}

function cancelWorkout() {
  if (!confirm(t('confirmCancelWorkout'))) return;
  db.currentWorkout = null;
  stopTimer();
  swReset();
  save();
  document.getElementById('activeWorkout').style.display = 'none';
  document.getElementById('quickStart').style.display    = 'block';
  renderLog();
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
    const startTs = typeof cw.startTime === 'string' ? new Date(cw.startTime).getTime() : cw.startTime;
    const elapsed = Math.floor((Date.now() - startTs) / 1000);
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
  if (!cw) return;
  document.getElementById('logTimerTimeDisplay').textContent = _fmtSwSec(swElapsed);
  
  if (typeof window._timerLogState !== 'undefined') {
    window._timerLogState.type = 'sw';
    window._timerLogState.swTarget = (cw.exercises.length > 0) ? 'workout_0' : 'custom_Brust';
    window._timerLogState.swNote = '';
    _renderSwLogContent();
  }
  
  openModal('logTimerModal');
}

function _renderSwLogContent() {
  const state = window._timerLogState;
  const container = document.getElementById('logTimerContent');
  if (!container) return;
  
  let html = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;">${t('swBookWhich') || 'Auf welche Übung buchen?'}</div>
      <select class="form-input" style="margin-bottom:8px;" onchange="window._timerLogState.swTarget=this.value; if(typeof _checkTimerLogTarget === 'function') _checkTimerLogTarget(this.value, 'sw')">
         ${typeof _buildTargetOptions === 'function' ? _buildTargetOptions(state.swTarget) : ''}
      </select>
      <input type="text" class="form-input" style="height:36px;font-size:13px;" placeholder="${t('sessionNotePlaceholder') || 'Anmerkung...'}" value="${state.swNote}" oninput="window._timerLogState.swNote=this.value">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="_saveSwLog()">✓ ${t('save') || 'Speichern'}</button>
  `;
  container.innerHTML = html;
}

function _saveSwLog() {
  const cw = db.currentWorkout;
  if (!cw) return;
  const state = window._timerLogState;
  const tVal = state.swTarget;
  const tNote = state.swNote.trim();
  
  if (tVal === 'gymlab' || tVal === 'newex') {
    alert("Bitte ein gültiges Ziel wählen.");
    return;
  }
  
  let exEntry = null;
  if (tVal.startsWith('workout_')) {
    const idx = parseInt(tVal.split('_')[1]);
    exEntry = cw.exercises[idx];
  } else if (tVal.startsWith('custom_')) {
    const cat = tVal.split('_')[1];
    const customName = 'Stoppuhr';
    exEntry = cw.exercises.find(e => e.isCustom && e.customCategory === cat && e.customName === customName);
    if (!exEntry) {
      exEntry = { isCustom: true, customCategory: cat, customName: customName, sets: [] };
      cw.exercises.push(exEntry);
    }
  }
  
  if (exEntry) {
    if (!exEntry.timerSec) exEntry.timerSec = 0;
    exEntry.timerSec += swElapsed;
    if (tNote) exEntry.note = exEntry.note ? exEntry.note + '\\n' + tNote : tNote;
  }
  
  save();
  closeModal('logTimerModal');
  renderActiveWorkout();
  haptic('success');
  showToast('⏱ ' + _fmtSwSec(swElapsed) + ' ' + (t('swSaved') || 'gespeichert'));
}

/* ---- Exercise Picker ---- */
function openExercisePicker() {
  const list       = document.getElementById('exercisePickerList');
  const categories = [...new Set(db.exercises.map(e => e.category))];
  
  const addNewHtml = `<div class="exercise-list-item" onclick="openAddExerciseFromPicker()" style="border-color:rgba(200,241,53,0.25);margin-bottom:12px;">
    <div class="exercise-list-name" style="color:var(--accent);font-weight:600;">+ ${t('newExercise') || 'Neue Übung'}</div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </div>`;
  
  list.innerHTML   = addNewHtml + categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type     = getCatType(cat);
    const catClass = getCatClass(type);
    const exs      = db.exercises.filter(e => e.category === cat);
    return `<div style="margin-bottom:8px;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${catLabel}</div>` +
      exs.map(e => `<div class="exercise-list-item" onclick="addExerciseToWorkout('${e.id}')">
        <div class="exercise-list-name">${e.name} <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>`).join('');
  }).join('<div class="divider"></div>');
  openModal('exercisePickerModal');
}

function openAddExerciseFromPicker() {
  window._openedFromPicker = true;
  openAddExercise();
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
  const type = we.isCustom ? getCatType(we.customCategory) : (ex ? getCatType(ex.category) : 'strength');
  const name = we.isCustom ? we.customName : (ex ? ex.name : '');
  currentExCategory = type;
  document.getElementById('logSetsTitle').textContent = name;

  _setupSetColHeaders(type);

  // Last performance + exercise notes
  const lastPerf = we.isCustom ? getLastCustomPerformance(we.customName, we.customCategory, cw.id) : getLastPerformance(we.exId, cw.id);
  const lpDiv    = document.getElementById('lastPerformance');
  let lpHtml = '';

  if (ex && ex.notes && !we.isCustom) {
    lpHtml += `<div style="background:rgba(200,241,53,0.07);border:1px solid rgba(200,241,53,0.2);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text);margin-bottom:10px;">📝 ${ex.notes}</div>`;
  }
  if (lastPerf && lastPerf.sets.length > 0) {
    const setsHtml = _renderSetBadges(lastPerf.sets, type);
    const lastNoteHtml = lastPerf.note ? `<div style="margin-top:6px;font-size:12px;color:var(--muted);">💬 ${lastPerf.note}</div>` : '';
    lpHtml += `<div class="exercise-last"><div class="label">${t('lastPerf') || 'Letztes Mal'}</div><div class="sets-row">${setsHtml}</div>${lastNoteHtml}</div>`;
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
    .filter(w => w.id !== currentWorkoutId && w.exercises.some(e => !e.isCustom && e.exId === exId))
    .sort((a, b) => b.date - a.date);
  if (relevant.length === 0) return null;
  return relevant[0].exercises.find(e => !e.isCustom && e.exId === exId);
}

function getLastCustomPerformance(name, category, currentWorkoutId) {
  const relevant = db.workouts
    .filter(w => w.id !== currentWorkoutId && w.exercises.some(e => e.isCustom && e.customName === name && e.customCategory === category))
    .sort((a, b) => b.date - a.date);
  if (relevant.length === 0) return null;
  return relevant[0].exercises.find(e => e.isCustom && e.customName === name && e.customCategory === category);
}

function _setupSetColHeaders(type) {
  const colLabels = document.getElementById('setColLabels');
  const btnAddRow = document.getElementById('btnAddRow');
  if (type === 'cardio') {
    colLabels.className = 'set-col-labels cardio-labels';
    colLabels.innerHTML = `<div></div><div class="set-col-label" id="colLabelType">${t('colType') || 'Typ'}</div><div class="set-col-label">${t('colKm')}</div><div class="set-col-label">${t('colTime')}</div><div class="set-col-label">${t('colPace')}</div><div class="set-col-label" id="colLabelRpe">${t('colRpe') || 'RPE'}</div><div></div>`;
  } else if (type === 'stretch') {
    colLabels.className = 'set-col-labels stretch-labels';
    colLabels.innerHTML = `<div></div><div class="set-col-label">${t('colMin')}</div><div></div>`;
  } else {
    colLabels.className = 'set-col-labels';
    colLabels.innerHTML = `<div></div><div class="set-col-label" id="colLabelType">${t('colType') || 'Typ'}</div><div class="set-col-label">${t('kg')}</div><div class="set-col-label">${t('reps')}</div><div class="set-col-label" id="colLabelRpe">${t('colRpe') || 'RPE'}</div><div></div>`;
  }
  btnAddRow.textContent = t('addSet');
}

function _cycleSetType(btn) {
  const types = ['N', 'W', 'D'];
  const titles = { 'N': t('setNormalTitle') || 'Normal', 'W': t('setWarmupTitle') || 'Aufwärmsatz', 'D': t('setDropTitle') || 'Dropsatz' };

  let current = btn.dataset.type || 'N';
  let nextIdx = (types.indexOf(current) + 1) % types.length;
  let next = types[nextIdx];
  
  btn.dataset.type = next;
  btn.textContent = t('set' + (next === 'N' ? 'Normal' : next === 'W' ? 'Warmup' : 'Drop')) || next;
  btn.style.color = TYPE_COLORS[next];
  btn.title = titles[next];
  haptic('light');
}

function addSetRow(data) {
  const container = document.getElementById('setsContainer');
  const idx       = container.children.length + 1;
  const row       = document.createElement('div');
  const type      = currentExCategory;
  
  const sType = data && data.type ? data.type : 'N';
  const rpe   = data && data.rpe ? data.rpe : '';
  const titles = { 'N': t('setNormalTitle') || 'Normal', 'W': t('setWarmupTitle') || 'Aufwärmsatz', 'D': t('setDropTitle') || 'Dropsatz' };
  const sTypeDisplay = t('set' + (sType === 'N' ? 'Normal' : sType === 'W' ? 'Warmup' : 'Drop')) || sType;

  const typeBtn = `<button class="set-type-btn" data-type="${sType}" style="color:${TYPE_COLORS[sType]};" title="${titles[sType]}" onclick="_cycleSetType(this)">${sTypeDisplay}</button>`;
  const rpeInput = `<input class="set-input set-rpe" type="number" placeholder="–" value="${rpe}" min="1" max="10" inputmode="numeric"/>`;

  const rmBtn = `<button class="remove-set" onclick="this.parentElement.remove();reindexSets();">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>`;

  if (type === 'cardio') {
    row.className = 'set-row cardio-row';
    const km = data ? data.km : '', time = data ? data.time : '', pace = data ? data.pace : '';
    row.innerHTML = `<span class="set-num">${idx}</span>
      ${typeBtn}
      <input class="set-input" type="number" placeholder="0.0" value="${km}" inputmode="decimal" oninput="recalcPace(this.parentElement)"/>
      <input class="set-input" type="text" placeholder="0:00" value="${time}" inputmode="numeric" oninput="recalcPace(this.parentElement)"/>
      <input class="set-input pace-display" type="text" placeholder="–" value="${pace}" readonly/>
      ${rpeInput}
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
      ${typeBtn}
      <input class="set-input" type="number" placeholder="0" value="${w}" inputmode="decimal"/>
      <input class="set-input" type="number" placeholder="0" value="${r}" inputmode="numeric"/>
      ${rpeInput}
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
    let sType = 'N';
    let rpe = null;
    const typeBtn = row.querySelector('.set-type-btn');
    if (typeBtn) sType = typeBtn.dataset.type || 'N';
    const rpeInput = row.querySelector('.set-rpe');
    if (rpeInput && rpeInput.value) rpe = parseFloat(rpeInput.value);

    const inputs = row.querySelectorAll('.set-input:not(.set-rpe)');
    if (type === 'cardio') {
      const km = parseFloat(inputs[0].value), time = inputs[1].value.trim(), pace = inputs[2].value;
      if (km > 0 && time) sets.push({ type: sType, rpe, km, time, pace });
    } else if (type === 'stretch') {
      const minutes = parseFloat(inputs[0].value);
      if (minutes > 0) sets.push({ minutes });
    } else {
      const weight = parseFloat(inputs[0].value), reps = parseInt(inputs[1].value);
      if (!isNaN(weight) && !isNaN(reps) && reps > 0) sets.push({ type: sType, rpe, weight, reps });
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
let restTimerEndAt    = 0; // timestamp when rest ends (background-safe)

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

function _requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function startRestTimer() {
  const cfg = _getRestCfg();
  if (!cfg.enabled) return;
  _requestNotifPermission();

  clearInterval(restTimerInterval);
  restTimerMax   = cfg.sec;
  restTimerEndAt = Date.now() + cfg.sec * 1000;
  restTimerSec   = cfg.sec;

  const overlay = document.getElementById('restTimerOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  _updateRestDisplay();

  // Schedule SW notification for Android / installed PWA users
  if (typeof _postSwMsg === 'function') {
    _postSwMsg({ type: 'SCHEDULE_REST_NOTIF', delayMs: cfg.sec * 1000 });
  }

  restTimerInterval = setInterval(() => {
    restTimerSec = Math.max(0, Math.round((restTimerEndAt - Date.now()) / 1000));
    if (restTimerSec <= 3 && restTimerSec > 0) haptic('light');
    if (restTimerSec <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      restTimerEndAt    = 0;
      overlay.style.display = 'none';
      if (typeof _postSwMsg === 'function') _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
      showToast('✓ ' + t('restDone'));
      return;
    }
    _updateRestDisplay();
  }, 500);
}

// When returning from background: re-sync + prominent alert if timer already done
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && restTimerEndAt) {
    restTimerSec = Math.max(0, Math.round((restTimerEndAt - Date.now()) / 1000));
    if (restTimerSec <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      restTimerEndAt    = 0;
      const overlay = document.getElementById('restTimerOverlay');
      if (overlay) overlay.style.display = 'none';
      if (typeof _postSwMsg === 'function') _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
      showToast('✓ ' + t('restDone'));
    } else {
      _updateRestDisplay();
    }
  }
});

function _renderStreakBanner() {
  const banner = document.getElementById('streakBanner');
  if (!banner) return;
  const streak = typeof calcStreak === 'function' ? calcStreak() : 0;
  if (streak >= 2) {
    const msgs = ['', '', '2 Tage am Stück – weiter so!', '3 Tage Streak – Feuer! 🔥', '4 Tage – du bist nicht aufzuhalten!', '5 Tage Streak – Maschine!'];
    const msg = msgs[Math.min(streak, msgs.length - 1)] || `${streak} Tage Streak – unglaublich!`;
    banner.style.display = 'block';
    banner.innerHTML = `<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(200,241,53,0.08);border:1px solid rgba(200,241,53,0.25);border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;color:var(--accent);">🔥 ${streak}-Tage-Streak &mdash; ${msg}</div>`;
  } else {
    banner.style.display = 'none';
  }
}

function skipRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  restTimerEndAt    = 0;
  if (typeof _postSwMsg === 'function') _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
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
