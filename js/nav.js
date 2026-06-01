/* =============================================
   GYMTRACK — Navigation + Swipe
   ============================================= */

const PAGE_ORDER = ['log', 'gymlab', 'supps', 'progress'];

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'log')      renderLog();
  if (id === 'gymlab')   renderGymLab();
  if (id === 'progress') {
    const activeSub = localStorage.getItem('gymtrack_progress_subtab') || 'calendar-stats';
    switchProgressSubTab(activeSub);
  }
  if (id === 'supps')    {
    const activeSub = localStorage.getItem('gymtrack_nutrition_subtab') || 'calories';
    if (typeof switchNutritionSubTab === 'function') {
      switchNutritionSubTab(activeSub);
    } else {
      if (window.currentSuppsDate) window.currentSuppsDate = new Date();
      if (typeof renderSupplements === 'function') renderSupplements();
    }
  }
}

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

function renderGymLabCategoryChips() {
  const wrapper = document.getElementById('gymlabCategoryChipsWrapper');
  if (!wrapper) return;

  const standardCategories = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Dehnen'];
  const customCategories = db.customCategories ? Object.keys(db.customCategories) : [];
  const allCategories = [...standardCategories, ...customCategories];

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

function renderGymLab() {
  const savedTab = localStorage.getItem('gymtrack_gymlab_tab') || 'templates';
  
  const searchInput = document.getElementById('gymlabSearch');
  if (searchInput) searchInput.value = '';
  window._gymlabSearchQuery = '';
  window._gymlabCategoryFilter = 'all';
  
  renderGymLabCategoryChips();

  renderTemplates();
  renderExercises();
  if (typeof renderPrograms === 'function') renderPrograms();
  switchGymLabTab(savedTab);
}

function switchGymLabTab(tab) {
  if (tab === 'all') tab = 'templates';
  
  document.querySelectorAll('.gymlab-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  const prog = document.getElementById('gymlab-programs-wrapper');
  const tmpl = document.getElementById('gymlab-templates-wrapper');
  const ex   = document.getElementById('gymlab-exercises-wrapper');
  const chipsWrapper = document.getElementById('gymlabCategoryChipsWrapper');
  
  if (prog) prog.style.display = tab === 'programs' ? 'block' : 'none';
  if (tmpl) tmpl.style.display = tab === 'templates' ? 'block' : 'none';
  if (ex) ex.style.display = tab === 'exercises' ? 'block' : 'none';
  
  if (chipsWrapper) {
    chipsWrapper.style.display = tab === 'exercises' ? 'block' : 'none';
    if (tab === 'exercises' && typeof renderGymLabCategoryChips === 'function') {
      renderGymLabCategoryChips();
    }
  }
  
  if (typeof initRipples === 'function') initRipples();
  localStorage.setItem('gymtrack_gymlab_tab', tab);
}

window._gymlabSearchQuery = '';
window._gymlabCategoryFilter = 'all';

function onGymLabSearchInput() {
  const searchVal = document.getElementById('gymlabSearch').value.trim().toLowerCase();
  window._gymlabSearchQuery = searchVal;
  
  const tab = localStorage.getItem('gymtrack_gymlab_tab') || 'templates';
  if (tab === 'templates') {
    renderTemplates(searchVal);
  } else if (tab === 'programs') {
    if (typeof renderPrograms === 'function') renderPrograms(searchVal);
  } else if (tab === 'exercises') {
    renderExercises(searchVal, window._gymlabCategoryFilter || 'all');
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

document.addEventListener('touchend', e => {
  if (document.querySelector('.modal-overlay.open')) return;
  if (e.target.closest('.qs-scroll-container') || e.target.closest('#quickStartTemplates') || e.target.closest('.horizontal-scroll') || e.target.closest('#monthlyRecap') || e.target.closest('.gymlab-category-chips-wrapper')) return;
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  if (Date.now() - swipeStartTime > 400 || Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
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
window.switchGymLabTab = switchGymLabTab;
window.filterGymLabExercisesByCategory = filterGymLabExercisesByCategory;
window.onGymLabSearchInput = onGymLabSearchInput;
