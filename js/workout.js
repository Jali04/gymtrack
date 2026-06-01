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
let swStartTs  = null;

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
  _renderQuickStartTemplates();
  _renderStreakBanner();
  if (typeof renderWeekStatusBanner === 'function') renderWeekStatusBanner();

  _updateQuickMetrics();
  _renderCoachTip();
}

const COACH_TIPS = [
  "Trink ausreichend Wasser! Muskeln bestehen zu ca. 75% aus Wasser. Eine Dehydration senkt deine Kraftleistung rapide.",
  "Nutze Supersätze (SS) im GymLab, um Zeit zu sparen und deinen Puls hochzuhalten.",
  "Regeneration ist der Schlüssel! Muskeln wachsen in den Ruhephasen, nicht während des Trainings.",
  "Achte auf progressive Überlastung: Versuche dich kontinuierlich in Gewicht oder Wiederholungen zu steigern.",
  "Die richtige Technik geht vor Gewicht. Vermeide Schwung holen, um Gelenke zu schonen und Muskeln optimal zu treffen.",
  "Eine proteinreiche Mahlzeit nach dem Training unterstützt den Muskelaufbau und beschleunigt die Regeneration.",
  "Schlaf ist dein bester Booster: 7–8 Stunden erholsamer Schlaf maximieren den Muskelaufbau und die Fettverbrennung.",
  "Creatin ist eines der am besten erforschten Supplements für Kraftzuwachs. Täglich 3-5g reichen aus.",
  "Wärme dich vor schweren Arbeitssätzen gut auf. 5-10 min Cardio und spezifisches Aufwärmen schützen vor Verletzungen.",
  "Tracke dein Gewicht regelmäßig im Fortschritts-Tab, um Trends bei deinem KFA und Muskelaufbau zu erkennen."
];

function _renderCoachTip() {
  const el = document.getElementById('coachTipText');
  if (!el) return;

  const wk = db.weekStatus || { mode: 'normal' };
  const mode = wk.mode || 'normal';

  if (mode === 'sick') {
    el.innerHTML = `<strong>Krankheits-Regeneration</strong>: Du bist krankgemeldet. Trainiere bitte nicht! Gönn deinem Körper maximale Ruhe, viel Flüssigkeit und Schlaf. Gute Besserung! 🤒`;
    return;
  }
  if (mode === 'deload') {
    el.innerHTML = `<strong>Deload-Fokus</strong>: Reduziere dein Trainingsvolumen und die Intensität um 30-40%. Perfekt, um Sehnen, Gelenke und das Nervensystem zu regenerieren. 😴`;
    return;
  }
  if (mode === 'vacation') {
    el.innerHTML = `<strong>Urlaubs-Erholung</strong>: Genieß die freie Zeit! Nutze aktive Regeneration (z.B. Spaziergänge, Schwimmen) oder dehne dich etwas. Bleib aktiv! 🏖️`;
    return;
  }
  if (mode === 'travel') {
    el.innerHTML = `<strong>Unterwegs-Tipp</strong>: Auf Reisen? Wenn kein Gym da ist, mach ein kurzes Bodyweight-Workout oder Hotelzimmer-Stretching, um geschmeidig zu bleiben. ✈️`;
    return;
  }

  // Check inactivity
  if (db.workouts && db.workouts.length > 0) {
    const sorted = [...db.workouts].sort((a, b) => (b.startTime || b.date) - (a.startTime || a.date));
    const lastWorkout = sorted[0];
    const lastTime = lastWorkout.startTime || lastWorkout.date;
    const daysInactive = Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24));
    if (daysInactive >= 3) {
      el.innerHTML = `<strong>Rhythmus finden</strong>: Dein letztes Workout liegt schon <strong>${daysInactive} Tage</strong> zurück. Der schwerste Schritt ist der Weg zum Gym. Wie wäre es heute mit einer kurzen Einheit? 🏋️`;
      return;
    }
  }

  // Check recent PR (Personal Record) in the last workout (within the last 3 days)
  if (db.workouts && db.workouts.length > 0) {
    const sorted = [...db.workouts].sort((a, b) => (b.startTime || b.date || 0) - (a.startTime || a.date || 0));
    const lastWorkout = sorted[0];
    const lastTime = lastWorkout.startTime || lastWorkout.date || 0;
    const daysSinceLast = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);

    if (daysSinceLast <= 3 && lastWorkout.exercises && lastWorkout.exercises.length > 0) {
      let prExercise = null;
      let prWeight = 0;
      let prPriorMax = 0;

      for (const we of lastWorkout.exercises) {
        const ex = getEx(we.exId);
        if (!ex || getCatType(ex.category) !== 'strength') continue;

        const maxWeightThisSession = Math.max(...(we.sets || []).map(s => Number(s.weight) || 0));
        if (maxWeightThisSession <= 0) continue;

        // Get max weight in all prior workouts
        let maxWeightPrior = 0;
        const priorWorkouts = sorted.slice(1);
        priorWorkouts.forEach(pw => {
          if (!pw.exercises) return;
          const pwe = pw.exercises.find(pe => pe.exId === we.exId);
          if (pwe && pwe.sets) {
            const wMax = Math.max(...pwe.sets.map(s => Number(s.weight) || 0));
            if (wMax > maxWeightPrior) maxWeightPrior = wMax;
          }
        });

        // It is a PR if it beats a prior max which was greater than 0
        if (maxWeightPrior > 0 && maxWeightThisSession > maxWeightPrior) {
          if (maxWeightThisSession > prWeight) {
            prExercise = ex.name;
            prWeight = maxWeightThisSession;
            prPriorMax = maxWeightPrior;
          }
        }
      }

      if (prExercise) {
        el.innerHTML = `<strong>Neuer Rekord!</strong> Du hast im letzten Training bei <strong>${prExercise}</strong> eine neue Bestleistung von <strong>${prWeight} kg</strong> aufgestellt (vorher: ${prPriorMax} kg). Der AI Coach gratuliert dir zu diesem Fortschritt! 🏆`;
        return;
      }
    }
  }

  // Check streak
  const streak = typeof calcStreak === 'function' ? calcStreak() : 0;
  if (streak >= 3) {
    el.innerHTML = `<strong>Momentum nutzen</strong>: Du hast eine <strong>${streak}-Tage-Streak</strong>! Unglaubliche Konsistenz. Achte auf genug Proteine und Schlaf, um die Leistung hochzuhalten! 🔥`;
    return;
  }

  // Default rotating science tip
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 86400000);
  const tip = COACH_TIPS[dayOfYear % COACH_TIPS.length];
  el.textContent = tip;
}

