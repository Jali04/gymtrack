/* =============================================
   GYMTRACK — Category Management

   Categories are more than a label: their type decides which fields a set has
   (kg × reps, km, minutes, hold seconds, plain duration). They can be renamed,
   merged, re-typed and deleted here — and every one of those edits asks what
   should happen to the sets that were already logged before it.
   ============================================= */

function _L(de, en) { return (typeof lang !== 'undefined' && lang === 'en') ? en : de; }

const CAT_TYPE_LABELS = {
  strength:  { de: '🏋️ Kraft (Gewicht & Wiederholungen)', en: '🏋️ Strength (weight & reps)' },
  cardio:    { de: '🏃 Ausdauer / Cardio (Kilometer & Zeit)', en: '🏃 Cardio (distance & time)' },
  stretch:   { de: '🧘 Dehnen (Minuten)', en: '🧘 Stretching (minutes)' },
  isometric: { de: '🧱 Isometrie (Last & Haltezeit)', en: '🧱 Isometric (load & hold time)' },
  time:      { de: '⏱ Zeit (nur Dauer stoppen)', en: '⏱ Time (duration only)' }
};
const CAT_TYPE_SHORT = {
  strength:  { de: 'Kraft', en: 'Strength' },
  cardio:    { de: 'Cardio', en: 'Cardio' },
  stretch:   { de: 'Dehnen', en: 'Stretching' },
  isometric: { de: 'Isometrie', en: 'Isometric' },
  time:      { de: 'Zeit', en: 'Time' }
};
function catTypeLabel(type)  { const e = CAT_TYPE_LABELS[type] || CAT_TYPE_LABELS.strength; return _L(e.de, e.en); }
function catTypeShort(type)  { const e = CAT_TYPE_SHORT[type]  || CAT_TYPE_SHORT.strength;  return _L(e.de, e.en); }
function catLabel(cat) {
  const cats = typeof t === 'function' ? t('cats') : null;
  return (cats && typeof cats === 'object' && cats[cat]) ? cats[cat] : cat;
}

function catTypeOptionsHtml(selected) {
  return Object.keys(CAT_TYPE_LABELS)
    .map(k => `<option value="${k}"${k === selected ? ' selected' : ''}>${catTypeLabel(k)}</option>`)
    .join('');
}

/* =============================================
   The tracking question

   Asked whenever a change would re-interpret sets that already exist. The
   answer decides what happens to them — never the change itself.
   ============================================= */
async function askTrackingDecision(count, oldType, newType, opts = {}) {
  const one = count === 1;
  const options = [{
    key: 'keep',
    label: _L('Tracking behalten', 'Keep tracking'),
    desc: _L(
      `${one ? 'Der bisherige Eintrag bleibt' : `Die ${count} bisherigen Einträge bleiben`} in „${catTypeShort(oldType)}“ gespeichert und ${one ? 'wird' : 'werden'} weiter so angezeigt. Ab jetzt wird in „${catTypeShort(newType)}“ aufgezeichnet.`,
      `${one ? 'The existing entry stays' : `The ${count} existing entries stay`} stored as "${catTypeShort(oldType)}" and keep${one ? 's' : ''} being shown that way. New sessions are logged as "${catTypeShort(newType)}".`)
  }];

  if (canConvertType(oldType, newType)) {
    options.push({
      key: 'convert',
      label: _L('Verlauf umrechnen', 'Convert history'),
      desc: _L(
        `Bisherige Einträge werden in „${catTypeShort(newType)}“ umgerechnet — ein durchgehender Verlauf, eine Kurve. Werte ohne Entsprechung (z.B. kg × Wdh) behalten ihre alte Einheit.`,
        `Existing entries are converted to "${catTypeShort(newType)}" — one continuous history and chart. Values with no counterpart (e.g. kg × reps) keep their old unit.`)
    });
  }

  if (opts.allowNew) {
    options.push({
      key: 'new',
      label: _L('Neu anfangen', 'Start fresh'),
      desc: _L(
        'Die Übung wird neu angelegt und startet bei null. Die alte bleibt mit ihrem kompletten Verlauf erhalten und wird archiviert.',
        'The exercise is created anew and starts from zero. The old one keeps its full history and is archived.')
    });
  }

  return showChoice(
    _L(`${one ? 'Ein aufgezeichneter Eintrag hängt' : `${count} aufgezeichnete Einträge hängen`} daran — bisher als „${catTypeShort(oldType)}“, künftig „${catTypeShort(newType)}“.\nWas soll mit dem Tracking passieren?`,
       `${one ? 'One logged entry belongs' : `${count} logged entries belong`} to this — recorded as "${catTypeShort(oldType)}", from now on "${catTypeShort(newType)}".\nWhat should happen to the tracking?`),
    options,
    { title: opts.title || _L('Typ ändern', 'Change type') }
  );
}

