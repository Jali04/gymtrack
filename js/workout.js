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
  const pageTitle = document.getElementById('ttlStartTraining');
  if (db.currentWorkout) {
    document.getElementById('quickStart').style.display    = 'none';
    document.getElementById('activeWorkout').style.display = 'block';
    if (pageTitle) pageTitle.style.display = 'none';
    renderActiveWorkout();
    startTimer();
    _checkForgottenWorkout();
    return;
  }
  if (pageTitle) pageTitle.style.display = '';
  document.getElementById('quickStart').style.display    = 'block';
  document.getElementById('activeWorkout').style.display = 'none';
  _renderRestConfig();
  _renderQuickStartTemplates();
  _renderRecentWorkouts();
  _renderStreakBanner();
  if (typeof renderWeekStatusBanner === 'function') renderWeekStatusBanner();

  _updateQuickMetrics();
  _renderCoachTip();
}

const COACH_TIPS_DE = [
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
const COACH_TIPS_EN = [
  "Drink enough water! Muscles are ~75% water and dehydration quickly cuts your strength output.",
  "Use supersets (SS) in the GymLab to save time and keep your heart rate up.",
  "Recovery is key! Muscles grow during rest, not during the workout itself.",
  "Chase progressive overload: aim to add a little weight or a rep over time.",
  "Form over weight. Avoid using momentum to protect your joints and hit the muscle properly.",
  "A protein-rich meal after training supports muscle growth and speeds up recovery.",
  "Sleep is your best booster: 7–8 hours maximises muscle growth and fat loss.",
  "Creatine is one of the best-researched supplements for strength. 3–5 g daily is enough.",
  "Warm up well before heavy work sets. 5–10 min cardio + specific warm-ups prevent injuries.",
  "Track your weight regularly in the Progress tab to spot body-fat and muscle trends."
];
// Language-aware accessor used by _renderCoachTip.
function _coachTips() { return (typeof lang !== 'undefined' && lang === 'en') ? COACH_TIPS_EN : COACH_TIPS_DE; }

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
  const tips = _coachTips();
  const tip = tips[dayOfYear % tips.length];
  el.textContent = tip;
}

function _updateQuickMetrics() {
  const elTrophies = document.getElementById('lblMetricTrophies');
  const elStreak = document.getElementById('lblMetricStreak');
  const elWorkouts7d = document.getElementById('lblMetricWorkouts7d');
  if (!elTrophies || !elStreak || !elWorkouts7d) return;

  elTrophies.textContent = typeof calcTrophies === 'function' ? calcTrophies() : 0;
  elStreak.textContent = typeof calcWeeklyStreak === 'function' ? calcWeeklyStreak() : (typeof calcStreak === 'function' ? calcStreak() : 0);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const count = (db.workouts || []).filter(w => {
    const d = w.date || w.startTime;
    return d && d >= sevenDaysAgo;
  }).length;
  elWorkouts7d.textContent = count;
}

