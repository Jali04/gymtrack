/* =============================================
   GYMTRACK — MUSKELKARTE

   Beantwortet zwei Fragen, die man beim Training tatsächlich hat:
     1. Welche Muskeln treffe ich oft genug?  (Frequenz)
     2. Wo werde ich wirklich stärker?        (Kraftentwicklung)

   Die Zuordnung Übung -> Muskel passiert ohne Zutun des Nutzers: erst eine
   ausdrückliche Übersteuerung, sonst Schlagwörter im Übungsnamen, sonst die
   Kategorie. Sekundäre Muskeln zählen anteilig mit (Bankdrücken trifft eben
   auch den Trizeps) — sonst wäre die Karte unehrlich.
   ============================================= */

const MUSCLES = [
  { id: 'chest',      de: 'Brust',        en: 'Chest',       view: 'front' },
  { id: 'shoulders',  de: 'Schultern',    en: 'Shoulders',   view: 'both'  },
  { id: 'biceps',     de: 'Bizeps',       en: 'Biceps',      view: 'front' },
  { id: 'forearms',   de: 'Unterarme',    en: 'Forearms',    view: 'both'  },
  { id: 'abs',        de: 'Bauch',        en: 'Abs',         view: 'front' },
  { id: 'quads',      de: 'Quadrizeps',   en: 'Quads',       view: 'front' },
  { id: 'traps',      de: 'Trapez',       en: 'Traps',       view: 'back'  },
  { id: 'back',       de: 'Rücken',       en: 'Back',        view: 'back'  },
  { id: 'triceps',    de: 'Trizeps',      en: 'Triceps',     view: 'back'  },
  { id: 'glutes',     de: 'Gesäß',        en: 'Glutes',      view: 'back'  },
  { id: 'hamstrings', de: 'Beinbeuger',   en: 'Hamstrings',  view: 'back'  },
  { id: 'calves',     de: 'Waden',        en: 'Calves',      view: 'back'  }
];
const MUSCLE_IDS = MUSCLES.map(m => m.id);

function muscleLabel(id) {
  const m = MUSCLES.find(x => x.id === id);
  if (!m) return id;
  return (typeof lang !== 'undefined' && lang === 'en') ? m.en : m.de;
}

/* Schlagwörter im Übungsnamen -> Muskelanteile.
   1.0 = primär, 0.5 = sekundär. Die Reihenfolge zählt: der erste Treffer
   gewinnt, deshalb stehen spezifische Begriffe ("beinbeuger") vor
   allgemeinen ("bein"). */
const MUSCLE_KEYWORDS = [
  // Arme — vor allem anderen, weil "curl" auch in "Beincurl" steckt
  [['beinbeuger', 'leg curl', 'beincurl', 'hamstring', 'beinbizeps'], { hamstrings: 1, glutes: 0.5 }],
  [['bizeps', 'biceps', 'curl', 'hammer'],                            { biceps: 1, forearms: 0.5 }],
  [['trizeps', 'triceps', 'pushdown', 'dip', 'french', 'kickback', 'skull'], { triceps: 1 }],
  [['unterarm', 'forearm', 'handgelenk', 'wrist', 'griff', 'grip'],   { forearms: 1 }],

  // Beine
  [['wade', 'calf', 'calves'],                                        { calves: 1 }],
  [['kniebeuge', 'squat', 'ausfallschritt', 'lunge', 'step-up', 'bulgar'], { quads: 1, glutes: 1, hamstrings: 0.5 }],
  [['beinstrecker', 'leg extension', 'beinpresse', 'leg press', 'hackenschmidt'], { quads: 1, glutes: 0.5 }],
  [['hip thrust', 'glute', 'gesäß', 'abduktor', 'abduction'],          { glutes: 1 }],
  [['rumänisch', 'romanian', 'rdl', 'good morning', 'hyperextension', 'gestreckte'], { hamstrings: 1, glutes: 1, back: 0.5 }],
  [['kreuzheben', 'deadlift'],                                        { hamstrings: 1, glutes: 1, back: 1, traps: 0.5, forearms: 0.5 }],

  // Rücken
  [['klimmzug', 'pull-up', 'pullup', 'chin-up', 'latzug', 'lat pull', 'pulldown'], { back: 1, biceps: 0.5 }],
  [['rudern', 'row', 'pullover'],                                     { back: 1, biceps: 0.5, shoulders: 0.5 }],
  [['nacken', 'shrug', 'trapez', 'trap'],                             { traps: 1 }],
  [['face pull', 'reverse fly', 'reverse butterfly', 'vorgebeugtes seitheben'], { shoulders: 1, traps: 0.5, back: 0.5 }],

  // Schultern
  [['seitheben', 'lateral raise', 'frontheben', 'front raise'],        { shoulders: 1 }],
  [['schulterdrücken', 'shoulder press', 'overhead press', 'military', 'arnold', 'nackendrücken'], { shoulders: 1, triceps: 0.5 }],
  [['aufrechtes rudern', 'upright row'],                              { shoulders: 1, traps: 1 }],

  // Brust
  [['fliegende', 'butterfly', 'fly', 'kabelzug brust', 'cable cross'], { chest: 1, shoulders: 0.5 }],
  [['bankdrücken', 'bench', 'brustpresse', 'chest press', 'liegestütz', 'push-up', 'pushup'], { chest: 1, triceps: 0.5, shoulders: 0.5 }],

  // Bauch
  [['crunch', 'sit-up', 'situp', 'bauch', 'plank', 'planke', 'beinheben', 'leg raise', 'russian twist', 'ab wheel', 'hollow'], { abs: 1 }]
];

