/* =============================================
   GYMTRACK — Achievements & Gamification
   ============================================= */

const ACHIEVEMENTS_DEF = [
  // ── Workout-Count Abzeichen ──────────────────────────────────────────
  { id: 'first_workout', title: 'Erster Schritt',   desc: 'Dein erstes Workout abgeschlossen.',               icon: '🎯', type: 'count',       target: 1,    trophies: 3  },
  { id: 'workout_5',     title: 'Warm-Up',           desc: '5 Workouts absolviert — du kommst in Schwung.',    icon: '🔥', type: 'count',       target: 5,    trophies: 3  },
  { id: 'workout_10',    title: 'Routine gefunden',  desc: '10 Workouts absolviert.',                          icon: '💪', type: 'count',       target: 10,   trophies: 5  },
  { id: 'workout_25',    title: 'Dedicated',         desc: '25 Workouts absolviert.',                          icon: '🥉', type: 'count',       target: 25,   trophies: 8  },
  { id: 'workout_50',    title: 'Eisenfresser',      desc: '50 Workouts absolviert.',                          icon: '🥈', type: 'count',       target: 50,   trophies: 12 },
  { id: 'workout_100',   title: 'Hundertfach',       desc: '100 Workouts — du bist eine Legende.',             icon: '🥇', type: 'count',       target: 100,  trophies: 20 },

  // ── Volumen in einem Workout ─────────────────────────────────────────
  { id: 'vol_1k',        title: 'Schwere Last',      desc: '1.000 kg Volumen in einem Workout bewegt.',        icon: '⚖️', type: 'vol_single',  target: 1000, trophies: 4  },
  { id: 'vol_3k',        title: 'Kraftwerk',         desc: '3.000 kg Volumen in einem Workout bewegt.',        icon: '🏗️', type: 'vol_single',  target: 3000, trophies: 8  },
  { id: 'vol_5k',        title: 'Volumen-Biest',     desc: '5.000 kg Volumen in einem Workout bewegt.',        icon: '🦍', type: 'vol_single',  target: 5000, trophies: 12 },

  // ── Streak ───────────────────────────────────────────────────────────
  { id: 'streak_3',      title: 'Comeback-Kid',      desc: '3 Tage hintereinander trainiert.',                 icon: '⚡', type: 'streak',      target: 3,    trophies: 3  },
  { id: 'streak_7',      title: 'Wochenheld',        desc: '7 Tage am Stück trainiert.',                       icon: '🌟', type: 'streak',      target: 7,    trophies: 8  },

  // ── Gewichtssteigerungen (Personal Records) ──────────────────────────
  { id: 'first_pr',      title: 'Pers. Rekord',      desc: 'Erste Gewichtssteigerung an einer Übung erzielt.', icon: '📈', type: 'pr_count',    target: 1,    trophies: 3  },
  { id: 'pr_5',          title: 'PR-Jäger',          desc: '5× Gewicht an irgendeiner Übung gesteigert.',      icon: '🏅', type: 'pr_count',    target: 5,    trophies: 8  },

  // ── Ausdauer ─────────────────────────────────────────────────────────
  { id: 'iron_lung',     title: 'Iron Lung',         desc: 'Cardio-Workout über 60 Minuten durchgehalten.',    icon: '🫁', type: 'cardio_time', target: 60,   trophies: 5  },
];

/* ─────────────────────────────────────────────
   Trophy calculation (main currency, Clash-style)
   1 trophy per workout + bonus from achievements
   ───────────────────────────────────────────── */
function calcTrophies() {
  const workoutTrophies     = db.workouts.length;
  const achievementTrophies = db.achievements.reduce((sum, a) => {
    const def = ACHIEVEMENTS_DEF.find(d => d.id === a.id);
    return sum + (def ? def.trophies : 0);
  }, 0);
  return workoutTrophies + achievementTrophies;
}

/* ─────────────────────────────────────────────
   Count how many times any exercise has set a
   new personal-best weight (across all sessions)
   ───────────────────────────────────────────── */