/* ---- B2: Recent workouts list ---- */
function _renderRecentWorkouts() {
  const c = document.getElementById('recentWorkouts');
  if (!c) return;
  const ws = [...(db.workouts || [])]
    .sort((a, b) => (b.startTime || b.date || 0) - (a.startTime || a.date || 0))
    .slice(0, 4);
  if (ws.length === 0) { c.style.display = 'none'; c.innerHTML = ''; return; }

  const loc = lang === 'en' ? 'en-GB' : 'de-DE';
  const rows = ws.map(w => {
    const ts = w.startTime || w.date;
    const d  = new Date(ts);
    const dateStr = d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
    const tmpl = w.templateId ? (db.templates || []).find(x => String(x.id) === String(w.templateId)) : null;
    const name = tmpl ? tmpl.name : (lang === 'en' ? 'Free workout' : 'Freies Training');
    let sets = 0, vol = 0;
    (w.exercises || []).forEach(e => (e.sets || []).forEach(s => {
      sets++; vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }));
    const endTs  = w.endTime || ts;
    const durMin = Math.max(0, Math.round((endTs - ts) / 60000));
    const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin}m`;
    const volStr = vol > 0 ? ` · ${fmtWeightBig(vol)}` : '';
    return `<button class="recent-wo" onclick="_openRecentWorkout('${w.id}')">
      <div class="recent-wo-main">
        <div class="recent-wo-name">${name}</div>
        <div class="recent-wo-meta">${dateStr} · ${durStr} · ${sets} ${t('sets') || 'Sätze'}${volStr}</div>
      </div>
      <div class="recent-wo-arrow">›</div>
    </button>`;
  }).join('');

  c.style.display = 'block';
  c.innerHTML = `
    <div class="recent-header">
      <span class="qs-label" style="margin:0;">${lang === 'en' ? 'Recent workouts' : 'Letzte Trainings'}</span>
      <button class="recent-all" onclick="showPage('progress', document.querySelector('.nav-btn[data-page=progress]'))">${lang === 'en' ? 'Show all' : 'Alle anzeigen'}</button>
    </div>
    ${rows}`;
}

function _openRecentWorkout(id) {
  const w = (db.workouts || []).find(x => x.id === id);
  if (!w) return;
  const d = new Date(w.startTime || w.date);
  if (typeof openCalDay === 'function') openCalDay(d.getFullYear(), d.getMonth(), d.getDate());
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
  // A4: delete immediately with a 5s Undo instead of a blocking confirm.
  const idx = (db.workouts || []).findIndex(w => w.id === id);
  if (idx === -1) return;
  const removed = db.workouts[idx];
  db.workouts.splice(idx, 1);
  save();
  renderLog();
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof renderStats === 'function') renderStats();
  haptic('light');
  const restore = () => {
    db.workouts.splice(Math.min(idx, db.workouts.length), 0, removed);
    save();
    renderLog();
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderStats === 'function') renderStats();
    showToast(lang === 'en' ? '✓ Restored' : '✓ Wiederhergestellt');
  };
  if (typeof showUndoToast === 'function') showUndoToast(lang === 'en' ? 'Workout deleted' : 'Training gelöscht', restore);
  else showToast(lang === 'en' ? 'Workout deleted' : 'Training gelöscht');
}

function openStartOptionsModal() {
  const btnProg = document.getElementById('btnStartProgOpt');
  if (db.activeProgram && db.activeProgram.id) {
    btnProg.style.display = 'block';
  } else {
    btnProg.style.display = 'none';
  }
  const btnRepeat = document.getElementById('btnStartRepeatLast');
  if (btnRepeat) btnRepeat.style.display = (db.workouts && db.workouts.length) ? 'block' : 'none';
  openModal('startOptionsModal');
}

// B3: start a fresh workout from the last one's exercises + supersets (no sets).
function repeatLastWorkout() {
  const last = [...(db.workouts || [])]
    .sort((a, b) => (b.startTime || b.date || 0) - (a.startTime || a.date || 0))[0];
  if (!last) { showToast(lang === 'en' ? 'No previous workout' : 'Kein vorheriges Training'); return; }
  closeModal('startOptionsModal');
  const exercises = (last.exercises || []).map(e => {
    const ne = { exId: e.exId, sets: [] };
    if (e.isCustom) { ne.isCustom = true; ne.customName = e.customName; ne.customCategory = e.customCategory; }
    if (e.supersetGroup) ne.supersetGroup = e.supersetGroup;
    if (e.restSec) ne.restSec = e.restSec;
    return ne;
  });
  db.currentWorkout = {
    id: uid(), date: Date.now(), startTime: Date.now(),
    exercises, templateId: last.templateId || null
  };
  save();
  document.getElementById('quickStart').style.display    = 'none';
  document.getElementById('activeWorkout').style.display = 'block';
  renderActiveWorkout();
  startTimer();
  haptic('medium');
  showToast(lang === 'en' ? 'Last workout loaded' : 'Letztes Training geladen');
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

// Task 7: true while the user is typing into a set/note field of the active
// workout. Used to suppress DOM-rebuilding re-renders (e.g. a background sync
// firing on tab refocus) that would blur the keyboard and drop the input.
function _isTypingInWorkout() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false;
  if (tag === 'INPUT' && el.type === 'checkbox') return false;
  const aw = document.getElementById('activeWorkout');
  return !!(aw && aw.contains(el));
}

function renderActiveWorkout() {
  // Never rebuild the exercise DOM while a field is focused — it would steal
  // focus, close the keyboard and reset the in-progress value. User-initiated
  // re-renders (set done, add set, reorder…) fire from buttons/checkboxes, so
  // they are unaffected by this guard.
  if (_isTypingInWorkout()) return;
  const pageTitle = document.getElementById('ttlStartTraining');
  if (pageTitle) pageTitle.style.display = 'none';
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

  // Template context (Task 1): lets each card offer add/remove-from-template,
  // and drives the "save order to template" button below the list.
  const cwTmpl = cw.templateId ? db.templates.find(x => String(x.id) === String(cw.templateId)) : null;

  container.innerHTML = (cw.exercises || []).map((e, i) => {
      const ex       = getEx(e.exId);
      const name     = e.isCustom ? e.customName : (ex ? ex.name : t('noEntries'));
      const type     = e.isCustom ? getCatType(e.customCategory) : (ex ? getCatType(ex.category) : 'strength');
      const catLabel = e.isCustom ? (t('cats')[e.customCategory] || e.customCategory) : (ex ? (t('cats')[ex.category] || ex.category) : '');
      const catClass = getCatClass(type);

    const hiits    = e.hiitSets || [];
    const hiitBadges  = hiits.map(_hiitBadge).join('');
    const timerBadge  = e.timerSec ? `<span class="set-badge" style="border-color:rgba(200,241,53,0.4);color:var(--accent);">⏱ ${_fmtSwSec(e.timerSec)}</span>` : '';
    const extraBadges = (hiitBadges || timerBadge)
      ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${hiitBadges}${timerBadge}</div>`
      : '';
    const inlineEditor = _renderInlineSetEditor(e, i, type);

    // Superset indicator
    const hasSS = !!e.supersetGroup;
    const ssPartner = hasSS ? cw.exercises.findIndex((x, j) => j !== i && x.supersetGroup === e.supersetGroup) : -1;
    let ssPartnerName = '';
    if (hasSS && ssPartner !== -1) {
      const pe = cw.exercises[ssPartner];
      ssPartnerName = pe.isCustom ? pe.customName : (getEx(pe.exId) ? getEx(pe.exId).name : '');
    }
    const ssLabel = hasSS
      ? `<span style="background:rgba(200,241,53,0.15);border:1px solid rgba(200,241,53,0.4);border-radius:6px;font-size:10px;padding:2px 6px;color:var(--accent);font-weight:700;margin-left:6px;">⟨ SS ⟩${ssPartnerName ? ' · ' + ssPartnerName : ''}</span>`
      : '';
    const ssBtn = hasSS
      ? `<button class="btn btn-secondary btn-sm" style="margin-top:6px;margin-right:4px;font-size:11px;padding:4px 8px;color:var(--accent2);" onclick="unlinkSuperset(${i})">🔗 Superset lösen</button>`
      : `<button class="btn btn-secondary btn-sm" style="margin-top:6px;margin-right:4px;font-size:11px;padding:4px 8px;" onclick="startSupersetLink(${i})">🔗 Superset</button>`;

    // Template persist buttons (Task 1): mirror add + remove so template
    // membership can be edited permanently right in the workout.
    let persistBtn = '';
    if (cwTmpl && e.exId && !e.isCustom) {
      if (cwTmpl.exerciseIds.includes(e.exId)) {
        persistBtn = `<button class="tmpl-persist-btn danger" onclick="event.stopPropagation();removeExerciseFromTemplate('${e.exId}', ${i})">${lang === 'en' ? '✕ From template' : '✕ Aus Vorlage'}</button>`;
      } else {
        persistBtn = `<button class="tmpl-persist-btn" onclick="event.stopPropagation();saveExerciseToTemplate('${e.exId}', this)">${t('saveToTemplate')}</button>`;
      }
    }

    // Inline note (Task 9): a per-set/session note lives right on the card now.
    const noteLabel  = lang === 'en' ? 'Note (this workout only)' : 'Anmerkung (nur dieses Training)';
    const notePlace  = lang === 'en' ? 'e.g. shoulder felt tight — only saved for this session' : 'z.B. Schulter gezwickt – gilt nur für dieses Training';
    const noteToggle = lang === 'en' ? (e.note ? '💬 Note' : '💬 Add note') : (e.note ? '💬 Anmerkung' : '💬 Anmerkung');
    const noteBlock = `
      ${e.note ? `<div class="card-note-display" onclick="toggleCardNote(${i})">💬 ${_escNote(e.note)} <span class="card-note-edit">✎</span></div>` : ''}
      <div id="cardNote-${i}" class="card-note-editor" style="display:none;">
        <div class="card-note-label">${noteLabel}</div>
        <textarea class="form-input card-note-input" placeholder="${notePlace}" oninput="_setCardNote(${i}, this.value)">${_escNote(e.note || '')}</textarea>
      </div>`;

    const isFirst = i === 0;
    const isLast  = i === cw.exercises.length - 1;
    const actionBtns = `
      <button class="ex-action-btn" ${isFirst ? 'disabled' : ''} onclick="event.stopPropagation();moveWorkoutExercise(${i},-1)" title="${t('moveUp')}" aria-label="${t('moveUp')}">↑</button>
      <button class="ex-action-btn" ${isLast ? 'disabled' : ''} onclick="event.stopPropagation();moveWorkoutExercise(${i},1)" title="${t('moveDown')}" aria-label="${t('moveDown')}">↓</button>
      <button class="ex-action-btn" onclick="event.stopPropagation();startExerciseSwap(${i})" title="${t('swapExercise')}" aria-label="${t('swapExercise')}">⇄</button>`;

    return `<div class="exercise-card${hasSS ? ' superset-card' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div class="exercise-name" style="margin-bottom:0;">${name}<span class="cat-badge ${catClass}">${catLabel}</span>${ssLabel}</div>
        <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">
          ${actionBtns}
          <button class="close-btn" onclick="event.stopPropagation();removeWorkoutExercise(${i})">✕</button>
        </div>
      </div>
      ${inlineEditor}
      ${extraBadges}
      ${noteBlock}
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
        ${ssBtn}
        <button class="btn btn-secondary btn-sm" style="margin-top:6px;" onclick="toggleCardNote(${i})">
          ${noteToggle}
        </button>
        ${persistBtn}
      </div>
    </div>`;
  }).join('');

  // Task 1: offer to persist the current exercise order into the template.
  if (cwTmpl && _tmplOrderDiffers(cw, cwTmpl)) {
    container.innerHTML += `<button class="tmpl-order-btn" onclick="saveTemplateOrder()">🔀 ${lang === 'en' ? 'Save order to template' : 'Reihenfolge in Vorlage speichern'}</button>`;
  }

  initRipples();
  _updateWorkoutLiveStats();
  if (typeof refreshWakeLock === 'function') refreshWakeLock();
}

/* ---- Inline set editor (A2) ---- */
function _we(i) {
  return db.currentWorkout && db.currentWorkout.exercises ? db.currentWorkout.exercises[i] : null;
}
function _exType(we) {
  if (!we) return 'strength';
  const ex = getEx(we.exId);
  return we.isCustom ? getCatType(we.customCategory) : (ex ? getCatType(ex.category) : 'strength');
}
function _parseNum(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}
function _setHasData(s) {
  if (!s) return false;
  if (s.minutes != null && s.minutes !== '') return Number(s.minutes) > 0;
  if ('km' in s || 'pace' in s || (s.time != null && !('reps' in s))) {
    return Number(s.km) > 0 || !!(s.time && String(s.time).trim());
  }
  return s.reps != null && s.reps !== '' && Number(s.reps) > 0;
}
function _lastPerf(we) {
  if (!we || !db.currentWorkout) return null;
  return we.isCustom
    ? getLastCustomPerformance(we.customName, we.customCategory, db.currentWorkout.id)
    : getLastPerformance(we.exId, db.currentWorkout.id);
}

// F3: some lifters think in RIR (Reps in Reserve) = 10 − RPE. Stored value is
// always RPE; RIR mode only changes what's shown/entered.
function _rirMode() { return !!(db.settings && db.settings.rir); }
function _rpeToInput(rpe) { if (rpe == null) return ''; return _rirMode() ? (10 - rpe) : rpe; }
function _rpeGhost(rpe) { if (rpe == null) return '–'; return String(_rirMode() ? (10 - rpe) : rpe); }

