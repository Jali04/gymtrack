/* =============================================
   GYMTRACK — Navigation + Swipe
   ============================================= */

const PAGE_ORDER = ['gym', 'mobility', 'supps', 'progress'];

/* Alte Seiten-IDs auf die neuen Abteilungen abbilden. Der Guide, die Tour und
   ältere Deep-Links rufen weiterhin showPage('log') bzw. showPage('gymlab') —
   beides landet jetzt in der Gym-Abteilung, nur auf unterschiedlichen
   Unterseiten. */
const LEGACY_PAGE_ALIASES = {
  log:    { page: 'gym', sub: 'today' },
  gymlab: { page: 'gym', sub: 'plans' }
};

function showPage(id, btn) {
  let sub = null;
  if (LEGACY_PAGE_ALIASES[id]) {
    sub = LEGACY_PAGE_ALIASES[id].sub;
    id  = LEGACY_PAGE_ALIASES[id].page;
    if (!btn) btn = document.querySelector(`.nav-btn[data-page="${id}"]`);
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }

  if (id === 'gym') {
    renderGymDepartment();
    switchGymSubTab(sub || localStorage.getItem('gymtrack_gym_subtab') || 'today');
  }
  if (id === 'mobility') {
    renderMobilityDepartment();
    switchMobilitySubTab(sub || localStorage.getItem('gymtrack_mobility_subtab') || 'today');
  }
  if (id === 'progress') {
    const activeSub = localStorage.getItem('gymtrack_progress_subtab') || 'calendar-stats';
    switchProgressSubTab(activeSub);
  }
  if (id === 'supps') {
    const activeSub = localStorage.getItem('gymtrack_nutrition_subtab') || 'calories';
    if (typeof switchNutritionSubTab === 'function') {
      switchNutritionSubTab(activeSub);
    } else {
      if (window.currentSuppsDate) window.currentSuppsDate = new Date();
      if (typeof renderSupplements === 'function') renderSupplements();
    }
  }
}

/* ---------------------------------------------
   PROGRESS-ABTEILUNG
   --------------------------------------------- */
function switchProgressSubTab(subTabId) {
  document.querySelectorAll('.progress-subtab').forEach(btn => {
    const isTarget = (subTabId === 'calendar-stats' && btn.id === 'tabProgCalendar') ||
                     (subTabId === 'body-photos' && btn.id === 'tabProgBody') ||
                     (subTabId === 'exercise-charts' && btn.id === 'tabProgExercises');
    btn.classList.toggle('active', isTarget);
  });
  
  document.querySelectorAll('.progress-subpage-content').forEach(div => {
    div.style.display = div.id === 'prog-subpage-' + subTabId ? 'block' : 'none';
  });
  
  if (subTabId === 'calendar-stats') {
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderStats === 'function') renderStats();
  } else if (subTabId === 'body-photos') {
    if (typeof renderMeasurements === 'function') renderMeasurements();
    if (typeof renderProgressPics === 'function') renderProgressPics();
  } else if (subTabId === 'exercise-charts') {
    if (typeof renderExerciseProgressTracker === 'function') renderExerciseProgressTracker();
  }
  
  localStorage.setItem('gymtrack_progress_subtab', subTabId);
}

/* =============================================
   LAUFENDE EINHEIT — geteilt zwischen den Abteilungen

   Es gibt nur EINEN #activeWorkout-Block. Statt ihn zu duplizieren (und damit
   doppelte IDs und doppeltes Event-Wiring zu erzeugen), wird derselbe Knoten in
   die "Heute"-Unterseite der Abteilung verschoben, die gerade angezeigt wird.
   Eine gemischte Einheit ist damit aus Gym UND Mobility bedienbar — genau das
   macht den Interconnect aus.
   ============================================= */
function mountActiveWorkout(departmentId) {
  const node = document.getElementById('activeWorkout');
  if (!node) return;
  const mountId = departmentId === 'mobility' ? 'mobilityActiveMount' : 'gymActiveMount';
  const mount = document.getElementById(mountId);
  if (mount && node.parentElement !== mount) mount.appendChild(node);
}

/* ---------------------------------------------
   GYM-ABTEILUNG
   --------------------------------------------- */
function renderGymDepartment() {
  renderTemplates();
  renderExercises();
  if (typeof renderPrograms === 'function') renderPrograms();
  renderGymLabCategoryChips();
}