function countPRs() {
  const exMax  = {};
  let   total  = 0;
  const sorted = [...db.workouts].sort((a, b) => (a.startTime || a.date) - (b.startTime || b.date));
  sorted.forEach(w => {
    if (!w.exercises) return;
    w.exercises.forEach(e => {
      const key = e.isCustom ? `c_${e.customName}` : `e_${e.exId}`;
      let sessionMax = 0;
      (e.sets || []).forEach(s => { if (s.weight > sessionMax && s.type !== 'W') sessionMax = s.weight; });
      if (sessionMax > 0) {
        if (exMax[key] !== undefined && sessionMax > exMax[key]) total++;
        if (exMax[key] === undefined || sessionMax > exMax[key]) exMax[key] = sessionMax;
      }
    });
  });
  return total;
}

/* ─────────────────────────────────────────────
   Check achievements after a workout is saved
   ───────────────────────────────────────────── */
function checkAchievements(justFinishedWorkout) {
  let newUnlocks = [];

  const totalWorkouts = db.workouts.length;

  // 1) Workout-count badges
  ACHIEVEMENTS_DEF.filter(d => d.type === 'count').forEach(def => {
    if (totalWorkouts >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def); newUnlocks.push(def);
    }
  });

  // 2) Streak badges
  const streak = calcStreak();
  ACHIEVEMENTS_DEF.filter(d => d.type === 'streak').forEach(def => {
    if (streak >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def); newUnlocks.push(def);
    }
  });

  // 3) PR badges (db.workouts already includes the just-saved workout)
  const prCount = countPRs();
  ACHIEVEMENTS_DEF.filter(d => d.type === 'pr_count').forEach(def => {
    if (prCount >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def); newUnlocks.push(def);
    }
  });

  // 4) Single-workout badges
  if (justFinishedWorkout) {
    let vol = 0, cardioMin = 0;
    justFinishedWorkout.exercises.forEach(e => {
      const isCardio = (e.isCustom
        ? getCatType(e.customCategory)
        : (getEx(e.exId)?.category === 'Cardio' ? 'cardio' : 'strength')) === 'cardio';
      (e.sets || []).forEach(s => {
        if (!isCardio && s.weight && s.reps && s.type !== 'W') vol += s.weight * s.reps;
        if (isCardio && s.time) {
          const p = s.time.split(':');
          if (p.length === 2) cardioMin += parseInt(p[0]) + parseInt(p[1]) / 60;
        }
      });
    });
    ACHIEVEMENTS_DEF.filter(d => d.type === 'vol_single').forEach(def => {
      if (vol >= def.target && !hasAchievement(def.id)) {
        unlockAchievement(def); newUnlocks.push(def);
      }
    });
    const ironLungDef = ACHIEVEMENTS_DEF.find(a => a.id === 'iron_lung');
    if (cardioMin >= ironLungDef.target && !hasAchievement('iron_lung')) {
      unlockAchievement(ironLungDef); newUnlocks.push(ironLungDef);
    }
  }

  if (newUnlocks.length > 0) {
    save();
    triggerConfetti();
    showAchievementPopup(newUnlocks[0]);
  }

  renderAchievements();
}

function hasAchievement(id) {
  return db.achievements.some(a => a.id === id);
}

function unlockAchievement(def) {
  db.achievements.push({ id: def.id, date: new Date().toISOString() });
}

/* ─────────────────────────────────────────────
   Achievement unlock popup (top banner)
   ───────────────────────────────────────────── */
function showAchievementPopup(def) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:var(--surface2);border:2px solid var(--accent);border-radius:14px;
    padding:14px 20px;z-index:10000;box-shadow:0 10px 30px rgba(0,0,0,0.5);
    display:flex;align-items:center;gap:14px;
    animation:slideDown 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
    min-width:260px;
  `;
  popup.innerHTML = `
    <div style="font-size:34px;flex-shrink:0;">${def.icon}</div>
    <div>
      <div style="font-size:10px;color:var(--accent);text-transform:uppercase;font-weight:700;letter-spacing:1px;">Abzeichen freigeschaltet!</div>
      <div style="font-size:18px;font-family:'Bebas Neue',sans-serif;color:var(--text);">${def.title}</div>
      <div style="font-size:12px;color:var(--muted);">${def.desc}</div>
      <div style="font-size:12px;color:var(--accent);font-weight:700;margin-top:2px;">+${def.trophies} 🏆</div>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.animation = 'slideUp 0.5s cubic-bezier(0.6,-0.28,0.735,0.045) forwards';
    setTimeout(() => popup.remove(), 500);
  }, 4000);
}