// Applies a 'keep' / 'convert' answer to the entries `match` selects.
function applyTrackingDecision(decision, match, oldType, newType) {
  if (decision === 'keep')    return stampEntryType(match, oldType);
  if (decision === 'convert') return convertEntrySets(match, newType);
  return 0;
}

function _refreshAfterCategoryChange() {
  if (typeof renderGymLabCategoryChips === 'function') renderGymLabCategoryChips();
  if (typeof renderExercises === 'function') renderExercises();
  if (typeof renderProgress === 'function') { try { renderProgress(); } catch (e) {} }
  if (typeof renderLog === 'function') { try { renderLog(); } catch (e) {} }
}

/* =============================================
   Manager list
   ============================================= */
function openCategoryManager() {
  renderCategoryManager();
  openModal('categoryManagerModal');
}

function renderCategoryManager() {
  const host = document.getElementById('categoryManagerList');
  if (!host) return;

  const ttl = document.getElementById('categoryManagerTitle');
  if (ttl) ttl.textContent = _L('Kategorien', 'Categories');
  const desc = document.getElementById('categoryManagerDesc');
  if (desc) desc.textContent = _L(
    'Kategorie antippen, um Name oder Typ zu ändern. Der Typ bestimmt, welche Felder du beim Eintragen bekommst.',
    'Tap a category to change its name or type. The type decides which fields you get when logging sets.');
  const addBtn = document.getElementById('btnAddCategory');
  if (addBtn) addBtn.textContent = _L('+ Neue Kategorie', '+ New category');

  host.innerHTML = getAllCategories().map(cat => {
    const type    = getCatType(cat);
    const exCount = (db.exercises || []).filter(e => e.category === cat).length;
    const entries = countLoggedEntries(matchCategoryEntry(cat));
    const std     = isStdCategory(cat);
    const meta    = _L(
      `${exCount} ${exCount === 1 ? 'Übung' : 'Übungen'} · ${entries} ${entries === 1 ? 'Eintrag' : 'Einträge'}`,
      `${exCount} ${exCount === 1 ? 'exercise' : 'exercises'} · ${entries} ${entries === 1 ? 'entry' : 'entries'}`);
    return `<div class="cat-manage-row" onclick="openCategoryEditor('${encodeURIComponent(cat)}')">
      <div class="cat-manage-main">
        <div class="cat-manage-name">
          ${catLabel(cat)}
          <span class="cat-badge ${getCatClass(type)}" style="font-size:10px;">${catTypeShort(type)}</span>
          ${std ? '' : `<span style="font-size:10px;color:var(--muted);">${_L('eigene', 'custom')}</span>`}
        </div>
        <div class="cat-manage-meta">${meta}</div>
      </div>
      <div class="cat-manage-chevron">›</div>
    </div>`;
  }).join('');
}

/* =============================================
   Editor
   ============================================= */
let editingCategory = null; // null = creating a new one

