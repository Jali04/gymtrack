/* =============================================
   GYMTRACK — MOBILITY-ABTEILUNG

   Mobility hat bewusst KEIN eigenes Datenmodell: Übungen, Routinen und
   Sessions sind dieselben Objekte wie im Gym, nur über `domain` getrennt
   (siehe db.js). Dieses Modul liefert die Ansicht der Abteilung und die
   Verbindungen zur Gym-Abteilung — eine Einheit kann Blöcke aus beiden
   tragen und erscheint dann in beiden ('mixed').
   ============================================= */

const MOBILITY_DEFAULT_CATEGORY = 'Dehnen';

/* ---- Kennzahlen ---- */
function getMobilityStats() {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const sessions = (db.workouts || []).filter(w => workoutMatchesDomain(w, DOMAIN_MOBILITY));
  const last7 = sessions.filter(w => (w.date || 0) >= weekAgo);

  // Gehaltene Zeit: Mobility wird in Sekunden geloggt (Halte- oder Dehnzeit),
  // nicht in Wiederholungen.
  let heldSeconds = 0;
  last7.forEach(w => {
    (w.exercises || []).forEach(e => {
      const ex = (db.exercises || []).find(x => String(x.id) === String(e.exId));
      if (!ex || getExerciseDomain(ex) !== DOMAIN_MOBILITY) return;
      (e.sets || []).forEach(st => { heldSeconds += Number(st.secs) || 0; });
    });
  });

  // Tage in Folge mit mindestens einer Mobility-Einheit, rückwärts ab heute.
  const dayKey = ts => new Date(ts).toDateString();
  const daysWith = new Set(sessions.map(w => dayKey(w.date || 0)));
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (daysWith.has(d.toDateString())) streak++;
    else if (i > 0) break;   // heute noch offen bricht die Serie nicht
  }

  return { total: sessions.length, last7: last7.length, heldSeconds, streak };
}

function renderMobilityStats() {
  const row = document.getElementById('mobilityStatsRow');
  if (!row) return;
  const s = getMobilityStats();
  const mins = Math.round(s.heldSeconds / 60);
  const card = (icon, label, value, color) => `
    <div class="metric-card" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:68px;">
      <div style="font-size:18px;margin-bottom:4px;line-height:1;">${icon}</div>
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">${label}</div>
      <div style="font-size:15px;font-weight:700;font-family:'Orbitron',sans-serif;color:${color};margin-top:2px;">${value}</div>
    </div>`;

  const en = (typeof lang !== 'undefined' && lang === 'en');
  row.innerHTML =
    card('🧘', en ? 'Sessions (7d)' : 'Einheiten (7t)', s.last7, 'var(--accent2)') +
    card('⏱️', en ? 'Minutes (7d)'  : 'Minuten (7t)',  mins,    'var(--text)') +
    card('🔥', en ? 'Day streak'    : 'Tage 🔥',        s.streak, 'var(--accent)');
}

/* ---- Routinen-Schnellstart ---- */
function renderMobilityQuickRoutines() {
  const box = document.getElementById('mobilityQuickRoutines');
  if (!box) return;

  const routines = (db.templates || []).filter(tm => {
    const d = tm.domain || resolveDomainForExerciseIds(tm.exerciseIds);
    return d === DOMAIN_MOBILITY || d === DOMAIN_MIXED;
  });

  if (db.currentWorkout || routines.length === 0) { box.innerHTML = ''; return; }

  const en = (typeof lang !== 'undefined' && lang === 'en');
  box.innerHTML = `
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:18px 0 8px;">
      ${en ? 'Quick start' : 'Schnellstart'}
    </div>` +
    routines.slice(0, 5).map(tm => `
      <div class="card" style="margin-bottom:8px;padding:12px;cursor:pointer;" onclick="startMobilityRoutine('${tm.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div>
            <div style="font-weight:700;font-size:15px;">${tm.name}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">${tm.exerciseIds.length} ${en ? 'exercises' : 'Übungen'}</div>
          </div>
          <div style="font-size:18px;flex-shrink:0;">▶</div>
        </div>
      </div>`).join('');
}

/* ---- Interconnect: Mobility in eine laufende Gym-Einheit ---- */
function updateMobilityInterconnectCard() {
  const card = document.getElementById('mobilityInterconnectCard');
  const quick = document.getElementById('mobilityQuickStart');
  if (!card) return;

  const running = !!db.currentWorkout;
  card.style.display = running ? 'block' : 'none';

  // Läuft eine Einheit, übernimmt der (hierher verschobene) #activeWorkout die
  // Seite — der Schnellstart würde nur doppelt anbieten, was schon läuft.
  if (quick) quick.style.display = running ? 'none' : 'block';

  if (running) {
    const txt = document.getElementById('mobilityInterconnectText');
    if (txt) {
      const en = (typeof lang !== 'undefined' && lang === 'en');
      const name = db.currentWorkout.templateName ||
                   (en ? 'a session' : 'eine Einheit');
      txt.textContent = en
        ? `You are training right now (${name}). Add a mobility exercise straight into this session.`
        : `Du trainierst gerade (${name}). Häng eine Mobility-Übung direkt in diese Einheit ein.`;
    }
  }
}