// Wenn kein Schlagwort greift: grobe Zuordnung über die Kategorie.
const CATEGORY_MUSCLES = {
  'Brust':     { chest: 1, triceps: 0.5, shoulders: 0.5 },
  'Rücken':    { back: 1, biceps: 0.5 },
  'Schultern': { shoulders: 1 },
  'Arme':      { biceps: 1, triceps: 1 },
  'Beine':     { quads: 1, hamstrings: 1, glutes: 1 },
  'Core':      { abs: 1 }
  // Cardio und Dehnen zahlen bewusst nicht auf die Karte ein: sie sagen nichts
  // darüber, ob eine Muskelgruppe wachstumswirksam trainiert wurde.
};

/* Die Muskelanteile einer Übung. Reihenfolge: Übersteuerung -> Name -> Kategorie.
   Die Übersteuerung liegt in db.exerciseFlags, das bereits über profiles.exercise_flags
   synchronisiert wird — es braucht also keine neue Spalte. */
/* Vom Nutzer gesetzte Zuordnung einer (eigenen) Kategorie.
   Liegt in db.settings und wandert damit über profiles.settings in die Cloud —
   ohne neue Spalte und ohne Migration. */
function getCategoryMuscles(category) {
  const map = (db.settings && db.settings.categoryMuscles) || {};
  const m = map[category];
  return (m && typeof m === 'object' && Object.keys(m).length) ? m : null;
}

function setCategoryMuscles(category, muscles) {
  if (!db.settings) db.settings = {};
  if (!db.settings.categoryMuscles) db.settings.categoryMuscles = {};
  if (muscles && Object.keys(muscles).length) {
    db.settings.categoryMuscles[category] = muscles;
  } else {
    delete db.settings.categoryMuscles[category];
  }
  save();
}

// Eine umbenannte Kategorie darf ihre Zuordnung nicht verlieren.
function renameCategoryMuscles(oldName, newName) {
  const map = db.settings && db.settings.categoryMuscles;
  if (!map || !map[oldName] || oldName === newName) return;
  map[newName] = map[oldName];
  delete map[oldName];
}

/* Die Muskelanteile einer Übung.

   Rangfolge: Ausdrückliches schlägt Geratenes.
     1. Zuordnung an dieser Übung          (der Nutzer meinte genau sie)
     2. Zuordnung ihrer Kategorie          (der Nutzer hat die Kategorie angelegt)
     3. Schlagwort im Übungsnamen          (Heuristik)
     4. Standard-Kategorie                 (Heuristik)

   Ohne Schritt 2 fiel jede eigene Kategorie durch: die Übung wurde geloggt,
   zählte im Volumen — war auf der Muskelkarte aber unsichtbar. Die Karte
   behauptete dann, eine Muskelgruppe werde nicht trainiert, obwohl doch. */
