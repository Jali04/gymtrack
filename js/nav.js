/* =============================================
   GYMTRACK — Navigation + Swipe
   ============================================= */

const PAGE_ORDER = ['log', 'gymlab', 'calendar', 'stats'];

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'log')      renderLog();
  if (id === 'gymlab')   renderGymLab();
  if (id === 'progress') renderProgress();
  if (id === 'stats')    { renderStats(); }
  if (id === 'calendar') { renderCalendar(); renderStats(); }
}

function renderGymLab() {
  renderTemplates();
  renderExercises();
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