function _renderInlineSetEditor(e, i, type) {
  if (!Array.isArray(e.sets)) e.sets = [];
  const lp    = _lastPerf(e);
  const lpSet = k => (lp && lp.sets && lp.sets[k]) ? lp.sets[k] : null;
  const restSec = e.restSec || _getRestCfg().sec;
  const restM = Math.floor(restSec / 60), restS = (restSec % 60).toString().padStart(2, '0');
  const restCustom = !!e.restSec;

  // Column header
  const rpeLbl = _rirMode() ? 'RIR' : 'RPE';
  let head;
  if (type === 'cardio') head = `<div class="il-head il-cardio"><span>#</span><span></span><span>${t('colKm')}</span><span>${t('colTime')}</span><span>${t('colPace')}</span><span>${rpeLbl}</span><span>✓</span><span></span></div>`;
  else if (type === 'stretch') head = `<div class="il-head il-stretch"><span>#</span><span>${t('colMin')}</span><span>✓</span><span></span></div>`;
  else head = `<div class="il-head"><span>#</span><span></span><span>${unitLabel()}</span><span>${t('reps')}</span><span>${rpeLbl}</span><span>✓</span><span></span></div>`;

  const titles = { 'N': t('setNormalTitle') || 'Normal', 'W': t('setWarmupTitle') || 'Warmup', 'D': t('setDropTitle') || 'Drop' };
  const typeLabel = st => t('set' + (st === 'N' ? 'Normal' : st === 'W' ? 'Warmup' : 'Drop')) || st;

  const rows = e.sets.map((s, k) => {
    const done = !!s.done;
    const g = lpSet(k);
    const typeBtn = st => `<button class="il-type" data-type="${st}" style="color:${TYPE_COLORS[st]};" title="${titles[st]}" onclick="_cycleInlineSetType(${i},${k},this)">${typeLabel(st)}</button>`;
    const done_cb = `<label class="il-done"><input type="checkbox" ${done ? 'checked' : ''} onchange="toggleSetDone(${i},${k},this.checked)"><span class="il-check">✓</span></label>`;
    const rm = `<button class="il-rm" title="${t('removeSet') || 'Entfernen'}" onclick="removeInlineSet(${i},${k})">✕</button>`;
    if (type === 'cardio') {
      return `<div class="il-row il-cardio${done ? ' done' : ''}">
        <span class="il-num">${k + 1}</span>
        ${typeBtn(s.type || 'N')}
        <input class="il-in" type="text" inputmode="decimal" value="${s.km != null ? s.km : ''}" placeholder="${g && g.km != null ? g.km : '0'}" onchange="inlineSet(${i},${k},'km',this.value)">
        <input class="il-in" type="text" inputmode="numeric" value="${s.time != null ? s.time : ''}" placeholder="${g && g.time ? g.time : '0:00'}" onchange="inlineSet(${i},${k},'time',this.value)">
        <span class="il-pace" id="ilpace-${i}-${k}">${s.pace || '–'}</span>
        <input class="il-in il-rpe" type="text" inputmode="numeric" value="${_rpeToInput(s.rpe)}" placeholder="–" onchange="inlineSet(${i},${k},'rpe',this.value)">
        ${done_cb}${rm}
      </div>`;
    } else if (type === 'stretch') {
      return `<div class="il-row il-stretch${done ? ' done' : ''}">
        <span class="il-num">${k + 1}</span>
        <input class="il-in" type="text" inputmode="decimal" value="${s.minutes != null ? s.minutes : ''}" placeholder="${g && g.minutes != null ? g.minutes : '2'}" onchange="inlineSet(${i},${k},'minutes',this.value)">
        ${done_cb}${rm}
      </div>`;
    }
    return `<div class="il-row${done ? ' done' : ''}">
      <span class="il-num">${k + 1}</span>
      ${typeBtn(s.type || 'N')}
      <input class="il-in" type="text" inputmode="decimal" value="${fmtWeightNum(s.weight)}" placeholder="${g && g.weight != null ? fmtWeightNum(g.weight) : '0'}" onchange="inlineSet(${i},${k},'weight',this.value)">
      <input class="il-in" type="text" inputmode="numeric" value="${s.reps != null ? s.reps : ''}" placeholder="${g && g.reps != null ? g.reps : '0'}" onchange="inlineSet(${i},${k},'reps',this.value)">
      <input class="il-in il-rpe" type="text" inputmode="numeric" value="${_rpeToInput(s.rpe)}" placeholder="–" onchange="inlineSet(${i},${k},'rpe',this.value)">
      ${done_cb}${rm}
    </div>`;
  }).join('');

  // "Last time" summary line with a one-tap apply
  let lastLine = '';
  if (lp && lp.sets && lp.sets.length) {
    lastLine = `<div class="il-last"><span class="il-last-txt">${t('lastPerf') || 'Letztes Mal'}: ${_lastPerfShort(lp.sets, type)}</span>
      <button class="il-apply" onclick="applyLastPerformance(${i})">${t('applyLast')}</button></div>`;
  }

  const restCtl = type === 'stretch' ? '' : `<div class="il-rest">
      <span class="il-rest-lbl">⏱ ${t('restLabel') || 'Pause'}</span>
      <button class="il-rest-adj" onclick="adjustExerciseRest(${i},-15)">−</button>
      <span class="il-rest-val${restCustom ? ' custom' : ''}">${restM}:${restS}</span>
      <button class="il-rest-adj" onclick="adjustExerciseRest(${i},15)">+</button>
    </div>`;

  // B8: e1RM estimate + plate calculator, strength only.
  let e1rmRow = '';
  if (type === 'strength') {
    const e1 = _bestE1rm(e.sets);
    const e1chip = e1 > 0
      ? `<span class="il-e1rm" title="Epley 1RM-Schätzung">≈ e1RM <b>${fmtWeight(e1)}</b></span>`
      : '';
    // F5: offer warm-up sets when there's a heavy work set and no warm-ups yet.
    const topWork = Math.max(0, ...(e.sets || []).filter(s => s.type !== 'W').map(s => Number(s.weight) || 0));
    const hasWarmup = (e.sets || []).some(s => s.type === 'W');
    const warmBtn = (!hasWarmup && topWork >= 40)
      ? `<button class="il-plate" onclick="suggestWarmup(${i})">🔥 ${lang === 'en' ? 'Warm-up' : 'Aufwärmen'}</button>`
      : '';
    e1rmRow = `<div class="il-e1rm-row">
      ${e1chip}
      ${warmBtn}
      <button class="il-plate" onclick="openPlateCalcFor(${i})">🧮 ${lang === 'en' ? 'Plates' : 'Scheiben'}</button>
    </div>`;
  }

  return `<div class="il-editor">
    ${lastLine}
    ${e.sets.length ? head + rows : `<div class="il-empty">${t('noSetsYet') || 'Noch keine Sätze'}</div>`}
    <div class="il-actions">
      <button class="il-add" onclick="addInlineSet(${i})">+ ${t('set') || 'Satz'}</button>
      ${restCtl}
    </div>
    ${e1rmRow}
  </div>`;
}

// F5: prepend warm-up sets (40/60/80% of the top work weight) as "W" sets.
function _round25(x) { return Math.round(x / 2.5) * 2.5; }
function suggestWarmup(i) {
  const we = _we(i); if (!we) return;
  if (_exType(we) !== 'strength') return;
  let top = 0, reps = 8;
  (we.sets || []).forEach(s => {
    if (s.type !== 'W') { const w = Number(s.weight) || 0; if (w > top) { top = w; reps = Number(s.reps) || reps; } }
  });
  if (top <= 0) return;
  const warm = [0.4, 0.6, 0.8].map(p => ({
    type: 'W',
    weight: Math.max(2.5, _round25(top * p)),
    reps: Math.max(3, Math.round(reps * 0.7)),
    rpe: null, done: false
  }));
  we.sets = warm.concat(we.sets);
  save();
  renderActiveWorkout();
  haptic('light');
  showToast(lang === 'en' ? '🔥 Warm-up sets added' : '🔥 Aufwärmsätze hinzugefügt');
}

// Best Epley e1RM across a set list (ignoring warm-up sets).
function _bestE1rm(sets) {
  let best = 0;
  (sets || []).forEach(s => {
    if (s.type === 'W') return;
    const w = Number(s.weight), r = Number(s.reps);
    if (w > 0 && r > 0) {
      const e = w * (1 + r / 30);
      if (e > best) best = e;
    }
  });
  return best ? Math.round(best) : 0;
}

// Open the plate calculator prefilled with this exercise's heaviest set.
function openPlateCalcFor(i) {
  const we = _we(i);
  let target = 0;
  if (we) (we.sets || []).forEach(s => { const w = Number(s.weight); if (w > target) target = w; });
  openToolsModal();
  const tEl = document.getElementById('toolPlateTarget');
  if (tEl && target > 0) { tEl.value = target; if (typeof calculatePlates === 'function') calculatePlates(); }
  haptic('light');
}

function _lastPerfShort(sets, type) {
  if (!sets || !sets.length) return '';
  const s = sets[0];
  if (type === 'cardio') return `${s.km || 0}km ${s.time || ''}`.trim();
  if (type === 'stretch') return `${s.minutes || 0} ${t('colMin')}`;
  return `${fmtWeight(s.weight != null ? s.weight : 0)} × ${s.reps != null ? s.reps : 0}${sets.length > 1 ? ` (${sets.length}×)` : ''}`;
}

