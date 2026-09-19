/* =============================================
   GYMTRACK — TRAININGS-SIGNALE

   Drei Rückmeldungen, die bei jedem Training zählen:
     • Rekorde      — die stärkste Motivationsschleife, die eine App hat
     • Stagnation   — der häufigste Grund aufzuhören, meist zu spät bemerkt
     • Deload       — steigendes Volumen bei fallender Leistung

   Alles wird aus den vorhandenen Workouts abgeleitet. Neu gespeichert wird
   nur ein Merker am Satz selbst (s.pr), damit ein Rekord nicht bei jedem
   Rendern erneut gefeiert wird — der liegt im workouts-jsonb und
   synchronisiert ohne neue Spalte mit.
   ============================================= */

/* ---------------------------------------------
   REKORDE
   --------------------------------------------- */

// Bestwerte einer Übung VOR einem bestimmten Zeitpunkt.
function getExercisePR(exId, beforeTs) {
  let bestE1rm = 0, bestWeight = 0, bestReps = 0, bestVolume = 0;
  (db.workouts || []).forEach(w => {
    const ts = w.startTime || w.date;
    if (!ts || (beforeTs && ts >= beforeTs)) return;
    (w.exercises || []).forEach(e => {
      if (String(e.exId) !== String(exId)) return;
      (e.sets || []).forEach(s => {
        if (s.type === 'W') return;
        const wt = Number(s.weight) || 0, r = Number(s.reps) || 0;
        if (wt <= 0 || r <= 0) return;
        const e1 = wt * (1 + r / 30);
        if (e1 > bestE1rm) bestE1rm = e1;
        if (wt > bestWeight) { bestWeight = wt; bestReps = r; }
        if (wt * r > bestVolume) bestVolume = wt * r;
      });
    });
  });
  return { e1rm: bestE1rm, weight: bestWeight, reps: bestReps, volume: bestVolume };
}

/* Prüft einen gerade abgehakten Satz auf einen Rekord.
   Gibt null zurück, wenn keiner vorliegt oder er schon gefeiert wurde. */
function checkSetForPR(we, set) {
  if (!we || !set || set.type === 'W' || set.pr) return null;
  const wt = Number(set.weight) || 0, reps = Number(set.reps) || 0;
  if (wt <= 0 || reps <= 0) return null;

  // Nur echte Kraftübungen — bei Cardio oder Halteübungen sagt ein 1RM nichts.
  if (typeof getEntryType === 'function' && getEntryType(we) !== 'strength') return null;

  const cw = db.currentWorkout;
  const startTs = cw ? (cw.startTime || cw.date) : Date.now();
  const prev = getExercisePR(we.exId, startTs);

  // Ohne Vorgeschichte ist der erste Satz kein "Rekord", sondern der Anfang.
  if (!prev.e1rm) return null;

  const e1 = wt * (1 + reps / 30);
  if (wt > prev.weight) return { kind: 'weight', value: wt, prev: prev.weight };
  if (e1 > prev.e1rm * 1.001) return { kind: 'e1rm', value: Math.round(e1), prev: Math.round(prev.e1rm) };
  return null;
}

function celebratePR(we, set, pr) {
  set.pr = true;
  const name = (typeof getExName === 'function') ? getExName(we.exId) : '';
  const en = (typeof lang !== 'undefined' && lang === 'en');
  const fmt = v => (typeof fmtWeight === 'function') ? fmtWeight(v) : `${v} kg`;

  const msg = pr.kind === 'weight'
    ? (en ? `🏆 PR: ${name} — ${fmt(pr.value)}` : `🏆 Rekord: ${name} — ${fmt(pr.value)}`)
    : (en ? `🏆 PR: ${name} — est. 1RM ${fmt(pr.value)}` : `🏆 Rekord: ${name} — gesch. 1RM ${fmt(pr.value)}`);

  if (typeof showToast === 'function') showToast(msg);
  if (typeof haptic === 'function') haptic('success');
  try {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 70, spread: 62, origin: { y: 0.7 }, disableForReducedMotion: true });
    }
  } catch (e) {}
}

/* ---------------------------------------------
   STAGNATION

   Eine Übung stagniert, wenn der beste geschätzte 1RM über mehrere Einheiten
   und einen längeren Zeitraum nicht mehr gestiegen ist. Beide Bedingungen
   zusammen — sonst meldet sich die App schon nach einer schlechten Woche.
   --------------------------------------------- */
const STAGNATION_MIN_SESSIONS = 4;
const STAGNATION_MIN_DAYS = 21;

function getExerciseSessions(exId) {
  const out = [];
  (db.workouts || []).forEach(w => {
    const ts = w.startTime || w.date;
    if (!ts) return;
    (w.exercises || []).forEach(e => {
      if (String(e.exId) !== String(exId)) return;
      const e1 = (typeof _bestE1rm === 'function') ? _bestE1rm(e.sets) : 0;
      if (e1 > 0) out.push({ ts, e1rm: e1 });
    });
  });
  return out.sort((a, b) => a.ts - b.ts);
}