function switchGymSubTab(sub) {
  if (!['today', 'plans', 'exercises'].includes(sub)) sub = 'today';

  document.querySelectorAll('#page-gym .dept-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sub === sub);
  });
  ['today', 'plans', 'exercises'].forEach(key => {
    const pane = document.getElementById('gym-subpage-' + key);
    if (pane) pane.style.display = key === sub ? 'block' : 'none';
  });

  // Suchfeld nur dort, wo es etwas zu suchen gibt.
  const searchWrapper = document.getElementById('gymSearchWrapper');
  if (searchWrapper) searchWrapper.style.display = sub === 'today' ? 'none' : 'block';
  const chips = document.getElementById('gymlabCategoryChipsWrapper');
  if (chips) {
    chips.style.display = sub === 'exercises' ? 'block' : 'none';
    if (sub === 'exercises') renderGymLabCategoryChips();
  }

  if (sub === 'today') {
    mountActiveWorkout('gym');
    if (typeof renderLog === 'function') renderLog();
  }

  if (typeof initRipples === 'function') initRipples();
  localStorage.setItem('gymtrack_gym_subtab', sub);
}

/* Kompatibilität: switchGymLabTab() wird noch aus Guide, Tour und einigen
   Modals heraus aufgerufen. Vorlagen und Programme teilen sich jetzt eine
   Unterseite. */
function switchGymLabTab(tab) {
  switchGymSubTab(tab === 'exercises' ? 'exercises' : 'plans');
}

/* ---------------------------------------------
   MOBILITY-ABTEILUNG
   --------------------------------------------- */
function renderMobilityDepartment() {
  renderTemplates();
  renderExercises();
  renderMobilityCategoryChips();
  renderMobilityStats();
  renderMobilityQuickRoutines();
  updateMobilityInterconnectCard();
}
window.renderMobilityDepartment = renderMobilityDepartment;

function switchMobilitySubTab(sub) {
  if (!['today', 'routines', 'exercises'].includes(sub)) sub = 'today';

  document.querySelectorAll('#page-mobility .dept-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sub === sub);
  });
  ['today', 'routines', 'exercises'].forEach(key => {
    const pane = document.getElementById('mobility-subpage-' + key);
    if (pane) pane.style.display = key === sub ? 'block' : 'none';
  });

  const searchWrapper = document.getElementById('mobilitySearchWrapper');
  if (searchWrapper) searchWrapper.style.display = sub === 'today' ? 'none' : 'block';
  const chips = document.getElementById('mobilityCategoryChipsWrapper');
  if (chips) {
    chips.style.display = sub === 'exercises' ? 'block' : 'none';
    if (sub === 'exercises') renderMobilityCategoryChips();
  }

  if (sub === 'today') {
    mountActiveWorkout('mobility');
    updateMobilityInterconnectCard();
    renderMobilityStats();
    renderMobilityQuickRoutines();
  }

  if (typeof initRipples === 'function') initRipples();
  localStorage.setItem('gymtrack_mobility_subtab', sub);
}

function onMobilitySearchInput() {
  const el = document.getElementById('mobilitySearch');
  window._mobilitySearchQuery = el ? el.value.trim().toLowerCase() : '';
  const sub = localStorage.getItem('gymtrack_mobility_subtab') || 'today';
  if (sub === 'routines') renderTemplates();
  else if (sub === 'exercises') renderExercises();
}

function renderMobilityCategoryChips() {
  const wrapper = document.getElementById('mobilityCategoryChipsWrapper');
  if (!wrapper) return;

  // Nur Kategorien, in denen es tatsächlich Mobility-Übungen gibt.
  const cats = [...new Set(
    activeExercises()
      .filter(e => getExerciseDomain(e) === DOMAIN_MOBILITY)
      .map(e => e.category)
  )];

  const current = window._mobilityCategoryFilter || 'all';
  let html = `<div style="display:inline-flex;gap:8px;">`;
  html += `<button class="filter-chip ${current === 'all' ? 'active' : ''}" data-mobcat="all" onclick="filterMobilityByCategory('all')">${t('allLabel') || 'Alle'}</button>`;
  cats.forEach(cat => {
    const catsObj = t('cats');
    const label = (catsObj && typeof catsObj === 'object') ? (catsObj[cat] || cat) : cat;
    html += `<button class="filter-chip ${current === cat ? 'active' : ''}" data-mobcat="${cat}" onclick="filterMobilityByCategory('${cat}')">${label}</button>`;
  });
  html += `</div>`;
  wrapper.innerHTML = html;
}

function filterMobilityByCategory(category) {
  window._mobilityCategoryFilter = category;
  document.querySelectorAll('[data-mobcat]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mobcat === category);
  });
  renderExercises();
  if (typeof haptic === 'function') haptic('light');
}

window._mobilitySearchQuery   = '';
window._mobilityCategoryFilter = 'all';

