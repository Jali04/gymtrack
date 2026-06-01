/* =============================================
   GYMTRACK — Data Layer
   ============================================= */

const CAT_TYPE = {
  Brust: 'strength', Rücken: 'strength', Schultern: 'strength',
  Arme: 'strength', Beine: 'strength', Core: 'strength',
  Cardio: 'cardio', Dehnen: 'stretch'
};
function getCatType(category) {
  if (db.customCategories && db.customCategories[category]) {
    return db.customCategories[category];
  }
  return CAT_TYPE[category] || 'strength';
}

const TYPE_COLORS = { 'N': 'var(--text)', 'W': '#f5a623', 'D': '#d0021b' };
function getCatClass(type) {
  return type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
}

let db = JSON.parse(localStorage.getItem('gymdb') || '{"exercises":[],"workouts":[],"currentWorkout":null}');
if (!db.exercises) db.exercises = [];
if (!db.workouts) db.workouts = [];
if (typeof db.currentWorkout === 'undefined') db.currentWorkout = null;
if (!db.templates) db.templates = [];
if (!db.measurements) db.measurements = [];
if (!db.progressPics) db.progressPics = [];
if (!db.programs) db.programs = [];
if (typeof db.activeProgram === 'undefined') db.activeProgram = null;
if (!db.achievements) db.achievements = [];
if (!db.weekStatus) db.weekStatus = { weekKey: 0, mode: 'normal' };
if (!db.supplements) db.supplements = [];
if (!db.supplementLog) db.supplementLog = [];
if (!db.customCategories) db.customCategories = {};

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
if (db.exercises.length === 0) { db.exercises = DEFAULT_EXERCISES; }

const SCHEMA_VERSION = 3;

const MIGRATIONS = {
  1: (data) => {
    let changed = false;
    if (data.workouts) {
      data.workouts.forEach(w => {
        if (!w.date && w.startTime) {
          w.date = w.startTime;
          changed = true;
        }
      });
    }
    return changed;
  },
  2: (data) => {
    let changed = false;
    if (data.programs) {
      data.programs.forEach(p => {
        if (p.days && Array.isArray(p.days)) {
          p.schedule = {};
          const mapDays = [1, 2, 3, 4, 5, 6, 0];
          p.days.forEach((d, i) => {
            if (i < 7 && d.templateId) {
              p.schedule[mapDays[i]] = d.templateId;
            }
          });
          delete p.days;
          changed = true;
        }
      });
    }
    return changed;
  },
  3: (data) => {
    let changed = false;
    if (data.exercises) {
      if (!data.exercises.find(e => e.name === 'Seilspringen')) {
        data.exercises.push({ id: 'e11', name: 'Seilspringen', category: 'Cardio' });
        changed = true;
      }
    }
    return changed;
  }
};

function runMigrations(data) {
  let currentVersion = data.version || 0;
  let changed = false;

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v]) {
      const migrationChanged = MIGRATIONS[v](data);
      if (migrationChanged) {
        changed = true;
      }
      data.version = v;
      changed = true;
    }
  }

  // Also run migrations for merged/imported datasets to handle missing migrations
  for (let v = 1; v <= SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v](data)) {
      changed = true;
    }
  }

  return changed;
}

// Run migrations on startup
if (runMigrations(db)) {
  localStorage.setItem('gymdb', JSON.stringify(db));
}

function save() {
  runMigrations(db);
  localStorage.setItem('gymdb', JSON.stringify(db));
  
  if (typeof syncProfileUpdate === 'function') {
    syncProfileUpdate();
  }
  
  if (typeof detectAndSyncChanges === 'function') {
    detectAndSyncChanges();
  }
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

// Builds an SVG line chart. points = [{x: label, y: number}], returns SVG string.
function _buildLineChart(points, opts) {
  if (!points || points.length < 2) return '';
  opts = opts || {};
  const W = opts.width  || 300;
  const H = opts.height || 140;
  const color  = opts.color  || 'var(--accent)';
  const pad    = { top: 20, right: 12, bottom: 28, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top  - pad.bottom;

  const ys    = points.map(p => p.y);
  const minY  = Math.min(...ys);
  const maxY  = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  const toX = i => pad.left + (i / (points.length - 1)) * innerW;
  const toY = v => pad.top  + innerH - ((v - minY) / rangeY) * innerH;

  // Grid lines
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (innerH / 4) * i;
    const val = maxY - (rangeY / 4) * i;
    grid += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2" opacity="0.6"/>`;
    grid += `<text x="${pad.left - 6}" y="${y + 3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="'DM Sans', sans-serif">${val % 1 === 0 ? val : val.toFixed(1)}</text>`;
  }

  // Polyline
  const polyPts = points.map((p, i) => `${toX(i)},${toY(p.y)}`).join(' ');

  // Filled area under line
  const areaFirst = `${toX(0)},${pad.top + innerH}`;
  const areaLast  = `${toX(points.length - 1)},${pad.top + innerH}`;
  const areaPath  = `${areaFirst} ${polyPts} ${areaLast}`;

  // Unique IDs for SVG gradients and filters to prevent overlap conflicts
  const randId = Math.floor(Math.random() * 1000000);
  const gradId = `chartGrad-${randId}`;
  const glowId = `chartGlow-${randId}`;

  // Dots + X labels
  let dots = '', xLabels = '';
  points.forEach((p, i) => {
    const cx = toX(i), cy = toY(p.y);
    const isLast = i === points.length - 1;
    dots += `<circle cx="${cx}" cy="${cy}" r="${isLast ? 4.5 : 3}" fill="${isLast ? color : 'var(--bg)'}" stroke="${color}" stroke-width="2"/>`;
    if (i === 0 || i === points.length - 1 || (points.length <= 6)) {
      xLabels += `<text x="${cx}" y="${H - 6}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="'DM Sans', sans-serif">${p.x}</text>`;
    }
    if (isLast) {
      dots += `<text x="${cx}" y="${cy - 9}" font-size="10.5" fill="${color}" font-weight="700" text-anchor="middle" font-family="'DM Sans', sans-serif" style="text-shadow: 0 1px 4px rgba(0,0,0,0.8);">${p.y % 1 === 0 ? p.y : p.y.toFixed(1)}</text>`;
    }
  });

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible;">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
      <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    ${grid}
    <polygon points="${areaPath}" fill="url(#${gradId})"/>
    <polyline points="${polyPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#${glowId})"/>
    ${dots}
    ${xLabels}
  </svg>`;
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
