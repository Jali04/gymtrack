/* =============================================
   GYMTRACK — Data Layer
   ============================================= */

const CAT_TYPE = {
  Brust: 'strength', Rücken: 'strength', Schultern: 'strength',
  Arme: 'strength', Beine: 'strength', Core: 'strength',
  Cardio: 'cardio', Dehnen: 'stretch'
};
function getCatType(category) { return CAT_TYPE[category] || 'strength'; }

const TYPE_COLORS = { 'N': 'var(--text)', 'W': '#f5a623', 'D': '#d0021b' };
function getCatClass(type) {
  return type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
}

let db = JSON.parse(localStorage.getItem('gymdb') || '{"exercises":[],"workouts":[],"currentWorkout":null}');
if (!db.templates) db.templates = [];
if (!db.measurements) db.measurements = [];
if (!db.progressPics) db.progressPics = [];
if (!db.programs) db.programs = [];
if (typeof db.activeProgram === 'undefined') db.activeProgram = null;
if (!db.achievements) db.achievements = [];

const DEFAULT_EXERCISES = [
  { id: 'e1',  name: 'Bankdrücken',     category: 'Brust' },
  { id: 'e2',  name: 'Kniebeugen',      category: 'Beine' },
  { id: 'e3',  name: 'Kreuzheben',      category: 'Rücken' },
  { id: 'e4',  name: 'Schulterdrücken', category: 'Schultern' },
  { id: 'e5',  name: 'Klimmzüge',       category: 'Rücken' },
  { id: 'e6',  name: 'Bizeps Curls',    category: 'Arme' },
  { id: 'e7',  name: 'Trizeps Dips',    category: 'Arme' },
  { id: 'e8',  name: 'Beinpresse',      category: 'Beine' },
  { id: 'e9',  name: 'Laufen',          category: 'Cardio' },
  { id: 'e10', name: 'Hüftbeuger',      category: 'Dehnen' },
];
if (db.exercises.length === 0) { db.exercises = DEFAULT_EXERCISES; save(); }

function save() {
  localStorage.setItem('gymdb', JSON.stringify(db));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getEx(id) {
  return db.exercises.find(x => x.id === id);
}

function getExName(id) {
  const e = db.exercises.find(x => x.id === id);
  return e ? e.name : (typeof lang !== 'undefined' && lang === 'en' ? 'Unknown' : 'Unbekannt');
}

// Renders set badges HTML for a given sets array and exercise type.
// Returns empty string if no sets.
function _renderSetBadges(sets, type) {
  if (!sets || sets.length === 0) return '';
  if (type === 'cardio') {
    return sets.map(s => {
      const tBadge = (s.type && s.type !== 'N') ? `<span style="color:${TYPE_COLORS[s.type]};font-weight:700;margin-right:4px;">${s.type}</span>` : '';
      const rBadge = s.rpe ? `<span style="opacity:0.6;margin-left:4px;">@${s.rpe}</span>` : '';
      return `<span class="set-badge">${tBadge}${s.km}km ${s.time} (${s.pace})${rBadge}</span>`;
    }).join('');
  }
  if (type === 'stretch') {
    return sets.map(s => `<span class="set-badge">${s.minutes} ${typeof t === 'function' ? t('colMin') : 'min'}</span>`).join('');
  }
  return sets.map(s => {
    const tBadge = (s.type && s.type !== 'N') ? `<span style="color:${TYPE_COLORS[s.type]};font-weight:700;margin-right:4px;">${s.type}</span>` : '';
    const rBadge = s.rpe ? `<span style="opacity:0.6;margin-left:4px;">@${s.rpe}</span>` : '';
    return `<span class="set-badge">${tBadge}${s.weight}kg × ${s.reps}${rBadge}</span>`;
  }).join('');
}
