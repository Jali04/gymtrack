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
function getExerciseMuscles(ex) {
  if (!ex) return {};

  const flags = (db.exerciseFlags || {})[ex.id];
  if (flags && flags.muscles && typeof flags.muscles === 'object' && Object.keys(flags.muscles).length) {
    return flags.muscles;
  }

  const name = (ex.name || '').toLowerCase();
  for (const [keys, muscles] of MUSCLE_KEYWORDS) {
    if (keys.some(k => name.includes(k))) return muscles;
  }

  return CATEGORY_MUSCLES[ex.category] || {};
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

/* Die Grundsilhouette (eine Hälfte, wird gespiegelt): Schultern breit, Taille
   schmal, Arme leicht abgespreizt. Sie liefert die Körperform; die Muskelfelder
   liegen darin und färben sich ein. Die Innenkante endet bei x=59.6 statt 60,
   damit sich die gespiegelten Hälften minimal überlappen und keine Naht zeigen. */
const BODY_BASE_HALF = [
  // Rumpf und Bein
  `M59.6 40 Q71 41 77 47 Q87 52 88.5 64 Q87.5 79 82 89
   Q76 99 74 107 Q78 113 79 121 Q80.5 142 77 162
   Q75.5 172 73.5 177 Q72.5 193 70.5 207 Q69.5 219 68 229
   L60.5 230 Q61.5 210 61.2 190 Q61 178 60.8 174
   Q60.2 150 59.6 121 Z`,
  // Arm, vom Deltamuskel abgespreizt bis zum Handgelenk
  `M88.5 62 Q97 69 98 82 Q99 96 97.5 106
   Q99.5 121 98.5 137 Q98 146 97 151 L90 149.5
   Q91.5 134 90.7 119 Q90.3 111 89.5 105
   Q87.5 95 87 82 Q86.5 70 86 65 Z`
];

// Muskelfelder je Ansicht — sie folgen der Silhouette, statt sie zu überdecken.
const BODY_HALF = {
  front: [
    ['traps',     'M60 41.5 Q70 42.5 76.5 47.5 L73.5 54 Q67 49.8 60 49 Z'],
    ['shoulders', 'M77 47.5 Q86.8 52 88.2 63.5 Q88.4 68 87.6 71.5 L79.6 68.5 Q79 56.5 74.2 50.5 Z'],
    ['chest',     'M60 50 Q71.5 51 78.5 56 Q81.5 64.5 79.8 73.5 Q70 78.5 60 76.5 Z'],
    ['biceps',    'M87.6 70 Q95 76 96.2 89 Q96.4 97.5 95.4 102.5 L88.4 100.5 Q88.2 86 85.4 76 Z'],
    ['forearms',  'M95.6 106 Q98.8 119.5 98 135.5 Q97.6 143.5 96.8 148 L90 146 Q91.4 130 90.6 116 Q90.4 110 89.6 105 Z'],
    ['abs',       'M60 79.5 Q69.5 79.8 75.8 82.5 Q77 95 73.8 106.5 Q67.5 110.5 60 110.5 Z'],
    ['quads',     'M60 114.5 Q71.5 115.5 78 119.5 Q80 141 77.5 168 L61.4 169.5 Q60.6 140 60 118.5 Z'],
    ['calves',    'M60.9 173 Q70.5 174 74.6 178 Q73.6 195 70.8 212 L61.2 212.8 Q60.9 194 60.8 175.5 Z']
  ],
  back: [
    ['traps',     'M60 40.5 Q71.5 41.5 77.5 47.5 Q79.8 56 78 63.5 Q69.5 58.5 60 57.5 Z'],
    ['shoulders', 'M78 47.5 Q87.6 52 88.8 63.5 Q89 68 88.2 71.5 L80.2 68.5 Q80 56.5 77.4 50.5 Z'],
    ['back',      'M60 59.5 Q71.5 60.5 78.6 66.5 Q80 80 76.2 92.5 Q68.8 97.5 60 97.5 Z'],
    ['triceps',   'M87.6 70 Q95 76 96.2 89 Q96.4 97.5 95.4 102.5 L88.4 100.5 Q88.2 86 85.4 76 Z'],
    ['forearms',  'M95.6 106 Q98.8 119.5 98 135.5 Q97.6 143.5 96.8 148 L90 146 Q91.4 130 90.6 116 Q90.4 110 89.6 105 Z'],
    ['glutes',    'M60 100.5 Q71.5 101.5 77.8 106.5 Q79.8 114.5 78 122.5 Q69.5 127 60 126.5 Z'],
    ['hamstrings','M60 129.5 Q71.5 130.5 78 134.5 Q79 151 76.5 168 L61.4 169.5 Q60.6 148 60 132.5 Z'],
    ['calves',    'M60.9 173 Q70.5 174 74.6 178 Q73.6 195 70.8 212 L61.2 212.8 Q60.9 194 60.8 175.5 Z']
  ]
};

/* Erzeugt eine Silhouette. `colorFor(muscleId)` liefert die Füllfarbe,
   `titleFor(muscleId)` den Tooltip-Text. */
function buildBodySvg(view, colorFor, titleFor) {
  const base = BODY_BASE_HALF.map(d => `<path d="${d}"/>`).join('');
  const baseClip = BODY_BASE_HALF.map(d =>
    `<path d="${d}"/><path d="${d}" transform="translate(120,0) scale(-1,1)"/>`
  ).join('');
  const regions = (BODY_HALF[view] || []).map(([mid, d]) =>
    `<path class="muscle-region" data-m="${mid}" d="${d}" fill="${colorFor(mid)}"><title>${titleFor(mid)}</title></path>`
  ).join('');

  const mirrored = inner => `<g>${inner}</g><g transform="translate(120,0) scale(-1,1)">${inner}</g>`;

  // Eindeutige clipPath-Id: auf einer Seite stehen mehrere Figuren nebeneinander.
  const clipId = `bodyclip-${view}-${(buildBodySvg._n = (buildBodySvg._n || 0) + 1)}`;

  return `
    <svg viewBox="0 0 120 244" class="body-map-svg" role="img"
         aria-label="${view === 'front'
            ? (lang === 'en' ? 'Front view muscle map' : 'Muskelkarte Vorderansicht')
            : (lang === 'en' ? 'Back view muscle map'  : 'Muskelkarte Rückansicht')}">
      <defs>
        <!-- In einem clipPath sind nur Formelemente erlaubt; ein <g> wird
             ignoriert und der Beschnitt wäre leer. Die Spiegelung sitzt
             deshalb direkt auf den Pfaden. -->
        <clipPath id="${clipId}">${baseClip}</clipPath>
      </defs>
      <g class="body-base">
        <ellipse cx="60" cy="20" rx="12" ry="14"/>
        <path d="M53.8 32.5 h12.4 v7 q0 3.2 -6.2 5.2 q-6.2-2 -6.2-5.2 z"/>
        ${mirrored(base)}
      </g>
      <g clip-path="url(#${clipId})">${mirrored(regions)}</g>
    </svg>`;
}

window.buildBodySvg          = buildBodySvg;
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

  host.innerHTML = `
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
