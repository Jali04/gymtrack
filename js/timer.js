/* =============================================
   GYMTRACK — HIIT / Cardio Timer
   ============================================= */

const HIIT_PRESETS = {
  tabata:  { workSec: 20, restSec: 10, rounds: 8 },
  emom:    { workSec: 60, restSec: 0,  rounds: 10 },
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
  openModal('hiitModal');
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
    return;
  }
  hiitState.currentRound++;
  _hiitStartPhase('work');
}

function _hiitUpdateBtn(state) {
  const btn = document.getElementById('hiitToggleBtn');
  if (!btn) return;
  if (state === 'pause')  { btn.textContent = '⏸ ' + t('hiitPause'); btn.className = 'btn btn-secondary hiit-ctrl-btn'; }
  if (state === 'resume') { btn.textContent = '▶ ' + t('hiitResume'); btn.className = 'btn btn-primary hiit-ctrl-btn'; }
  if (state === 'start')  { btn.textContent = '▶ ' + t('hiitStart'); btn.className = 'btn btn-primary hiit-ctrl-btn'; }
}