function inlineSet(i, k, field, value) {
  const we = _we(i); if (!we || !we.sets[k]) return;
  const s = we.sets[k];
  if (field === 'weight') s.weight = toKg(value); // F2: input is in display unit, stored in kg
  else if (field === 'km' || field === 'minutes') s[field] = _parseNum(value);
  else if (field === 'reps') { const n = parseInt(String(value).replace(',', '.'), 10); s.reps = isNaN(n) ? null : n; }
  else if (field === 'rpe') {
    const n = _parseNum(value);
    // In RIR mode the input is Reps-in-Reserve; convert to stored RPE (= 10 − RIR).
    s.rpe = (n == null) ? null : Math.max(0, Math.min(10, _rirMode() ? (10 - n) : n));
  }
  else if (field === 'time') { s.time = String(value).trim(); _recalcInlinePace(i, k); }
  save();
  _updateWorkoutLiveStats();
}

function _recalcInlinePace(i, k) {
  const we = _we(i); if (!we || !we.sets[k]) return;
  const s = we.sets[k];
  const km = Number(s.km), timeStr = s.time || '';
  let pace = '–';
  if (km > 0 && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const totalMins = (parseInt(parts[0] || 0) || 0) + ((parseInt(parts[1] || 0) || 0) / 60);
    if (totalMins > 0) {
      const p = totalMins / km, pm = Math.floor(p), ps = Math.round((p - pm) * 60).toString().padStart(2, '0');
      pace = `${pm}:${ps}`;
    }
  }
  s.pace = pace === '–' ? '' : pace;
  const el = document.getElementById(`ilpace-${i}-${k}`);
  if (el) el.textContent = pace;
}

function _cycleInlineSetType(i, k, btn) {
  const we = _we(i); if (!we || !we.sets[k]) return;
  const types = ['N', 'W', 'D'];
  const cur = we.sets[k].type || 'N';
  const next = types[(types.indexOf(cur) + 1) % types.length];
  we.sets[k].type = next;
  btn.dataset.type = next;
  btn.style.color = TYPE_COLORS[next];
  btn.textContent = t('set' + (next === 'N' ? 'Normal' : next === 'W' ? 'Warmup' : 'Drop')) || next;
  save();
  haptic('light');
}

function addInlineSet(i) {
  const we = _we(i); if (!we) return;
  if (!Array.isArray(we.sets)) we.sets = [];
  const type = _exType(we);
  const prev = we.sets[we.sets.length - 1];
  // Task 6: keep new sets EMPTY (only inherit the set type). That way each new
  // row shows the matching set from last time as ghost text (placeholder) —
  // e.g. adding set 2 shows last workout's set 2, not a copy of this session's
  // set 1. The ghost comes from _lastPerf() → lpSet(k) in the inline editor.
  let s;
  if (type === 'cardio')      s = { type: prev ? (prev.type || 'N') : 'N', km: null, time: '', pace: '', rpe: null, done: false };
  else if (type === 'stretch') s = { minutes: null, done: false };
  else                         s = { type: prev ? (prev.type || 'N') : 'N', weight: null, reps: null, rpe: null, done: false };
  we.sets.push(s);
  save();
  renderActiveWorkout();
  // Focus the first input of the new row for immediate typing
  const rows = document.querySelectorAll('#workoutExercises .exercise-card')[i];
  if (rows) {
    const inputs = rows.querySelectorAll('.il-row:last-child .il-in');
    if (inputs && inputs[0]) inputs[0].focus();
  }
  haptic('light');
}

function removeInlineSet(i, k) {
  const we = _we(i); if (!we || !Array.isArray(we.sets)) return;
  const removed = we.sets[k];
  we.sets.splice(k, 1);
  save();
  renderActiveWorkout();
  haptic('light');
  // A4: offer a quick undo for an accidental set removal.
  if (removed && _setHasData(removed) && typeof showUndoToast === 'function') {
    showUndoToast(lang === 'en' ? 'Set removed' : 'Satz entfernt', () => {
      const w2 = _we(i);
      if (!w2 || !Array.isArray(w2.sets)) return;
      w2.sets.splice(Math.min(k, w2.sets.length), 0, removed);
      save();
      renderActiveWorkout();
    });
  }
}

// B4: within a superset, the rest timer starts only after the LAST member's
// set; earlier members show a "Weiter mit B" hint so you flow A→B→rest.
function _nextSupersetPartnerName(i) {
  const cw = db.currentWorkout;
  const e = cw && cw.exercises[i];
  if (!e || !e.supersetGroup) return null;
  const members = cw.exercises
    .map((x, idx) => ({ x, idx }))
    .filter(o => o.x.supersetGroup === e.supersetGroup)
    .map(o => o.idx)
    .sort((a, b) => a - b);
  const pos = members.indexOf(i);
  if (pos === -1 || pos === members.length - 1) return null; // last member → rest
  const ne = cw.exercises[members[pos + 1]];
  return ne.isCustom ? ne.customName : (getEx(ne.exId) ? getEx(ne.exId).name : '?');
}

function toggleSetDone(i, k, checked) {
  const we = _we(i); if (!we || !we.sets[k]) return;
  we.sets[k].done = checked;
  save();
  renderActiveWorkout();
  if (checked) {
    haptic('success');
    const partner = _nextSupersetPartnerName(i);
    if (partner) {
      // Superset continues — don't rest yet, cue the next exercise.
      showToast((lang === 'en' ? '→ Next: ' : '→ Weiter mit ') + partner);
    } else {
      startRestTimer(i);
    }
  } else {
    haptic('light');
  }
}

function adjustExerciseRest(i, delta) {
  const we = _we(i); if (!we) return;
  const base = we.restSec || _getRestCfg().sec;
  we.restSec = Math.max(15, Math.min(600, base + delta));
  save();
  renderActiveWorkout();
  haptic('light');
}

function applyLastPerformance(i) {
  const we = _we(i); if (!we) return;
  const lp = _lastPerf(we);
  if (!lp || !lp.sets || !lp.sets.length) return;
  we.sets = lp.sets.map(s => {
    const c = Object.assign({}, s);
    delete c.done;
    return Object.assign(c, { done: false });
  });
  save();
  renderActiveWorkout();
  haptic('success');
  showToast(t('appliedLast') || '✓');
}

/* ---- B6: Forgotten-workout detection (checked once per app start) ---- */
let _forgottenChecked = false;
const _FORGOTTEN_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

function _cwStartMs(cw) {
  if (!cw || cw.startTime == null) return 0;
  return typeof cw.startTime === 'string' ? new Date(cw.startTime).getTime() : cw.startTime;
}

function _checkForgottenWorkout() {
  if (_forgottenChecked) return;
  _forgottenChecked = true;
  const cw = db.currentWorkout;
  if (!cw) return;
  const start = _cwStartMs(cw);
  if (!start) return;
  const ageMs = Date.now() - start;
  if (ageMs < _FORGOTTEN_AGE_MS) return;

  const hrs = Math.floor(ageMs / 3600000);
  const info = document.getElementById('forgottenWorkoutInfo');
  if (info) {
    info.textContent = lang === 'en'
      ? `Your workout has been running for about ${hrs} h. Did you forget to finish it?`
      : `Dein Training läuft seit etwa ${hrs} h. Hast du vergessen, es zu beenden?`;
  }
  // Localize the buttons/title for EN users
  if (lang === 'en') {
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('forgottenWorkoutTitle', 'Workout still active?');
    set('btnForgottenFinish', 'Finish & save');
    set('btnForgottenResume', 'Resume');
    set('btnForgottenDiscard', 'Discard');
  }
  openModal('forgottenWorkoutModal');
}

function _forgottenResume() {
  closeModal('forgottenWorkoutModal');
  haptic('light');
}

async function _forgottenDiscard() {
  if (!await showConfirm(lang === 'en' ? 'Discard this workout? This cannot be undone.' : 'Training wirklich verwerfen? Das kann nicht rückgängig gemacht werden.')) return;
  closeModal('forgottenWorkoutModal');
  db.currentWorkout = null;
  stopTimer();
  swReset();
  skipRestTimer();
  if (typeof refreshWakeLock === 'function') refreshWakeLock();
  save();
  document.getElementById('activeWorkout').style.display = 'none';
  document.getElementById('quickStart').style.display    = 'block';
  renderLog();
  haptic('light');
}