/* ─────────────────────────────────────────────
   Post-workout trophy toast
   ───────────────────────────────────────────── */
function showWorkoutTrophyToast() {
  const toast = document.createElement('div');
  toast.className = 'trophy-toast';
  toast.innerHTML = `
    <span style="font-size:24px;">🏆</span>
    <div>
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Training abgeschlossen</div>
      <div style="font-weight:700;color:var(--accent);font-size:15px;">+1 Trophäe</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('trophy-toast-out'); setTimeout(() => toast.remove(), 500); }, 3500);
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#c8f135', '#ffffff', '#a8d21c'] });
  }
}

/* ─────────────────────────────────────────────
   Render the stats / achievements page
   ───────────────────────────────────────────── */
function renderAchievements() {
  retroAwardGamification();

  // ── Achievement grid ─────────────────────────────────────────────────
  const container = document.getElementById('achievementsGrid');
  if (container) {
    container.innerHTML = '';
    ACHIEVEMENTS_DEF.forEach(def => {
      const isUnlocked  = hasAchievement(def.id);
      const unlockEntry = isUnlocked ? db.achievements.find(a => a.id === def.id) : null;
      const dateLine    = unlockEntry
        ? `<div style="font-size:10px;color:var(--accent);margin-top:3px;">${new Date(unlockEntry.date).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'})}</div>`
        : '';
      const lockedStyle  = isUnlocked ? '' : 'opacity:0.35;filter:grayscale(100%);';
      const borderStyle  = isUnlocked ? 'border-color:var(--accent);box-shadow:0 0 14px rgba(200,241,53,0.18);' : '';

      container.innerHTML += `
        <div style="background:var(--surface2);border:1px solid var(--border);${borderStyle}border-radius:14px;padding:14px 10px;display:flex;flex-direction:column;align-items:center;text-align:center;${lockedStyle}position:relative;">
          ${isUnlocked ? '<div style="position:absolute;top:8px;right:8px;font-size:10px;color:var(--accent);">✓</div>' : ''}
          <div style="font-size:34px;margin-bottom:6px;">${def.icon}</div>
          <div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:3px;">${def.title}</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">${def.desc}</div>
          <div style="font-size:11px;font-weight:700;color:${isUnlocked ? 'var(--accent)' : 'var(--muted)'};">+${def.trophies} 🏆</div>
          ${dateLine}
        </div>
      `;
    });
  }

  // ── Trophy/badge count banner ─────────────────────────────────────────
  const trophies = calcTrophies();
  const unlocked = db.achievements.length;
  const total    = ACHIEVEMENTS_DEF.length;
  const streak   = calcStreak();

  const elTrophies   = document.getElementById('trophyTotalCount');
  const elBadgeFrac  = document.getElementById('trophyBadgeFrac');
  const elStreak     = document.getElementById('streakCount');
  const elStreakCard = document.getElementById('streakCard');

  if (elTrophies)  elTrophies.textContent  = trophies;
  if (elBadgeFrac) elBadgeFrac.textContent = `${unlocked}/${total}`;
  if (elStreak)    elStreak.textContent    = streak;
  if (elStreakCard) {
    elStreakCard.style.borderColor = streak >= 3 ? 'var(--accent)' : 'var(--border)';
    elStreakCard.style.boxShadow   = streak >= 3 ? '0 0 12px rgba(200,241,53,0.15)' : 'none';
  }

  renderRanking();
  renderRankRoad();
  renderMilestones();
}

/* ─────────────────────────────────────────────
   Ranks (threshold = total trophies)
   ───────────────────────────────────────────── */
const RANKS = [
  { pt: 0,   title: '🥚 Beginner',     sub: 'Der erste Schritt ist getan.' },
  { pt: 5,   title: '🥉 Rookie',       sub: 'Du kommst in Schwung!' },
  { pt: 20,  title: '🥈 Eisenfresser', sub: 'Das Gym ist dein zweites Zuhause.' },
  { pt: 50,  title: '🥇 Gym-Rat',      sub: 'Pures Dedication.' },
  { pt: 100, title: '🦍 Maschine',     sub: 'Kein Gewicht ist dir zu schwer.' },
  { pt: 200, title: '🔱 Titan',        sub: 'Legendärer Status erreicht.' },
];