function getStagnation(exId) {
  const sessions = getExerciseSessions(exId);
  if (sessions.length < STAGNATION_MIN_SESSIONS) return null;

  // Wie viele Einheiten liegen seit dem Bestwert zurück?
  let peakIdx = 0;
  sessions.forEach((s, i) => { if (s.e1rm > sessions[peakIdx].e1rm) peakIdx = i; });
  const since = sessions.length - 1 - peakIdx;
  if (since < STAGNATION_MIN_SESSIONS - 1) return null;

  const days = Math.round((sessions[sessions.length - 1].ts - sessions[peakIdx].ts) / 86400000);
  if (days < STAGNATION_MIN_DAYS) return null;

  return {
    sessions: since,
    days,
    peak: Math.round(sessions[peakIdx].e1rm),
    current: Math.round(sessions[sessions.length - 1].e1rm)
  };
}

// Alle stagnierenden Übungen, am längsten stagnierende zuerst.
function getStagnatingExercises() {
  return (db.exercises || [])
    .filter(ex => !(typeof isArchivedEx === 'function' && isArchivedEx(ex.id)))
    .map(ex => ({ ex, stag: getStagnation(ex.id) }))
    .filter(x => x.stag)
    .sort((a, b) => b.stag.days - a.stag.days);
}

/* ---------------------------------------------
   DELOAD

   Zwei Signale, die zusammen zählen: das Wochenvolumen steigt mehrere Wochen
   in Folge, ODER es bleibt hoch, während die Leistung nachgibt. Letzteres ist
   das ernstere — genau dort verletzt man sich.
   --------------------------------------------- */
const DELOAD_RISING_WEEKS = 3;

function getWeeklyVolumes(weeks = 6) {
  const out = [];
  const mondayOf = offset => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - offset * 7);
    return d.getTime();
  };
  for (let i = weeks - 1; i >= 0; i--) {
    const from = mondayOf(i), to = mondayOf(i - 1);
    let vol = 0, best = 0;
    (db.workouts || []).forEach(w => {
      const ts = w.startTime || w.date;
      if (!ts || ts < from || ts >= to) return;
      (w.exercises || []).forEach(e => {
        if (typeof getEntryType === 'function' && getEntryType(e) !== 'strength') return;
        const e1 = (typeof _bestE1rm === 'function') ? _bestE1rm(e.sets) : 0;
        if (e1 > best) best = e1;
        (e.sets || []).forEach(s => {
          if (s.type === 'W') return;
          vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        });
      });
    });
    out.push({ from, to, vol, bestE1rm: best });
  }
  return out;
}

function getDeloadSignal() {
  const wk = getWeeklyVolumes(6);
  // Die laufende Woche ist unvollständig und würde jeden Trend verfälschen.
  const done = wk.slice(0, -1).filter(w => w.vol > 0);
  if (done.length < DELOAD_RISING_WEEKS) return null;

  const last = done.slice(-DELOAD_RISING_WEEKS);

  let rising = true;
  for (let i = 1; i < last.length; i++) if (last[i].vol <= last[i - 1].vol) rising = false;

  const volUp = last[last.length - 1].vol > last[0].vol * 1.05;
  const perfDown = last[last.length - 1].bestE1rm > 0 && last[0].bestE1rm > 0 &&
                   last[last.length - 1].bestE1rm < last[0].bestE1rm * 0.98;

  if (perfDown && volUp) {
    return { level: 'high', weeks: last.length,
             volPct: Math.round(((last[last.length - 1].vol - last[0].vol) / last[0].vol) * 100),
             perfPct: Math.round(((last[last.length - 1].bestE1rm - last[0].bestE1rm) / last[0].bestE1rm) * 100) };
  }
  if (rising && volUp) {
    return { level: 'watch', weeks: last.length,
             volPct: Math.round(((last[last.length - 1].vol - last[0].vol) / last[0].vol) * 100),
             perfPct: null };
  }
  return null;
}

window.getExercisePR          = getExercisePR;
window.checkSetForPR          = checkSetForPR;
window.celebratePR            = celebratePR;
window.getStagnation          = getStagnation;
window.getStagnatingExercises = getStagnatingExercises;
window.getWeeklyVolumes       = getWeeklyVolumes;
window.getDeloadSignal        = getDeloadSignal;

/* =============================================
   ANSICHTEN
   ============================================= */

function _insightCard(tint, accent, kicker, title, body, action) {
  return `
    <div class="card insight-card" style="background:${tint};border:1px solid ${accent};">
      <div class="insight-kicker">${kicker}</div>
      <div class="insight-title">${title}</div>
      <div class="insight-body">${body}</div>
      ${action || ''}
    </div>`;
}

/* Deload-Hinweis auf der Gym-Startseite — dort, wo man entscheidet, was man
   heute macht. Im Fortschritts-Tab käme er zu spät. */
