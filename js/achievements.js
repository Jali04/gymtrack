/* =============================================
   GYMTRACK — Achievements & Gamification
   ============================================= */

const ACHIEVEMENTS_DEF = [
  { id: 'first_workout', title: 'Erster Schritt', desc: 'Absolviere dein erstes Workout.', icon: '🎯', type: 'count', target: 1 },
  { id: 'workout_10', title: '10 Workouts', desc: 'Absolviere 10 Workouts.', icon: '🥉', type: 'count', target: 10 },
  { id: 'workout_50', title: '50 Workouts', desc: 'Absolviere 50 Workouts.', icon: '🥈', type: 'count', target: 50 },
  { id: 'workout_100', title: '100 Workouts', desc: 'Absolviere 100 Workouts.', icon: '🥇', type: 'count', target: 100 },
  { id: 'vol_10k', title: 'Volumen-Biest', desc: 'Bewege 10.000 kg in einem einzigen Workout.', icon: '🦍', type: 'vol_single', target: 10000 },
  { id: 'rest_master', title: 'Iron Lung', desc: 'Logge ein Cardio-Workout über 60 Minuten.', icon: '🫁', type: 'cardio_time', target: 60 }
];

// Call this right after a workout is saved to `db.workouts`
function checkAchievements(justFinishedWorkout) {
  let newUnlocks = [];
  
  const totalWorkouts = db.workouts.length;
  
  // 1) Workout count badges
  for (let def of ACHIEVEMENTS_DEF) {
    if (def.type === 'count') {
      if (totalWorkouts >= def.target && !hasAchievement(def.id)) {
        unlockAchievement(def);
        newUnlocks.push(def);
      }
    }
  }
  
  // 2) Single workout specific badges
  if (justFinishedWorkout) {
    let vol = 0;
    let cardioMin = 0;
    
    justFinishedWorkout.exercises.forEach(e => {
      const isCardio = (e.isCustom ? getCatType(e.customCategory) : (getEx(e.id)?.category === 'Cardio' ? 'cardio' : 'strength')) === 'cardio';
      
      e.sets.forEach(s => {
        if (!isCardio && s.weight && s.reps && s.type !== 'W') {
          vol += (s.weight * s.reps);
        }
        if (isCardio && s.time) {
          // crude parse of mm:ss
          const parts = s.time.split(':');
          if (parts.length === 2) {
             cardioMin += parseInt(parts[0]) + (parseInt(parts[1])/60);
          }
        }
      });
    });
    
    const volBeastDef = ACHIEVEMENTS_DEF.find(a => a.id === 'vol_10k');
    if (vol >= volBeastDef.target && !hasAchievement('vol_10k')) {
      unlockAchievement(volBeastDef);
      newUnlocks.push(volBeastDef);
    }
    
    const ironLungDef = ACHIEVEMENTS_DEF.find(a => a.id === 'rest_master');
    if (cardioMin >= ironLungDef.target && !hasAchievement('rest_master')) {
      unlockAchievement(ironLungDef);
      newUnlocks.push(ironLungDef);
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
  db.achievements.push({
    id: def.id,
    date: new Date().toISOString()
  });
}

function showAchievementPopup(def) {
  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.left = '50%';
  popup.style.transform = 'translateX(-50%)';
  popup.style.background = 'var(--surface2)';
  popup.style.border = '2px solid var(--accent)';
  popup.style.borderRadius = '12px';
  popup.style.padding = '16px 20px';
  popup.style.zIndex = '10000';
  popup.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  popup.style.display = 'flex';
  popup.style.alignItems = 'center';
  popup.style.gap = '15px';
  popup.style.animation = 'slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
  
  popup.innerHTML = `
    <div style="font-size:32px;">${def.icon}</div>
    <div>
      <div style="font-size:11px;color:var(--accent);text-transform:uppercase;font-weight:700;">Achievement Unlocked!</div>
      <div style="font-size:18px;font-family:'Bebas Neue',sans-serif;color:var(--text);">${def.title}</div>
      <div style="font-size:13px;color:var(--muted);">${def.desc}</div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.style.animation = 'slideUp 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards';
    setTimeout(() => popup.remove(), 500);
  }, 4000);
}

function showWorkoutTrophyToast(pts) {
  const toast = document.createElement('div');
  toast.className = 'trophy-toast';
  toast.innerHTML = `<span style="font-size:22px;">🏆</span><div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Training abgeschlossen</div><div style="font-weight:700;color:var(--accent);font-size:15px;">+${pts} Punkte</div></div>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('trophy-toast-out'); setTimeout(() => toast.remove(), 500); }, 3500);
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#c8f135', '#ffffff', '#a8d21c']
    });
  }
}

