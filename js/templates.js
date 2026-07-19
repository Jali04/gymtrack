/* =============================================
   GYMTRACK — Templates
   ============================================= */

let editingTemplateId = null;
let tmplExercises     = [];
let tmplPickerPending = [];

function renderTemplates(searchQuery = '') {
  const list = document.getElementById('templatesList');
  if (!list) return;
  
  const q = searchQuery.toLowerCase().trim();
  let filteredTemplates = db.templates || [];
  
  if (q) {
    filteredTemplates = filteredTemplates.filter(tmpl => 
      tmpl.name.toLowerCase().includes(q) ||
      tmpl.exerciseIds.some(exId => getExName(exId).toLowerCase().includes(q))
    );

    // Sort by relevance
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

    filteredTemplates.sort((a, b) => {
      const scoreA = getRelevanceScore(a.name, q);
      const scoreB = getRelevanceScore(b.name, q);
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Secondary: exercise match relevance
      const aHasExStart = a.exerciseIds.some(exId => getExName(exId).toLowerCase().startsWith(q));
      const bHasExStart = b.exerciseIds.some(exId => getExName(exId).toLowerCase().startsWith(q));
      if (aHasExStart !== bHasExStart) return bHasExStart ? 1 : -1;
      
      return 0;
    });
  }
  
  if (filteredTemplates.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">${t('noTemplatesYet') || 'Keine Vorlagen gefunden.'}</div></div>`;
    return;
  }
  list.innerHTML = filteredTemplates.map(tmpl => {
    const exNames = tmpl.exerciseIds.map(id => getExName(id)).join(', ');
    const typeColors = { 'training': 'var(--accent)', 'rest': '#f5a623', 'couch': '#d0021b' };
    const typeObj = tmpl.type || 'training';
    const typeLabel = typeObj === 'training' ? 'TRAINING' : typeObj === 'rest' ? 'ACTIVE REST' : 'COUCH POTATO';
    const typeBadge = `<span style="background:${typeColors[typeObj]};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;display:inline-block;">${typeLabel}</span>`;
    
    return `<div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">
        <div style="font-weight:700;font-size:17px;display:flex;flex-direction:column;gap:4px;word-break:break-word;">
          ${tmpl.name}
          <div>${typeBadge}</div>
        </div>
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
  const tmpl = db.templates.find(t => String(t.id) === String(id)); if (!tmpl) return;
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
    const catClass = getCatClass(type);
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
  _renderTmplExPickerList('');
  // Inject search bar
  const list = document.getElementById('tmplExPickerList');
  const searchBarId = 'tmplExPickerSearchBar';
  let bar = document.getElementById(searchBarId);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = searchBarId;
    list.parentElement.insertBefore(bar, list);
  }
  bar.innerHTML = `<input class="form-input picker-search" id="tmplExPickerSearch" type="text" placeholder="${t('searchExercise')}" oninput="_filterTmplExPicker()" autocomplete="off">`;
  updateTmplPickerCount();
  openModal('tmplExPickerModal');
  setTimeout(() => { const s = document.getElementById('tmplExPickerSearch'); if (s) s.focus(); }, 320);
}

function _filterTmplExPicker() {
  const input = document.getElementById('tmplExPickerSearch');
  _renderTmplExPickerList(input ? input.value : '');
  updateTmplPickerCount();
}

function _renderTmplExPickerList(query) {
  const list = document.getElementById('tmplExPickerList');
  const q = (query || '').toLowerCase().trim();
  const categories = [...new Set(db.exercises.map(e => e.category))];
  list.innerHTML = categories.map(cat => {
    const catLabel = t('cats')[cat] || cat;
    const type     = getCatType(cat);
    const catClass = getCatClass(type);
    let exs = db.exercises.filter(e => e.category === cat);
    if (q) {
      exs = exs.filter(e => e.name.toLowerCase().includes(q));
      
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

      exs.sort((a, b) => {
        const scoreA = getRelevanceScore(a.name, q);
        const scoreB = getRelevanceScore(b.name, q);
        return scoreB - scoreA;
      });
    }
    if (exs.length === 0) return '';
    return `<div style="margin-bottom:8px;"><span class="cat-badge ${catClass}" style="font-size:11px;">${catLabel}</span></div>` +
      exs.map(e => {
        const alreadyIn = tmplExercises.includes(e.id);
        const isPending = tmplPickerPending.includes(e.id);
        const isSelected = alreadyIn || isPending;
        return `<div class="picker-item${isSelected ? ' selected' : ''}" id="pickerItem_${e.id}" onclick="toggleTmplPickerItem('${e.id}', ${alreadyIn})">
          <div class="exercise-list-name" style="flex:1;">${e.name}</div>
          <div class="picker-check" id="pickerCheck_${e.id}">${isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
        </div>`;
      }).join('');
  }).filter(Boolean).join('<div class="divider"></div>');
  if (q && !list.innerHTML.trim()) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">${t('noSearchResults')}</div>`;
  }
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
  
  if (!name) { showAlert(t('enterName')); return; }

  // If it's a rest day, we don't necessarily NEED exercise IDs.
  if (type === 'training' && tmplExercises.length === 0) { showAlert(t('minOneExercise')); return; }
  
  if (editingTemplateId) {
    const tmpl = db.templates.find(x => String(x.id) === String(editingTemplateId));
    tmpl.name = name; tmpl.type = type; tmpl.exerciseIds = [...tmplExercises];
  } else {
    db.templates.push({ id: uid(), name, type, exerciseIds: [...tmplExercises] });
  }
  save();
  closeModal('templateModal');
  renderTemplates();
  showToast(t('save') + ' ✓');
}

async function deleteTemplate() {
  if (!await showConfirm(t('confirmDeleteTmpl'))) return;
  db.templates = db.templates.filter(x => String(x.id) !== String(editingTemplateId));
  save();
  closeModal('templateModal');
  renderTemplates();
}

function startWorkoutFromTemplate(tmplId) {
  const tmpl = db.templates.find(x => String(x.id) === String(tmplId)); if (!tmpl) return;
  db.currentWorkout = {
    id: uid(), date: Date.now(), startTime: Date.now(),
    templateId: tmplId,
    templateName: tmpl.name, // keep the name so history survives template edits/deletes/sync loss
    exercises: tmpl.exerciseIds.map(exId => ({ exId, sets: [] }))
  };
  save();
  haptic('medium');
  showPage('log', document.querySelector('.nav-btn[data-page="log"]'));
}
