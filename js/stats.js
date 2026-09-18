/* =============================================
   GYMTRACK — Statistik-Karten (Progress → Kalender)

   Bewusst KEINE "seit Beginn"-Zahlen mehr: wie viele Sätze man insgesamt
   gemacht hat, ändert nichts am nächsten Training. Gezeigt wird, was diese
   Woche passiert ist und wie es zur letzten steht.
   ============================================= */

function _statsWeekStart(offsetWeeks = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));   // Montag
  d.setDate(d.getDate() - offsetWeeks * 7);
  return d.getTime();
}

// Tonnage (Gewicht × Wiederholungen) über alle Kraftsätze eines Zeitraums.
function _statsVolume(workouts, from, to) {
  let vol = 0, sets = 0;
  workouts.forEach(w => {
    const ts = w.startTime || w.date;
    if (!ts || ts < from || ts >= to) return;
    (w.exercises || []).forEach(e => {
      if (typeof getEntryType === 'function' && getEntryType(e) !== 'strength') return;
      (e.sets || []).forEach(st => {
        if (st.type === 'W') return;
        sets++;
        vol += (Number(st.weight) || 0) * (Number(st.reps) || 0);
      });
    });
  });
  return { vol, sets };
}

function renderStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;

  const en = (typeof lang !== 'undefined' && lang === 'en');
  const ws = (typeof progressWorkouts === 'function') ? progressWorkouts() : (db.workouts || []);

  const thisWeekStart = _statsWeekStart(0);
  const lastWeekStart = _statsWeekStart(1);
  const now = Date.now();

  const sessions = ws.filter(w => (w.startTime || w.date) >= thisWeekStart).length;
  const cur  = _statsVolume(ws, thisWeekStart, now);
  const prev = _statsVolume(ws, lastWeekStart, thisWeekStart);

  // Volumenveränderung zur Vorwoche — das Signal, auf das man reagiert.
  let trendVal, trendCls = '';
  if (prev.vol > 0) {
    const pct = ((cur.vol - prev.vol) / prev.vol) * 100;
    trendVal = `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`;
    trendCls = pct >= 0 ? 'stat-up' : 'stat-down';
  } else {
    trendVal = '–';
  }

  // Tonnage kompakt: 12.4t statt 12400 kg
  const tonnage = cur.vol >= 1000
    ? `${(cur.vol / 1000).toFixed(1).replace('.', en ? '.' : ',')}t`
    : `${Math.round(cur.vol)}`;

  const card = (value, label, cls = '') =>
    `<div class="stat-card"><div class="stat-value ${cls}">${value}</div><div class="stat-label">${label}</div></div>`;

  grid.innerHTML =
    card(sessions,  en ? 'Sessions this week' : 'Einheiten diese Woche') +
    card(cur.sets,  en ? 'Working sets'       : 'Arbeitssätze') +
    card(tonnage,   en ? 'Volume this week'   : 'Volumen diese Woche') +
    card(trendVal,  en ? 'vs. last week'      : 'zur Vorwoche', trendCls);
}
