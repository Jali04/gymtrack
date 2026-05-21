/* =============================================
   GYMTRACK — Supplement Tracker
   ============================================= */

let editingSuppId = null;
let currentSuppsDate = new Date();
Object.defineProperty(window, 'currentSuppsDate', {
  get() { return currentSuppsDate; },
  set(v) { currentSuppsDate = v; }
});

const SUPP_COLORS = ['#c8f135','#38bdf8','#f59e0b','#a78bfa','#f87171','#34d399'];
const SUPP_FORMS  = ['capsule','powder','liquid','tablet'];
const SUPP_TIME   = ['morgens','mittags','abends','vor_training','nach_training','egal'];

/* ---- Helpers ---- */
function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _isDueToday(sup) {
  if (!sup.active) return false;
  const today = new Date(); today.setHours(0,0,0,0);

  if (sup.frequency === 'daily') return true;

  if (sup.frequency === 'weekdays') {
    const dow = today.getDay(); // 0=Sun
    return (sup.frequencyDays || []).includes(dow);
  }

  if (sup.frequency === 'every_x_days') {
    const created = new Date(sup.createdAt); created.setHours(0,0,0,0);
    const diffDays = Math.floor((today - created) / 86400000);
    return diffDays % (sup.frequencyValue || 1) === 0;
  }
  return true;
}

function _isTakenOn(supId, dateKey) {
  return db.supplementLog.some(l => l.date === dateKey && l.supId === supId && l.taken);
}

function _isTakenToday(supId) {
  return _isTakenOn(supId, _todayKey());
}

function _getTakenCount(supId, dateKey) {
  return db.supplementLog.filter(l => l.date === dateKey && l.supId === supId && l.taken).length;
}

function _getAdherence(supId, days) {
  const today = new Date(); today.setHours(0,0,0,0);
  let due = 0, taken = 0;
  const sup = db.supplements.find(s => s.id === supId);
  if (!sup) return 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = _dateKey(d);
    // Check if it was due on that day
    const wasDue = _wasDueOn(sup, d);
    if (wasDue) {
      due++;
      if (db.supplementLog.some(l => l.date === key && l.supId === supId && l.taken)) taken++;
    }
  }
  return due > 0 ? Math.round((taken / due) * 100) : 100;
}

function _wasDueOn(sup, date) {
  if (!sup.active) return false;
  const d = new Date(date); d.setHours(0,0,0,0);
  const created = new Date(sup.createdAt); created.setHours(0,0,0,0);
  if (d < created) return false;

  if (sup.frequency === 'daily') return true;
  if (sup.frequency === 'weekdays') return (sup.frequencyDays || []).includes(d.getDay());
  if (sup.frequency === 'every_x_days') {
    const diff = Math.floor((d - created) / 86400000);
    return diff % (sup.frequencyValue || 1) === 0;
  }
  return true;
}

function _getSupplyRemaining(sup) {
  if (!sup.supplySize || sup.supplySize <= 0) return null;
  const takenTotal = db.supplementLog.filter(l => l.supId === sup.id && l.taken).length;
  return Math.max(0, sup.supplySize - (takenTotal * sup.dosage));
}

function _getSuppStreak(supId) {
  const today = new Date(); today.setHours(0,0,0,0);
  const sup = db.supplements.find(s => s.id === supId);
  if (!sup) return 0;
  let streak = 0;
  const d = new Date(today);
  // Check today first; if not yet taken but it's still today, start from yesterday
  const key = _dateKey(d);
  if (!db.supplementLog.some(l => l.date === key && l.supId === supId && l.taken)) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const dk = _dateKey(d);
    // Break if we check before the supplement was even created
    if (d < new Date(new Date(sup.createdAt).setHours(0,0,0,0))) break;
    
    if (!_wasDueOn(sup, d)) { d.setDate(d.getDate() - 1); continue; }
    if (db.supplementLog.some(l => l.date === dk && l.supId === supId && l.taken)) {
      streak++;
      d.setDate(d.getDate() - 1);
      // Safety: don't loop forever
      if (streak > 365) break;
    } else break;
  }
  return streak;
}