function _updateQuickMetrics() {
  const elTrophies = document.getElementById('lblMetricTrophies');
  const elStreak = document.getElementById('lblMetricStreak');
  const elWorkouts7d = document.getElementById('lblMetricWorkouts7d');
  if (!elTrophies || !elStreak || !elWorkouts7d) return;

  elTrophies.textContent = typeof calcTrophies === 'function' ? calcTrophies() : 0;
  elStreak.textContent = typeof calcStreak === 'function' ? calcStreak() : 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const count = (db.workouts || []).filter(w => {
    const d = w.date || w.startTime;
    return d && d >= sevenDaysAgo;
  }).length;
  elWorkouts7d.textContent = count;
}

function _renderQuickStartTemplates() {
  const container = document.getElementById('quickStartTemplates');
  if (!container) return;
  if (!db.templates || db.templates.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  const trainingTmpls = db.templates.filter(tmpl => (tmpl.type || 'training') === 'training');
  if (trainingTmpls.length === 0) { container.style.display = 'none'; return; }
  container.innerHTML = `
    <div class="qs-label">${t('quickStartTemplates')}</div>
    <div class="qs-scroll">
      ${trainingTmpls.map(tmpl => {
        const exCount = tmpl.exerciseIds ? tmpl.exerciseIds.length : 0;
        return `<button class="qs-chip" onclick="startWorkoutFromTemplate('${tmpl.id}')">
          <span class="qs-chip-name">${tmpl.name}</span>
          <span class="qs-chip-count">${exCount} ${t('exercises')}</span>
        </button>`;
      }).join('')}
    </div>
  `;
}

function deleteLogWorkout(id) {
  if (!confirm(t('confirmDeleteWorkout'))) return;
  db.workouts = db.workouts.filter(w => w.id !== id);
  save();
  renderLog();
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof renderStats === 'function') renderStats();
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

  if (!cw || !cw.exercises || cw.exercises.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-text">${t('enterExercise')}</div></div>`;
    return;
  }

  container.innerHTML = (cw.exercises || []).map((e, i) => {
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

    // Template persist button (show if exercise is not in the original template)
    let persistBtn = '';
    if (cw.templateId) {
      const tmpl = db.templates.find(x => String(x.id) === String(cw.templateId));
      if (tmpl && !tmpl.exerciseIds.includes(e.exId) && e.exId) {
        persistBtn = `<button class="tmpl-persist-btn" onclick="event.stopPropagation();saveExerciseToTemplate('${e.exId}', this)">${t('saveToTemplate')}</button>`;
      }
    }

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
        ${persistBtn}
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
  
  // Check if new exercises were added to a template-based workout
  _checkTemplateUpdates(cw);
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
    swStartTs  = null;
    const btn = document.getElementById('swToggleBtn');
    if (btn) { btn.textContent = '▶'; btn.style.background = 'var(--accent)'; btn.style.color = '#000'; }
    if (swElapsed > 0) { const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = ''; }
    _saveSwState();
  } else {
    swStartTs = Date.now() - swElapsed * 1000;
    swInterval = setInterval(() => { swElapsed = Math.floor((Date.now() - swStartTs) / 1000); _swUpdateDisplay(); }, 1000);
    swRunning = true;
    const btn = document.getElementById('swToggleBtn');
    if (btn) { btn.textContent = '⏸'; btn.style.background = 'var(--accent2)'; btn.style.color = '#fff'; }
    const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = 'none';
    _saveSwState();
  }
  haptic('light');
}

function swReset() {
  clearInterval(swInterval); swInterval = null; swRunning = false; swElapsed = 0; swStartTs = null;
  _swUpdateDisplay();
  const btn = document.getElementById('swToggleBtn');
  if (btn) { btn.textContent = '▶'; btn.style.background = 'var(--accent)'; btn.style.color = '#000'; }
  const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = 'none';
  _saveSwState();
  haptic('light');
}

function _swUpdateDisplay() {
  const el = document.getElementById('swDisplay'); if (el) el.textContent = _fmtSwSec(swElapsed);
}

function _saveSwState() {
  localStorage.setItem('dscpln_sw_state', JSON.stringify({
    swElapsed,
    swRunning,
    swStartTs
  }));
}

function _restoreSwState() {
  try {
    const saved = localStorage.getItem('dscpln_sw_state');
    if (saved) {
      const state = JSON.parse(saved);
      swRunning = !!state.swRunning;
      swStartTs = state.swStartTs ? parseInt(state.swStartTs) : null;
      
      if (swRunning && swStartTs) {
        swElapsed = Math.floor((Date.now() - swStartTs) / 1000);
        if (swInterval) clearInterval(swInterval);
        swInterval = setInterval(() => { 
          swElapsed = Math.floor((Date.now() - swStartTs) / 1000); 
          _swUpdateDisplay(); 
        }, 1000);
        
        const btn = document.getElementById('swToggleBtn');
        if (btn) { btn.textContent = '⏸'; btn.style.background = 'var(--accent2)'; btn.style.color = '#fff'; }
        const lb = document.getElementById('swLogBtn'); if (lb) lb.style.display = 'none';
      } else {
        swElapsed = state.swElapsed || 0;
        if (swInterval) {
          clearInterval(swInterval);
          swInterval = null;
        }
        const btn = document.getElementById('swToggleBtn');
        if (btn) { btn.textContent = '▶'; btn.style.background = 'var(--accent)'; btn.style.color = '#000'; }
        const lb = document.getElementById('swLogBtn'); 
        if (lb) {
          if (swElapsed > 0) lb.style.display = '';
          else lb.style.display = 'none';
        }
      }
      _swUpdateDisplay();
    }
  } catch (e) {
    console.error('Error restoring stopwatch state', e);
  }
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
function _getFrequentExercises(limit = 5) {
  const freq = {};
  db.workouts.forEach(w => {
    if (!w.exercises) return;
    w.exercises.forEach(e => {
      if (e.isCustom) return;
      freq[e.exId] = (freq[e.exId] || 0) + 1;
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => db.exercises.find(x => x.id === id))
    .filter(Boolean);
}

function _buildExPickerListHtml(query) {
  const q = (query || '').toLowerCase().trim();
  const categories = [...new Set(db.exercises.map(e => e.category))];
  const alreadyIn = db.currentWorkout ? db.currentWorkout.exercises.map(e => e.exId) : [];

  // Frequent exercises section
  let freqHtml = '';
  if (!q) {
    const freqs = _getFrequentExercises(5).filter(e => !alreadyIn.includes(e.id));
    if (freqs.length > 0) {
      freqHtml = `<div class="picker-section-label">⭐ ${t('frequentlyUsed')}</div>` +
        freqs.map(e => {
          const cat = e.category;
          const type = getCatType(cat);
          const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
          const catLabel = t('cats')[cat] || cat;
          return `<div class="exercise-list-item" onclick="addExerciseToWorkout('${e.id}')">
            <div class="exercise-list-name">${e.name} <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>`;
        }).join('') + '<div class="divider"></div>';
    }
  }

  // Category-based list (filtered)
  let catHtml = categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type = getCatType(cat);
    const catClass = getCatClass(type);
    let exs = db.exercises.filter(e => e.category === cat);
    if (q) exs = exs.filter(e => e.name.toLowerCase().includes(q));
    if (exs.length === 0) return '';
    return `<div style="margin-bottom:8px;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">${catLabel}</div>` +
      exs.map(e => {
        const inWo = alreadyIn.includes(e.id);
        return `<div class="exercise-list-item${inWo ? ' ex-picker-disabled' : ''}" ${inWo ? '' : `onclick="addExerciseToWorkout('${e.id}')"`}>
          <div class="exercise-list-name">${e.name} <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span></div>
          ${inWo ? '<span style="font-size:11px;color:var(--muted);">✓</span>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
        </div>`;
      }).join('');
  }).filter(Boolean).join('<div class="divider"></div>');

  if (q && !catHtml) {
    catHtml = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">${t('noSearchResults')}</div>`;
  }

  return freqHtml + catHtml;
}

function filterExercisePicker() {
  const input = document.getElementById('exPickerSearch');
  const list = document.getElementById('exercisePickerList');
  if (!input || !list) return;
  list.innerHTML = _buildExPickerListHtml(input.value);
}

function openExercisePicker() {
  const list = document.getElementById('exercisePickerList');

  // Inject search + quick-add bar above the list
  const searchBarId = 'exPickerSearchBar';
  let bar = document.getElementById(searchBarId);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = searchBarId;
    list.parentElement.insertBefore(bar, list);
  }
  bar.innerHTML = `
    <input class="form-input picker-search" id="exPickerSearch" type="text" placeholder="${t('searchExercise')}" oninput="filterExercisePicker()" autocomplete="off">
    <div class="quick-add-row" id="exPickerQuickAdd">
      <input class="form-input quick-add-input" id="quickAddName" type="text" placeholder="${t('quickAddPlaceholder')}" autocomplete="off">
      <select class="form-input quick-add-cat" id="quickAddCat">
        ${Object.keys(t('cats')).map(c => `<option value="${c}">${t('cats')[c]}</option>`).join('')}
      </select>
      <button class="btn btn-primary quick-add-btn" onclick="quickAddExercise()">+</button>
    </div>
  `;

  list.innerHTML = _buildExPickerListHtml('');
  openModal('exercisePickerModal');

  // Focus search after modal animation
  setTimeout(() => { const s = document.getElementById('exPickerSearch'); if (s) s.focus(); }, 320);
}

function quickAddExercise() {
  const nameInput = document.getElementById('quickAddName');
  const catSelect = document.getElementById('quickAddCat');
  if (!nameInput || !catSelect) return;
  const name = nameInput.value.trim();
  const category = catSelect.value;
  if (!name) { nameInput.focus(); return; }
  
  closeSubModal('exercisePickerModal');
  openAddExerciseFromPicker();
  
  document.getElementById('exName').value = name;
  document.getElementById('exCategory').value = category;
  if (typeof updateCategoryHint === 'function') updateCategoryHint();
  
  nameInput.value = '';
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

  if (ex && !we.isCustom) {
    lpHtml += `<div style="margin-bottom:10px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Notiz (GymLab)</div>
      <textarea class="form-input" placeholder="Notiz für diese Übung..." style="resize:none;height:50px;line-height:1.4;font-size:13px;background:rgba(200,241,53,0.03);border-color:rgba(200,241,53,0.2);" oninput="updateGlobalExNote('${ex.id}', this.value)">${ex.notes || ''}</textarea>
    </div>`;
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
  const cw = db.currentWorkout;
  const templateId = cw ? cw.templateId : null;
  let relevant;
  if (templateId) {
    // Template-specific: compare with workouts spawned from the exact same template
    relevant = db.workouts
      .filter(w => w.id !== currentWorkoutId && w.templateId === templateId && w.exercises.some(e => !e.isCustom && e.exId === exId))
      .sort((a, b) => b.date - a.date);
  }
  if (!relevant || relevant.length === 0) {
    // Fallback: global comparison
    relevant = db.workouts
      .filter(w => w.id !== currentWorkoutId && w.exercises.some(e => !e.isCustom && e.exId === exId))
      .sort((a, b) => b.date - a.date);
  }
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
      <input class="set-input pace-display" type="text" placeholder="–" value="${pace}"/>
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
      const km = parseFloat(inputs[0].value), time = inputs[1].value.trim(), pace = inputs[2].value.trim();
      if (km > 0 || time || pace) sets.push({ type: sType, rpe, km: km||0, time, pace });
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
  // Show next-exercise suggestions if not template-based
  _showNextExSuggestions();
}

function _showNextExSuggestions() {
  const cw = db.currentWorkout;
  if (!cw) return;
  // Only show if it's a free (non-template) workout
  if (cw.templateId) return;
  const existing = document.getElementById('nextExSuggestions');
  if (existing) existing.remove();
  
  const addedIds = cw.exercises.map(e => e.exId).filter(Boolean);
  // Find last exercise's category
  const lastEx = cw.exercises[cw.exercises.length - 1];
  let lastCat = null;
  if (lastEx && !lastEx.isCustom) {
    const exDef = getEx(lastEx.exId);
    if (exDef) lastCat = exDef.category;
  }
  
  // Build suggestions: same-category exercises not yet added + frequent
  let suggestions = [];
  if (lastCat) {
    suggestions = db.exercises
      .filter(e => e.category === lastCat && !addedIds.includes(e.id))
      .slice(0, 3);
  }
  if (suggestions.length < 3) {
    const freqs = _getFrequentExercises(5)
      .filter(e => !addedIds.includes(e.id) && !suggestions.find(s => s.id === e.id));
    suggestions = suggestions.concat(freqs).slice(0, 4);
  }
  if (suggestions.length === 0) return;
  
  const container = document.getElementById('workoutExercises');
  if (!container) return;
  const bar = document.createElement('div');
  bar.id = 'nextExSuggestions';
  bar.className = 'next-ex-bar';
  bar.innerHTML = `
    <div class="next-ex-label">${t('suggestNextEx')}</div>
    <div class="next-ex-chips">
      ${suggestions.map(e => {
        const type = getCatType(e.category);
        const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
        return `<button class="next-ex-chip ${catClass}" onclick="addExerciseToWorkout('${e.id}');this.parentElement.parentElement.remove();">${e.name}</button>`;
      }).join('')}
    </div>
  `;
  container.parentElement.insertBefore(bar, document.getElementById('btnAddExercise'));
  // Auto-dismiss after 8 seconds
  setTimeout(() => { const el = document.getElementById('nextExSuggestions'); if (el) el.remove(); }, 8000);
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
      haptic('success');
      showToast('✓ ' + t('restDone'));
      return;
    }
    _updateRestDisplay();
  }, 500);
}

