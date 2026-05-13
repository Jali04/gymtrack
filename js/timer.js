/* =============================================
   GYMTRACK — HIIT / Cardio Timer
   ============================================= */

const HIIT_PRESETS = {
  tabata:  { workSec: 20, restSec: 10, rounds: 8 },
  emom:    { workSec: 60, restSec: 0,  rounds: 10 },
  rope:    { workSec: 30, restSec: 15, rounds: 10 },
  custom:  { workSec: 40, restSec: 20, rounds: 5  },
};

let hiitState = {
  mode: 'tabata',    // 'tabata' | 'emom' | 'custom' | 'amrap'
  workSec: 20, restSec: 10, rounds: 8,
  currentRound: 1, phase: 'idle', // 'idle' | 'work' | 'rest' | 'done'
  remaining: 0, elapsed: 0,
  interval: null, startTs: null,
};

/* ---------- open / close ---------- */
function openHiitTimer() {
  _hiitRenderPreset();
  _hiitRenderConfig();
  _hiitRenderDisplay();
  switchTimerMode('hiit');
  openModal('hiitModal');
}

function switchTimerMode(mode) {
  const hiitSec = document.getElementById('hiitSection');
  const swSec   = document.getElementById('swSection');
  const btnHiit = document.getElementById('timerModeHiit');
  const btnSw   = document.getElementById('timerModeSw');
  if (hiitSec) hiitSec.style.display = mode === 'hiit' ? '' : 'none';
  if (swSec)   swSec.style.display   = mode === 'sw'   ? '' : 'none';
  if (btnHiit) btnHiit.classList.toggle('active', mode === 'hiit');
  if (btnSw)   btnSw.classList.toggle('active',   mode === 'sw');
}

function closeHiitTimer() {
  _hiitStop();
  hiitState.phase = 'idle';
  _hiitRenderDisplay();
  closeModal('hiitModal');
}

/* ---------- preset tabs ---------- */
function hiitSelectMode(mode) {
  _hiitStop();
  hiitState.mode         = mode;
  hiitState.currentRound = 1;
  hiitState.phase        = 'idle';
  const p                = HIIT_PRESETS[mode] || HIIT_PRESETS.tabata;
  if (mode !== 'amrap') {
    hiitState.workSec  = p.workSec;
    hiitState.restSec  = p.restSec;
    hiitState.rounds   = p.rounds;
  }
  _hiitRenderPreset();
  _hiitRenderConfig();
  _hiitRenderDisplay();
}

function _hiitRenderPreset() {
  document.querySelectorAll('.hiit-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === hiitState.mode);
  });
}

/* ---------- config inputs ---------- */
function _hiitRenderConfig() {
  const cfg    = document.getElementById('hiitConfig');
  const isAmrap = hiitState.mode === 'amrap';
  if (isAmrap) {
    cfg.innerHTML = `<p class="hiit-hint" id="hiitHintText">${t('hiitAmrapHint')}</p>`;
    return;
  }
  const hasRest = hiitState.mode !== 'emom';
  cfg.innerHTML = `
    <div class="hiit-config-row">
      <div class="hiit-config-item">
        <label class="form-label" id="hiitLblWork">${t('hiitWork')}</label>
        <div class="hiit-num-input">
          <button onclick="hiitAdj('workSec',-5)">−</button>
          <span id="hiitWorkVal">${hiitState.workSec}s</span>
          <button onclick="hiitAdj('workSec', 5)">+</button>
        </div>
      </div>
      ${hasRest ? `<div class="hiit-config-item">
        <label class="form-label" id="hiitLblRest">${t('hiitRest')}</label>
        <div class="hiit-num-input">
          <button onclick="hiitAdj('restSec',-5)">−</button>
          <span id="hiitRestVal">${hiitState.restSec}s</span>
          <button onclick="hiitAdj('restSec', 5)">+</button>
        </div>
      </div>` : ''}
      <div class="hiit-config-item">
        <label class="form-label" id="hiitLblRounds">${t('hiitRounds')}</label>
        <div class="hiit-num-input">
          <button onclick="hiitAdj('rounds',-1)">−</button>
          <span id="hiitRoundsVal">${hiitState.rounds}</span>
          <button onclick="hiitAdj('rounds', 1)">+</button>
        </div>
      </div>
    </div>`;
}