/* ---- Time of day labels ---- */
function _timeLabel(timeKey) {
  const labels = {
    de: { morgens: '☀️ Morgens', mittags: '🌤️ Mittags', abends: '🌙 Abends', vor_training: '💪 Vor Training', nach_training: '🏋️ Nach Training', egal: '⏰ Jederzeit' },
    en: { morgens: '☀️ Morning', mittags: '🌤️ Noon', abends: '🌙 Evening', vor_training: '💪 Pre-Workout', nach_training: '🏋️ Post-Workout', egal: '⏰ Anytime' }
  };
  return (labels[lang] || labels.de)[timeKey] || timeKey;
}

function _formLabel(form) {
  const labels = {
    de: { capsule: 'Kapsel', powder: 'Pulver', liquid: 'Flüssig', tablet: 'Tablette' },
    en: { capsule: 'Capsule', powder: 'Powder', liquid: 'Liquid', tablet: 'Tablet' }
  };
  return (labels[lang] || labels.de)[form] || form;
}

function _freqLabel(sup) {
  if (sup.frequency === 'daily') return lang === 'en' ? 'Daily' : 'Täglich';
  if (sup.frequency === 'every_x_days') return (lang === 'en' ? `Every ${sup.frequencyValue} days` : `Alle ${sup.frequencyValue} Tage`);
  if (sup.frequency === 'weekdays') {
    const dayNames = lang === 'en' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['So','Mo','Di','Mi','Do','Fr','Sa'];
    return (sup.frequencyDays || []).map(d => dayNames[d]).join(', ');
  }
  return '';
}

