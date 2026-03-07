/* =============================================
   GYMTRACK — Exercise Management
   ============================================= */

let editingExId = null;

function renderExercises() {
  const list       = document.getElementById('exercisesList');
  const categories = [...new Set(db.exercises.map(e => e.category))];
  list.innerHTML   = categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type     = getCatType(cat);
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    const exs      = db.exercises.filter(e => e.category === cat);
    return `<div style="margin-bottom:4px;"><span class="cat-badge ${catClass}" style="font-size:11px;">${catLabel}</span></div>` +
      exs.map(e => `<div class="exercise-card" onclick="openEditExercise('${e.id}')">
        <div class="exercise-name">${e.name}</div>
        <div class="exercise-meta" style="margin-top:4px;">${getProgressSummary(e.id)}</div>
        ${e.notes ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);background:var(--surface2);border-radius:8px;padding:8px 10px;">📝 ${e.notes}</div>` : ''}
      </div>`).join('') + '<div class="divider"></div>';
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
  if (editingExId) {
    const ex = getEx(editingExId);
    ex.name = name; ex.category = category; ex.notes = notes;
  } else {
    db.exercises.push({ id: uid(), name, category, notes });
  }
  save();
  closeModal('addExerciseModal');
  renderExercises();
  showToast(t('save') + ' ✓');
}

function deleteExercise() {
  if (!confirm(t('confirmDeleteExercise'))) return;
  db.exercises = db.exercises.filter(e => e.id !== editingExId);
  save();
  closeModal('addExerciseModal');
  renderExercises();
}
