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
}
