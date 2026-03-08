/* =============================================
   GYMTRACK — Templates
   ============================================= */

let editingTemplateId = null;
let tmplExercises     = [];
let tmplPickerPending = [];

function renderTemplates() {
  const list = document.getElementById('templatesList');
  if (!db.templates || db.templates.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">${t('noTemplatesYet')}</div></div>`;
    return;
  }
  list.innerHTML = db.templates.map(tmpl => {
    const exNames = tmpl.exerciseIds.map(id => getExName(id)).join(', ');
    const typeColors = { 'training': 'var(--accent)', 'rest': '#f5a623', 'couch': '#d0021b' };
    const typeObj = tmpl.type || 'training';
    const typeLabel = typeObj === 'training' ? 'TRAINING' : typeObj === 'rest' ? 'ACTIVE REST' : 'COUCH POTATO';
    const typeBadge = `<span style="background:${typeColors[typeObj]};color:#000;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:8px;">${typeLabel}</span>`;
    
    return `<div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">
        <div style="font-weight:700;font-size:17px;display:flex;align-items:center;flex-wrap:wrap;word-break:break-word;">${tmpl.name}${typeBadge}</div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="close-btn" onclick="openTemplateShare('${tmpl.id}')" style="width:auto;padding:4px 10px;border-radius:8px;font-size:11px;font-family:'DM Sans',sans-serif;font-weight:600;" title="${t('shareTmpl')}">🔗</button>
          <button class="close-btn" onclick="openEditTemplate('${tmpl.id}')" style="width:auto;padding:4px 10px;border-radius:8px;font-size:11px;font-family:'DM Sans',sans-serif;font-weight:600;">${t('editTmpl')}</button>
        </div>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">${tmpl.exerciseIds.length} ${t('tmplExercises')} · ${exNames}</div>
      <button class="btn btn-primary" style="padding:10px;position:relative;overflow:hidden;" onclick="startWorkoutFromTemplate('${tmpl.id}')">${t('startWorkout')}</button>
    </div>`;
  }).join('');
  initRipples();
}

function openCreateTemplate() {
  editingTemplateId = null; tmplExercises = [];
  document.getElementById('tmplName').value = '';
  const selType = document.getElementById('tmplType');
  if(selType) selType.value = 'training';
  document.getElementById('templateModalTitle').textContent = t('tmplNewTitle');
  document.getElementById('deleteTmplBtn').style.display = 'none';
  renderTmplExerciseList();
  openModal('templateModal');
}

function openEditTemplate(id) {
  const tmpl = db.templates.find(t => t.id === id); if (!tmpl) return;
  editingTemplateId = id; tmplExercises = [...tmpl.exerciseIds];
  document.getElementById('tmplName').value = tmpl.name;
  const selType = document.getElementById('tmplType');
  if(selType) selType.value = tmpl.type || 'training';
  document.getElementById('templateModalTitle').textContent = t('tmplEditTitle');
  document.getElementById('deleteTmplBtn').style.display = 'block';
  renderTmplExerciseList();
  openModal('templateModal');
}