function _forgottenFinish() {
  closeModal('forgottenWorkoutModal');
  const cw = db.currentWorkout;
  if (!cw) return;
  cw.exercises.forEach(e => { if (Array.isArray(e.sets)) e.sets = e.sets.filter(_setHasData); });
  const hasEntries = e => e.sets.length > 0 || e.timerSec > 0 || (e.hiitSets && e.hiitSets.length > 0);

  // Nothing was actually logged — just discard silently.
  if (!cw.exercises.some(hasEntries)) {
    db.currentWorkout = null;
    stopTimer(); swReset(); skipRestTimer();
    if (typeof refreshWakeLock === 'function') refreshWakeLock();
    save();
    document.getElementById('activeWorkout').style.display = 'none';
    document.getElementById('quickStart').style.display    = 'block';
    renderLog();
    showToast(lang === 'en' ? 'Empty workout discarded' : 'Leeres Training verworfen');
    return;
  }

  cw.exercises = cw.exercises.filter(hasEntries);
  // We don't track per-set timestamps, so estimate a sane end time instead of
  // the real (huge) elapsed span: ~3 min per logged set, clamped 15 min–3 h.
  const start    = _cwStartMs(cw);
  const setCount = cw.exercises.reduce((a, e) => a + (Array.isArray(e.sets) ? e.sets.length : 0), 0);
  const estMs    = Math.min(3 * 3600000, Math.max(15 * 60000, setCount * 180000));
  cw.endTime     = start + estMs;

  const summary = _buildWorkoutSummary(cw);
  db.workouts.push(cw);
  db.currentWorkout = null;
  try { if (typeof checkAchievements === 'function') summary.newBadges = checkAchievements(cw, { silent: true }) || []; } catch (e) {}
  stopTimer(); swReset(); skipRestTimer();
  if (typeof refreshWakeLock === 'function') refreshWakeLock();
  if (typeof maybeAutoBackup === 'function' && (db.workouts.length % 5 === 0)) maybeAutoBackup(true);
  save();
  document.getElementById('activeWorkout').style.display = 'none';
  document.getElementById('quickStart').style.display    = 'block';
  renderLog();
  renderHistory();
  haptic('success');
  flashWorkoutComplete();
  _pendingFinishedWorkout = cw;
  _showWorkoutSummary(summary);
}

function _updateWorkoutLiveStats() {
  const el = document.getElementById('workoutLiveStats');
  if (!el) return;
  const cw = db.currentWorkout;
  if (!cw) { el.textContent = ''; return; }
  let setCount = 0, volume = 0;
  const bw = (typeof _latestBodyweight === 'function') ? _latestBodyweight() : 0;
  (cw.exercises || []).forEach(e => {
    const add = (!e.isCustom && typeof isBodyweightEx === 'function' && isBodyweightEx(e.exId)) ? bw : 0; // F4
    (e.sets || []).forEach(s => {
      if (!_setHasData(s)) return;
      setCount++;
      volume += ((Number(s.weight) || 0) + add) * (Number(s.reps) || 0);
    });
  });
  if (setCount === 0) { el.textContent = ''; return; }
  el.textContent = `${setCount} ${t('sets')}${volume > 0 ? ' · ' + fmtWeightBig(volume) : ''}`;
}

function moveWorkoutExercise(idx, dir) {
  const cw = db.currentWorkout;
  if (!cw) return;
  const j = idx + dir;
  if (j < 0 || j >= cw.exercises.length) return;
  [cw.exercises[idx], cw.exercises[j]] = [cw.exercises[j], cw.exercises[idx]];
  save();
  renderActiveWorkout();
  haptic('light');
}

/* ---- Exercise Swap (e.g. machine occupied) ---- */
function startExerciseSwap(idx) {
  if (!db.currentWorkout || !db.currentWorkout.exercises[idx]) return;
  window._pickerMode = 'replace';
  window._swapIdx    = idx;
  openExercisePicker();
}

function removeWorkoutExercise(idx) {
  // F8: defensive guard — currentWorkout may have been cleared/finished.
  if (!db.currentWorkout || !Array.isArray(db.currentWorkout.exercises)) return;
  const e = db.currentWorkout.exercises[idx];
  if (!e) return;
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
    showToast(lang === 'en' ? 'Need at least 2 exercises for a superset' : 'Mindestens 2 Übungen für Superset nötig');
    return;
  }
  _supersetLinkSource = idx;
  showToast(lang === 'en' ? 'Tap another exercise to link it' : 'Tippe eine andere Übung an, um sie zu verknüpfen');
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
  showToast(lang === 'en' ? '⟨ SS ⟩ Superset linked' : '⟨ SS ⟩ Superset verknüpft');
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
    showToast(lang === 'en' ? 'Superset unlinked' : 'Superset gelöst');
  }
}

async function finishWorkout() {
  const cw = db.currentWorkout;
  if (!cw) return;
  // Drop empty inline set rows the user never filled in before evaluating entries.
  cw.exercises.forEach(e => { if (Array.isArray(e.sets)) e.sets = e.sets.filter(_setHasData); });
  const hasEntries = e => e.sets.length > 0 || e.timerSec > 0 || (e.hiitSets && e.hiitSets.length > 0);
  if (!cw.exercises.some(hasEntries)) { showAlert(t('minOneSet')); return; }
  const emptyCount = cw.exercises.filter(e => !hasEntries(e)).length;
  if (emptyCount > 0 && !await showConfirm(`${emptyCount} ${t('finishEmptyWarn')}`, { danger: false, confirmText: t('done') })) return;
  cw.exercises = cw.exercises.filter(hasEntries);
  cw.endTime   = Date.now();

  const summary = _buildWorkoutSummary(cw);

  db.workouts.push(cw);
  db.currentWorkout = null;
  // F6: award badges now (workout is in db.workouts) and surface them in the summary.
  try { if (typeof checkAchievements === 'function') summary.newBadges = checkAchievements(cw, { silent: true }) || []; } catch (e) {}
  stopTimer();
  swReset();
  skipRestTimer();
  if (typeof refreshWakeLock === 'function') refreshWakeLock();
  save();
  document.getElementById('activeWorkout').style.display = 'none';
  document.getElementById('quickStart').style.display    = 'block';
  renderLog();
  renderHistory();
  haptic('success');
  flashWorkoutComplete();

  // Silent auto-backup after every 5th completed workout (E3).
  if (typeof maybeAutoBackup === 'function' && (db.workouts.length % 5 === 0)) {
    maybeAutoBackup(true);
  }

  // Show the summary; the template-update check runs when it is closed
  _pendingFinishedWorkout = cw;
  _showWorkoutSummary(summary);
}

/* ---- Workout Summary ---- */
let _pendingFinishedWorkout = null;

function _getHistoricalMaxWeight(exId, excludeWorkoutId) {
  let max = 0;
  (db.workouts || []).forEach(w => {
    if (w.id === excludeWorkoutId || !w.exercises) return;
    w.exercises.forEach(e => {
      if (e.isCustom || e.exId !== exId || !e.sets) return;
      e.sets.forEach(s => {
        if (s.type === 'W') return; // warmup sets don't count as records
        const wgt = Number(s.weight) || 0;
        if (wgt > max) max = wgt;
      });
    });
  });
  return max;
}

// Must be called BEFORE the workout is pushed into db.workouts,
// otherwise PRs would compare the workout against itself.
function _buildWorkoutSummary(cw) {
  const startTs = typeof cw.startTime === 'string' ? new Date(cw.startTime).getTime() : cw.startTime;
  const durMin  = Math.max(1, Math.round((cw.endTime - startTs) / 60000));
  let setCount = 0, volume = 0;
  const prs = [];
  const _bw = (typeof _latestBodyweight === 'function') ? _latestBodyweight() : 0;
  cw.exercises.forEach(e => {
    const _add = (!e.isCustom && typeof isBodyweightEx === 'function' && isBodyweightEx(e.exId)) ? _bw : 0; // F4
    (e.sets || []).forEach(s => {
      setCount++;
      volume += ((Number(s.weight) || 0) + _add) * (Number(s.reps) || 0);
    });
    if (!e.isCustom && e.exId) {
      const ex = getEx(e.exId);
      if (ex && getCatType(ex.category) === 'strength') {
        // Weight PR
        const maxNow = Math.max(0, ...(e.sets || []).filter(s => s.type !== 'W').map(s => Number(s.weight) || 0));
        const prior  = _getHistoricalMaxWeight(e.exId, cw.id);
        if (prior > 0 && maxNow > prior) prs.push({ name: ex.name, kind: 'weight', value: maxNow, prior });
        // e1RM PR (captures rep progress at the same/lower weight)
        const e1Now   = _bestE1rm(e.sets);
        const e1Prior = _getHistoricalBestE1rm(e.exId, cw.id);
        if (e1Prior > 0 && e1Now > e1Prior) prs.push({ name: ex.name, kind: 'e1rm', value: e1Now, prior: e1Prior });
      }
    }
  });
  return { durMin, exCount: cw.exercises.length, setCount, volume, prs };
}

function _getHistoricalBestE1rm(exId, excludeWorkoutId) {
  let best = 0;
  (db.workouts || []).forEach(w => {
    if (w.id === excludeWorkoutId || !w.exercises) return;
    w.exercises.forEach(e => {
      if (e.isCustom || e.exId !== exId || !e.sets) return;
      const b = _bestE1rm(e.sets);
      if (b > best) best = b;
    });
  });
  return best;
}