function calcStreak() {
  if (!db.workouts.length) return 0;
  const days = new Set(
    db.workouts.map(w => {
      const d = new Date(w.startTime || w.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  while (true) {
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (!days.has(key)) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

/* Remove count-based achievements whose threshold is no longer met */
function revokeCountAchievements() {
  const totalWorkouts = db.workouts.length;
  let dirty = false;
  for (const def of ACHIEVEMENTS_DEF) {
    if (def.type === 'count' && totalWorkouts < def.target) {
      const idx = db.achievements.findIndex(a => a.id === def.id);
      if (idx !== -1) { db.achievements.splice(idx, 1); dirty = true; }
    }
  }
  if (dirty) save();
}

/* Retro-award all achievements on load (for existing data) */
function retroAwardGamification() {
  let dirty = false;

  const totalWorkouts = db.workouts.length;
  ACHIEVEMENTS_DEF.filter(d => d.type === 'count').forEach(def => {
    if (totalWorkouts >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def); dirty = true;
    }
  });

  // Streak
  const streak = calcStreak();
  ACHIEVEMENTS_DEF.filter(d => d.type === 'streak').forEach(def => {
    if (streak >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def); dirty = true;
    }
  });

  // PRs
  const prCount = countPRs();
  ACHIEVEMENTS_DEF.filter(d => d.type === 'pr_count').forEach(def => {
    if (prCount >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def); dirty = true;
    }
  });

  // Single-workout badges
  db.workouts.forEach(w => {
    let vol = 0, cardioMin = 0;
    if (!w.exercises) return;
    w.exercises.forEach(e => {
      const isCardio = (e.isCustom
        ? getCatType(e.customCategory)
        : (getEx(e.exId)?.category === 'Cardio' ? 'cardio' : 'strength')) === 'cardio';
      (e.sets || []).forEach(s => {
        if (!isCardio && s.weight && s.reps && s.type !== 'W') vol += s.weight * s.reps;
        if (isCardio && s.time) {
          const p = s.time.split(':');
          if (p.length === 2) cardioMin += parseInt(p[0]) + parseInt(p[1]) / 60;
        }
      });
    });
    ACHIEVEMENTS_DEF.filter(d => d.type === 'vol_single').forEach(def => {
      if (vol >= def.target && !hasAchievement(def.id)) {
        unlockAchievement(def); dirty = true;
      }
    });
    const ironLungDef = ACHIEVEMENTS_DEF.find(a => a.id === 'iron_lung');
    if (cardioMin >= ironLungDef.target && !hasAchievement('iron_lung')) {
      unlockAchievement(ironLungDef); dirty = true;
    }
  });

  if (dirty) save();
}

/* ─────────────────────────────────────────────
   Rank card (inside stats page)
   ───────────────────────────────────────────── */
function renderRanking() {
  const trophies = calcTrophies();
  let currentRankIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (trophies >= RANKS[i].pt) currentRankIdx = i;
  }
  const currentRank = RANKS[currentRankIdx];
  const nextRank    = RANKS[currentRankIdx + 1] || null;

  const titleEl = document.getElementById('userRankTitle');
  const subEl   = document.getElementById('userRankSub');
  if (!titleEl) return;

  titleEl.textContent = currentRank.title;
  if (nextRank) {
    const needed       = nextRank.pt - trophies;
    subEl.textContent  = `${currentRank.sub} Noch ${needed} 🏆 bis ${nextRank.title}.`;
    const ptsInBracket = trophies - currentRank.pt;
    const bracketSize  = nextRank.pt - currentRank.pt;
    const pct          = Math.min(100, Math.round((ptsInBracket / bracketSize) * 100));
    const fill  = document.getElementById('rankProgressFill');
    const label = document.getElementById('rankProgressLabel');
    if (fill)  fill.style.width  = pct + '%';
    if (label) label.textContent = `${trophies} / ${nextRank.pt} 🏆 (${pct}%)`;
  } else {
    subEl.textContent = currentRank.sub;
    const fill  = document.getElementById('rankProgressFill');
    const label = document.getElementById('rankProgressLabel');
    if (fill)  fill.style.width  = '100%';
    if (label) label.textContent = `MAX RANG erreicht · ${trophies} 🏆`;
  }

  // Populate rank info modal once
  const infoList = document.getElementById('rankInfoList');
  if (infoList && infoList.innerHTML === '') {
    infoList.innerHTML = RANKS.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:10px;border-radius:8px;">
        <div style="font-weight:700;font-size:15px;color:var(--text);">${r.title}</div>
        <div style="font-size:12px;color:var(--accent);font-weight:600;">Ab ${r.pt} 🏆</div>
      </div>
    `).join('');
  }
}

/* ─────────────────────────────────────────────
   Rank road (visual progression bar)
   ───────────────────────────────────────────── */
function renderRankRoad() {
  const road = document.getElementById('rankRoad');
  if (!road) return;

  const trophies = calcTrophies();
  let currentRankIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (trophies >= RANKS[i].pt) currentRankIdx = i;
  }

  let html = '<div style="display:flex;align-items:center;padding:4px 8px;gap:0;">';
  RANKS.forEach((r, i) => {
    const isReached = trophies >= r.pt;
    const isCurrent = i === currentRankIdx;
    const emoji     = r.title.split(' ')[0];
    const label     = r.title.replace(/^\S+\s/, '');
    const nodeSize  = isCurrent ? '52px' : '42px';
    const fontSize  = isCurrent ? '20px' : '16px';
    const nodeBorder = isCurrent
      ? 'border:2px solid var(--accent);box-shadow:0 0 14px rgba(200,241,53,0.5);background:rgba(200,241,53,0.12);'
      : isReached
        ? 'border:2px solid var(--accent);background:rgba(200,241,53,0.06);'
        : 'border:2px solid var(--border);background:var(--bg);';
    const labelColor  = isCurrent ? 'var(--accent)' : isReached ? 'var(--text)' : 'var(--muted)';
    const labelWeight = isCurrent ? '700' : '400';

    html += `
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
        <div style="width:${nodeSize};height:${nodeSize};border-radius:50%;${nodeBorder}display:flex;align-items:center;justify-content:center;transition:all 0.3s;" title="${r.title} · ${r.pt} 🏆">
          <span style="font-size:${fontSize};line-height:1;">${emoji}</span>
        </div>
        <div style="font-size:10px;color:${labelColor};font-weight:${labelWeight};margin-top:4px;text-align:center;max-width:52px;line-height:1.2;">${label}</div>
      </div>
    `;
    if (i < RANKS.length - 1) {
      const connColor = isReached ? 'var(--accent)' : 'var(--border)';
      html += `<div style="width:20px;height:3px;background:${connColor};border-radius:2px;flex-shrink:0;margin-bottom:18px;transition:background 0.3s;"></div>`;
    }
  });
  html += '</div>';
  road.innerHTML = html;
}

/* ─────────────────────────────────────────────
   Milestones feed (weight PRs + consistency)
   ───────────────────────────────────────────── */
function renderMilestones() {
  const container = document.getElementById('milestonesList');
  if (!container) return;

  let milestones = [];

  // Weight improvements per exercise
  const exCounts = {};
  db.workouts.forEach(w => {
    if (!w.exercises) return;
    w.exercises.forEach(e => {
      const key = e.isCustom ? `c_${e.customName}` : `e_${e.exId}`;
      if (!exCounts[key]) exCounts[key] = { id: e.exId, isCustom: e.isCustom, name: e.customName, dates: [], maxW: [] };
      exCounts[key].dates.push(w.startTime || w.date);
      let m = 0;
      (e.sets || []).forEach(s => { if (s.type !== 'W' && s.weight > m) m = s.weight; });
      exCounts[key].maxW.push(m);
    });
  });

  Object.values(exCounts).filter(x => x.dates.length >= 2).forEach(x => {
    const zipped = x.dates.map((d, i) => ({ d: new Date(d).getTime(), w: x.maxW[i] })).sort((a, b) => a.d - b.d);
    const first  = zipped[0];
    const last   = zipped[zipped.length - 1];
    if (last.w > first.w && first.w > 0) {
      const diffW     = +(last.w - first.w).toFixed(1);
      const diffTime  = last.d - first.d;
      const diffWeeks = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)));
      const ex        = x.isCustom ? { name: x.name, category: '' } : getEx(x.id);
      if (ex && ex.category !== 'Cardio' && ex.category !== 'Dehnen') {
        milestones.push({
          time: last.d,
          html: `<div class="card" style="padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:0;">
            <div style="font-size:24px;">📈</div>
            <div>
              <div style="font-weight:700;font-size:15px;">${ex.name}</div>
              <div style="font-size:13px;color:var(--text);">+<span style="color:var(--accent);font-weight:700;">${diffW} kg</span> in ${diffWeeks} Woche${diffWeeks !== 1 ? 'n' : ''} gesteigert</div>
            </div>
          </div>`
        });
      }
    }
  });

  // Consistency milestone
  if (db.workouts.length >= 5) {
    milestones.push({
      time: Date.now(),
      html: `<div class="card" style="padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:0;">
        <div style="font-size:24px;">🔥</div>
        <div>
          <div style="font-weight:700;font-size:15px;">Konsistenz</div>
          <div style="font-size:13px;color:var(--text);">Schon <span style="color:var(--accent);font-weight:700;">${db.workouts.length} Workouts</span> absolviert — bleib dran!</div>
        </div>
      </div>`
    });
  }

  if (milestones.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Sammle mehr Trainingsdaten für Meilensteine.</div>`;
    return;
  }

  container.innerHTML = milestones.sort((a, b) => b.time - a.time).slice(0, 6).map(m => m.html).join('');
}

/* ─────────────────────────────────────────────
   Manual Week Mode
   ───────────────────────────────────────────── */
const WEEK_MODES = {
  normal:   { emoji: '💪', label: 'Normal',      color: 'var(--accent)',  bg: 'rgba(200,241,53,0.08)',  border: 'rgba(200,241,53,0.3)'  },
  deload:   { emoji: '😴', label: 'Deload',       color: '#a78bfa',        bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.3)' },
  sick:     { emoji: '🤒', label: 'Krank',        color: '#f87171',        bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)' },
  vacation: { emoji: '🏖️', label: 'Urlaub',      color: '#38bdf8',        bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.3)'  },
  travel:   { emoji: '✈️', label: 'Unterwegs',   color: '#94a3b8',        bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.3)' },
};

function _currentWeekKey() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.getTime();
}

function setWeekMode(mode) {
  db.weekStatus = { weekKey: _currentWeekKey(), mode };
  save();
  renderWeekStatusBanner();
}

function renderWeekStatusBanner() {
  const widget = document.getElementById('weekStatusWidget');
  if (!widget) return;

  const wk = _currentWeekKey();
  if (!db.weekStatus || db.weekStatus.weekKey !== wk) {
    db.weekStatus = { weekKey: wk, mode: 'normal' };
    save();
  }
  const mode = db.weekStatus.mode || 'normal';

  const chips = Object.entries(WEEK_MODES).map(([key, m]) => {
    const active = key === mode;
    const bg     = active ? m.color : 'var(--surface2)';
    const color  = active ? (key === 'normal' ? '#000' : '#fff') : 'var(--muted)';
    const border = active ? m.color : 'var(--border)';
    return `<button onclick="setWeekMode('${key}')" style="background:${bg};color:${color};border:1px solid ${border};border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;">${m.emoji} ${m.label}</button>`;
  }).join('');

  let banner = '';
  if (mode !== 'normal') {
    const m    = WEEK_MODES[mode];
    const desc = { deload: 'Leichtere Woche geplant — Volumen runter, Regeneration hoch.', sick: 'Gute Besserung! Körper erholt sich am besten mit Ruhe.', vacation: 'Genieß den Urlaub — der Körper dankt es dir.', travel: 'Unterwegs — mach das Beste draus!' }[mode] || '';
    banner = `<div style="background:${m.bg};border:1px solid ${m.border};border-radius:12px;padding:10px 14px;font-size:13px;display:flex;align-items:center;gap:10px;margin-top:8px;">
      <span style="font-size:18px;">${m.emoji}</span>
      <div><div style="font-weight:700;color:${m.color};">${m.label}-Woche</div>
      <div style="color:var(--muted);font-size:12px;">${desc}</div></div>
    </div>`;
  }

  widget.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px;">Diese Woche</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;">${chips}</div>
    ${banner}
  `;
}
