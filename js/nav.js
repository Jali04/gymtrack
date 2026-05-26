/* =============================================
   GYMTRACK — Navigation + Swipe
   ============================================= */

const PAGE_ORDER = ['log', 'gymlab', 'calendar', 'supps', 'progress'];

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'log')      renderLog();
  if (id === 'gymlab')   renderGymLab();
  if (id === 'progress') renderProgress();
  if (id === 'supps')    {
    if (window.currentSuppsDate) window.currentSuppsDate = new Date();
    if (typeof renderSupplements === 'function') renderSupplements();
  }
  if (id === 'calendar') { renderCalendar(); renderStats(); }
}

function renderGymLab() {
  renderTemplates();
  renderExercises();
  if (typeof renderPrograms === 'function') renderPrograms();
  const savedTab = localStorage.getItem('gymtrack_gymlab_tab') || 'all';
  switchGymLabTab(savedTab);
}

function switchGymLabTab(tab) {
  document.querySelectorAll('.gymlab-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  const prog = document.getElementById('gymlab-programs-wrapper');
  const tmpl = document.getElementById('gymlab-templates-wrapper');
  const ex   = document.getElementById('gymlab-exercises-wrapper');
  
  if (tab === 'all') {
    if (prog) prog.style.display = 'block';
    if (tmpl) tmpl.style.display = 'block';
    if (ex) ex.style.display = 'block';
  } else {
    if (prog) prog.style.display = tab === 'programs' ? 'block' : 'none';
    if (tmpl) tmpl.style.display = tab === 'templates' ? 'block' : 'none';
    if (ex) ex.style.display = tab === 'exercises' ? 'block' : 'none';
  }
  
  if (typeof initRipples === 'function') initRipples();
  localStorage.setItem('gymtrack_gymlab_tab', tab);
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
  if (e.target.closest('.qs-scroll-container') || e.target.closest('#quickStartTemplates') || e.target.closest('.horizontal-scroll') || e.target.closest('#monthlyRecap')) return;
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