/* ---- Sessions starten ---- */
function startMobilitySession() {
  db.currentWorkout = {
    id: uid(), date: Date.now(), startTime: Date.now(),
    intendedDomain: DOMAIN_MOBILITY,
    exercises: []
  };
  save();
  if (typeof haptic === 'function') haptic('medium');
  _enterMobilitySession();
}

function startMobilityRoutine(tmplId) {
  const tmpl = (db.templates || []).find(x => String(x.id) === String(tmplId));
  if (!tmpl) return;
  db.currentWorkout = {
    id: uid(), date: Date.now(), startTime: Date.now(),
    templateId: String(tmplId),
    templateName: tmpl.name,
    intendedDomain: DOMAIN_MOBILITY,
    exercises: tmpl.exerciseIds.map(exId => ({ exId, sets: [] }))
  };
  save();
  if (typeof haptic === 'function') haptic('medium');
  _enterMobilitySession();
}

// Die laufende Einheit in der Mobility-Abteilung anzeigen: derselbe
// #activeWorkout-Block wie im Gym, nur hierher gehängt.
function _enterMobilitySession() {
  showPage('mobility', document.querySelector('.nav-btn[data-page="mobility"]'));
  switchMobilitySubTab('today');
  const aw = document.getElementById('activeWorkout');
  if (aw) aw.style.display = 'block';
  if (typeof renderActiveWorkout === 'function') renderActiveWorkout();
  if (typeof startTimer === 'function') startTimer();
  updateMobilityInterconnectCard();
}

/* Übung in die laufende Einheit hängen. Der Picker ist derselbe wie im Gym —
   eine Gym-Einheit wird dadurch zu 'mixed' und bleibt in beiden Abteilungen
   sichtbar (siehe resolveWorkoutDomain in db.js). */
function addMobilityToActiveWorkout() {
  if (!db.currentWorkout) { startMobilitySession(); return; }
  window._exercisePickerDomain = DOMAIN_MOBILITY;
  if (typeof openExercisePicker === 'function') openExercisePicker();
}

/* ---- Anlegen ---- */
function openCreateMobilityRoutine() {
  // Die Vorlage bekommt ihre Abteilung über die enthaltenen Übungen; dieser
  // Merker sorgt dafür, dass eine noch leere Routine trotzdem in Mobility bleibt.
  window._newTemplateDomain = DOMAIN_MOBILITY;
  if (typeof openCreateTemplate === 'function') openCreateTemplate();
}

function openAddMobilityExercise() {
  if (typeof openAddExercise !== 'function') return;
  openAddExercise();
  // Kategorie auf eine Mobility-Kategorie vorbelegen, damit die neue Übung in
  // dieser Abteilung landet.
  const sel = document.getElementById('exCategory');
  if (sel) {
    const preferred = Array.from(sel.options).find(o => MOBILITY_CATEGORIES.includes(o.value));
    if (preferred) {
      sel.value = preferred.value;
      if (typeof updateCategoryHint === 'function') updateCategoryHint();
    }
  }
}

/* ---- AI Coach ---- */
function askCoachAboutMobility() {
  const en = (typeof lang !== 'undefined' && lang === 'en');
  const stats = getMobilityStats();
  const prompt = en
    ? `Build me a mobility routine that fits my current gym training. In the last 7 days I did ${stats.last7} mobility sessions (${Math.round(stats.heldSeconds / 60)} minutes of holds). Focus on the areas my strength training loads most, and tell me which parts to do as a warm-up before a session and which as a cool-down.`
    : `Bau mir eine Mobility-Routine, die zu meinem aktuellen Gym-Training passt. In den letzten 7 Tagen hatte ich ${stats.last7} Mobility-Einheiten (${Math.round(stats.heldSeconds / 60)} Minuten Haltezeit). Konzentrier dich auf die Bereiche, die mein Krafttraining am stärksten belastet, und sag mir, was ich als Warmup vor einer Einheit und was ich als Cooldown machen soll.`;

  if (typeof openAiCoach === 'function') {
    openAiCoach();
    if (typeof sendAiMessage === 'function') {
      const input = document.getElementById('aiChatInput');
      if (input) input.value = prompt;
      sendAiMessage();
    }
  }
}

window.getMobilityStats            = getMobilityStats;
window.renderMobilityStats         = renderMobilityStats;
window.renderMobilityQuickRoutines = renderMobilityQuickRoutines;
window.updateMobilityInterconnectCard = updateMobilityInterconnectCard;
window.startMobilitySession        = startMobilitySession;
window.startMobilityRoutine        = startMobilityRoutine;
window.addMobilityToActiveWorkout  = addMobilityToActiveWorkout;
window.openCreateMobilityRoutine   = openCreateMobilityRoutine;
window.openAddMobilityExercise     = openAddMobilityExercise;
window.askCoachAboutMobility       = askCoachAboutMobility;