function hiitAdj(field, delta) {
  const min = field === 'rounds' ? 1 : 5;
  hiitState[field] = Math.max(min, hiitState[field] + delta);
  _hiitRenderConfig();
  _hiitRenderDisplay();
  haptic('light');
}

/* ---------- timer display ---------- */
function _hiitRenderDisplay() {
  const isAmrap = hiitState.mode === 'amrap';
  const phase   = hiitState.phase;
  const el      = document.getElementById('hiitDisplay');

  let timeVal = 0;
  let phaseLabel = '';
  let ringColor  = 'var(--accent)';
  let pct        = 1;

  if (phase === 'idle') {
    timeVal    = isAmrap ? 0 : hiitState.workSec;
    phaseLabel = t('hiitReady');
    pct        = 1;
  } else if (phase === 'work') {
    timeVal    = hiitState.remaining;
    phaseLabel = t('hiitWork');
    ringColor  = 'var(--accent)';
    pct        = isAmrap ? 0 : hiitState.remaining / hiitState.workSec;
  } else if (phase === 'rest') {
    timeVal    = hiitState.remaining;
    phaseLabel = t('hiitRest');
    ringColor  = 'var(--accent2)';
    pct        = hiitState.remaining / hiitState.restSec;
  } else if (phase === 'done') {
    timeVal    = 0;
    phaseLabel = t('hiitDone');
    ringColor  = 'var(--accent)';
    pct        = 1;
  }

  const displayTime = isAmrap && phase === 'work'
    ? _fmtSec(hiitState.elapsed)
    : _fmtSec(timeVal);

  const rounds     = hiitState.rounds;
  const curRound   = hiitState.currentRound;
  const roundsHtml = isAmrap
    ? ''
    : `<div class="hiit-rounds" id="hiitRoundsDisplay">
         ${t('hiitRound')} ${Math.min(curRound, rounds)} / ${rounds}
       </div>`;

  const circumference = 2 * Math.PI * 52;
  const dashOffset    = circumference * (1 - Math.max(0, Math.min(1, pct)));

  el.innerHTML = `
    <div class="hiit-ring-wrap">
      <svg class="hiit-ring" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface2)" stroke-width="8"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="${ringColor}" stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashOffset}"
          transform="rotate(-90 60 60)"
          id="hiitRingProgress"
          style="transition:stroke-dashoffset 0.9s linear,stroke 0.4s;"/>
      </svg>
      <div class="hiit-ring-inner">
        <div class="hiit-phase-label" style="color:${ringColor}">${phaseLabel}</div>
        <div class="hiit-time-big">${displayTime}</div>
        ${roundsHtml}
      </div>
    </div>`;
}