function renderDeloadBanner() {
  const host = document.getElementById('deloadBanner');
  if (!host) return;
  const sig = (typeof getDeloadSignal === 'function') ? getDeloadSignal() : null;
  if (!sig) { host.innerHTML = ''; return; }

  const en = (typeof lang !== 'undefined' && lang === 'en');

  if (sig.level === 'high') {
    host.innerHTML = _insightCard(
      'rgba(255,77,77,0.10)', 'rgba(255,77,77,0.30)',
      en ? 'Deload recommended' : 'Deload empfohlen',
      en ? 'Volume up, performance down'
         : 'Volumen hoch, Leistung runter',
      en ? `Over the last ${sig.weeks} weeks your volume rose ${sig.volPct}% while your best estimated 1RM fell ${Math.abs(sig.perfPct)}%. That is the classic sign of accumulated fatigue — a lighter week now usually beats pushing through.`
         : `In den letzten ${sig.weeks} Wochen ist dein Volumen um ${sig.volPct}% gestiegen, dein bester geschätzter 1RM aber um ${Math.abs(sig.perfPct)}% gefallen. Das ist das klassische Zeichen für angestaute Ermüdung — eine leichte Woche bringt jetzt meist mehr als Durchziehen.`
    );
  } else {
    host.innerHTML = _insightCard(
      'rgba(245,166,35,0.10)', 'rgba(245,166,35,0.28)',
      en ? 'Load rising' : 'Belastung steigt',
      en ? `Volume up ${sig.volPct}% over ${sig.weeks} weeks`
         : `Volumen ${sig.volPct}% in ${sig.weeks} Wochen`,
      en ? 'Still progressing, but the load has climbed every week. Keep an eye on sleep and performance — a deload is usually due after 4 to 6 rising weeks.'
         : 'Läuft noch, aber die Belastung steigt jede Woche. Achte auf Schlaf und Leistung — nach 4 bis 6 steigenden Wochen ist ein Deload meist fällig.'
    );
  }
}

/* Stagnierende Übungen im Fortschritt. Nur die drei hartnäckigsten — eine
   Liste mit zwölf Einträgen liest niemand, und dann handelt man bei keiner. */
function renderStagnationSection() {
  const host = document.getElementById('stagnationSection');
  if (!host) return;
  const list = (typeof getStagnatingExercises === 'function') ? getStagnatingExercises() : [];
  if (list.length === 0) { host.innerHTML = ''; return; }

  const en = (typeof lang !== 'undefined' && lang === 'en');
  const fmt = v => (typeof fmtWeight === 'function') ? fmtWeight(v) : `${v} kg`;

  const rows = list.slice(0, 3).map(({ ex, stag }) => `
    <div class="insight-row">
      <div>
        <div class="insight-row-name">${ex.name}</div>
        <div class="insight-row-meta">${en
          ? `${stag.sessions} sessions · ${stag.days} days at ${fmt(stag.peak)}`
          : `${stag.sessions} Einheiten · ${stag.days} Tage bei ${fmt(stag.peak)}`}</div>
      </div>
      <button class="close-btn insight-row-btn" onclick="askCoachAboutStagnation('${ex.id}')">${en ? 'Ideas' : 'Ideen'}</button>
    </div>`).join('');

  host.innerHTML = _insightCard(
    'rgba(245,166,35,0.08)', 'rgba(245,166,35,0.25)',
    en ? 'Stalled' : 'Stagniert',
    en ? `${list.length} exercise${list.length > 1 ? 's' : ''} not moving`
       : `${list.length} Übung${list.length > 1 ? 'en' : ''} ohne Fortschritt`,
    (en ? 'No new best in a while. Usually one of: add reps before weight, extend rest, or swap the variation.'
        : 'Seit einer Weile kein neuer Bestwert. Meist hilft: erst Wiederholungen statt Gewicht, längere Pausen, oder die Variante tauschen.')
      + `<div class="insight-rows">${rows}</div>`
  );
}

function askCoachAboutStagnation(exId) {
  const ex = (typeof getEx === 'function') ? getEx(exId) : null;
  const stag = getStagnation(exId);
  if (!ex || !stag) return;
  const en = (typeof lang !== 'undefined' && lang === 'en');
  const fmt = v => (typeof fmtWeight === 'function') ? fmtWeight(v) : `${v} kg`;

  const prompt = en
    ? `My "${ex.name}" has stalled: no new best in ${stag.sessions} sessions over ${stag.days} days, stuck around an estimated 1RM of ${fmt(stag.peak)}. Give me three concrete options to get moving again, and say which one you would pick for me based on my training history.`
    : `Meine Übung „${ex.name}" stagniert: seit ${stag.sessions} Einheiten und ${stag.days} Tagen kein neuer Bestwert, ich hänge bei einem geschätzten 1RM von ${fmt(stag.peak)} fest. Gib mir drei konkrete Möglichkeiten, wieder in Bewegung zu kommen, und sag mir, welche du für mich wählen würdest — auf Basis meiner Trainingshistorie.`;

  if (typeof openAiCoach === 'function') {
    openAiCoach();
    const input = document.getElementById('aiChatInput');
    if (input) input.value = prompt;
    if (typeof sendAiMessage === 'function') sendAiMessage();
  }
}

window.renderDeloadBanner       = renderDeloadBanner;
window.renderStagnationSection  = renderStagnationSection;
window.askCoachAboutStagnation  = askCoachAboutStagnation;
