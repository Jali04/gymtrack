/* =============================================
   GYMTRACK — Statistics
   ============================================= */

function renderStats() {
  // Respektiert den Abteilungs-Filter der Progress-Abteilung.
  const ws         = (typeof progressWorkouts === 'function') ? progressWorkouts() : db.workouts;
  const domain     = (typeof getProgressDomain === 'function') ? getProgressDomain() : 'all';
  const total      = ws.length;
  const totalSets  = ws.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const totalExs   = domain === 'all'
    ? activeExercises().length
    : activeExercises().filter(e => getExerciseDomain(e) === domain).length;
  const thisWeek   = ws.filter(w => (Date.now() - w.date) < 7 * 86400000).length;

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