function renderGymLabCategoryChips() {
  const wrapper = document.getElementById('gymlabCategoryChipsWrapper');
  if (!wrapper) return;

  // getAllCategories() dedupes: a standard category that merely carries a type
  // override also lives in customCategories and must not show up twice.
  const allCategories = getAllCategories();

  const currentFilter = window._gymlabCategoryFilter || 'all';

  let html = `<div style="display: inline-flex; gap: 8px;">`;
  html += `<button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-cat="all" onclick="filterGymLabExercisesByCategory('all')">${t('allLabel') || 'Alle'}</button>`;
  
  allCategories.forEach(cat => {
    const catsObj = t('cats');
    const label = (catsObj && typeof catsObj === 'object') ? (catsObj[cat] || cat) : cat;
    html += `<button class="filter-chip ${currentFilter === cat ? 'active' : ''}" data-cat="${cat}" onclick="filterGymLabExercisesByCategory('${cat}')">${label}</button>`;
  });
  
  html += `</div>`;
  wrapper.innerHTML = html;
}
window.renderGymLabCategoryChips = renderGymLabCategoryChips;


window._gymlabSearchQuery = '';
window._gymlabCategoryFilter = 'all';

function onGymLabSearchInput() {
  const el = document.getElementById('gymlabSearch');
  const searchVal = el ? el.value.trim().toLowerCase() : '';
  window._gymlabSearchQuery = searchVal;

  // Vorlagen und Programme teilen sich jetzt die Unterseite "Pläne" — die Suche
  // muss dort beide Listen filtern.
  const sub = localStorage.getItem('gymtrack_gym_subtab') || 'today';
  if (sub === 'exercises') {
    renderExercises(searchVal, window._gymlabCategoryFilter || 'all');
  } else {
    renderTemplates(searchVal);
    if (typeof renderPrograms === 'function') renderPrograms(searchVal);
  }
}

function filterGymLabExercisesByCategory(category) {
  window._gymlabCategoryFilter = category;
  
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === category);
  });
  
  renderExercises(window._gymlabSearchQuery || '', category);
  if (typeof haptic === 'function') haptic('light');
}

/* ---- Touch swipe navigation ---- */
let swipeStartX = 0, swipeStartY = 0, swipeStartTime = 0;

document.addEventListener('touchstart', e => {
  if (document.querySelector('.modal-overlay.open')) return;
  swipeStartX    = e.touches[0].clientX;
  swipeStartY    = e.touches[0].clientY;
  swipeStartTime = Date.now();
}, { passive: true });

// C2: ignore a swipe when it starts on an interactive control or inside any
// horizontally-scrollable element (charts, chip rows, tables, editable inputs).
function _swipeShouldIgnore(target) {
  if (!target || !target.closest) return false;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  let el = target;
  while (el && el !== document.body) {
    if (el.nodeType === 1) {
      // Element genuinely scrolls horizontally right now.
      if (el.scrollWidth - el.clientWidth > 8) {
        const ov = getComputedStyle(el).overflowX;
        if (ov === 'auto' || ov === 'scroll') return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

document.addEventListener('touchend', e => {
  if (document.querySelector('.modal-overlay.open')) return;
  if (_swipeShouldIgnore(e.target)) return;
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  // Higher threshold (80px) + must be clearly horizontal.
  if (Date.now() - swipeStartTime > 400 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
  const active = document.querySelector('.page.active');
  if (!active) return;
  const cur = PAGE_ORDER.indexOf(active.id.replace('page-', ''));
  if (cur === -1) return;
  const next = dx < 0 ? Math.min(cur + 1, PAGE_ORDER.length - 1) : Math.max(cur - 1, 0);
  if (next === cur) return;
  const navBtn = document.querySelector(`.nav-btn[data-page="${PAGE_ORDER[next]}"]`);
  showPage(PAGE_ORDER[next], navBtn);
  if (navBtn) navBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}, { passive: true });

// Export global functions explicitly for HTML handlers
window.showPage = showPage;
window.mountActiveWorkout = mountActiveWorkout;
window.switchProgressSubTab = switchProgressSubTab;

// Gym-Abteilung
window.renderGymDepartment = renderGymDepartment;
window.switchGymSubTab = switchGymSubTab;
window.switchGymLabTab = switchGymLabTab;           // Kompatibilität (Guide/Tour)
window.filterGymLabExercisesByCategory = filterGymLabExercisesByCategory;
window.onGymLabSearchInput = onGymLabSearchInput;

// Mobility-Abteilung
window.switchMobilitySubTab = switchMobilitySubTab;
window.onMobilitySearchInput = onMobilitySearchInput;
window.renderMobilityCategoryChips = renderMobilityCategoryChips;
window.filterMobilityByCategory = filterMobilityByCategory;
