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
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
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

function openAddExercise() {
  editingExId = null;
  document.getElementById('addExerciseTitle').textContent = t('newExercise');
  document.getElementById('exName').value     = '';
  document.getElementById('exCategory').value = 'Brust';
  document.getElementById('exNotes').value    = '';
  document.getElementById('deleteExBtn').style.display = 'none';
  updateCategoryHint();
  openModal('addExerciseModal');
}

function openEditExercise(id) {
  const ex = getEx(id); if (!ex) return;
  editingExId = id;
  document.getElementById('addExerciseTitle').textContent = t('editExercise');
  document.getElementById('exName').value     = ex.name;
  document.getElementById('exCategory').value = ex.category;
  document.getElementById('exNotes').value    = ex.notes || '';
  document.getElementById('deleteExBtn').style.display = 'block';
  updateCategoryHint();
  openModal('addExerciseModal');
}

function saveExercise() {
  const name     = document.getElementById('exName').value.trim();
  const category = document.getElementById('exCategory').value;
  const notes    = document.getElementById('exNotes').value.trim();
  if (!name) { alert(t('enterName')); return; }
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
  renderExercises();
}
