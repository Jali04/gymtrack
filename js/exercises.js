/* =============================================
   GYMTRACK — Exercise Management
   ============================================= */

let editingExId = null;

function renderExercises(searchQuery = '', categoryFilter = 'all') {
  const list = document.getElementById('exercisesList');
  if (!list) return;
  
  const q = searchQuery.toLowerCase().trim();
  let filteredExercises = db.exercises;
  
  if (q) {
    filteredExercises = filteredExercises.filter(e => e.name.toLowerCase().includes(q));

    const getRelevanceScore = (name, query) => {
      const n = name.toLowerCase();
      const qy = query.toLowerCase();
      if (n === qy) return 100;
      if (n.startsWith(qy)) return 80;
      const words = n.split(/[\s_-]+/);
      if (words.some(w => w.startsWith(qy))) return 60;
      if (n.includes(qy)) return 40;
      return 0;
    };

    filteredExercises.sort((a, b) => {
      const scoreA = getRelevanceScore(a.name, q);
      const scoreB = getRelevanceScore(b.name, q);
      return scoreB - scoreA;
    });
  }
  if (categoryFilter !== 'all') {
    filteredExercises = filteredExercises.filter(e => e.category === categoryFilter);
  }
  
  if (filteredExercises.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--muted);font-size:14px;">${t('noSearchResults') || 'Keine Übungen gefunden.'}</div>`;
    return;
  }
  
  const categories = [...new Set(filteredExercises.map(e => e.category))];
  const CAT_ORDER = ['Brust', 'Rücken', 'Beine', 'Schultern', 'Arme', 'Core', 'Cardio', 'Dehnen'];
  categories.sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  
  list.innerHTML = categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type     = getCatType(cat);
    const catClass = getCatClass(type);
    const exs      = filteredExercises.filter(e => e.category === cat);
    return `<div style="margin-bottom:6px; margin-top: 10px;"><span class="cat-badge ${catClass}" style="font-size:11px;">${catLabel}</span></div>` +
      exs.map(e => `<div class="exercise-card" onclick="openEditExercise('${e.id}')">
        <div class="exercise-name">${e.name}</div>
        <div class="exercise-meta" style="margin-top:4px;">${getProgressSummary(e.id)}</div>
        ${e.notes ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);background:var(--surface2);border-radius:8px;padding:8px 10px;">📝 ${e.notes}</div>` : ''}
      </div>`).join('') + '<div class="divider" style="margin: 12px 0;"></div>';
  }).join('');
}

function getProgressSummary(exId) {
  const ex       = getEx(exId);
  const type     = ex ? getCatType(ex.category) : 'strength';
  const workouts = db.workouts.filter(w => w.exercises.some(e => e.exId === exId)).sort((a, b) => b.date - a.date);
  if (workouts.length === 0) return t('noTrainingYet');
  const last = workouts[0].exercises.find(e => e.exId === exId);
  if (type === 'cardio') {
    const maxKm = Math.max(...last.sets.map(s => s.km));
    return `${t('lastTime')}: ${maxKm}km max`;
  } else if (type === 'stretch') {
    const total = last.sets.reduce((a, s) => a + s.minutes, 0);
    return `${t('lastTime')}: ${total} ${t('colMin')}`;
  } else {
    const maxW = Math.max(...last.sets.map(s => s.weight));
    return `${t('lastTime')}: ${maxW}kg max`;
  }
}

function populateCategoryDropdown(selectedValue) {
  const select = document.getElementById('exCategory');
  if (!select) return;

  const standardCategories = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Dehnen'];
  
  if (selectedValue && selectedValue !== 'new_custom' && !standardCategories.includes(selectedValue)) {
    if (!db.customCategories) db.customCategories = {};
    if (!db.customCategories[selectedValue]) {
      db.customCategories[selectedValue] = 'strength';
    }
  }
  
  let html = '';
  // Predefined categories
  standardCategories.forEach(cat => {
    html += `<option value="${cat}">${t('cats')[cat] || cat}</option>`;
  });
  
  // Custom categories
  if (db.customCategories) {
    const sortedCustom = Object.keys(db.customCategories).sort();
    sortedCustom.forEach(cat => {
      if (!standardCategories.includes(cat)) {
        html += `<option value="${cat}">${cat}</option>`;
      }
    });
  }
  
  // Custom category trigger
  html += `<option value="new_custom">${t('cats')['new_custom'] || '+ Neue Kategorie...'}</option>`;
  
  select.innerHTML = html;
  select.value = selectedValue;
}

function onCategoryChange() {
  const select = document.getElementById('exCategory');
  const customGroup = document.getElementById('customCategoryGroup');
  const hintGroup = document.getElementById('categoryHint');
  if (!select) return;
  
  if (select.value === 'new_custom') {
    if (customGroup) customGroup.style.display = 'block';
    if (hintGroup) hintGroup.style.display = 'none';
    const customNameInput = document.getElementById('customCategoryName');
    if (customNameInput) {
      customNameInput.value = '';
      customNameInput.focus();
    }
    const customTypeSelect = document.getElementById('customCategoryType');
    if (customTypeSelect) customTypeSelect.value = 'strength';
  } else {
    if (customGroup) customGroup.style.display = 'none';
    if (hintGroup) hintGroup.style.display = 'block';
  }
  
  updateCategoryHint();
}

function openAddExercise() {
  editingExId = null;
  document.getElementById('addExerciseTitle').textContent = t('newExercise');
  document.getElementById('exName').value     = '';
  
  populateCategoryDropdown('Brust');
  
  document.getElementById('exNotes').value    = '';
  document.getElementById('deleteExBtn').style.display = 'none';
  
  const container = document.getElementById('exerciseAiAnalysisContainer');
  if (container) container.style.display = 'none';

  const customGroup = document.getElementById('customCategoryGroup');
  if (customGroup) customGroup.style.display = 'none';
  const hintGroup = document.getElementById('categoryHint');
  if (hintGroup) hintGroup.style.display = 'block';

  updateCategoryHint();
  openModal('addExerciseModal');
}

function openEditExercise(id) {
  const ex = getEx(id); if (!ex) return;
  editingExId = id;
  document.getElementById('addExerciseTitle').textContent = t('editExercise');
  document.getElementById('exName').value     = ex.name;
  
  populateCategoryDropdown(ex.category);
  
  document.getElementById('exNotes').value    = ex.notes || '';
  document.getElementById('deleteExBtn').style.display = 'block';
  
  const customGroup = document.getElementById('customCategoryGroup');
  if (customGroup) customGroup.style.display = 'none';
  const hintGroup = document.getElementById('categoryHint');
  if (hintGroup) hintGroup.style.display = 'block';

  updateCategoryHint();
  _updateExerciseAiAnalysis(id);
  openModal('addExerciseModal');
}

function saveExercise() {
  const name     = document.getElementById('exName').value.trim();
  let category   = document.getElementById('exCategory').value;
  const notes    = document.getElementById('exNotes').value.trim();
  if (!name) { alert(t('enterName')); return; }
  
  if (category === 'new_custom') {
    const customName = document.getElementById('customCategoryName').value.trim();
    const customType = document.getElementById('customCategoryType').value;
    if (!customName) {
      alert(lang === 'de' ? 'Bitte Namen für die neue Kategorie eingeben!' : 'Please enter a name for the new category!');
      return;
    }
    const standardCategories = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Dehnen'];
    if (standardCategories.includes(customName)) {
      category = customName;
    } else {
      if (!db.customCategories) db.customCategories = {};
      db.customCategories[customName] = customType;
      category = customName;
    }
  }
  
  let newId = null;
  if (editingExId) {
    const ex = getEx(editingExId);
    ex.name = name; ex.category = category; ex.notes = notes;
  } else {
    newId = uid();
    db.exercises.push({ id: newId, name, category, notes });
  }
  const context = window._openedFromPickerContext || (window._openedFromPicker ? 'workout' : null);
  window._openedFromPickerContext = null;
  window._openedFromPicker = false;

  save();
  closeModal('addExerciseModal');
  if (typeof renderGymLabCategoryChips === 'function') {
    renderGymLabCategoryChips();
  }
  renderExercises();
  showToast(t('save') + ' ✓');

  if (newId) {
    if (context === 'workout') {
      addExerciseToWorkout(newId);
    } else if (context === 'template') {
      if (typeof tmplExercises !== 'undefined' && !tmplExercises.includes(newId)) {
        tmplExercises.push(newId);
        renderTmplExerciseList();
      }
    }
  }
}

function openAddExerciseFromPicker() {
  window._openedFromPickerContext = 'workout';
  openAddExercise();
}

function openAddExerciseFromTmplPicker() {
  window._openedFromPickerContext = 'template';
  openAddExercise();
}

function deleteExercise() {
  if (!confirm(t('confirmDeleteExercise'))) return;
  db.exercises = db.exercises.filter(e => e.id !== editingExId);
  save();
  closeModal('addExerciseModal');
  if (typeof renderGymLabCategoryChips === 'function') {
    renderGymLabCategoryChips();
  }
  renderExercises();
}

function _updateExerciseAiAnalysis(exId) {
  const container = document.getElementById('exerciseAiAnalysisContainer');
  const textEl = document.getElementById('exerciseAiAnalysisText');
  if (!container || !textEl) return;

  const ex = getEx(exId);
  if (!ex) {
    container.style.display = 'none';
    return;
  }

  // Support responsive updates when dropdown changes value
  const catSelect = document.getElementById('exCategory');
  const activeCategory = catSelect ? catSelect.value : ex.category;
  const type = getCatType(activeCategory);
  const unit = type === 'cardio' ? ' km' : type === 'stretch' ? ' Min' : ' kg';

  // Filter workouts that contain this exercise, sorted oldest to newest
  const exerciseWorkouts = (db.workouts || [])
    .filter(w => w.exercises && w.exercises.some(e => e.exId === exId))
    .sort((a, b) => (a.date || a.startTime || 0) - (b.date || b.startTime || 0));

  if (exerciseWorkouts.length === 0) {
    textEl.innerHTML = `Du hast diese Übung noch nicht trainiert. Logge dein erstes Workout, um die KI-Analyse freizuschalten! 🏋️`;
    container.style.display = 'block';
    return;
  }

  if (exerciseWorkouts.length < 3) {
    const remaining = 3 - exerciseWorkouts.length;
    textEl.innerHTML = `Logge noch mindestens <strong>${remaining}</strong> weitere Einheit${remaining > 1 ? 'en' : ''}, damit der AI Coach deinen Fortschritt und Plateau-Trends analysieren kann. 📈`;
    container.style.display = 'block';
    return;
  }

  // Extract the max performance per session
  const metrics = exerciseWorkouts.map(w => {
    const se = w.exercises.find(e => e.exId === exId);
    if (!se || !se.sets || se.sets.length === 0) return 0;
    if (type === 'cardio') {
      return Math.max(...se.sets.map(s => Number(s.km) || 0));
    } else if (type === 'stretch') {
      return se.sets.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
    } else {
      return Math.max(...se.sets.map(s => Number(s.weight) || 0));
    }
  });

  const len = metrics.length;
  const m3 = metrics[len - 3];
  const m2 = metrics[len - 2];
  const m1 = metrics[len - 1]; // Latest session

  // Plateau Check (last 3 sessions flat or decreasing)
  if (m1 <= m2 && m2 <= m3) {
    if (type === 'strength') {
      textEl.innerHTML = `<strong>Plateau-Warnung</strong>: Deine Leistung stagniert bei <strong>${m1}${unit}</strong>. Der AI Coach empfiehlt: Erhöhe die Pause auf 3 Min, steigere die Wiederholungszahl bei leicht reduziertem Gewicht oder plane eine Deload-Woche, um neue Reize zu setzen. 🔄`;
    } else if (type === 'cardio') {
      textEl.innerHTML = `<strong>Plateau-Warnung</strong>: Deine Ausdauerleistung stagniert bei <strong>${m1}${unit}</strong>. Tipp: Baue Intervallläufe ein oder variiere das Tempo, um dein Herz-Kreislauf-System neu herauszufordern. 🏃‍♂️`;
    } else {
      textEl.innerHTML = `<strong>Plateau-Warnung</strong>: Deine Dehnungsdauer stagniert bei <strong>${m1}${unit}</strong>. Tipp: Konzentriere dich auf tiefere Atmung und halte die Positionen passiv für 10-15 Sek länger. 🧘`;
    }
  } else if (m1 > m3) {
    const initial = m3 || 1;
    const diff = m1 - m3;
    const pct = Math.round((diff / initial) * 100);
    
    if (type === 'strength') {
      textEl.innerHTML = `<strong>Progressive Overload!</strong> Du hast dich um <strong>+${pct}%</strong> gesteigert (von ${m3}${unit} auf ${m1}${unit}). Empfehlung: Versuche in der nächsten Einheit ein kleines Gewicht-Upgrade (+1.25kg bis 2.5kg) oder 1-2 Wiederholungen mehr! 🚀`;
    } else if (type === 'cardio') {
      textEl.innerHTML = `<strong>Ausdauer gesteigert!</strong> Du hast dich um <strong>+${pct}%</strong> gesteigert (von ${m3}${unit} auf ${m1}${unit}). Tolle Pace! Versuche beim nächsten Mal die Distanz leicht zu erhöhen oder die Zeit zu unterbieten. 🏃‍♂️`;
    } else {
      textEl.innerHTML = `<strong>Flexibilität verbessert!</strong> Du hast dich um <strong>+${pct}%</strong> gesteigert (von ${m3}${unit} auf ${m1}${unit}). Sehr gut! Behalte diese Routine bei, um deine Gelenkgesundheit weiter zu fördern. 🧘`;
    }
  } else {
    // Normal stability/fluctuations
    if (type === 'strength') {
      textEl.innerHTML = `<strong>Konstanz zahlt sich aus</strong>: Du hältst deine Leistung stabil bei <strong>${m1}${unit}</strong>. Tipp: Konzentriere dich auf eine saubere Ausführung und versuche im letzten Satz ans Muskelversagen zu gehen, um Muskelwachstum anzuregen! 💪`;
    } else if (type === 'cardio') {
      textEl.innerHTML = `<strong>Ausdauer stabil</strong>: Du bist solide <strong>${m1}${unit}</strong> gelaufen. Versuche beim nächsten Training, die ersten 10 Minuten etwas ruhiger anzugehen, um am Ende mehr Energie für einen Schlusssprint zu haben! 🏃‍♂️`;
    } else {
      textEl.innerHTML = `<strong>Flexibilität stabil</strong>: Du hast <strong>${m1}${unit}</strong> gedehnt. Versuche, die Übung nach einem warmen Bad oder am Ende eines Krafttrainings durchzuführen, wenn die Muskeln maximal durchblutet sind. 🧘`;
    }
  }

  container.style.display = 'block';
}