function renderTmplExerciseList() {
  const container = document.getElementById('tmplExerciseList');
  if (tmplExercises.length === 0) {
    container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:8px 0;">${t('noExercisesYet')}</div>`;
    return;
  }
  container.innerHTML = tmplExercises.map((exId, i) => {
    const ex       = getEx(exId);
    const type     = ex ? getCatType(ex.category) : 'strength';
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    const catLabel = ex ? (t('cats')[ex.category] || ex.category) : '';
    const isFirst  = i === 0, isLast = i === tmplExercises.length - 1;
    return `<div class="tmpl-ex-row">
      <span class="ex-order-num">${i + 1}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:500;">${getExName(exId)}</div>
        <span class="cat-badge ${catClass}" style="font-size:10px;">${catLabel}</span>
      </div>
      <div style="display:flex;gap:4px;align-items:center;">
        <button class="reorder-btn" onclick="moveTmplEx(${i}, -1)" ${isFirst ? 'disabled' : ''}>↑</button>
        <button class="reorder-btn" onclick="moveTmplEx(${i},  1)" ${isLast  ? 'disabled' : ''}>↓</button>
        <button class="close-btn" style="margin-left:2px;" onclick="removeTmplExercise(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
}

function moveTmplEx(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= tmplExercises.length) return;
  [tmplExercises[idx], tmplExercises[newIdx]] = [tmplExercises[newIdx], tmplExercises[idx]];
  renderTmplExerciseList();
  haptic('light');
}

function removeTmplExercise(idx) {
  tmplExercises.splice(idx, 1);
  renderTmplExerciseList();
  haptic('light');
}

function openTmplExPicker() {
  tmplPickerPending = [];
  const list       = document.getElementById('tmplExPickerList');
  const categories = [...new Set(db.exercises.map(e => e.category))];
  list.innerHTML   = categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type     = getCatType(cat);
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    const exs      = db.exercises.filter(e => e.category === cat);
    return `<div style="margin-bottom:8px;"><span class="cat-badge ${catClass}" style="font-size:11px;">${catLabel}</span></div>` +
      exs.map(e => {
        const alreadyIn = tmplExercises.includes(e.id);
        return `<div class="picker-item${alreadyIn ? ' selected' : ''}" id="pickerItem_${e.id}" onclick="toggleTmplPickerItem('${e.id}', ${alreadyIn})">
          <div class="exercise-list-name" style="flex:1;">${e.name}</div>
          <div class="picker-check" id="pickerCheck_${e.id}">${alreadyIn ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
        </div>`;
      }).join('');
  }).join('<div class="divider"></div>');
  updateTmplPickerCount();
  openModal('tmplExPickerModal');
}

function toggleTmplPickerItem(exId, alreadyIn) {
  if (alreadyIn) return;
  const idx   = tmplPickerPending.indexOf(exId);
  const item  = document.getElementById('pickerItem_'  + exId);
  const check = document.getElementById('pickerCheck_' + exId);
  if (idx === -1) {
    tmplPickerPending.push(exId);
    item.classList.add('selected');
    check.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
  } else {
    tmplPickerPending.splice(idx, 1);
    item.classList.remove('selected');
    check.innerHTML = '';
  }
  updateTmplPickerCount();
  haptic('light');
}

function updateTmplPickerCount() {
  const el  = document.getElementById('tmplPickerSelectedCount');
  const btn = document.getElementById('btnConfirmTmplEx');
  const n   = tmplPickerPending.length;
  if (n === 0) {
    el.textContent         = '';
    btn.textContent        = t('addExToTmpl');
    btn.style.opacity      = '0.5';
    btn.style.pointerEvents = 'none';
  } else {
    el.textContent         = `${n} ${t('selectedCount')}`;
    btn.textContent        = `${t('addExToTmpl')} (${n})`;
    btn.style.opacity      = '1';
    btn.style.pointerEvents = 'auto';
  }
}

function confirmTmplExSelection() {
  tmplPickerPending.forEach(exId => { if (!tmplExercises.includes(exId)) tmplExercises.push(exId); });
  tmplPickerPending = [];
  closeModal('tmplExPickerModal');
  openModal('templateModal');
  renderTmplExerciseList();
}

function closeTmplExPicker() {
  tmplPickerPending = [];
  closeModal('tmplExPickerModal');
  openModal('templateModal');
}

function saveTemplate() {
  const name = document.getElementById('tmplName').value.trim();
  const typeEl = document.getElementById('tmplType');
  const type = typeEl ? typeEl.value : 'training';
  
  if (!name) { alert(t('enterName')); return; }
  
  // If it's a rest day, we don't necessarily NEED exercise IDs.
  if (type === 'training' && tmplExercises.length === 0) { alert(t('minOneExercise')); return; }
  
  if (editingTemplateId) {
    const tmpl = db.templates.find(x => x.id === editingTemplateId);
    tmpl.name = name; tmpl.type = type; tmpl.exerciseIds = [...tmplExercises];
  } else {
    db.templates.push({ id: uid(), name, type, exerciseIds: [...tmplExercises] });
  }
  save();
  closeModal('templateModal');
  renderTemplates();
  showToast(t('save') + ' ✓');
}

function deleteTemplate() {
  if (!confirm(t('confirmDeleteTmpl'))) return;
  db.templates = db.templates.filter(x => x.id !== editingTemplateId);
  save();
  closeModal('templateModal');
  renderTemplates();
}

function startWorkoutFromTemplate(tmplId) {
  const tmpl = db.templates.find(x => x.id === tmplId); if (!tmpl) return;
  db.currentWorkout = {
    id: uid(), date: Date.now(), startTime: Date.now(),
    templateId: tmplId,
    exercises: tmpl.exerciseIds.map(exId => ({ exId, sets: [] }))
  };
  save();
  haptic('medium');
  showPage('log', document.querySelector('.nav-btn[data-page="log"]'));
}
