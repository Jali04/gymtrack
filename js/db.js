/* =============================================
   GYMTRACK — Data Layer
   ============================================= */

const CAT_TYPE = {
  Brust: 'strength', Rücken: 'strength', Schultern: 'strength',
  Arme: 'strength', Beine: 'strength', Core: 'strength',
  Cardio: 'cardio', Dehnen: 'stretch'
};
function getCatType(category) { return CAT_TYPE[category] || 'strength'; }

let db = JSON.parse(localStorage.getItem('gymdb') || '{"exercises":[],"workouts":[],"currentWorkout":null}');
if (!db.templates) db.templates = [];

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