function _showWorkoutSummary(s) {
  const modal = document.getElementById('workoutSummaryModal');
  if (!modal) { showToast(t('workoutDone')); if (_pendingFinishedWorkout) { const w = _pendingFinishedWorkout; _pendingFinishedWorkout = null; _checkTemplateUpdates(w); } return; }

  document.getElementById('summaryTitle').textContent    = t('summaryTitle');
  document.getElementById('summarySubtitle').textContent = t('summarySubtitle');
  document.getElementById('btnCloseSummary').textContent = t('summaryClose');

  const loc = lang === 'de' ? 'de-DE' : 'en-GB';
  const stat = (icon, val, label) => `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
    <div style="font-size:18px;line-height:1;">${icon}</div>
    <div style="font-family:'Orbitron',sans-serif;font-size:17px;font-weight:700;color:var(--accent);margin-top:6px;">${val}</div>
    <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">${label}</div>
  </div>`;
  document.getElementById('summaryStatsGrid').innerHTML =
    stat('⏱', `${s.durMin} min`, t('summaryDuration')) +
    stat('🏋️', s.exCount, t('exercises')) +
    stat('📊', s.setCount, t('sets')) +
    stat('⚖️', fmtWeightBig(s.volume), t('summaryVolume'));

  // B6: allow correcting the recorded duration (e.g. a forgotten stop).
  const durValEl = document.getElementById('summaryDurVal');
  if (durValEl) durValEl.textContent = `${s.durMin} min`;
  const durLbl = document.getElementById('lblSummaryDurEdit');
  if (durLbl) durLbl.textContent = lang === 'en' ? 'Duration' : 'Dauer';

  const prSec = document.getElementById('summaryPrSection');
  if (s.prs.length > 0) {
    prSec.style.display = 'block';
    prSec.innerHTML = `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent);margin-bottom:8px;">🏆 ${t('summaryPRs')}</div>` +
      s.prs.map(p => {
        const tag = p.kind === 'e1rm' ? ' e1RM' : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(200,241,53,0.06);border:1px solid rgba(200,241,53,0.25);border-radius:10px;padding:10px 12px;margin-bottom:6px;">
        <span style="font-weight:600;font-size:14px;">${p.name}${p.kind === 'e1rm' ? ` <span style="font-size:10px;color:var(--muted);text-transform:uppercase;">e1RM</span>` : ''}</span>
        <span style="font-size:13px;color:var(--accent);font-weight:700;">${fmtWeight(p.prior, {noUnit:true})} → ${fmtWeight(p.value)}</span>
      </div>`;
      }).join('');
  } else {
    prSec.style.display = 'none';
    prSec.innerHTML = '';
  }

  // F6: surface newly unlocked achievements right in the summary.
  const badgeSec = document.getElementById('summaryBadgeSection');
  if (badgeSec) {
    const badges = s.newBadges || [];
    if (badges.length) {
      const de = lang !== 'en';
      badgeSec.style.display = 'block';
      badgeSec.innerHTML = `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent);margin-bottom:8px;">🎖️ ${de ? 'Neue Abzeichen' : 'New badges'}</div>` +
        badges.map(b => `<div style="display:flex;align-items:center;gap:10px;background:rgba(200,241,53,0.06);border:1px solid rgba(200,241,53,0.25);border-radius:10px;padding:10px 12px;margin-bottom:6px;">
          <span style="font-size:22px;">${b.icon || '🏅'}</span>
          <div><div style="font-weight:700;font-size:14px;">${b.title || 'Badge'}</div>
          ${b.desc ? `<div style="font-size:12px;color:var(--muted);">${b.desc}</div>` : ''}</div>
        </div>`).join('');
    } else {
      badgeSec.style.display = 'none';
      badgeSec.innerHTML = '';
    }
  }

  // D3: connect the two app halves — remind about remaining protein today.
  const protHint = document.getElementById('summaryProteinHint');
  if (protHint) {
    const p = (typeof _proteinRemainingToday === 'function') ? _proteinRemainingToday() : null;
    if (p && p.remaining > 0) {
      const de = lang !== 'en';
      protHint.style.display = 'block';
      protHint.innerHTML = `<div style="display:flex;align-items:center;gap:10px;background:rgba(155,92,246,0.08);border:1px solid rgba(155,92,246,0.28);border-radius:12px;padding:10px 12px;">
        <span style="font-size:20px;">🥤</span>
        <div style="font-size:13px;color:var(--text);">${de ? `Heute noch <b>${p.remaining} g Protein</b> offen (${p.consumed}/${p.goal} g).` : `<b>${p.remaining} g protein</b> left today (${p.consumed}/${p.goal} g).`}</div>
      </div>`;
    } else {
      protHint.style.display = 'none';
      protHint.innerHTML = '';
    }
  }

  openModal('workoutSummaryModal');

  if (s.prs.length > 0 && typeof confetti === 'function') {
    setTimeout(() => confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, zIndex: 3000 }), 250);
  }
}

// B6: adjust the finished workout's end time (duration) from the summary.
function adjustSummaryDuration(deltaMin) {
  const w = _pendingFinishedWorkout;
  if (!w) return;
  const start = typeof w.startTime === 'string' ? new Date(w.startTime).getTime() : w.startTime;
  const curMin = Math.max(1, Math.round(((w.endTime || start) - start) / 60000));
  const newMin = Math.max(1, Math.min(600, curMin + deltaMin));
  w.endTime = start + newMin * 60000;
  save();
  const el = document.getElementById('summaryDurVal');
  if (el) el.textContent = `${newMin} min`;
  haptic('light');
}

function closeWorkoutSummary() {
  closeModal('workoutSummaryModal');
  const w = _pendingFinishedWorkout;
  _pendingFinishedWorkout = null;
  if (w) _checkTemplateUpdates(w);
}