function openCategoryEditor(encodedCat) {
  const cat = encodedCat ? decodeURIComponent(encodedCat) : null;
  editingCategory = cat;

  const isNew = !cat;
  const std   = !isNew && isStdCategory(cat);

  document.getElementById('categoryEditTitle').textContent =
    isNew ? _L('Neue Kategorie', 'New category') : _L('Kategorie bearbeiten', 'Edit category');
  document.getElementById('lblCatEditName').textContent = _L('Name', 'Name');
  document.getElementById('lblCatEditType').textContent = _L('Typ (für Trainings-Eingaben)', 'Type (drives the set fields)');

  const nameInput = document.getElementById('catEditName');
  nameInput.value = isNew ? '' : cat;
  nameInput.readOnly = std;
  nameInput.style.opacity = std ? '0.6' : '';
  nameInput.placeholder = _L('z.B. Bizeps oder CrossFit', 'e.g. Biceps or CrossFit');

  const nameHint = document.getElementById('catEditNameHint');
  nameHint.style.display = std ? 'block' : 'none';
  nameHint.textContent = _L(
    'Standard-Kategorien behalten ihren Namen (sie werden übersetzt) — der Typ lässt sich trotzdem frei ändern.',
    'Standard categories keep their name (it is translated) — their type can still be changed freely.');

  const typeSel = document.getElementById('catEditType');
  typeSel.innerHTML = catTypeOptionsHtml(isNew ? 'strength' : getCatType(cat));

  const usage = document.getElementById('catEditUsage');
  if (isNew) {
    usage.style.display = 'none';
  } else {
    const exCount = (db.exercises || []).filter(e => e.category === cat).length;
    const entries = countLoggedEntries(matchCategoryEntry(cat));
    usage.style.display = 'block';
    usage.textContent = _L(
      `${exCount} ${exCount === 1 ? 'Übung' : 'Übungen'} in dieser Kategorie, ${entries} ${entries === 1 ? 'aufgezeichneter Eintrag' : 'aufgezeichnete Einträge'}.`,
      `${exCount} ${exCount === 1 ? 'exercise' : 'exercises'} in this category, ${entries} logged ${entries === 1 ? 'entry' : 'entries'}.`);
  }

  const delBtn = document.getElementById('btnDeleteCategory');
  delBtn.style.display = (isNew || std) ? 'none' : 'block';
  delBtn.textContent = _L('Kategorie löschen', 'Delete category');
  document.getElementById('btnSaveCategory').textContent = t('save');
  document.getElementById('btnCancelCategory').textContent = t('cancel');

  _renderCategoryDeleteGroup(false);
  openModal('categoryEditModal');
}

// Deleting never deletes exercises — it asks where they should go instead.
function _renderCategoryDeleteGroup(show) {
  const group = document.getElementById('catDeleteGroup');
  if (!group) return;
  group.style.display = show ? 'block' : 'none';
  if (!show) return;

  const targets = getAllCategories().filter(c => c !== editingCategory);
  const exCount = (db.exercises || []).filter(e => e.category === editingCategory).length;
  document.getElementById('catDeleteHint').textContent = exCount
    ? _L(`${exCount} Übungen liegen in dieser Kategorie. Wohin sollen sie verschoben werden?`,
         `${exCount} exercises live in this category. Where should they move?`)
    : _L('Diese Kategorie ist leer und kann direkt entfernt werden.',
         'This category is empty and can be removed right away.');

  const sel = document.getElementById('catDeleteTarget');
  sel.style.display = exCount ? 'block' : 'none';
  sel.innerHTML = targets.map(c =>
    `<option value="${c}">${catLabel(c)} · ${catTypeShort(getCatType(c))}</option>`).join('');
  document.getElementById('btnConfirmDeleteCategory').textContent = _L('Verschieben & löschen', 'Move & delete');
}

function startDeleteCategory() { _renderCategoryDeleteGroup(true); }