window.updateGlobalExNote = function(exId, val) {
  const ex = db.exercises.find(e => e.id === exId);
  if (ex) {
    ex.notes = val;
    save();
  }
};

// When returning from background: re-sync + prominent alert if timer already done
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (restTimerEndAt) {
      restTimerSec = Math.max(0, Math.round((restTimerEndAt - Date.now()) / 1000));
      if (restTimerSec <= 0) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        restTimerEndAt    = 0;
        const overlay = document.getElementById('restTimerOverlay');
        if (overlay) overlay.style.display = 'none';
        if (typeof _postSwMsg === 'function') _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
        haptic('success');
        showToast('✓ ' + t('restDone'));
      } else {
        _updateRestDisplay();
      }
    }
    
    // Restore and recalculate stopwatch elapsed time
    if (typeof _restoreSwState === 'function') {
      _restoreSwState();
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

/* ---- Template Exercise Persistence ---- */
function saveExerciseToTemplate(exId, btnEl) {
  const cw = db.currentWorkout;
  if (!cw || !cw.templateId) return;
  const tmpl = db.templates.find(x => String(x.id) === String(cw.templateId));
  if (!tmpl) return;
  if (tmpl.exerciseIds.includes(exId)) return;
  
  tmpl.exerciseIds.push(exId);
  save();
  
  // Update button to show "saved"
  if (btnEl) {
    btnEl.textContent = t('savedToTemplate');
    btnEl.classList.add('saved');
  }
  haptic('success');
  showToast(t('savedToTemplate'));
}

let _pendingTemplateUpdate = null;

function _checkTemplateUpdates(finishedWorkout) {
  if (!finishedWorkout.templateId) return;
  const tmpl = db.templates.find(x => String(x.id) === String(finishedWorkout.templateId));
  if (!tmpl) return;
  
  // Find exercises that were added during the workout but not in the template
  const newExIds = finishedWorkout.exercises
    .filter(e => e.exId && !e.isCustom && !tmpl.exerciseIds.includes(e.exId))
    .map(e => e.exId);
  
  if (newExIds.length === 0) return;
  
  _pendingTemplateUpdate = {
    templateId: finishedWorkout.templateId,
    newExIds: [...newExIds],
    selected: [...newExIds] // all selected by default
  };
  
  _renderTemplateUpdateDialog();
  openModal('tmplUpdateModal');
}

function _renderTemplateUpdateDialog() {
  const state = _pendingTemplateUpdate;
  if (!state) return;
  
  document.getElementById('tmplUpdateTitle').textContent = t('tmplUpdateTitle');
  document.getElementById('tmplUpdateDesc').textContent = t('tmplUpdateDesc');
  document.getElementById('btnTmplUpdateConfirm').textContent = t('tmplUpdateConfirm');
  
  const list = document.getElementById('tmplUpdateExList');
  list.innerHTML = state.newExIds.map(exId => {
    const ex = getEx(exId);
    const name = ex ? ex.name : exId;
    const cat = ex ? (t('cats')[ex.category] || ex.category) : '';
    const catType = ex ? getCatType(ex.category) : 'strength';
    const catClass = getCatClass(catType);
    const isSelected = state.selected.includes(exId);
    
    return `<div class="tmpl-update-item${isSelected ? ' selected' : ''}" onclick="_toggleTmplUpdateItem('${exId}')">
      <div class="tmpl-update-check">${isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
      <div>
        <div style="font-weight:600;font-size:14px;">${name}</div>
        <span class="cat-badge ${catClass}" style="font-size:10px;">${cat}</span>
      </div>
    </div>`;
  }).join('');
}

function _toggleTmplUpdateItem(exId) {
  if (!_pendingTemplateUpdate) return;
  const idx = _pendingTemplateUpdate.selected.indexOf(exId);
  if (idx === -1) _pendingTemplateUpdate.selected.push(exId);
  else _pendingTemplateUpdate.selected.splice(idx, 1);
  _renderTemplateUpdateDialog();
  haptic('light');
}

function confirmTemplateUpdate() {
  if (!_pendingTemplateUpdate) { closeModal('tmplUpdateModal'); return; }
  const tmpl = db.templates.find(x => String(x.id) === String(_pendingTemplateUpdate.templateId));
  if (tmpl && _pendingTemplateUpdate.selected.length > 0) {
    _pendingTemplateUpdate.selected.forEach(exId => {
      if (!tmpl.exerciseIds.includes(exId)) tmpl.exerciseIds.push(exId);
    });
    save();
    showToast(`✓ ${_pendingTemplateUpdate.selected.length} ${t('exercises')} ${t('savedToTemplate')}`);
  }
  _pendingTemplateUpdate = null;
  closeModal('tmplUpdateModal');
  haptic('success');
}

function skipTemplateUpdate() {
  _pendingTemplateUpdate = null;
  closeModal('tmplUpdateModal');
}

// Restore stopwatch state on initial script load
_restoreSwState();