async function cancelWorkout() {
  if (!await showConfirm(t('confirmCancelWorkout'), { confirmText: t('cancelWorkout') })) return;
  db.currentWorkout = null;
  stopTimer();
  swReset();
  skipRestTimer();
  if (typeof refreshWakeLock === 'function') refreshWakeLock();
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
    showAlert("Bitte ein gültiges Ziel wählen.");
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
    if (q) {
      exs = exs.filter(e => e.name.toLowerCase().includes(q));
      
      const getRelevanceScore = (name, query) => {
        const n = name.toLowerCase();
        const qy = query.toLowerCase();
        if (n === qy) return 100;
        if (n.startsWith(qy)) return 80;
        const words = n.split(/[\s_-]+/);
        if (words.some(w => w.startsWith(qy))) return 60;
        if (n.includes(qy)) return 40;
        return 0;
      };

      exs.sort((a, b) => {
        const scoreA = getRelevanceScore(a.name, q);
        const scoreB = getRelevanceScore(b.name, q);
        return scoreB - scoreA;
      });
    }
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
  const ttl  = document.getElementById('ttlChooseExercise');
  if (ttl) ttl.textContent = window._pickerMode === 'replace' ? t('swapExercise') : t('chooseExercise');

  // Inject search + quick-add bar above the list
  const searchBarId = 'exPickerSearchBar';
  let bar = document.getElementById(searchBarId);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = searchBarId;
    list.parentElement.insertBefore(bar, list);
  }

  // Build category options including custom categories
  const standardCategories = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Dehnen'];
  let quickAddCatOptions = '';
  standardCategories.forEach(cat => {
    quickAddCatOptions += `<option value="${cat}">${t('cats')[cat] || cat}</option>`;
  });
  if (db.customCategories) {
    const sortedCustom = Object.keys(db.customCategories).sort();
    sortedCustom.forEach(cat => {
      if (!standardCategories.includes(cat)) {
        quickAddCatOptions += `<option value="${cat}">${cat}</option>`;
      }
    });
  }
  quickAddCatOptions += `<option value="new_custom">${t('cats')['new_custom'] || '+ Neue Kategorie...'}</option>`;

  bar.innerHTML = `
    <input class="form-input picker-search" id="exPickerSearch" type="text" placeholder="${t('searchExercise')}" oninput="filterExercisePicker()" autocomplete="off">
    <div class="quick-add-row" id="exPickerQuickAdd">
      <input class="form-input quick-add-input" id="quickAddName" type="text" placeholder="${t('quickAddPlaceholder')}" autocomplete="off">
      <select class="form-input quick-add-cat" id="quickAddCat">
        ${quickAddCatOptions}
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
  if (typeof onCategoryChange === 'function') {
    onCategoryChange();
  } else if (typeof updateCategoryHint === 'function') {
    updateCategoryHint();
  }
  
  nameInput.value = '';
}

function addExerciseToWorkout(exId) {
  // Replace/swap mode (exchange an exercise mid-workout, keep its position & logged sets)
  if (window._pickerMode === 'replace') {
    const idx = window._swapIdx;
    window._pickerMode = null;
    window._swapIdx    = null;
    const cw = db.currentWorkout;
    if (!cw || idx === null || idx === undefined || !cw.exercises[idx]) return;
    if (cw.exercises.some((e, j) => j !== idx && e.exId === exId)) { showAlert(t('alreadyAdded')); return; }
    const entry = cw.exercises[idx];
    entry.exId = exId;
    delete entry.isCustom;
    delete entry.customName;
    delete entry.customCategory;
    save();
    closeModal('exercisePickerModal');
    renderActiveWorkout();
    haptic('success');
    showToast(t('swapDone'));
    return;
  }
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
    showToast(lang === 'en' ? '⚡ HIIT saved' : '⚡ HIIT gespeichert');
    return;
  }
  // Edit-past-workout mode
  if (window._pickerMode === 'edit') {
    if (editingWorkoutCopy.exercises.find(e => e.exId === exId)) { showAlert(t('alreadyAdded')); return; }
    editingWorkoutCopy.exercises.push({ exId, sets: [] });
    window._pickerMode = null;
    closeModal('exercisePickerModal');
    openModal('editWorkoutModal');
    renderEditWorkout();
    return;
  }
  // Normal mode
  if (!db.currentWorkout) return;
  if (db.currentWorkout.exercises.find(e => e.exId === exId)) { showAlert(t('alreadyAdded')); return; }
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
    colLabels.innerHTML = `<div></div><div class="set-col-label" id="colLabelType">${t('colType') || 'Typ'}</div><div class="set-col-label">${unitLabel()}</div><div class="set-col-label">${t('reps')}</div><div class="set-col-label" id="colLabelRpe">${_rirMode() ? 'RIR' : (t('colRpe') || 'RPE')}</div><div></div>`;
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

  // "+ Satz" without data: prefill from the previous row so only deltas need typing
  if (!data && container.children.length > 0) {
    const last    = container.lastElementChild;
    const inputs  = last.querySelectorAll('.set-input:not(.set-rpe)');
    const typeBtn = last.querySelector('.set-type-btn');
    if (currentExCategory === 'stretch') {
      data = { minutes: inputs[0] ? inputs[0].value : '' };
    } else if (currentExCategory !== 'cardio') {
      data = {
        type:   typeBtn ? (typeBtn.dataset.type || 'N') : 'N',
        weight: inputs[0] ? toKg(inputs[0].value) : '', // F2: normalize to kg so the row re-renders in the display unit
        reps:   inputs[1] ? inputs[1].value : ''
      };
    }
  }

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
      <input class="set-input" type="text" placeholder="0.0" value="${km}" inputmode="decimal" oninput="recalcPace(this.parentElement)"/>
      <input class="set-input" type="text" placeholder="0:00" value="${time}" inputmode="numeric" oninput="recalcPace(this.parentElement)"/>
      <input class="set-input pace-display" type="text" placeholder="–" value="${pace}"/>
      ${rpeInput}
      ${rmBtn}`;
  } else if (type === 'stretch') {
    row.className = 'set-row stretch-row';
    const min = data ? data.minutes : '';
    row.innerHTML = `<span class="set-num">${idx}</span>
      <input class="set-input" type="text" placeholder="2" value="${min}" inputmode="decimal"/>
      ${rmBtn}`;
  } else {
    row.className = 'set-row';
    const w = data ? data.weight : '', r = data ? data.reps : '';
    row.innerHTML = `<span class="set-num">${idx}</span>
      ${typeBtn}
      <input class="set-input" type="text" placeholder="0" value="${fmtWeightNum(w)}" inputmode="decimal"/>
      <input class="set-input" type="text" placeholder="0" value="${r}" inputmode="numeric"/>
      ${rpeInput}
      ${rmBtn}`;
  }
  row.style.animation = 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) backwards';
  container.appendChild(row);
}