function getExerciseMuscles(ex) {
  if (!ex) return {};

  const flags = (db.exerciseFlags || {})[ex.id];
  if (flags && flags.muscles && typeof flags.muscles === 'object' && Object.keys(flags.muscles).length) {
    return flags.muscles;
  }

  const fromCategory = getCategoryMuscles(ex.category);
  if (fromCategory) return fromCategory;

  const name = (ex.name || '').toLowerCase();
  for (const [keys, muscles] of MUSCLE_KEYWORDS) {
    if (keys.some(k => name.includes(k))) return muscles;
  }

  return CATEGORY_MUSCLES[ex.category] || {};
}

/* Übungen, die auf der Karte nirgends einzahlen. Cardio und Mobility zählen
   nicht dazu — die sollen bewusst nicht auf die Muskelkarte einzahlen. */
function getUnmappedExercises() {
  return (db.exercises || [])
    .filter(ex => !(typeof isArchivedEx === 'function' && isArchivedEx(ex.id)))
    .filter(ex => typeof getExerciseDomain !== 'function' || getExerciseDomain(ex) === DOMAIN_GYM)
    .filter(ex => {
      const type = (typeof getCatType === 'function') ? getCatType(ex.category) : 'strength';
      if (type === 'cardio' || type === 'stretch') return false;
      return Object.keys(getExerciseMuscles(ex)).length === 0;
    });
}

function setExerciseMuscles(exId, muscles) {
  if (!db.exerciseFlags) db.exerciseFlags = {};
  db.exerciseFlags[exId] = Object.assign({}, db.exerciseFlags[exId], { muscles: muscles || undefined });
  save();
}

/* ---------------------------------------------
   FREQUENZ — wie oft wird eine Muskelgruppe getroffen?

   Fenster von 14 Tagen, auf die Woche heruntergerechnet. Ein 7-Tage-Fenster
   wäre zu zappelig: eine einzige verpasste Einheit färbte die halbe Karte grau.
   --------------------------------------------- */
const MUSCLE_FREQ_WINDOW_DAYS = 14;
const MUSCLE_FREQ_TARGET = 2;          // Einheiten pro Woche und Muskel

function getMuscleFrequency(windowDays = MUSCLE_FREQ_WINDOW_DAYS) {
  const since = Date.now() - windowDays * 86400000;
  const weeks = windowDays / 7;

  const sessions = {};   // muscleId -> Set aus Tagesschlüsseln
  const sets = {};       // muscleId -> gewichtete Satzzahl
  MUSCLE_IDS.forEach(id => { sessions[id] = new Set(); sets[id] = 0; });

  (db.workouts || []).forEach(w => {
    const ts = w.startTime || w.date;
    if (!ts || ts < since) return;
    const dayKey = new Date(ts).toDateString();

    (w.exercises || []).forEach(e => {
      if (typeof getEntryType === 'function' && getEntryType(e) !== 'strength') return;
      const ex = e.isCustom ? { name: e.customName, category: e.customCategory, id: e.exId } : getEx(e.exId);
      const muscles = getExerciseMuscles(ex);
      // Nur tatsächlich geloggte Arbeitssätze zählen — Aufwärmsätze nicht.
      const workSets = (e.sets || []).filter(s => s.type !== 'W').length;
      if (workSets === 0) return;

      Object.entries(muscles).forEach(([mid, weight]) => {
        if (!sessions[mid]) return;
        sets[mid] += workSets * weight;
        if (weight >= 0.5) sessions[mid].add(dayKey);
      });
    });
  });

  const out = {};
  MUSCLE_IDS.forEach(id => {
    const perWeek = sessions[id].size / weeks;
    out[id] = {
      sessionsPerWeek: perWeek,
      setsPerWeek: sets[id] / weeks,
      // 0..1 gemessen am Ziel; 5 Stufen für die Farbskala
      ratio: Math.min(1, perWeek / MUSCLE_FREQ_TARGET),
      step: Math.round(Math.min(1, perWeek / MUSCLE_FREQ_TARGET) * 4)
    };
  });
  return out;
}

/* ---------------------------------------------
   KRAFTENTWICKLUNG — wo wächst tatsächlich etwas?

   Vergleicht den besten geschätzten 1RM (Epley) der letzten 4 Wochen mit dem
   der 4 Wochen davor. Nur Übungen, die primär auf den Muskel gehen, zählen —
   sonst verwässerte jede Bankdrück-Steigerung auch den Trizeps-Wert.
   --------------------------------------------- */