/* ---- Render ---- */
function renderSupplements() {
  const page = document.getElementById('page-supps');
  if (!page) return;

  const targetDateKey = _dateKey(currentSuppsDate);
  const isTargetToday = targetDateKey === _todayKey();

  const dueSupps    = db.supplements.filter(s => _wasDueOn(s, currentSuppsDate));
  const takenCount  = dueSupps.filter(s => _isTakenOn(s.id, targetDateKey)).length;
  const totalDue    = dueSupps.length;
  const pct         = totalDue > 0 ? Math.round((takenCount / totalDue) * 100) : 100;
  const allDone     = takenCount >= totalDue && totalDue > 0;

  // Group by time of day
  const groups = {};
  SUPP_TIME.forEach(t => { groups[t] = []; });
  dueSupps.forEach(s => {
    const key = s.timeOfDay || 'egal';
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  // Today view
  let todayHtml = '';
  if (totalDue > 0) {
    todayHtml += `
      <div class="supp-progress-bar">
        <div class="supp-progress-fill" style="width:${pct}%;${allDone ? 'background:var(--accent);' : ''}"></div>
      </div>
      <div class="supp-progress-label">${takenCount}/${totalDue} ${t('suppTaken')} ${allDone ? '✓' : ''}</div>
    `;

    Object.entries(groups).forEach(([timeKey, supps]) => {
      if (supps.length === 0) return;
      todayHtml += `<div class="supp-time-group-label">${_timeLabel(timeKey)}</div>`;
      supps.forEach(s => {
        const taken = _isTakenOn(s.id, targetDateKey);
        const streak = _getSuppStreak(s.id);
        const supply = _getSupplyRemaining(s);
        const supplyWarn = supply !== null && supply <= s.dosage * 5;

        todayHtml += `
          <div class="supp-check-card ${taken ? 'supp-taken' : ''}" onclick="toggleSuppTaken('${s.id}')">
            <div class="supp-check-left">
              <div class="supp-check-dot" style="background:${taken ? s.color : 'transparent'};border-color:${s.color};">
                ${taken ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
              </div>
              <div>
                <div class="supp-check-name${taken ? ' supp-name-done' : ''}">${s.name}</div>
                <div class="supp-check-meta">${s.dosage} ${s.dosageUnit}${s.form === 'powder' && s.scoopSize ? ' · ' + s.scoopSize : ''}</div>
              </div>
            </div>
            <div class="supp-check-right">
              ${streak >= 2 ? `<span class="supp-streak-mini">🔥${streak}</span>` : ''}
              ${supplyWarn ? `<span class="supp-supply-warn">⚠️</span>` : ''}
            </div>
          </div>`;
      });
    });
  } else if (db.supplements.length > 0) {
    const emptyMsg = isTargetToday ? t('suppNoneDue') : (lang === 'en' ? 'No supplements due on this day' : 'Keine Supplements fällig an diesem Tag');
    todayHtml = `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">✅</div><div class="empty-text">${emptyMsg}</div></div>`;
  } else {
    todayHtml = `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">💊</div><div class="empty-text">${t('suppEmpty')}</div></div>`;
  }

  // Supplement list
  let listHtml = '';
  if (db.supplements.length > 0) {
    listHtml = db.supplements.map(s => {
      const adherence = _getAdherence(s.id, 30);
      const supply = _getSupplyRemaining(s);
      const supplyWarn = supply !== null && supply <= s.dosage * 5;
      const streak = _getSuppStreak(s.id);

      let supplyHtml = '';
      if (supply !== null) {
        const supplyPct = Math.round((supply / s.supplySize) * 100);
        supplyHtml = `
          <div class="supp-supply-row">
            <div class="supp-supply-bar"><div class="supp-supply-fill${supplyWarn ? ' supply-low' : ''}" style="width:${supplyPct}%;"></div></div>
            <span class="supp-supply-text${supplyWarn ? ' supply-low-text' : ''}">${Math.round(supply)} ${s.dosageUnit} ${t('suppLeft')}</span>
          </div>`;
      }

      return `
        <div class="card supp-list-card" style="border-left:3px solid ${s.color};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
                ${s.name}
                ${!s.active ? `<span style="font-size:10px;color:var(--muted);background:var(--surface2);padding:2px 6px;border-radius:4px;">PAUSIERT</span>` : ''}
              </div>
              <div style="font-size:13px;color:var(--muted);margin-top:4px;">
                ${s.dosage} ${s.dosageUnit} · ${_formLabel(s.form)} · ${_freqLabel(s)}
              </div>
              ${s.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;">💬 ${s.notes}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="close-btn" onclick="event.stopPropagation();openEditSupplement('${s.id}')" style="width:auto;padding:4px 10px;border-radius:8px;font-size:11px;font-family:'DM Sans',sans-serif;font-weight:600;">✏️</button>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:10px;">
            <div class="supp-stat-chip">
              <span style="font-size:10px;color:var(--muted);text-transform:uppercase;">${t('suppAdherence')}</span>
              <span style="font-weight:700;color:${adherence >= 80 ? 'var(--accent)' : adherence >= 50 ? '#f59e0b' : 'var(--accent2)'};">${adherence}%</span>
            </div>
            ${streak >= 2 ? `<div class="supp-stat-chip"><span style="font-size:10px;color:var(--muted);">🔥 STREAK</span><span style="font-weight:700;color:var(--accent);">${streak}</span></div>` : ''}
          </div>
          ${supplyHtml}
        </div>`;
    }).join('');
  }

  const todayLabel = isTargetToday ? t('suppToday') : (lang === 'en' ? 'Supplements Due' : 'Supplements fällig');
  const maxDate = _todayKey();

  let dateNavHtml = `
    <div class="supp-date-nav" style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 12px;margin-bottom:16px;">
      <button class="cal-nav" onclick="changeSuppDate(-1)" style="font-family:'DM Sans',sans-serif;font-weight:bold;">‹</button>
      <div style="position:relative;font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;user-select:none;">
        <span style="font-size:14px;color:var(--accent);">📅</span>
        <span id="suppDateLabel">${_formatSuppDate(currentSuppsDate)}</span>
        <input type="date" id="suppDatePicker" value="${targetDateKey}" max="${maxDate}" onchange="onSuppDatePickerChange(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
      </div>
      <button class="cal-nav" id="suppDateNextBtn" onclick="changeSuppDate(1)" ${isTargetToday ? 'disabled style="opacity:0.25;cursor:default;"' : ''} style="font-family:'DM Sans',sans-serif;font-weight:bold;">›</button>
    </div>
  `;

  // Build page
  const container = page.querySelector('.supp-content') || page;
  container.innerHTML = `
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      ${todayLabel}
    </div>
    ${dateNavHtml}
    ${todayHtml}
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div class="section-title" style="margin:0;font-size:18px;">${t('suppMySupps')}</div>
      <button class="btn btn-primary btn-sm" style="margin:0;" onclick="openAddSupplement()">+</button>
    </div>
    ${listHtml}
  `;

  updateSuppNavBadge();
}

/* ---- Toggle Taken ---- */
function toggleSuppTaken(supId) {
  const key = _dateKey(currentSuppsDate);
  const existing = db.supplementLog.findIndex(l => l.date === key && l.supId === supId && l.taken);
  if (existing !== -1) {
    db.supplementLog.splice(existing, 1);
  } else {
    let takenAt = Date.now();
    if (key !== _todayKey()) {
      const d = new Date(currentSuppsDate);
      d.setHours(12, 0, 0, 0);
      takenAt = d.getTime();
    }
    db.supplementLog.push({ date: key, supId, taken: true, takenAt });
  }
  save();
  renderSupplements();
  haptic('success');
}

function changeSuppDate(offset) {
  const d = new Date(currentSuppsDate);
  d.setDate(d.getDate() + offset);
  const today = new Date(); today.setHours(0,0,0,0);
  const checkDate = new Date(d); checkDate.setHours(0,0,0,0);
  if (checkDate > today) return; // Prevent future dates
  currentSuppsDate = d;
  renderSupplements();
  haptic('light');
}

function onSuppDatePickerChange(val) {
  if (!val) return;
  const parts = val.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date(); today.setHours(0,0,0,0);
  if (d > today) return; // Prevent future dates
  currentSuppsDate = d;
  renderSupplements();
  haptic('light');
}

function _formatSuppDate(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(date); target.setHours(0,0,0,0);
  const diffTime = today - target;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return lang === 'en' ? 'Today' : 'Heute';
  } else if (diffDays === 1) {
    return lang === 'en' ? 'Yesterday' : 'Gestern';
  } else {
    return target.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}

/* ---- Nav Badge ---- */
function updateSuppNavBadge() {
  const btn = document.querySelector('.nav-btn[data-page="supps"]');
  if (!btn) return;
  let badge = btn.querySelector('.supp-nav-badge');
  const due = db.supplements.filter(s => s.active && _isDueToday(s) && !_isTakenToday(s.id)).length;
  if (due > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'supp-nav-badge';
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
    badge.textContent = due;
    badge.style.display = 'flex';
  } else if (badge) {
    badge.style.display = 'none';
  }
}

/* ---- Add / Edit Modal ---- */
function openAddSupplement() {
  editingSuppId = null;
  const form = document.getElementById('suppForm');
  if (!form) return;
  document.getElementById('suppModalTitle').textContent = t('suppNew');
  document.getElementById('suppName').value = '';
  document.getElementById('suppForm').value = 'capsule';
  document.getElementById('suppDosage').value = '';
  document.getElementById('suppUnit').value = lang === 'en' ? 'capsules' : 'Kapseln';
  document.getElementById('suppScoopSize').value = '';
  document.getElementById('suppScoopRow').style.display = 'none';
  document.getElementById('suppFrequency').value = 'weekdays';
  document.getElementById('suppFreqValue').value = '2';
  document.getElementById('suppFreqDaysRow').style.display = 'block';
  document.getElementById('suppFreqValueRow').style.display = 'none';
  document.getElementById('suppTimeOfDay').value = 'morgens';
  document.getElementById('suppNotes').value = '';
  document.getElementById('suppSupplySize').value = '';
  document.getElementById('deleteSuppBtn').style.display = 'none';
  document.getElementById('suppActive').checked = true;
  _resetSuppColorPicker(SUPP_COLORS[0]);
  _updateSuppFreqDays([0,1,2,3,4,5,6]); // Select all days by default
  _onSuppFormChange();
  _onSuppFreqChange();
  openModal('supplementModal');
}

function openEditSupplement(id) {
  const s = db.supplements.find(x => x.id === id);
  if (!s) return;
  editingSuppId = id;
  document.getElementById('suppModalTitle').textContent = t('suppEdit');
  document.getElementById('suppName').value = s.name;
  document.getElementById('suppForm').value = s.form;
  document.getElementById('suppDosage').value = s.dosage;
  document.getElementById('suppUnit').value = s.dosageUnit;
  document.getElementById('suppScoopSize').value = s.scoopSize || '';
  document.getElementById('suppFrequency').value = s.frequency;
  document.getElementById('suppFreqValue').value = s.frequencyValue || 2;
  document.getElementById('suppTimeOfDay').value = s.timeOfDay || 'morgens';
  document.getElementById('suppNotes').value = s.notes || '';
  document.getElementById('suppSupplySize').value = s.supplySize || '';
  document.getElementById('deleteSuppBtn').style.display = 'block';
  document.getElementById('suppActive').checked = s.active !== false;
  _resetSuppColorPicker(s.color || SUPP_COLORS[0]);
  _updateSuppFreqDays(s.frequencyDays || []);
  _onSuppFormChange();
  _onSuppFreqChange();
  openModal('supplementModal');
}

function _onSuppFormChange() {
  const form = document.getElementById('suppForm').value;
  const scoopRow = document.getElementById('suppScoopRow');
  const unitSelect = document.getElementById('suppUnit');
  scoopRow.style.display = form === 'powder' ? 'block' : 'none';

  // Auto-suggest unit
  const units = {
    capsule: lang === 'en' ? 'capsules' : 'Kapseln',
    powder: 'g',
    liquid: 'ml',
    tablet: lang === 'en' ? 'tablets' : 'Tabletten'
  };
  if (!editingSuppId) unitSelect.value = units[form] || 'g';
}

function _onSuppFreqChange() {
  const freq = document.getElementById('suppFrequency').value;
  document.getElementById('suppFreqValueRow').style.display = freq === 'every_x_days' ? 'block' : 'none';
  document.getElementById('suppFreqDaysRow').style.display = freq === 'weekdays' ? 'block' : 'none';
}

let _selectedSuppColor = SUPP_COLORS[0];
function _resetSuppColorPicker(color) {
  _selectedSuppColor = color;
  const picker = document.getElementById('suppColorPicker');
  if (!picker) return;
  picker.innerHTML = SUPP_COLORS.map(c => {
    const sel = c === color;
    return `<button class="supp-color-dot${sel ? ' active' : ''}" style="background:${c};" onclick="event.preventDefault();_selectSuppColor('${c}')"></button>`;
  }).join('');
}

function _selectSuppColor(c) {
  _selectedSuppColor = c;
  _resetSuppColorPicker(c);
}

let _selectedFreqDays = [];
function _updateSuppFreqDays(days) {
  _selectedFreqDays = [...days];
  const container = document.getElementById('suppFreqDaysContainer');
  if (!container) return;
  const dayNames = lang === 'en' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['So','Mo','Di','Mi','Do','Fr','Sa'];
  container.innerHTML = [1,2,3,4,5,6,0].map(d => {
    const sel = _selectedFreqDays.includes(d);
    return `<button class="supp-day-chip${sel ? ' active' : ''}" onclick="event.preventDefault();_toggleFreqDay(${d})">${dayNames[d]}</button>`;
  }).join('');
}

function _toggleFreqDay(d) {
  const idx = _selectedFreqDays.indexOf(d);
  if (idx === -1) _selectedFreqDays.push(d);
  else _selectedFreqDays.splice(idx, 1);
  _updateSuppFreqDays(_selectedFreqDays);
  haptic('light');
}

function saveSupplement() {
  const name = document.getElementById('suppName').value.trim();
  if (!name) { alert(t('enterName')); return; }
  const dosage = parseFloat(document.getElementById('suppDosage').value) || 1;

  const data = {
    name,
    form: document.getElementById('suppForm').value,
    dosage,
    dosageUnit: document.getElementById('suppUnit').value,
    scoopSize: document.getElementById('suppScoopSize').value.trim(),
    frequency: document.getElementById('suppFrequency').value,
    frequencyValue: parseInt(document.getElementById('suppFreqValue').value) || 2,
    frequencyDays: [..._selectedFreqDays],
    timeOfDay: document.getElementById('suppTimeOfDay').value,
    notes: document.getElementById('suppNotes').value.trim(),
    supplySize: parseFloat(document.getElementById('suppSupplySize').value) || 0,
    active: document.getElementById('suppActive').checked,
    color: _selectedSuppColor
  };

  if (editingSuppId) {
    const s = db.supplements.find(x => x.id === editingSuppId);
    if (s) Object.assign(s, data);
  } else {
    data.id = 'sup_' + uid();
    data.createdAt = Date.now();
    db.supplements.push(data);
  }
  save();
  closeModal('supplementModal');
  renderSupplements();
  showToast(t('save') + ' ✓');
  haptic('success');
}

function deleteSupplement() {
  if (!editingSuppId) return;
  if (!confirm(t('suppConfirmDelete'))) return;
  db.supplements = db.supplements.filter(x => x.id !== editingSuppId);
  db.supplementLog = db.supplementLog.filter(l => l.supId !== editingSuppId);
  save();
  closeModal('supplementModal');
  renderSupplements();
  haptic('light');
}