function renderAchievements() {
  retroAwardGamification();

  const container = document.getElementById('achievementsGrid');
  if (!container) return;

  container.innerHTML = '';

  ACHIEVEMENTS_DEF.forEach(def => {
    const isUnlocked = hasAchievement(def.id);
    const lockedStyle = isUnlocked ? '' : 'opacity:0.3; filter:grayscale(100%);';
    const borderStyle = isUnlocked ? 'border-color:var(--accent);box-shadow:0 0 12px rgba(200,241,53,0.15);' : '';
    const unlockedDate = isUnlocked ? db.achievements.find(a => a.id === def.id)?.date : null;
    const dateLine = unlockedDate ? `<div style="font-size:10px;color:var(--accent);margin-top:3px;">${new Date(unlockedDate).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'})}</div>` : '';

    container.innerHTML += `
      <div style="background:var(--surface2);border:1px solid var(--border);${borderStyle}border-radius:12px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center;${lockedStyle}position:relative;">
        ${isUnlocked ? '<div style="position:absolute;top:8px;right:8px;font-size:10px;color:var(--accent);">✓</div>' : ''}
        <div style="font-size:36px;margin-bottom:8px;">${def.icon}</div>
        <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:4px;">${def.title}</div>
        <div style="font-size:11px;color:var(--muted);">${def.desc}</div>
        ${dateLine}
      </div>
    `;
  });

  // Update trophy count banner
  const unlocked = db.achievements.length;
  const total = ACHIEVEMENTS_DEF.length;
  const pts = db.workouts.length * 2 + unlocked * 10;
  const streak = calcStreak();

  const elUnlocked = document.getElementById('trophyCountUnlocked');
  const elTotal    = document.getElementById('trophyCountTotal');
  const elPts      = document.getElementById('trophyTotalPts');
  const elStreak   = document.getElementById('streakCount');
  const elStreakCard = document.getElementById('streakCard');

  if (elUnlocked) elUnlocked.textContent = unlocked;
  if (elTotal)    elTotal.textContent    = total;
  if (elPts)      elPts.textContent      = pts;
  if (elStreak)   elStreak.textContent   = streak;
  // Highlight streak card when active
  if (elStreakCard) {
    elStreakCard.style.borderColor = streak >= 3 ? 'var(--accent)' : 'var(--border)';
    elStreakCard.style.boxShadow   = streak >= 3 ? '0 0 12px rgba(200,241,53,0.15)' : 'none';
  }

  renderRanking();
  renderRankRoad();
  renderMilestones();
}

const RANKS = [
  { pt: 0, title: '🥚 Beginner', sub: 'Der erste Schritt ist getan.' },
  { pt: 10, title: '🥉 Rookie', sub: 'Du kommst in Schwung!' },
  { pt: 30, title: '🥈 Eisenfresser', sub: 'Das Gym ist dein zweites Zuhause.' },
  { pt: 60, title: '🥇 Gym-Rat', sub: 'Pures Dedication.' },
  { pt: 120, title: '🦍 Maschine', sub: 'Kein Gewicht ist dir zu schwer.' },
  { pt: 250, title: '🔱 Titan', sub: 'Legendärer Status erreicht.' }
];