const MUSCLE_GROWTH_WINDOW_DAYS = 28;

function getMuscleStrengthChange(windowDays = MUSCLE_GROWTH_WINDOW_DAYS) {
  const now = Date.now();
  const recentFrom = now - windowDays * 86400000;
  const priorFrom  = now - windowDays * 2 * 86400000;

  // Bester e1RM je Übung, getrennt nach Zeitfenster
  const best = {};  // exId -> { recent, prior, sets }
  (db.workouts || []).forEach(w => {
    const ts = w.startTime || w.date;
    if (!ts || ts < priorFrom) return;
    const bucket = ts >= recentFrom ? 'recent' : 'prior';

    (w.exercises || []).forEach(e => {
      if (typeof getEntryType === 'function' && getEntryType(e) !== 'strength') return;
      const e1rm = (typeof _bestE1rm === 'function') ? _bestE1rm(e.sets) : 0;
      if (!e1rm) return;
      if (!best[e.exId]) best[e.exId] = { recent: 0, prior: 0, sets: 0 };
      if (e1rm > best[e.exId][bucket]) best[e.exId][bucket] = e1rm;
      best[e.exId].sets += (e.sets || []).filter(s => s.type !== 'W').length;
    });
  });

  const acc = {};   // muscleId -> { weightedSum, weight }
  MUSCLE_IDS.forEach(id => { acc[id] = { sum: 0, weight: 0, exercises: 0 }; });

  Object.entries(best).forEach(([exId, b]) => {
    if (!b.recent || !b.prior) return;          // ohne beide Fenster kein Vergleich
    const pct = ((b.recent - b.prior) / b.prior) * 100;
    const ex = getEx(exId);
    const muscles = getExerciseMuscles(ex);

    Object.entries(muscles).forEach(([mid, weight]) => {
      if (!acc[mid] || weight < 0.75) return;   // nur primäre Zuordnung
      acc[mid].sum += pct * b.sets;
      acc[mid].weight += b.sets;
      acc[mid].exercises++;
    });
  });

  const out = {};
  MUSCLE_IDS.forEach(id => {
    const a = acc[id];
    out[id] = a.weight > 0
      ? { pct: a.sum / a.weight, exercises: a.exercises, hasData: true }
      : { pct: 0, exercises: 0, hasData: false };
  });
  return out;
}

window.MUSCLES                  = MUSCLES;
window.MUSCLE_IDS               = MUSCLE_IDS;
window.muscleLabel              = muscleLabel;
window.getExerciseMuscles       = getExerciseMuscles;
window.getCategoryMuscles       = getCategoryMuscles;
window.setCategoryMuscles       = setCategoryMuscles;
window.renameCategoryMuscles    = renameCategoryMuscles;
window.getUnmappedExercises     = getUnmappedExercises;
window.setExerciseMuscles       = setExerciseMuscles;
window.getMuscleFrequency       = getMuscleFrequency;
window.getMuscleStrengthChange  = getMuscleStrengthChange;
window.MUSCLE_FREQ_TARGET       = MUSCLE_FREQ_TARGET;

/* =============================================
   KÖRPERGRAFIK

   Eine Körperhälfte wird gezeichnet und für die Gegenseite gespiegelt: das hält
   die Pfade kurz und die Figur garantiert symmetrisch. Jede Region trägt
   data-m="<muskelId>", damit beide Hälften in einem Zug eingefärbt werden.
   ============================================= */

// Sequenziell (Frequenz): EINE Farbe, monoton in der Helligkeit. Auf dunklem
// Grund läuft die Rampe von "nah an der Oberfläche" (nicht trainiert) zu hell.
const MUSCLE_RAMP_DARK  = ['#1c1c20', '#38441a', '#5c7523', '#8fb62b', '#c8f135'];
const MUSCLE_RAMP_LIGHT = ['#ececee', '#dbe9b4', '#b6d071', '#8ab434', '#4e7d00'];

