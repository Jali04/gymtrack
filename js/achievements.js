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
    const borderStyle = isUnlocked ? 'border-color:var(--accent);' : '';
    
    container.innerHTML += `
      <div style="background:var(--surface2);border:1px solid var(--border);${borderStyle}border-radius:12px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center;${lockedStyle}">
        <div style="font-size:36px;margin-bottom:8px;">${def.icon}</div>
        <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:4px;">${def.title}</div>
        <div style="font-size:11px;color:var(--muted);">${def.desc}</div>
      </div>
    `;
  });
  
  renderRanking();
  renderMilestones();
}

const RANKS = [
  { pt: 0, title: 'Beginner', sub: 'Der erste Schritt ist getan.' },
  { pt: 10, title: 'Rookie', sub: 'Du kommst in Schwung!' },
  { pt: 30, title: 'Eisenfresser', sub: 'Das Gym ist dein zweites Zuhause.' },
  { pt: 60, title: 'Gym-Rat', sub: 'Pures Dedication.' },
  { pt: 120, title: 'Maschine', sub: 'Kein Gewicht ist dir zu schwer.' },
  { pt: 250, title: 'Titan', sub: 'Legendärer Status erreicht.' }
];

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
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];
  for(let i=0; i<RANKS.length; i++) {
    if (pts >= RANKS[i].pt) {
      currentRank = RANKS[i];
      nextRank = RANKS[i+1];
    }
  }
  
  const titleEl = document.getElementById('userRankTitle');
  const subEl = document.getElementById('userRankSub');
  if (!titleEl) return;
  
  titleEl.textContent = currentRank.title;
  if (nextRank) {
    const ptsNeeded = nextRank.pt - pts;
    subEl.textContent = `${currentRank.sub} Noch ${ptsNeeded} Pkt bis ${nextRank.title}.`;
  } else {
    subEl.textContent = currentRank.sub;
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
    const zipped = x.dates.map((d, i) => ({d, w: x.maxW[i]})).sort((a,b) => a.d - b.d);
    
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
