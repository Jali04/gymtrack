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

  // Animate counters
  grid.querySelectorAll('.stat-value[data-count]').forEach((el, i) => {
    const target = parseInt(el.dataset.count, 10);
    setTimeout(() => animateCount(el, target), i * 60);
  });

  // Progress per exercise
  const progList  = document.getElementById('progressList');
  const activeExs = db.exercises.filter(ex => db.workouts.some(w => w.exercises.some(e => e.exId === ex.id)));

  if (activeExs.length === 0) {
    progList.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-text">${t('noDataYet')}</div></div>`;
    return;
  }

  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  progList.innerHTML = activeExs.map(ex => {
    const type          = getCatType(ex.category);
    const workoutsWithEx = db.workouts.filter(w => w.exercises.some(e => e.exId === ex.id)).sort((a, b) => a.date - b.date);
    if (workoutsWithEx.length < 1) return '';

    const last      = workoutsWithEx[workoutsWithEx.length - 1];
    const lastEntry = last.exercises.find(e => e.exId === ex.id);
    const d         = new Date(last.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

    let mainValue = '', mainUnit = '', progressTag = '';

    if (type === 'cardio') {
      const maxKm = Math.max(...lastEntry.sets.map(s => s.km));
      mainValue = maxKm; mainUnit = 'km';
      if (workoutsWithEx.length >= 2) {
        const prev      = workoutsWithEx[workoutsWithEx.length - 2];
        const prevEntry = prev.exercises.find(e => e.exId === ex.id);
        const prevMax   = Math.max(...prevEntry.sets.map(s => s.km));
        const diff      = +(maxKm - prevMax).toFixed(2);
        if (diff > 0)      progressTag = `<span class="progress-tag up">↑ +${diff}${t('distanceUp')}</span>`;
        else if (diff < 0) progressTag = `<span class="progress-tag down">↓ ${diff}${t('distanceDown')}</span>`;
        else               progressTag = `<span class="progress-tag same">${t('same')}</span>`;
      }
    } else if (type === 'stretch') {
      const total = lastEntry.sets.reduce((a, s) => a + s.minutes, 0);
      mainValue = total; mainUnit = t('colMin');
      if (workoutsWithEx.length >= 2) {
        const prev      = workoutsWithEx[workoutsWithEx.length - 2];
        const prevEntry = prev.exercises.find(e => e.exId === ex.id);
        const prevTotal = prevEntry.sets.reduce((a, s) => a + s.minutes, 0);
        const diff      = +(total - prevTotal).toFixed(1);
        if (diff > 0)      progressTag = `<span class="progress-tag up">↑ +${diff}${t('longerStretch')}</span>`;
        else if (diff < 0) progressTag = `<span class="progress-tag down">↓ ${diff}${t('shorterStretch')}</span>`;
        else               progressTag = `<span class="progress-tag same">${t('same')}</span>`;
      }
    } else {
      const maxW = Math.max(...lastEntry.sets.map(s => s.weight));
      mainValue = maxW; mainUnit = 'kg';
      if (workoutsWithEx.length >= 2) {
        const prev      = workoutsWithEx[workoutsWithEx.length - 2];
        const prevEntry = prev.exercises.find(e => e.exId === ex.id);
        const prevMax   = Math.max(...prevEntry.sets.map(s => s.weight));
        const totalReps = lastEntry.sets.reduce((a, s) => a + s.reps, 0);
        const prevReps  = prevEntry.sets.reduce((a, s) => a + s.reps, 0);
        const wDiff = maxW - prevMax, rDiff = totalReps - prevReps;
        if (wDiff > 0)      progressTag = `<span class="progress-tag up">↑ +${wDiff}${t('weightUp')}</span>`;
        else if (wDiff < 0) progressTag = `<span class="progress-tag down">↓ ${wDiff}${t('weightDown')}</span>`;
        else if (rDiff > 0) progressTag = `<span class="progress-tag up">↑ +${rDiff}${t('repsUp')}</span>`;
        else if (rDiff < 0) progressTag = `<span class="progress-tag down">↓ ${rDiff}${t('repsDown')}</span>`;
        else                progressTag = `<span class="progress-tag same">${t('same')}</span>`;
      }
    }

    let setsHtml = '';
    if (type === 'cardio') {
      setsHtml = lastEntry.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
    } else if (type === 'stretch') {
      setsHtml = lastEntry.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
    } else {
      const prevSets = workoutsWithEx.length >= 2
        ? workoutsWithEx[workoutsWithEx.length - 2].exercises.find(e => e.exId === ex.id).sets
        : null;
      setsHtml = lastEntry.sets.map((s, i) => {
        let diff = '';
        if (prevSets && prevSets[i]) {
          const wD = s.weight - prevSets[i].weight, rD = s.reps - prevSets[i].reps;
          if (wD > 0)      diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">+${wD}kg</span>`;
          else if (wD < 0) diff = `<span style="color:var(--accent2);font-size:11px;margin-left:4px;">${wD}kg</span>`;
          else if (rD > 0) diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">+${rD} ${t('reps')}</span>`;
          else if (rD < 0) diff = `<span style="color:var(--accent2);font-size:11px;margin-left:4px;">${rD} ${t('reps')}</span>`;
        } else if (prevSets && !prevSets[i]) {
          diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">${t('newBadge')}</span>`;
        }
        return `<div style="display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
          <span style="color:var(--muted);font-size:11px;margin-right:4px;">S${i + 1}</span>${s.weight}kg × ${s.reps}${diff}
        </div>`;
      }).join('');
    }

    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:600;font-size:15px;">${ex.name} <span class="cat-badge ${catClass}">${t('cats')[ex.category] || ex.category}</span></div>
          <div style="font-size:12px;color:var(--muted);">${d} · ${workoutsWithEx.length}${t('trainedX')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${mainValue}</div>
          <div style="font-size:11px;color:var(--muted);">${mainUnit}</div>
        </div>
      </div>
      ${progressTag}
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}</div>
    </div>`;
  }).join('');
}