// Divergierend (Kraftentwicklung): zwei Pole + neutraler grauer Mittelpunkt.
// Lime/Rot ist das Markenpaar der App und besteht die Farbsehschwächen-Prüfung
// (ΔE 22,3 dunkel / 11,5 hell bei Deuteranopie, Ziel ≥ 8).
const MUSCLE_DIVERGING = {
  dark:  { pos: '#c8f135', mid: '#383835', neg: '#ff4d4d' },
  light: { pos: '#4e7d00', mid: '#d4d4d8', neg: '#cc2200' }
};

function _isLightMode() {
  return typeof document !== 'undefined' && document.body && document.body.classList.contains('light-mode');
}

function muscleRampColor(step) {
  const ramp = _isLightMode() ? MUSCLE_RAMP_LIGHT : MUSCLE_RAMP_DARK;
  return ramp[Math.max(0, Math.min(ramp.length - 1, step | 0))];
}

/* Farbe für eine prozentuale Kraftveränderung. ±10 % ist der Anschlag — darüber
   hinaus wird nicht weiter gesättigt, sonst dominiert ein einzelner Ausreißer. */
function muscleDivergingColor(pct, hasData) {
  const c = MUSCLE_DIVERGING[_isLightMode() ? 'light' : 'dark'];
  if (!hasData) return _isLightMode() ? '#ececee' : '#1c1c20';
  const t = Math.max(-1, Math.min(1, (pct || 0) / 10));
  if (Math.abs(t) < 0.08) return c.mid;
  return _mixHex(c.mid, t > 0 ? c.pos : c.neg, Math.abs(t));
}