function _fmtSec(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const r = (s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

/* ---------- start / pause / stop ---------- */
function hiitToggle() {
  if (hiitState.phase === 'idle' || hiitState.phase === 'done') {
    _hiitBegin();
  } else if (hiitState.interval) {
    _hiitPause();
  } else {
    _hiitResume();
  }
}

function _hiitBegin() {
  hiitState.currentRound = 1;
  hiitState.elapsed      = 0;
  _hiitStartPhase('work');
  haptic('medium');
  _hiitUpdateBtn('pause');
}

function _hiitPause() {
  clearInterval(hiitState.interval);
  hiitState.interval = null;
  _hiitUpdateBtn('resume');
}

function _hiitResume() {
  hiitState.startTs = Date.now() - ((hiitState.mode === 'amrap' ? hiitState.workSec : hiitState.remaining) - hiitState.remaining) * 1000;
  _hiitTick();
  hiitState.interval = setInterval(_hiitTick, 250);
  _hiitUpdateBtn('pause');
}

function _hiitStop() {
  clearInterval(hiitState.interval);
  hiitState.interval     = null;
  hiitState.currentRound = 1;
  hiitState.phase        = 'idle';
  hiitState.elapsed      = 0;
}

function hiitReset() {
  _hiitStop();
  _hiitRenderDisplay();
  _hiitUpdateBtn('start');
  haptic('light');
}

function hiitSkip() {
  if (hiitState.phase === 'idle' || hiitState.phase === 'done') return;
  clearInterval(hiitState.interval);
  hiitState.interval = null;
  _hiitPhaseEnd();
  haptic('light');
}

function _hiitStartPhase(phase) {
  hiitState.phase = phase;
  const dur = phase === 'work' ? hiitState.workSec : hiitState.restSec;
  hiitState.remaining = dur;
  hiitState.startTs   = Date.now();
  _hiitRenderDisplay();
  hiitState.interval = setInterval(_hiitTick, 250);
}

function _hiitTick() {
  const now   = Date.now();
  const isAmrap = hiitState.mode === 'amrap';

  if (isAmrap) {
    hiitState.elapsed = Math.floor((now - hiitState.startTs) / 1000);
  } else {
    const dur   = hiitState.phase === 'work' ? hiitState.workSec : hiitState.restSec;
    const spent = (now - hiitState.startTs) / 1000;
    hiitState.remaining = Math.max(0, dur - spent);
    if (hiitState.remaining <= 0) {
      clearInterval(hiitState.interval);
      hiitState.interval = null;
      _hiitPhaseEnd();
      return;
    }
  }
  _hiitRenderDisplay();
}

function _hiitPhaseEnd() {
  haptic('success');
  const isAmrap = hiitState.mode === 'amrap';
  if (isAmrap) return;

  if (hiitState.phase === 'work') {
    if (hiitState.restSec > 0) {
      _hiitStartPhase('rest');
    } else {
      // EMOM: jump to next round immediately
      _hiitNextRound();
    }
  } else {
    _hiitNextRound();
  }
}

function _hiitNextRound() {
  if (hiitState.currentRound >= hiitState.rounds) {
    hiitState.phase = 'done';
    clearInterval(hiitState.interval);
    hiitState.interval = null;
    _hiitRenderDisplay();
    _hiitUpdateBtn('start');
    haptic('success');
    showToast('🏆 ' + t('hiitDone'));
    if (typeof db !== 'undefined' && db.currentWorkout) {
      setTimeout(openHiitLogModal, 800);
    }
    return;
  }
  hiitState.currentRound++;
  _hiitStartPhase('work');
}

/* ---------- log HIIT to workout ---------- */
window._timerLogState = {
  type: 'hiit',
  perRound: false,
  allTarget: 'workout_0',
  allNote: '',
  roundTargets: [],
  roundNotes: [],
  swTarget: 'workout_0',
  swNote: ''
};

window._reRenderTimerLog = function() {
  if (window._timerLogState.type === 'hiit') {
    _renderHiitLogContent();
  } else {
    _renderSwLogContent();
  }
};

function _buildTargetOptions(selectedVal) {
  const cw = db.currentWorkout;
  let html = '';
  if (cw && cw.exercises.length > 0) {
    html += `<optgroup label="${t('targetCurrentEx') || 'Aktuelle Übungen'}">`;
    cw.exercises.forEach((e, i) => {
      const ex = getEx(e.exId);
      const name = e.isCustom ? e.customName : (ex ? ex.name : '?');
      const sel = (selectedVal === `workout_${i}`) ? 'selected' : '';
      html += `<option value="workout_${i}" ${sel}>${name}</option>`;
    });
    html += `</optgroup>`;
  }
  html += `<optgroup label="${t('targetMuscleGroup') || 'Muskelgruppe (Freies Training)'}">`;
  const catsObj = t('cats') || {};
  Object.keys(catsObj).forEach(cat => {
    const sel = (selectedVal === `custom_${cat}`) ? 'selected' : '';
    html += `<option value="custom_${cat}" ${sel}>${catsObj[cat]}</option>`;
  });
  html += `</optgroup>`;
  html += `<optgroup label="Optionen">`;
  html += `<option value="gymlab" ${selectedVal === 'gymlab' ? 'selected' : ''}>${t('targetGymLab') || 'Aus GymLab'}</option>`;
  html += `<option value="newex" ${selectedVal === 'newex' ? 'selected' : ''}>+ ${t('targetNewEx') || 'Neue Übung'}</option>`;
  html += `</optgroup>`;
  return html;
}

function openHiitLogModal() {
  const cw = db.currentWorkout;
  if (!cw) return;

  const modeLabel = { tabata: 'Tabata', emom: 'EMOM', amrap: 'AMRAP', rope: '🪢 Seilspringen', custom: 'Custom' };
  const totalSec  = hiitState.rounds * (hiitState.workSec + hiitState.restSec);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  const restInfo = hiitState.restSec > 0 ? ` / ${hiitState.restSec}s Pause` : '';

  document.getElementById('hiitLogSummary').innerHTML = `
    <div style="background:var(--surface2);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:var(--accent);letter-spacing:1px;margin-bottom:6px;">${modeLabel[hiitState.mode] || hiitState.mode}</div>
      <div style="font-size:13px;color:var(--muted);">${hiitState.rounds} Runden · ${hiitState.workSec}s Arbeit${restInfo}</div>
      <div style="font-size:13px;color:var(--muted);margin-top:3px;">Gesamtzeit: ${mm}:${ss}</div>
    </div>`;

  window._timerLogState.type = 'hiit';
  window._timerLogState.perRound = false;
  window._timerLogState.allTarget = (cw.exercises.length > 0) ? 'workout_0' : 'custom_Brust';
  window._timerLogState.allNote = '';
  window._timerLogState.roundTargets = Array(hiitState.rounds).fill(window._timerLogState.allTarget);
  window._timerLogState.roundNotes = Array(hiitState.rounds).fill('');

  _renderHiitLogContent();
  openModal('hiitLogModal');
}

function _renderHiitLogContent() {
  const state = window._timerLogState;
  const container = document.getElementById('hiitLogContent');
  if (!container) return;
  
  const isAmrap = (hiitState.mode === 'amrap');
  const showToggle = !isAmrap && hiitState.rounds > 1;

  let html = '';
  if (showToggle) {
    html += `
      <div style="display:flex;background:var(--surface2);border-radius:10px;padding:4px;margin-bottom:16px;">
        <div style="flex:1;text-align:center;padding:8px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;${!state.perRound ? 'background:var(--accent);color:#000;' : 'color:var(--muted);'}"
             onclick="window._timerLogState.perRound=false;_renderHiitLogContent()">${t('hiitAllRounds') || 'Alle Runden gleich'}</div>
        <div style="flex:1;text-align:center;padding:8px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;${state.perRound ? 'background:var(--accent);color:#000;' : 'color:var(--muted);'}"
             onclick="window._timerLogState.perRound=true;_renderHiitLogContent()">${t('hiitPerRound') || 'Pro Runde wählen'}</div>
      </div>
    `;
  }

  if (state.perRound && showToggle) {
    for (let r = 0; r < hiitState.rounds; r++) {
      html += `
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">${t('hiitLogRound') || 'Runde'} ${r+1}</div>
          <select class="form-input" style="margin-bottom:8px;" onchange="window._timerLogState.roundTargets[${r}]=this.value; _checkTimerLogTarget(this.value, 'hiit', ${r})">
            ${_buildTargetOptions(state.roundTargets[r])}
          </select>
          <input type="text" class="form-input" style="height:36px;font-size:13px;" placeholder="${t('sessionNotePlaceholder') || 'Anmerkung...'}" value="${state.roundNotes[r]}" oninput="window._timerLogState.roundNotes[${r}]=this.value">
        </div>
      `;
    }
  } else {
    html += `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Ziel</div>
        <select class="form-input" style="margin-bottom:8px;" onchange="window._timerLogState.allTarget=this.value; _checkTimerLogTarget(this.value, 'hiit')">
           ${_buildTargetOptions(state.allTarget)}
        </select>
        <textarea class="form-input" style="resize:none;height:60px;line-height:1.5;font-size:13px;" placeholder="${t('sessionNotePlaceholder') || 'Anmerkung...'}" oninput="window._timerLogState.allNote=this.value">${state.allNote}</textarea>
      </div>
    `;
  }
  
  html += `<button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="_saveHiitLog()">✓ ${t('save') || 'Speichern'}</button>`;
  container.innerHTML = html;
}

function _checkTimerLogTarget(val, timerType, roundIdx = -1) {
  if (val === 'gymlab') {
    window._pickerMode = 'timer_' + timerType;
    window._timerRoundIdx = roundIdx;
    openExercisePicker();
  } else if (val === 'newex') {
    window._pickerMode = 'timer_' + timerType;
    window._timerRoundIdx = roundIdx;
    document.getElementById('exName').value = '';
    document.getElementById('exNotes').value = '';
    document.getElementById('deleteExBtn').style.display = 'none';
    document.getElementById('addExerciseTitle').textContent = t('newExercise');
    openModal('addExerciseModal');
  }
}

// Intercept addExerciseToWorkout and saveExercise to handle timer assignment
const _orig_addExerciseToWorkout = window.addExerciseToWorkout;
window.addExerciseToWorkout = function(exId) {
  if (window._pickerMode && window._pickerMode.startsWith('timer_')) {
    _assignTimerTarget(exId);
    return;
  }
  if (_orig_addExerciseToWorkout) _orig_addExerciseToWorkout(exId);
};

function _assignTimerTarget(exId) {
  const cw = db.currentWorkout;
  let exIdx = cw.exercises.findIndex(e => e.exId === exId);
  if (exIdx === -1) {
    cw.exercises.push({ exId, sets: [] });
    exIdx = cw.exercises.length - 1;
    save();
  }
  const type = window._pickerMode.split('_')[1];
  const rIdx = window._timerRoundIdx;
  const targetStr = `workout_${exIdx}`;
  
  if (type === 'hiit') {
    if (rIdx >= 0) window._timerLogState.roundTargets[rIdx] = targetStr;
    else window._timerLogState.allTarget = targetStr;
  } else {
    window._timerLogState.swTarget = targetStr;
  }
  
  window._pickerMode = null;
  window._timerRoundIdx = null;
  closeModal('exercisePickerModal');
  closeModal('addExerciseModal');
  window._reRenderTimerLog();
}

function _saveHiitLog() {
  const cw = db.currentWorkout;
  if (!cw) return;
  const state = window._timerLogState;

  const totalSec = hiitState.rounds * (hiitState.workSec + hiitState.restSec);
  const baseSet = { mode: hiitState.mode, workSec: hiitState.workSec, restSec: hiitState.restSec };

  let targets = state.perRound ? state.roundTargets : [state.allTarget];
  let notes = state.perRound ? state.roundNotes : [state.allNote];
  let roundsArr = state.perRound ? Array(hiitState.rounds).fill(1) : [hiitState.rounds];

  for (let i = 0; i < targets.length; i++) {
    const tVal = targets[i];
    const tNote = notes[i].trim();
    if (tVal === 'gymlab' || tVal === 'newex') {
      alert("Bitte ein gültiges Ziel wählen.");
      return;
    }
    const setObj = { ...baseSet, rounds: roundsArr[i], totalSec: roundsArr[i] * (hiitState.workSec + hiitState.restSec) };
    
    let exEntry = null;
    if (tVal.startsWith('workout_')) {
      const idx = parseInt(tVal.split('_')[1]);
      exEntry = cw.exercises[idx];
    } else if (tVal.startsWith('custom_')) {
      const cat = tVal.split('_')[1];
      const customName = `HIIT ${hiitState.mode.toUpperCase()}`;
      // Look for existing custom entry in this workout
      exEntry = cw.exercises.find(e => e.isCustom && e.customCategory === cat && e.customName === customName);
      if (!exEntry) {
        exEntry = { isCustom: true, customCategory: cat, customName: customName, sets: [] };
        cw.exercises.push(exEntry);
      }
    }
    
    if (exEntry) {
      if (!exEntry.hiitSets) exEntry.hiitSets = [];
      exEntry.hiitSets.push(setObj);
      if (tNote) exEntry.note = exEntry.note ? exEntry.note + '\\n' + tNote : tNote;
    }
  }

  save();
  closeModal('hiitLogModal');
  closeHiitTimer();
  renderActiveWorkout();
  haptic('success');
  showToast('⚡ HIIT gespeichert');
}

function _hiitUpdateBtn(state) {
  const btn = document.getElementById('hiitToggleBtn');
  if (!btn) return;
  if (state === 'pause')  { btn.textContent = '⏸ ' + t('hiitPause'); btn.className = 'btn btn-secondary hiit-ctrl-btn'; }
  if (state === 'resume') { btn.textContent = '▶ ' + t('hiitResume'); btn.className = 'btn btn-primary hiit-ctrl-btn'; }
  if (state === 'start')  { btn.textContent = '▶ ' + t('hiitStart'); btn.className = 'btn btn-primary hiit-ctrl-btn'; }
}