function calcStreak() {
  if (!db.workouts.length) return 0;
  // Collect unique calendar days that have at least one workout
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

// Remove count-based achievements that are no longer earned (e.g. after workout deleted)
function revokeCountAchievements() {
  const totalWorkouts = db.workouts.length;
  let dirty = false;
  for (const def of ACHIEVEMENTS_DEF) {
    if (def.type === 'count' && totalWorkouts < def.target) {
      const idx = db.achievements.findIndex(a => a.id === def.id);
      if (idx !== -1) {
        db.achievements.splice(idx, 1);
        dirty = true;
      }
    }
  }
  if (dirty) save();
}

/* ---- Manual Week Mode ---- */
const WEEK_MODES = {
  normal:   { emoji: '💪', label: 'Normal',      color: 'var(--accent)',  bg: 'rgba(200,241,53,0.08)',  border: 'rgba(200,241,53,0.3)'  },
  deload:   { emoji: '😴', label: 'Deload',       color: '#a78bfa',        bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.3)' },
  sick:     { emoji: '🤒', label: 'Krank',        color: '#f87171',        bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)' },
  vacation: { emoji: '🏖️', label: 'Urlaub',      color: '#38bdf8',        bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.3)'  },
  travel:   { emoji: '✈️', label: 'Unterwegs',   color: '#94a3b8',        bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.3)' },
};

function _currentWeekKey() {
  const d = new Date(); d.setHours(0,0,0,0);
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

  // Auto-reset if new week has started
  const wk = _currentWeekKey();
  if (!db.weekStatus || db.weekStatus.weekKey !== wk) {
    db.weekStatus = { weekKey: wk, mode: 'normal' };
    save();
  }
  const mode = db.weekStatus.mode || 'normal';

  // Render chips
  const chips = Object.entries(WEEK_MODES).map(([key, m]) => {
    const active = key === mode;
    const bg     = active ? m.color : 'var(--surface2)';
    const color  = active ? (key === 'normal' ? '#000' : '#fff') : 'var(--muted)';
    const border = active ? m.color : 'var(--border)';
    return `<button onclick="setWeekMode('${key}')" style="background:${bg};color:${color};border:1px solid ${border};border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;">${m.emoji} ${m.label}</button>`;
  }).join('');

  // Banner only for non-normal modes
  let banner = '';
  if (mode !== 'normal') {
    const m = WEEK_MODES[mode];
    const desc = {
      deload:   'Leichtere Woche geplant — Volumen runter, Regeneration hoch.',
      sick:     'Gute Besserung! Körper erholt sich am besten mit Ruhe.',
      vacation: 'Genieß den Urlaub — der Körper dankt es dir.',
      travel:   'Unterwegs — mach das Beste draus!',
    }[mode] || '';
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

function retroAwardGamification() {
  let dirty = false;
  
  // 1) Count badges
  const totalWorkouts = db.workouts.length;
  for (let def of ACHIEVEMENTS_DEF) {
    if (def.type === 'count' && totalWorkouts >= def.target && !hasAchievement(def.id)) {
      unlockAchievement(def);
      dirty = true;
    }
  }
  
  // 2) Single workout badges
  const volBeastDef = ACHIEVEMENTS_DEF.find(a => a.id === 'vol_10k');
  const ironLungDef = ACHIEVEMENTS_DEF.find(a => a.id === 'rest_master');
  
  db.workouts.forEach(w => {
    let vol = 0; let cardioMin = 0;
    if(!w.exercises) return;
    w.exercises.forEach(e => {
      const isCardio = (e.isCustom ? getCatType(e.customCategory) : (getEx(e.id)?.category === 'Cardio' ? 'cardio' : 'strength')) === 'cardio';
      e.sets.forEach(s => {
        if (!isCardio && s.weight && s.reps && s.type !== 'W') vol += (s.weight * s.reps);
        if (isCardio && s.time) {
          const parts = s.time.split(':');
          if (parts.length === 2) cardioMin += parseInt(parts[0]) + (parseInt(parts[1])/60);
        }
      });
    });
    
    if (vol >= volBeastDef.target && !hasAchievement('vol_10k')) { unlockAchievement(volBeastDef); dirty = true; }
    if (cardioMin >= ironLungDef.target && !hasAchievement('rest_master')) { unlockAchievement(ironLungDef); dirty = true; }
  });
  
  if (dirty) save();
}

function renderRanking() {
  const pts = db.workouts.length * 2 + db.achievements.length * 10;
  let currentRankIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (pts >= RANKS[i].pt) currentRankIdx = i;
  }
  const currentRank = RANKS[currentRankIdx];
  const nextRank    = RANKS[currentRankIdx + 1] || null;

  const titleEl = document.getElementById('userRankTitle');
  const subEl   = document.getElementById('userRankSub');
  if (!titleEl) return;

  titleEl.textContent = currentRank.title;
  if (nextRank) {
    const ptsNeeded = nextRank.pt - pts;
    subEl.textContent = `${currentRank.sub} Noch ${ptsNeeded} Pkt bis ${nextRank.title}.`;
    // Progress bar within current rank bracket
    const ptsInBracket  = pts - currentRank.pt;
    const bracketSize   = nextRank.pt - currentRank.pt;
    const pct           = Math.min(100, Math.round((ptsInBracket / bracketSize) * 100));
    const fill  = document.getElementById('rankProgressFill');
    const label = document.getElementById('rankProgressLabel');
    if (fill)  fill.style.width  = pct + '%';
    if (label) label.textContent = `${pts} / ${nextRank.pt} Pkt (${pct}%)`;
  } else {
    subEl.textContent = currentRank.sub;
    const fill  = document.getElementById('rankProgressFill');
    const label = document.getElementById('rankProgressLabel');
    if (fill)  fill.style.width  = '100%';
    if (label) label.textContent = `MAX RANG erreicht · ${pts} Pkt`;
  }

  // Populate Info Modal
  const infoList = document.getElementById('rankInfoList');
  if (infoList && infoList.innerHTML === '') {
    infoList.innerHTML = RANKS.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:10px;border-radius:8px;">
        <div style="font-weight:700;font-size:15px;color:var(--text);">${r.title}</div>
        <div style="font-size:12px;color:var(--accent);font-weight:600;">Ab ${r.pt} Pkt</div>
      </div>
    `).join('');
  }
}

function renderRankRoad() {
  const road = document.getElementById('rankRoad');
  if (!road) return;

  const pts = db.workouts.length * 2 + db.achievements.length * 10;
  let currentRankIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (pts >= RANKS[i].pt) currentRankIdx = i;
  }

  // Build road: [node][connector][node][connector]...
  let html = '<div style="display:flex;align-items:center;padding:4px 8px;gap:0;">';
  RANKS.forEach((r, i) => {
    const isReached = pts >= r.pt;
    const isCurrent = i === currentRankIdx;
    const emoji = r.title.split(' ')[0];
    const label = r.title.replace(/^\S+\s/, '');
    const nodeSize = isCurrent ? '52px' : '42px';
    const fontSize = isCurrent ? '20px' : '16px';
    const nodeBorder = isCurrent
      ? 'border:2px solid var(--accent);box-shadow:0 0 14px rgba(200,241,53,0.5);background:rgba(200,241,53,0.12);'
      : isReached
        ? 'border:2px solid var(--accent);background:rgba(200,241,53,0.06);'
        : 'border:2px solid var(--border);background:var(--bg);';
    const labelColor = isCurrent ? 'var(--accent)' : isReached ? 'var(--text)' : 'var(--muted)';
    const labelWeight = isCurrent ? '700' : '400';

    html += `
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
        <div style="width:${nodeSize};height:${nodeSize};border-radius:50%;${nodeBorder}display:flex;align-items:center;justify-content:center;transition:all 0.3s;" title="${r.title} · ${r.pt} Pkt">
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

function renderMilestones() {
  const container = document.getElementById('milestonesList');
  if (!container) return;
  
  let milestones = [];
  
  // Find top exercises (most logged)
  const exCounts = {};
  db.workouts.forEach(w => {
    if(!w.exercises) return;
    w.exercises.forEach(e => {
      if(!exCounts[e.exId]) exCounts[e.exId] = { id: e.exId, dates: [], maxW: [] };
      exCounts[e.exId].dates.push(w.startTime || w.date);
      let m = 0;
      e.sets.forEach(s => { if(s.type!=='W' && s.weight > m) m = s.weight; });
      exCounts[e.exId].maxW.push(m);
    });
  });
  
  const validExs = Object.values(exCounts).filter(x => x.dates.length >= 3);
  
  validExs.forEach(x => {
    const zipped = x.dates.map((d, i) => ({d: new Date(d).getTime(), w: x.maxW[i]})).sort((a,b) => a.d - b.d);
    
    // Compare first to last (oldest vs newest)
    const first = zipped[0];
    const last = zipped[zipped.length-1];
    if (last.w > first.w && first.w > 0) {
       const diffW = last.w - first.w;
       const diffTime = last.d - first.d;
       const diffWeeks = Math.max(1, Math.round(diffTime / (1000*60*60*24*7)));
       
       const ex = getEx(x.id);
       if (ex && ex.category !== 'Cardio' && ex.category !== 'Dehnen') {
         milestones.push({
           time: last.d,
           html: `<div class="card" style="padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:0;">
             <div style="font-size:24px;">📈</div>
             <div>
               <div style="font-weight:700;font-size:15px;">${ex.name}</div>
               <div style="font-size:13px;color:var(--text);">Du hast dich in ${diffWeeks} Wochen um <span style="color:var(--accent);font-weight:700;">+${diffW}kg</span> gesteigert!</div>
             </div>
           </div>`
         });
       }
    }
  });
  
  // Add total workouts milestone
  if (db.workouts.length >= 5) {
     milestones.push({
        time: Date.now(),
        html: `<div class="card" style="padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:0;">
          <div style="font-size:24px;">🔥</div>
          <div>
            <div style="font-weight:700;font-size:15px;">Konsistenz</div>
            <div style="font-size:13px;color:var(--text);">Schon ${db.workouts.length} Workouts absolviert. Bleib dran!</div>
          </div>
        </div>`
     });
  }
  
  if (milestones.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Sammle mehr Trainingsdaten für Meilensteine.</div>`;
    return;
  }
  
  container.innerHTML = milestones.sort((a,b) => b.time - a.time).slice(0,5).map(m => m.html).join('');
}