function recalcPace(row) {
  const inputs  = row.querySelectorAll('.set-input');
  const km      = parseFloat(String(inputs[0].value).replace(',', '.'));
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
    // B7: accept a comma decimal separator (German keyboards) so "82,5" isn't lost.
    const pf = el => parseFloat(String(el.value).replace(',', '.'));
    if (type === 'cardio') {
      const km = pf(inputs[0]), time = inputs[1].value.trim(), pace = inputs[2].value.trim();
      if (km > 0 || time || pace) sets.push({ type: sType, rpe, km: km||0, time, pace });
    } else if (type === 'stretch') {
      const minutes = pf(inputs[0]);
      if (minutes > 0) sets.push({ minutes });
    } else {
      const weight = toKg(inputs[0].value), reps = parseInt(String(inputs[1].value).replace(',', '.'), 10); // F2: store kg
      if (weight != null && !isNaN(reps) && reps > 0) sets.push({ type: sType, rpe, weight, reps });
    }
  });

  if (sets.length === 0) { showAlert(t('minValidSet')); return; }

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
  const we = db.currentWorkout.exercises[currentWorkoutExIdx];
  we.sets = sets;
  we.note = document.getElementById('sessionNote').value.trim();

  // Live PR detection (strength, non-custom exercises only)
  let prWeight = 0;
  if (type === 'strength' && we.exId && !we.isCustom) {
    const maxNow = Math.max(0, ...sets.filter(s => s.type !== 'W').map(s => Number(s.weight) || 0));
    const prior  = _getHistoricalMaxWeight(we.exId, db.currentWorkout.id);
    if (prior > 0 && maxNow > prior) prWeight = maxNow;
  }

  save();
  closeModal('logSetsModal');
  renderActiveWorkout();
  haptic('success');
  showToast(prWeight ? `🏆 ${t('prToast')}: ${prWeight} kg` : '✓');
  // Task 4: honour this exercise's own rest duration (not the global default)
  // so a detail-save can't kick off a conflicting rest timer.
  startRestTimer(currentWorkoutExIdx);
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
    <div class="next-ex-head">
      <div class="next-ex-label">${t('suggestNextEx')}</div>
      <button class="next-ex-close" onclick="document.getElementById('nextExSuggestions').remove();" aria-label="${lang === 'en' ? 'Dismiss' : 'Ausblenden'}">✕</button>
    </div>
    <div class="next-ex-chips">
      ${suggestions.map(e => {
        const type = getCatType(e.category);
        const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
        return `<button class="next-ex-chip ${catClass}" onclick="addExerciseToWorkout('${e.id}');this.parentElement.parentElement.remove();">${e.name}</button>`;
      }).join('')}
    </div>
  `;
  container.parentElement.insertBefore(bar, document.getElementById('btnAddExercise'));
  // B5: no auto-dismiss — the bar stays until the user closes it (✕) or picks one.
}

/* ---- Rest Timer ---- */
let restTimerInterval = null;
let restTimerSec      = 0;
let restTimerMax      = 90;
let restTimerEndAt    = 0; // timestamp when rest ends (background-safe)
let _restLastSec      = null; // for once-per-second audio/haptic ticks

/* ---- Rest Timer Config ---- */
function _getRestCfg() {
  if (!db.restTimer) db.restTimer = { enabled: true, sec: 90 };
  if (typeof db.restTimer.sound === 'undefined') db.restTimer.sound = true;
  return db.restTimer;
}

/* ---- Audio cues (WebAudio; ignores the ringer/mute switch on some devices) ---- */
let _restAudioCtx = null;
function _getAudioCtx() {
  if (_restAudioCtx) return _restAudioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _restAudioCtx = new AC();
  } catch (e) { _restAudioCtx = null; }
  return _restAudioCtx;
}
function _restBeep(freq, dur, force) {
  if (!force && _getRestCfg().sound === false) return;
  const ctx = _getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.28, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.12));
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + (dur || 0.12) + 0.02);
  } catch (e) { /* ignore */ }
}
function _restTick()    { _restBeep(660, 0.07); }
function _restEndChime() { _restBeep(880, 0.14); setTimeout(() => _restBeep(1320, 0.18), 130); }

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

function startRestTimer(exIdx) {
  const cfg = _getRestCfg();
  if (!cfg.enabled) return;
  _requestNotifPermission();

  // Per-exercise rest duration overrides the global default (B1).
  let sec = cfg.sec;
  if (typeof exIdx === 'number') {
    const we = _we(exIdx);
    if (we && we.restSec) sec = we.restSec;
  }

  // Unlock audio within this user-gesture call chain (set ✓ tap).
  const ac = _getAudioCtx();
  if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }

  clearInterval(restTimerInterval);
  restTimerMax   = sec;
  restTimerEndAt = Date.now() + sec * 1000;
  restTimerSec   = sec;
  _restLastSec   = sec;

  const overlay = document.getElementById('restTimerOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  _updateRestDisplay();

  // Schedule SW notification for Android / installed PWA users
  if (typeof _postSwMsg === 'function') {
    _postSwMsg({ type: 'SCHEDULE_REST_NOTIF', delayMs: sec * 1000 });
  }

  restTimerInterval = setInterval(() => {
    const s = Math.max(0, Math.round((restTimerEndAt - Date.now()) / 1000));
    restTimerSec = s;
    if (s !== _restLastSec) {
      _restLastSec = s;
      if (s <= 3 && s > 0) { haptic('light'); _restTick(); }
    }
    if (s <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      restTimerEndAt    = 0;
      overlay.style.display = 'none';
      _closeRestFullscreen();
      if (typeof _postSwMsg === 'function') _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
      haptic('success');
      _restEndChime();
      showToast('✓ ' + t('restDone'));
      return;
    }
    _updateRestDisplay();
  }, 250);
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
        _closeRestFullscreen();
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
  const de   = lang !== 'en';
  const goal = typeof getWeeklyGoal === 'function' ? getWeeklyGoal() : 3;
  const done = typeof weeklyWorkoutsThisWeek === 'function' ? weeklyWorkoutsThisWeek() : 0;
  const streak = typeof calcWeeklyStreak === 'function' ? calcWeeklyStreak() : 0;
  const pct  = Math.min(1, done / goal);
  const met  = done >= goal;

  const streakChip = streak >= 1
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(200,241,53,0.1);border:1px solid rgba(200,241,53,0.3);border-radius:20px;padding:4px 12px;font-size:13px;font-weight:700;color:var(--accent);">🔥 ${streak}${de ? '-Wochen-Streak' : ' week streak'}</span>`
    : `<span style="font-size:12px;color:var(--muted);">${de ? 'Noch keine Wochen-Streak' : 'No week streak yet'}</span>`;

  const goalLabel = de ? 'Wochenziel' : 'Weekly goal';
  const progLabel = met
    ? (de ? 'Ziel erreicht! 💪' : 'Goal reached! 💪')
    : `${done}/${goal} ${de ? 'diese Woche' : 'this week'}`;

  banner.style.display = 'block';
  banner.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px 14px;text-align:left;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
        ${streakChip}
        <div style="display:inline-flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">${goalLabel}</span>
          <button class="wk-goal-btn" onclick="setWeeklyGoal(-1)" aria-label="-">−</button>
          <span style="min-width:16px;text-align:center;font-weight:700;font-size:14px;">${goal}</span>
          <button class="wk-goal-btn" onclick="setWeeklyGoal(1)" aria-label="+">+</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;height:8px;background:var(--surface2);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${Math.round(pct * 100)}%;background:${met ? 'var(--accent)' : 'var(--accent2)'};border-radius:6px;transition:width .3s;"></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:${met ? 'var(--accent)' : 'var(--muted)'};white-space:nowrap;">${progLabel}</span>
      </div>
    </div>`;
}

function extendRestTimer(sec) {
  if (!restTimerEndAt) return;
  // Guard the −15s button from driving the timer to/below zero.
  const remaining = Math.round((restTimerEndAt - Date.now()) / 1000);
  const applied   = Math.max(5, remaining + sec) - remaining; // never below 5s left
  restTimerEndAt += applied * 1000;
  if (applied > 0) restTimerMax += applied; // keep the arc proportional when extending
  restTimerSec = Math.max(0, Math.round((restTimerEndAt - Date.now()) / 1000));
  _restLastSec = restTimerSec;
  if (typeof _postSwMsg === 'function') {
    _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
    _postSwMsg({ type: 'SCHEDULE_REST_NOTIF', delayMs: restTimerEndAt - Date.now() });
  }
  _updateRestDisplay();
  haptic('light');
}

function skipRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  restTimerEndAt    = 0;
  if (typeof _postSwMsg === 'function') _postSwMsg({ type: 'CANCEL_REST_NOTIF' });
  const overlay = document.getElementById('restTimerOverlay');
  if (overlay) overlay.style.display = 'none';
  _closeRestFullscreen();
  haptic('light');
}

function _fmtRest(sec) {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  return String(sec);
}

function _updateRestDisplay() {
  const el = document.getElementById('restTimerCount');
  if (el) el.textContent = _fmtRest(restTimerSec);
  const pct = Math.max(0, Math.min(1, restTimerSec / (restTimerMax || 90)));
  const arc = document.getElementById('restTimerArc');
  if (arc) arc.style.strokeDashoffset = (2 * Math.PI * 26) * (1 - pct);
  // Fullscreen mirror
  const fsCount = document.getElementById('restFsCount');
  if (fsCount) fsCount.textContent = _fmtRest(restTimerSec);
  const fsArc = document.getElementById('restFsArc');
  if (fsArc) fsArc.style.strokeDashoffset = (2 * Math.PI * 130) * (1 - pct);
}

/* ---- Fullscreen rest countdown (B1) ---- */
function openRestFullscreen() {
  if (!restTimerEndAt) return;
  const fs = document.getElementById('restFullscreen');
  if (!fs) return;
  fs.style.display = 'flex';
  _updateRestDisplay();
}
function _closeRestFullscreen() {
  const fs = document.getElementById('restFullscreen');
  if (fs) fs.style.display = 'none';
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

  // Re-render so the button flips to the "remove from template" variant (Task 1).
  renderActiveWorkout();
  haptic('success');
  showToast(t('savedToTemplate'));
}

/* Task 1: permanently remove an exercise from its template — right from the
   active workout. The exercise stays in the current session; only the stored
   template loses it (with a quick undo). */
function removeExerciseFromTemplate(exId, i) {
  const cw = db.currentWorkout;
  if (!cw || !cw.templateId) return;
  const tmpl = db.templates.find(x => String(x.id) === String(cw.templateId));
  if (!tmpl) return;
  const idx = tmpl.exerciseIds.indexOf(exId);
  if (idx === -1) return;
  tmpl.exerciseIds.splice(idx, 1);
  save();
  renderActiveWorkout();
  haptic('light');
  const restore = () => {
    const t2 = db.currentWorkout && db.templates.find(x => String(x.id) === String(db.currentWorkout.templateId));
    if (t2 && !t2.exerciseIds.includes(exId)) {
      t2.exerciseIds.splice(Math.min(idx, t2.exerciseIds.length), 0, exId);
      save();
      renderActiveWorkout();
    }
  };
  if (typeof showUndoToast === 'function') showUndoToast(lang === 'en' ? 'Removed from template' : 'Aus Vorlage entfernt', restore);
  else showToast(lang === 'en' ? 'Removed from template' : 'Aus Vorlage entfernt');
}

/* Task 1: does the workout's order of shared template exercises differ from the
   template's stored order? Drives the "save order to template" button. */
function _tmplOrderDiffers(cw, tmpl) {
  if (!cw || !tmpl) return false;
  const inWorkout = cw.exercises
    .filter(e => !e.isCustom && e.exId && tmpl.exerciseIds.includes(e.exId))
    .map(e => e.exId);
  if (inWorkout.length < 2) return false;
  const tmplOrder = tmpl.exerciseIds.filter(id => inWorkout.includes(id));
  return inWorkout.join(',') !== tmplOrder.join(',');
}

/* Task 1: persist the current exercise order into the template. Shared members
   follow the workout order; template exercises not in this session keep their
   relative order and are appended. */
function saveTemplateOrder() {
  const cw = db.currentWorkout;
  if (!cw || !cw.templateId) return;
  const tmpl = db.templates.find(x => String(x.id) === String(cw.templateId));
  if (!tmpl) return;
  const workoutOrder = cw.exercises
    .filter(e => !e.isCustom && e.exId && tmpl.exerciseIds.includes(e.exId))
    .map(e => e.exId);
  const others = tmpl.exerciseIds.filter(id => !workoutOrder.includes(id));
  tmpl.exerciseIds = workoutOrder.concat(others);
  save();
  renderActiveWorkout();
  haptic('success');
  showToast(lang === 'en' ? '✓ Order saved to template' : '✓ Reihenfolge in Vorlage gespeichert');
}

/* ---- Inline card note (Task 9) ---- */
// Escape for safe injection into the display line and textarea body.
function _escNote(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toggleCardNote(i) {
  const ed = document.getElementById('cardNote-' + i);
  if (!ed) return;
  const open = ed.style.display !== 'none';
  ed.style.display = open ? 'none' : 'block';
  if (!open) {
    const ta = ed.querySelector('textarea');
    if (ta) { ta.focus(); const v = ta.value; ta.value = ''; ta.value = v; } // caret to end
  }
  haptic('light');
}

// Persist the note without re-rendering, so the keyboard/caret stay put (Task 7).
function _setCardNote(i, val) {
  const we = _we(i);
  if (!we) return;
  we.note = val;
  save();
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

