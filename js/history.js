/* =============================================
   GYMTRACK — Workout History
   ============================================= */

function deleteWorkout(id) {
  if (!confirm(t('confirmDeleteWorkout'))) return;
  db.workouts = db.workouts.filter(w => w.id !== id);
  save();
  renderHistory();
  renderLog();
  haptic('light');
}

function renderHistory() {
  const list   = document.getElementById('historyList');
  const ws     = [...db.workouts].reverse();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';

  if (ws.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">${t('noHistoryYet')}</div></div>`;
    return;
  }

  list.innerHTML = ws.map(w => {
    const d      = new Date(w.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    const exHtml = w.exercises.map(e => {
      const ex   = getEx(e.exId);
      const type = ex ? getCatType(ex.category) : 'strength';
      const name = getExName(e.exId);
      let setsHtml = '';
      if (type === 'cardio')       setsHtml = e.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
      else if (type === 'stretch') setsHtml = e.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
      else                         setsHtml = e.sets.map(s => `<span class="set-badge">${s.weight}kg × ${s.reps}</span>`).join('');
      return `<div style="margin-bottom:10px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:6px;">${name}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}</div>
        ${e.note ? `<div style="margin-top:6px;font-size:12px;color:var(--muted);">💬 ${e.note}</div>` : ''}
      </div>`;
    }).join('');

    const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    return `<div class="history-entry">
      <div class="history-entry-header">
        <div><div class="history-exercise-name">${d}</div></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="tag">${totalSets} ${t('sets')}</span>
          <button class="close-btn" onclick="deleteWorkout('${w.id}')" style="color:var(--accent2);border-color:rgba(255,77,77,0.3);">🗑</button>
        </div>
      </div>
      ${exHtml}
    </div>`;
  }).join('');
}