function _mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a), [br, bg, bb] = p(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(ar, br)}${m(ag, bg)}${m(ab, bb)}`;
}

/* =============================================
   ZUORDNUNG: anatomische Region -> Muskelgruppe

   Die Grafik (js/bodyPaths.js) kennt 89 einzelne Regionen, die App rechnet mit
   12 Gruppen. Hier wird beides verbunden. Regionen, die nicht auftauchen —
   Kopf, Hände, Füße, Knie, Wirbelsäule — bleiben dauerhaft neutral eingefärbt;
   sie sind keine trainierbaren Gruppen und dürfen nicht so aussehen.
   ============================================= */
const REGION_TO_MUSCLE = {};
const _mapRegions = (muscleId, ids) => ids.forEach(id => { REGION_TO_MUSCLE[id] = muscleId; });

_mapRegions('chest', ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right']);
_mapRegions('shoulders', ['shoulder-front-left', 'shoulder-front-right', 'shoulder-side-left', 'shoulder-side-right',
                          'deltoid-rear-left', 'deltoid-rear-right']);
_mapRegions('biceps', ['biceps-left', 'biceps-right']);
_mapRegions('triceps', ['triceps-long-left', 'triceps-long-right', 'triceps-lateral-left', 'triceps-lateral-right']);
_mapRegions('forearms', ['forearm-left', 'forearm-right',
                         'forearm-flexors-left', 'forearm-flexors-right',
                         'forearm-extensors-left', 'forearm-extensors-right']);
// Serratus und Obliques laufen bei den Bauchübungen mit.
_mapRegions('abs', ['abs-upper-left', 'abs-upper-right', 'abs-lower-left', 'abs-lower-right',
                    'obliques-left', 'obliques-right',
                    'serratus-anterior-left', 'serratus-anterior-right']);
// Lats und die untere Rückenstrecker-Kette zählen zusammen als "Rücken".
_mapRegions('back', ['lats-upper-left', 'lats-upper-right', 'lats-mid-left', 'lats-mid-right',
                     'lats-lower-left', 'lats-lower-right',
                     'lower-back-erectors-left', 'lower-back-erectors-right',
                     'lower-back-ql-left', 'lower-back-ql-right']);
_mapRegions('traps', ['traps-upper-left', 'traps-upper-right', 'traps-mid-left', 'traps-mid-right',
                      'traps-lower-left', 'traps-lower-right']);
// Adduktoren und Hüftbeuger laufen bei Kniebeugen und Beinpresse mit.
_mapRegions('quads', ['quads-left', 'quads-right', 'adductors-left', 'adductors-right',
                      'hip-flexor-left', 'hip-flexor-right']);
_mapRegions('glutes', ['gluteus-maximus-left', 'gluteus-maximus-right',
                       'gluteus-medius-left', 'gluteus-medius-right']);
_mapRegions('hamstrings', ['hamstrings-medial-left', 'hamstrings-medial-right',
                           'hamstrings-lateral-left', 'hamstrings-lateral-right']);
// Schienbein gehört sichtbar zum Unterschenkel.
_mapRegions('calves', ['calves-gastroc-medial-left', 'calves-gastroc-medial-right',
                       'calves-gastroc-lateral-left', 'calves-gastroc-lateral-right',
                       'calves-soleus-left', 'calves-soleus-right',
                       'tibialis-anterior-left', 'tibialis-anterior-right']);

// Farbe für Regionen ohne Muskelgruppe (Kopf, Hände, Füße, Knie, Wirbelsäule).
function _neutralRegionColor() {
  return _isLightMode() ? '#e4e4e7' : '#232327';
}

/* Erzeugt eine Ansicht. `colorFor(muscleId)` liefert die Füllfarbe,
   `titleFor(muscleId)` den Tooltip-Text. */
function buildBodySvg(view, colorFor, titleFor) {
  const paths = view === 'back' ? BODY_PATHS_BACK : BODY_PATHS_FRONT;
  const en = (typeof lang !== 'undefined' && lang === 'en');

  const regions = paths.map(r => {
    const muscle = REGION_TO_MUSCLE[r.id];
    if (!muscle) {
      return `<path class="body-region-inert" d="${r.d}" fill="${_neutralRegionColor()}"/>`;
    }
    return `<path class="muscle-region" data-m="${muscle}" d="${r.d}" fill="${colorFor(muscle)}">` +
           `<title>${titleFor(muscle)}</title></path>`;
  }).join('');

  return `
    <svg viewBox="${BODY_VIEWBOX[view] || BODY_VIEWBOX.front}" class="body-map-svg" role="img"
         aria-label="${view === 'front'
            ? (en ? 'Front view muscle map' : 'Muskelkarte Vorderansicht')
            : (en ? 'Back view muscle map'  : 'Muskelkarte Rückansicht')}">
      ${regions}
    </svg>`;
}

window.buildBodySvg          = buildBodySvg;
window.REGION_TO_MUSCLE      = REGION_TO_MUSCLE;
window.muscleRampColor       = muscleRampColor;
window.muscleDivergingColor  = muscleDivergingColor;

/* =============================================
   ANSICHT "MUSKELN" in der Progress-Abteilung
   ============================================= */

function getMuscleMapMode() {
  const v = (db.settings && db.settings.muscleMapMode) || 'frequency';
  return v === 'growth' ? 'growth' : 'frequency';
}

function setMuscleMapMode(mode) {
  if (!db.settings) db.settings = {};
  db.settings.muscleMapMode = mode === 'growth' ? 'growth' : 'frequency';
  save();
  renderMuscleMap();
  if (typeof haptic === 'function') haptic('light');
}

function _fmtNum(n, digits = 1) {
  const v = Number(n) || 0;
  const s = v.toFixed(digits).replace('.', (typeof lang !== 'undefined' && lang === 'en') ? '.' : ',');
  return s.replace(/[.,]0$/, '');
}

function renderMuscleMap() {
  const host = document.getElementById('muscleMapSection');
  if (!host) return;
  const en = (typeof lang !== 'undefined' && lang === 'en');
  const mode = getMuscleMapMode();

  const freq   = getMuscleFrequency();
  const growth = getMuscleStrengthChange();

  const colorFor = mode === 'frequency'
    ? (mid => muscleRampColor(freq[mid] ? freq[mid].step : 0))
    : (mid => muscleDivergingColor(growth[mid] ? growth[mid].pct : 0, growth[mid] && growth[mid].hasData));

  const titleFor = mid => {
    const label = muscleLabel(mid);
    if (mode === 'frequency') {
      const f = freq[mid];
      return `${label}: ${_fmtNum(f ? f.sessionsPerWeek : 0)}× ${en ? 'per week' : 'pro Woche'}`;
    }
    const g = growth[mid];
    if (!g || !g.hasData) return `${label}: ${en ? 'not enough data' : 'zu wenig Daten'}`;
    return `${label}: ${g.pct >= 0 ? '+' : ''}${_fmtNum(g.pct)} %`;
  };

  // Legende — die Farbe allein darf die Aussage nie tragen.
  const legend = mode === 'frequency'
    ? `<div class="muscle-legend">
         <span class="muscle-legend-label">${en ? 'rarely' : 'selten'}</span>
         ${[0,1,2,3,4].map(i => `<span class="muscle-legend-swatch" style="background:${muscleRampColor(i)};"></span>`).join('')}
         <span class="muscle-legend-label">${en ? `${MUSCLE_FREQ_TARGET}×/week` : `${MUSCLE_FREQ_TARGET}×/Woche`}</span>
       </div>`
    : `<div class="muscle-legend">
         <span class="muscle-legend-label">−10 %</span>
         ${[-10,-5,0,5,10].map(v => `<span class="muscle-legend-swatch" style="background:${muscleDivergingColor(v, true)};"></span>`).join('')}
         <span class="muscle-legend-label">+10 %</span>
       </div>`;

  // Rangliste: die Zahl steht schwarz auf weiss da, nicht nur als Farbe.
  const rows = MUSCLE_IDS
    .map(mid => ({ mid, f: freq[mid], g: growth[mid] }))
    .sort((a, b) => mode === 'frequency'
      ? a.f.sessionsPerWeek - b.f.sessionsPerWeek          // Vernachlässigtes zuerst
      : (b.g.hasData ? b.g.pct : -Infinity) - (a.g.hasData ? a.g.pct : -Infinity))
    .map(({ mid, f, g }) => {
      const swatch = `<span class="muscle-legend-swatch" style="background:${colorFor(mid)};"></span>`;
      let value, note = '';
      if (mode === 'frequency') {
        value = `${_fmtNum(f.sessionsPerWeek)}×`;
        note = `${_fmtNum(f.setsPerWeek, 0)} ${en ? 'sets/wk' : 'Sätze/Wo'}`;
        if (f.sessionsPerWeek === 0) note = en ? 'not trained' : 'nicht trainiert';
      } else if (g.hasData) {
        value = `${g.pct >= 0 ? '+' : ''}${_fmtNum(g.pct)} %`;
        note = `${g.exercises} ${en ? 'exercises' : 'Übungen'}`;
      } else {
        value = '–';
        note = en ? 'not enough data' : 'zu wenig Daten';
      }
      const below = mode === 'frequency' && f.sessionsPerWeek > 0 && f.sessionsPerWeek < MUSCLE_FREQ_TARGET;
      const missing = mode === 'frequency' && f.sessionsPerWeek === 0;
      return `<div class="muscle-row">
          <div class="muscle-row-name">${swatch}${muscleLabel(mid)}</div>
          <div class="muscle-row-val${missing ? ' muscle-row-missing' : (below ? ' muscle-row-below' : '')}">${value}<span class="muscle-row-note">${note}</span></div>
        </div>`;
    }).join('');

  const hint = mode === 'frequency'
    ? (en ? `Sessions per week per muscle, averaged over the last 14 days. Target: ${MUSCLE_FREQ_TARGET}× per week.`
          : `Einheiten pro Woche und Muskel, gemittelt über 14 Tage. Ziel: ${MUSCLE_FREQ_TARGET}× pro Woche.`)
    : (en ? 'Change in estimated 1RM: last 4 weeks against the 4 weeks before.'
          : 'Veränderung des geschätzten 1RM: letzte 4 Wochen gegen die 4 Wochen davor.');

  /* Nicht zugeordnete Übungen sichtbar machen. Ohne diesen Hinweis bliebe die
     Lücke unbemerkt: die Übung wird geloggt, zählt im Volumen — und die Karte
     behauptet still, die Muskelgruppe werde nicht trainiert. */
  const unmapped = getUnmappedExercises();
  const unmappedHtml = unmapped.length ? `
    <div class="muscle-unmapped">
      <div class="muscle-unmapped-text">
        ⚠️ ${en
          ? `${unmapped.length} exercise${unmapped.length > 1 ? 's are' : ' is'} not assigned to a muscle group and ${unmapped.length > 1 ? 'do' : 'does'} not count on this map.`
          : `${unmapped.length} ${unmapped.length > 1 ? 'Übungen zählen' : 'Übung zählt'} auf dieser Karte nicht mit — noch keiner Muskelgruppe zugeordnet.`}
        <div style="color:var(--muted);margin-top:3px;font-size:11.5px;">${unmapped.slice(0, 4).map(e => e.name).join(', ')}${unmapped.length > 4 ? ' …' : ''}</div>
      </div>
      <button class="close-btn insight-row-btn" onclick="openCategoryManager()">${en ? 'Assign' : 'Zuordnen'}</button>
    </div>` : '';

  host.innerHTML = unmappedHtml + `
    <div class="muscle-mode-tabs">
      <button class="muscle-mode-tab ${mode === 'frequency' ? 'active' : ''}" onclick="setMuscleMapMode('frequency')">${en ? 'Frequency' : 'Frequenz'}</button>
      <button class="muscle-mode-tab ${mode === 'growth' ? 'active' : ''}" onclick="setMuscleMapMode('growth')">${en ? 'Strength' : 'Kraft'}</button>
    </div>

    <div class="card muscle-map-card">
      <div class="muscle-bodies">
        ${buildBodySvg('front', colorFor, titleFor)}
        ${buildBodySvg('back',  colorFor, titleFor)}
      </div>
      <div class="muscle-view-labels">
        <span>${en ? 'Front' : 'Vorne'}</span><span>${en ? 'Back' : 'Hinten'}</span>
      </div>
      ${legend}
    </div>

    <div class="muscle-hint">${hint}</div>
    <div class="muscle-rows">${rows}</div>`;
}

window.renderMuscleMap   = renderMuscleMap;
window.getMuscleMapMode  = getMuscleMapMode;
window.setMuscleMapMode  = setMuscleMapMode;

/* =============================================
   MUSKEL-AUSWAHL (Kategorie-Editor und Übungs-Editor)

   Eine Reihe von Umschaltern statt eines Mehrfach-Auswahlfelds: auf dem Handy
   ist ein <select multiple> praktisch nicht bedienbar. Primär/sekundär wird
   durch wiederholtes Antippen durchlaufen — aus/primär/sekundär —, damit auch
   die anteilige Belastung setzbar ist, ohne ein zweites Bedienelement.
   ============================================= */

// Arbeitsstand, während ein Editor offen ist.
let _musclePickerState = {};

function _cycleMuscleWeight(w) {
  if (!w) return 1;          // aus  -> primär
  if (w === 1) return 0.5;   // primär -> sekundär
  return 0;                  // sekundär -> aus
}

function _muscleWeightLabel(w) {
  const en = (typeof lang !== 'undefined' && lang === 'en');
  if (w === 1) return en ? 'primary' : 'primär';
  if (w === 0.5) return en ? 'secondary' : 'sekundär';
  return '';
}

function renderMusclePicker(hostId) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const en = (typeof lang !== 'undefined' && lang === 'en');

  host.innerHTML = MUSCLE_IDS.map(mid => {
    const w = _musclePickerState[mid] || 0;
    const cls = w === 1 ? ' mp-primary' : (w === 0.5 ? ' mp-secondary' : '');
    const sub = _muscleWeightLabel(w);
    return `<button type="button" class="muscle-pick${cls}" data-mp="${mid}"
              onclick="toggleMusclePick('${mid}','${hostId}')">
              ${muscleLabel(mid)}${sub ? `<span class="muscle-pick-sub">${sub}</span>` : ''}
            </button>`;
  }).join('') +
  `<div class="muscle-pick-hint">${en
    ? 'Tap once for primary, twice for secondary (counts half), a third time to clear.'
    : 'Einmal tippen = primär, zweimal = sekundär (zählt halb), dreimal = aus.'}</div>`;
}

function toggleMusclePick(mid, hostId) {
  _musclePickerState[mid] = _cycleMuscleWeight(_musclePickerState[mid] || 0);
  if (!_musclePickerState[mid]) delete _musclePickerState[mid];
  renderMusclePicker(hostId);
  if (typeof haptic === 'function') haptic('light');
}

function initMusclePicker(hostId, current) {
  _musclePickerState = Object.assign({}, current || {});
  renderMusclePicker(hostId);
}

function getMusclePickerValue() {
  return Object.assign({}, _musclePickerState);
}

window.renderMusclePicker = renderMusclePicker;
window.toggleMusclePick   = toggleMusclePick;
window.initMusclePicker   = initMusclePicker;
window.getMusclePickerValue = getMusclePickerValue;