async function confirmDeleteCategory() {
  const cat = editingCategory;
  if (!cat || isStdCategory(cat)) return;

  const exCount = (db.exercises || []).filter(e => e.category === cat).length;
  const target  = exCount ? document.getElementById('catDeleteTarget').value : null;
  if (exCount && !target) return;

  if (exCount) {
    const oldType = getCatType(cat);
    const newType = getCatType(target);
    if (oldType !== newType) {
      const affected = countLoggedEntries(matchCategoryEntry(cat));
      if (affected > 0) {
        const decision = await askTrackingDecision(affected, oldType, newType, {
          title: _L('Kategorie löschen', 'Delete category')
        });
        if (!decision) return;
        applyTrackingDecision(decision, matchCategoryEntry(cat), oldType, newType);
      }
    }
  }

  const moved = deleteCategory(cat, target);
  save();
  closeModal('categoryEditModal');
  renderCategoryManager();
  _refreshAfterCategoryChange();
  showToast(moved
    ? _L(`Kategorie gelöscht · ${moved} Übungen verschoben`, `Category deleted · ${moved} exercises moved`)
    : _L('Kategorie gelöscht', 'Category deleted'));
}

async function saveCategoryEdit() {
  const nameInput = document.getElementById('catEditName');
  const newName   = nameInput.value.trim();
  const newType   = document.getElementById('catEditType').value;
  const cat       = editingCategory;
  const isNew     = !cat;

  if (!newName) { showAlert(_L('Bitte einen Namen eingeben!', 'Please enter a name!')); return; }

  if (isNew) {
    if (getAllCategories().includes(newName)) {
      showAlert(_L('Diese Kategorie gibt es schon.', 'That category already exists.'));
      return;
    }
    setCategoryType(newName, newType);
    save();
    closeModal('categoryEditModal');
    renderCategoryManager();
    _refreshAfterCategoryChange();
    showToast(_L('Kategorie angelegt ✓', 'Category created ✓'));
    return;
  }

  const renamed = !isStdCategory(cat) && newName !== cat;
  const merging = renamed && getAllCategories().includes(newName);
  const oldType = getCatType(cat);
  // Merging hands the exercises over to the target category, so that
  // category's type is what they will be logged in from then on.
  const effectiveType = merging ? getCatType(newName) : newType;

  if (merging) {
    const ok = await showConfirm(
      _L(`„${catLabel(newName)}“ gibt es bereits. Beide Kategorien zusammenführen?`,
         `"${catLabel(newName)}" already exists. Merge both categories?`),
      { danger: false, confirmText: _L('Zusammenführen', 'Merge') });
    if (!ok) return;
  }

  if (effectiveType !== oldType) {
    const affected = countLoggedEntries(matchCategoryEntry(cat));
    if (affected > 0) {
      const decision = await askTrackingDecision(affected, oldType, effectiveType, {
        title: _L('Kategorie-Typ ändern', 'Change category type')
      });
      if (!decision) return;
      applyTrackingDecision(decision, matchCategoryEntry(cat), oldType, effectiveType);
    }
  }

  if (merging) {
    deleteCategory(cat, newName);
  } else {
    if (renamed) renameCategory(cat, newName);
    setCategoryType(renamed ? newName : cat, newType);
  }

  save();
  closeModal('categoryEditModal');
  renderCategoryManager();
  _refreshAfterCategoryChange();
  showToast(t('save') + ' ✓');
}

window.openCategoryManager   = openCategoryManager;
window.renderCategoryManager = renderCategoryManager;
window.openCategoryEditor    = openCategoryEditor;
window.saveCategoryEdit      = saveCategoryEdit;
window.startDeleteCategory   = startDeleteCategory;
window.confirmDeleteCategory = confirmDeleteCategory;
window.askTrackingDecision   = askTrackingDecision;
window.applyTrackingDecision = applyTrackingDecision;
window.catTypeShort          = catTypeShort;
window.catTypeLabel          = catTypeLabel;
