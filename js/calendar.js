/* =============================================
   GYMTRACK — Calendar
   ============================================= */

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

function calPrevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function calNextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function getWorkoutsOnDay(year, month, day) {
  return db.workouts.filter(w => {
    const d = new Date(w.date || w.startTime);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return totalMin + ' min';
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function calcStreak() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let streak = 0;
  const checking = new Date(today);
  while (true) {
    const y = checking.getFullYear(), mo = checking.getMonth(), d = checking.getDate();
    const hasWorkout = db.workouts.some(w => {
      const wd = new Date(w.date || w.startTime);
      return wd.getFullYear() === y && wd.getMonth() === mo && wd.getDate() === d;
    });
    if (!hasWorkout) {
      if (streak === 0 && checking.getTime() === today.getTime()) {
        checking.setDate(checking.getDate() - 1); continue;
      }
      break;
    }
    streak++;
    checking.setDate(checking.getDate() - 1);
  }
  return streak;
}

function renderCalendar() {
  const months    = t('calMonths');
  const dayLabels = t('calDayShort');
  document.getElementById('calMonthLabel').textContent = months[calMonth] + ' ' + calYear;

  // Day labels
  const labelsEl = document.getElementById('calDayLabels');
  labelsEl.innerHTML = dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('');

  // Streak & month stats
  const streak       = calcStreak();
  const monthWorkouts = db.workouts.filter(w => {
    const d = new Date(w.date || w.startTime);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  });
  const streakEl = document.getElementById('calStreak');
  streakEl.innerHTML = `
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${streak}</div>
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">${t('calStreak')} ${streak > 0 ? '🔥' : ''}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${monthWorkouts.length}</div>
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">${t('calThisMonth')}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--accent);line-height:1;">${db.workouts.length}</div>
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">${t('calWorkouts')}</div>
    </div>`;

  // Build calendar grid (Monday-first)
  const firstDay    = new Date(calYear, calMonth, 1);
  const lastDay     = new Date(calYear, calMonth + 1, 0);
  const today       = new Date();
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon

  const grid = document.getElementById('calGrid');
  let html = '';

  for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
    const workouts = getWorkoutsOnDay(calYear, calMonth, day);
    const hasW     = workouts.length > 0;

    let dots = '';
    if (hasW) {
      const types = new Set();
      workouts.forEach(w => w.exercises.forEach(e => {
        const ex = getEx(e.exId);
        if (ex) types.add(getCatType(ex.category));
      }));
      dots = `<div class="cal-dot-row">${[...types].slice(0, 3).map(tp => `<div class="cal-dot ${tp}"></div>`).join('')}</div>`;
    }

    html += `<div class="cal-day${isToday ? ' today' : ''}${hasW ? ' has-workout' : ''}" onclick="${hasW ? `openCalDay(${calYear},${calMonth},${day})` : ''}">
      <span>${day}</span>
      ${dots}
    </div>`;
  }
  grid.innerHTML = html;
  renderMonthlyRecap();
}

function renderMonthlyRecap() {
  const container = document.getElementById('monthlyRecap');
  if (!container) return;

  const now = new Date();
  // Use currently displayed month
  const y = calYear, m = calMonth;
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;

  const inMonth = (w, yr, mo) => { const d = new Date(w.date || w.startTime); return d.getFullYear() === yr && d.getMonth() === mo; };
  const thisMonthWos  = db.workouts.filter(w => inMonth(w, y, m));
  const lastMonthWos  = db.workouts.filter(w => inMonth(w, prevY, prevM));

  // Volume = sum of weight × reps for non-warmup strength sets
  const calcVol = wos => wos.reduce((total, w) => {
    return total + w.exercises.reduce((wt, e) => {
      return wt + e.sets.reduce((st, s) => {
        return (s.type !== 'W' && s.weight && s.reps) ? st + s.weight * s.reps : st;
      }, 0);
    }, 0);
  }, 0);

  const thisVol = Math.round(calcVol(thisMonthWos));
  const lastVol = Math.round(calcVol(lastMonthWos));

  // Training time
  const calcTime = wos => wos.reduce((total, w) => {
    return (w.endTime && w.startTime) ? total + Math.round((w.endTime - w.startTime) / 60000) : total;
  }, 0);
  const thisMins = calcTime(thisMonthWos);

  // PRs this month: exercises where max weight is the all-time highest
  const prThisMonth = [];
  const exIds = [...new Set(thisMonthWos.flatMap(w => w.exercises.map(e => e.exId).filter(Boolean)))];
  exIds.forEach(exId => {
    const ex = getEx(exId);
    if (!ex || getCatType(ex.category) !== 'strength') return;
    let allTimeMax = 0, thisMonthMax = 0;
    db.workouts.forEach(w => {
      const match = w.exercises.find(e => e.exId === exId);
      if (!match) return;
      const mx = Math.max(...match.sets.filter(s => s.type !== 'W' && s.weight).map(s => s.weight), 0);
      if (mx > allTimeMax) allTimeMax = mx;
      if (inMonth(w, y, m) && mx > thisMonthMax) thisMonthMax = mx;
    });
    if (thisMonthMax > 0 && thisMonthMax >= allTimeMax) prThisMonth.push({ name: ex.name, weight: thisMonthMax });
  });

  const delta = (curr, prev) => {
    if (prev === 0) return '';
    const pct = Math.round(((curr - prev) / prev) * 100);
    if (pct > 0) return `<span style="color:var(--accent);font-weight:700;font-size:12px;"> ↑ +${pct}%</span>`;
    if (pct < 0) return `<span style="color:var(--accent2);font-weight:700;font-size:12px;"> ↓ ${pct}%</span>`;
    return `<span style="color:var(--muted);font-size:12px;"> = gleich</span>`;
  };

  const h = thisMins >= 60 ? `${Math.floor(thisMins/60)}h ${thisMins%60}min` : `${thisMins} min`;

  const prHtml = prThisMonth.length > 0
    ? prThisMonth.slice(0, 3).map(p => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span>${p.name}</span><span style="color:var(--accent);font-weight:700;">🏆 ${p.weight}kg</span>
      </div>`).join('')
    : `<div style="color:var(--muted);font-size:13px;text-align:center;padding:8px 0;">Noch keine PRs diesen Monat</div>`;

  const months = t('calMonths') || [];
  const monthLabel = (months[m] || '') + ' ' + y;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${thisMonthWos.length}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-top:2px;">Workouts</div>
        ${delta(thisMonthWos.length, lastMonthWos.length)}
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${thisVol >= 1000 ? (thisVol/1000).toFixed(1)+'t' : thisVol+'kg'}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-top:2px;">Volumen</div>
        ${delta(thisVol, lastVol)}
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent);line-height:1;">${thisMins > 0 ? h : '–'}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-top:2px;">Zeit</div>
      </div>
    </div>
    ${prThisMonth.length > 0 ? `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;">
      <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">🏆 Neue PRs diesen Monat</div>
      ${prHtml}
    </div>` : ''}
  `;
}

function openCalDay(year, month, day) {
  const workouts = getWorkoutsOnDay(year, month, day);
  const locale   = lang === 'de' ? 'de-DE' : 'en-GB';
  const dateStr  = new Date(year, month, day).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('calDayTitle').textContent = dateStr;

  const content = document.getElementById('calDayContent');
  if (workouts.length === 0) {
    content.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">😴</div><div class="empty-text">${t('calRestDay')}</div></div>`;
    openModal('calDayModal'); return;
  }

  content.innerHTML = workouts.map(w => {
    const startTime = formatTime(w.startTime || w.date);
    const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    const endTs     = w.endTime || (w.startTime + totalSets * 45000 + 300000);
    const endTime   = formatTime(endTs);
    const durMs     = endTs - (w.startTime || w.date);
    const durStr    = formatDuration(durMs);

    const exHtml = w.exercises.map(e => {
      const ex       = getEx(e.exId);
      const type     = ex ? getCatType(ex.category) : 'strength';
      const catClass = getCatClass(type);
      const catLabel = ex ? (t('cats')[ex.category] || ex.category) : '';
      let setsHtml   = '';
      if (type === 'cardio')       setsHtml = e.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
      else if (type === 'stretch') setsHtml = e.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
      else                         setsHtml = e.sets.map(s => `<span class="set-badge">${s.weight}kg×${s.reps}</span>`).join('');
      return `<div style="margin-bottom:10px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:6px;">${getExName(e.exId)} <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}</div>
        ${e.note ? `<div style="margin-top:6px;font-size:12px;color:var(--muted);">💬 ${e.note}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="cal-detail-workout">
      <div class="cal-time-badge">🕐 ${startTime} – ${endTime} &nbsp;·&nbsp; ${durStr}</div>
      ${exHtml}
    </div>`;
  }).join('');

  openModal('calDayModal');
}
