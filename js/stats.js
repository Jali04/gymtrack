/* =============================================
   GYMTRACK — Statistics
   ============================================= */

function renderStats() {
  const total      = db.workouts.length;
  const totalSets  = db.workouts.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const totalExs   = db.exercises.length;
  const thisWeek   = db.workouts.filter(w => (Date.now() - w.date) < 7 * 86400000).length;

  const grid = document.getElementById('statsGrid');
  grid.innerHTML = `
    <div class="stat-card"><div class="stat-value" data-count="${total}">0</div><div class="stat-label">${t('totalWorkouts')}</div></div>
    <div class="stat-card"><div class="stat-value" data-count="${thisWeek}">0</div><div class="stat-label">${t('thisWeek')}</div></div>
    <div class="stat-card"><div class="stat-value" data-count="${totalSets}">0</div><div class="stat-label">${t('totalSets')}</div></div>
    <div class="stat-card"><div class="stat-value" data-count="${totalExs}">0</div><div class="stat-label">${t('exercises')}</div></div>`;

  grid.querySelectorAll('.stat-value[data-count]').forEach((el, i) => {
    const target = parseInt(el.dataset.count, 10);
    setTimeout(() => animateCount(el, target), i * 60);
  });
}
