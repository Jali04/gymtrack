/* =============================================
   GYMTRACK — Supplement Tracker
   ============================================= */

let editingSuppId = null;
let currentSuppsDate = new Date();
let showAllActiveSupps = false;
Object.defineProperty(window, 'currentSuppsDate', {
  get() { return currentSuppsDate; },
  set(v) { currentSuppsDate = v; }
});
Object.defineProperty(window, 'showAllActiveSupps', {
  get() { return showAllActiveSupps; },
  set(v) { showAllActiveSupps = v; }
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

function _getLastTakenDateBefore(supId, date) {
  const targetKey = _dateKey(date);
  let lastKey = null;
  (db.supplementLog || []).forEach(l => {
    if (l.supId === supId && l.taken && l.date < targetKey) {
      if (!lastKey || l.date > lastKey) {
        lastKey = l.date;
      }
    }
  });
  if (!lastKey) return null;
  const parts = lastKey.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function _isDueToday(sup) {
  return _wasDueOn(sup, new Date());
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
  const createdVal = sup.createdAt || sup.createdAt === 0 ? sup.createdAt : (sup.updated_at || Date.now());
  const created = new Date(createdVal); created.setHours(0,0,0,0);
  if (d < created) return false;

  if (sup.frequency === 'daily') return true;
  if (sup.frequency === 'weekdays') return (sup.frequencyDays || []).includes(d.getDay());
  if (sup.frequency === 'every_x_days') {
    const lastTaken = _getLastTakenDateBefore(sup.id, d);
    let nextDue;
    if (lastTaken) {
      nextDue = new Date(lastTaken);
      nextDue.setDate(nextDue.getDate() + (sup.frequencyValue || 1));
    } else {
      nextDue = created;
    }
    return d >= nextDue;
  }
  return true;
}

function _getSupplyRemaining(sup) {
  if (!sup.supplySize || sup.supplySize <= 0) return null;
  const takenTotal = db.supplementLog.filter(l => l.supId === sup.id && l.taken).length;
  const takenSinceRefill = Math.max(0, takenTotal - (sup.lastRefillTakenCount || 0));
  return Math.max(0, sup.supplySize - (takenSinceRefill * sup.dosage));
}

/* =============================================
   VORRAT — Reichweite und Warnungen

   "120 g übrig" sagt einem nichts, solange man nicht im Kopf durch die Dosis
   und die Einnahme-Frequenz teilt. Entscheidend ist die Frage: wie lange
   reicht das noch? Genau die beantworten diese Helfer — und sie sind die
   Grundlage dafür, dass eine Einnahme blockiert wird, sobald der Vorrat
   physisch nicht mehr dafür reicht.
   ============================================= */

// Warnschwelle: eine Woche Vorlauf reicht, um nachzubestellen.
const SUPPLY_LOW_DAYS = 7;

// Wie viele volle Einnahmen der Rest noch hergibt.
function _getSupplyIntakesLeft(sup) {
  const remaining = _getSupplyRemaining(sup);
  if (remaining === null) return null;           // kein Vorrat gepflegt
  const dose = Number(sup.dosage) || 0;
  if (dose <= 0) return null;                    // ohne Dosis nicht berechenbar
  return Math.floor(remaining / dose);
}

// Einnahmen pro Woche laut Frequenz — die Brücke von Einnahmen zu Tagen.
function _getIntakesPerWeek(sup) {
  if (sup.frequency === 'weekdays') return (sup.frequencyDays || []).length;
  if (sup.frequency === 'every_x_days') {
    const every = Number(sup.frequencyValue) || 1;
    return 7 / Math.max(1, every);
  }
  return 7; // täglich (und alles ohne gesetzte Frequenz)
}

// Reichweite in Tagen, oder null wenn nicht berechenbar.
function _getSupplyDaysLeft(sup) {
  const intakes = _getSupplyIntakesLeft(sup);
  if (intakes === null) return null;
  const perWeek = _getIntakesPerWeek(sup);
  if (!perWeek || perWeek <= 0) return null;     // z.B. Wochentage ohne Auswahl
  return Math.floor((intakes * 7) / perWeek);
}

/* Der Vorratsstatus eines Supplements.
   level: 'none'  — kein Vorrat gepflegt, es gilt keine Grenze
          'ok'    — reicht noch
          'low'   — weniger als SUPPLY_LOW_DAYS Tage
          'empty' — kein voller Dosis-Rest mehr da */
function getSupplyStatus(sup) {
  const remaining = _getSupplyRemaining(sup);
  if (remaining === null) return { level: 'none', remaining: null, intakesLeft: null, daysLeft: null };

  const intakesLeft = _getSupplyIntakesLeft(sup);
  const daysLeft = _getSupplyDaysLeft(sup);

  // Ohne verwertbare Dosis kann nichts blockiert werden — sonst sperrte ein
  // unvollständig gepflegtes Supplement den Nutzer dauerhaft aus.
  if (intakesLeft === null) return { level: 'ok', remaining, intakesLeft: null, daysLeft: null };

  let level = 'ok';
  if (intakesLeft < 1) level = 'empty';
  else if (daysLeft !== null && daysLeft <= SUPPLY_LOW_DAYS) level = 'low';

  return { level, remaining, intakesLeft, daysLeft };
}

// Alle aktiven Supplements, die zur Neige gehen — dringendste zuerst.
function getLowSupplies() {
  return (db.supplements || [])
    .filter(s => s.active !== false)
    .map(s => ({ sup: s, status: getSupplyStatus(s) }))
    .filter(x => x.status.level === 'low' || x.status.level === 'empty')
    .sort((a, b) => {
      if (a.status.level !== b.status.level) return a.status.level === 'empty' ? -1 : 1;
      return (a.status.daysLeft ?? 0) - (b.status.daysLeft ?? 0);
    });
}

window.getSupplyStatus = getSupplyStatus;
window.getLowSupplies  = getLowSupplies;

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
  let iterations = 0;
  while (true) {
    iterations++;
    if (iterations > 1000) break; // Emergency break to prevent infinite loop/app freeze
    const dk = _dateKey(d);
    // Break if we check before the supplement was even created
    const createdVal = sup.createdAt || sup.createdAt === 0 ? sup.createdAt : (sup.updated_at || Date.now());
    if (d < new Date(new Date(createdVal).setHours(0,0,0,0))) break;
    
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

/* Warnbanner über den fälligen Supplements. Zeigt die Reichweite in Tagen —
   das ist die Zahl, nach der man handelt, nicht "noch 40 g". */
function _buildSupplyWarningHtml() {
  const low = getLowSupplies();
  if (low.length === 0) return '';

  const en = (typeof lang !== 'undefined' && lang === 'en');
  const empty = low.filter(x => x.status.level === 'empty');
  const running = low.filter(x => x.status.level === 'low');

  const line = ({ sup, status }) => {
    const isEmpty = status.level === 'empty';
    const reach = isEmpty
      ? (en ? 'empty' : 'leer')
      : (status.daysLeft === null
          ? (en ? 'running low' : 'wird knapp')
          : status.daysLeft <= 1
            ? (en ? 'last dose' : 'letzte Dosis')
            : (en ? `approx. ${status.daysLeft} days left` : `noch ca. ${status.daysLeft} Tage`));
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;">
        <div style="min-width:0;">
          <span style="font-weight:600;font-size:13.5px;color:var(--text);">${isEmpty ? '🚫' : '⚠️'} ${sup.name}</span>
          <span style="font-size:12px;color:var(--muted);margin-left:6px;">${reach}</span>
        </div>
        <button class="supp-refill-btn" style="flex-shrink:0;" onclick="event.stopPropagation();refillSupplement('${sup.id}')">🔄 ${t('suppRefill')}</button>
      </div>`;
  };

  const headline = empty.length
    ? (en ? `${empty.length} supplement${empty.length > 1 ? 's' : ''} out of stock`
          : `${empty.length} Supplement${empty.length > 1 ? 's' : ''} aufgebraucht`)
    : (en ? `${running.length} supplement${running.length > 1 ? 's' : ''} running low`
          : `${running.length} Supplement${running.length > 1 ? 's' : ''} wird knapp`);

  const accent = empty.length ? 'rgba(208,2,27,0.35)' : 'rgba(245,166,35,0.35)';
  const tint   = empty.length ? 'rgba(208,2,27,0.10)' : 'rgba(245,166,35,0.10)';

  return `
    <div class="card" style="margin-bottom:16px;background:${tint};border:1px solid ${accent};border-radius:14px;padding:12px 14px;">
      <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.8px;color:var(--muted);margin-bottom:4px;">
        ${en ? 'Stock' : 'Vorrat'}
      </div>
      <div style="font-weight:700;font-size:14.5px;margin-bottom:4px;">${headline}</div>
      ${empty.map(line).join('')}
      ${running.map(line).join('')}
    </div>`;
}

/* ---- Render ---- */
function renderSupplements() {
  const page = document.getElementById('page-supps');
  if (!page) return;

  const targetDateKey = _dateKey(currentSuppsDate);
  const isTargetToday = targetDateKey === _todayKey();

  const strictlyDueSupps = db.supplements.filter(s => _wasDueOn(s, currentSuppsDate));
  const dueSupps = db.supplements.filter(s => {
    if (_isTakenOn(s.id, targetDateKey)) return true;
    if (showAllActiveSupps) return s.active;
    return _wasDueOn(s, currentSuppsDate);
  });

  const takenCount  = strictlyDueSupps.filter(s => _isTakenOn(s.id, targetDateKey)).length;
  const totalDue    = strictlyDueSupps.length;
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
  if (dueSupps.length > 0) {
    if (totalDue > 0) {
      todayHtml += `
        <div class="supp-progress-bar">
          <div class="supp-progress-fill" style="width:${pct}%;${allDone ? 'background:var(--accent);' : ''}"></div>
        </div>
        <div class="supp-progress-label">${takenCount}/${totalDue} ${t('suppTaken')} ${allDone ? '✓' : ''}</div>
      `;
    }

    Object.entries(groups).forEach(([timeKey, supps]) => {
      if (supps.length === 0) return;
      todayHtml += `<div class="supp-time-group-label">${_timeLabel(timeKey)}</div>`;
      supps.forEach(s => {
        const taken = _isTakenOn(s.id, targetDateKey);
        const streak = _getSuppStreak(s.id);
        const supplyStatus = getSupplyStatus(s);
        // Bei leerem Vorrat lässt sich nicht abhaken (siehe toggleSuppTaken).
        // Bereits gesetzte Haken bleiben normal bedienbar, damit ein Versehen
        // zurücknehmbar bleibt.
        const supplyBlocked = supplyStatus.level === 'empty' && !taken;

        todayHtml += `
          <div class="supp-check-card ${taken ? 'supp-taken' : ''}${supplyBlocked ? ' supp-out-of-stock' : ''}"
               ${supplyBlocked ? `title="${lang === 'en' ? 'Out of stock — refill first' : 'Vorrat leer — bitte erst auffüllen'}"` : ''}
               onclick="toggleSuppTaken('${s.id}')">
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
              ${supplyStatus.level === 'empty'
                  ? `<span class="supp-supply-warn" title="${lang === 'en' ? 'Out of stock' : 'Vorrat leer'}">🚫</span>`
                  : supplyStatus.level === 'low'
                    ? `<span class="supp-supply-warn" title="${supplyStatus.daysLeft !== null ? (lang === 'en' ? `approx. ${supplyStatus.daysLeft} days left` : `noch ca. ${supplyStatus.daysLeft} Tage`) : ''}">⚠️</span>`
                    : ''}
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
      const listStatus = getSupplyStatus(s);
      const supply = listStatus.remaining;
      const supplyWarn = listStatus.level === 'low' || listStatus.level === 'empty';
      const streak = _getSuppStreak(s.id);

      let supplyHtml = '';
      if (supply !== null) {
        const supplyPct = Math.round((supply / s.supplySize) * 100);
        supplyHtml = `
          <div class="supp-supply-row">
            <div class="supp-supply-bar"><div class="supp-supply-fill${supplyWarn ? ' supply-low' : ''}" style="width:${supplyPct}%;"></div></div>
            <span class="supp-supply-text${supplyWarn ? ' supply-low-text' : ''}">${Math.round(supply)} ${s.dosageUnit} ${t('suppLeft')}${
              listStatus.daysLeft !== null && listStatus.level !== 'empty'
                ? ` · ${lang === 'en' ? `~${listStatus.daysLeft}d` : `~${listStatus.daysLeft} Tage`}`
                : (listStatus.level === 'empty' ? ` · ${lang === 'en' ? 'empty' : 'leer'}` : '')
            }</span>
            <button class="supp-refill-btn" onclick="event.stopPropagation();refillSupplement('${s.id}')">🔄 ${t('suppRefill')}</button>
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

  let filterHtml = `
    <div class="supp-filter-nav" style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 12px;margin-bottom:16px;">
      <span style="font-size:13px;color:var(--text);font-weight:500;">${t('suppShowAll')}</span>
      <label class="toggle">
        <input type="checkbox" id="showAllSuppsToggle" ${showAllActiveSupps ? 'checked' : ''} onchange="toggleShowAllSupps(this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>
  `;

  // Build page
  const container = page.querySelector('.supp-content') || page;
  container.innerHTML = `
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      ${todayLabel}
    </div>
    ${dateNavHtml}
    ${_buildSupplyWarningHtml()}
    ${filterHtml}
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

function toggleShowAllSupps(checked) {
  showAllActiveSupps = checked;
  renderSupplements();
}

/* ---- Toggle Taken ---- */
function toggleSuppTaken(supId) {
  const key = _dateKey(currentSuppsDate);
  const existing = db.supplementLog.findIndex(l => l.date === key && l.supId === supId && l.taken);
  if (existing !== -1) {
    // Abwählen ist IMMER erlaubt, auch bei leerem Vorrat: sonst liesse sich ein
    // versehentlicher Haken nicht mehr zurücknehmen.
    db.supplementLog.splice(existing, 1);
  } else {
    // Eine Einnahme, für die der Vorrat nicht mehr reicht, hat nicht
    // stattgefunden — sie würde die Adhärenz und die Vorratsrechnung
    // verfälschen. Statt still zu erlauben: blockieren und zum Auffüllen führen.
    const sup = db.supplements.find(x => x.id === supId);
    if (sup) {
      const status = getSupplyStatus(sup);
      if (status.level === 'empty') {
        haptic('warning');
        showToast(lang === 'en'
          ? `${sup.name}: out of stock — refill first`
          : `${sup.name}: Vorrat leer — bitte erst auffüllen`);
        if (typeof refillSupplement === 'function') {
          // Direkt zum Auffüllen, statt den Nutzer suchen zu lassen.
          setTimeout(() => refillSupplement(supId), 400);
        }
        return;
      }
    }
    let takenAt = Date.now();
    if (key !== _todayKey()) {
      const d = new Date(currentSuppsDate);
      d.setHours(12, 0, 0, 0);
      takenAt = d.getTime();
    }
    db.supplementLog.push({ id: 'suplog_' + uid(), date: key, supId, taken: true, takenAt, updated_at: Date.now() });
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

/* Einmal pro Tag beim Öffnen der App auf knappe Vorräte hinweisen.

   Bewusst nur einmal täglich und per Toast statt Modal: eine Warnung, die bei
   jedem Start aufpoppt, wird ignoriert — und ein Modal, das man wegklicken
   muss, bevor man sein Training loggt, ist genau das Falsche.
   Die Quittung liegt absichtlich in localStorage und nicht in db.settings:
   der Hinweis gilt pro Gerät, und die Erinnerung auf dem Handy soll nicht
   verschwinden, weil man die App am Tablet offen hatte. */
const SUPPLY_NOTICE_KEY = 'dscpln_supply_notice_day';

function maybeShowSupplyNotice() {
  try {
    if (typeof showToast !== 'function') return;
    const today = _todayKey();
    if (localStorage.getItem(SUPPLY_NOTICE_KEY) === today) return;

    const low = getLowSupplies();
    if (low.length === 0) return;

    const en = (typeof lang !== 'undefined' && lang === 'en');
    const empty = low.filter(x => x.status.level === 'empty');
    const first = low[0];

    let msg;
    if (empty.length === 1 && low.length === 1) {
      msg = en ? `🚫 ${first.sup.name} is out of stock` : `🚫 ${first.sup.name} ist aufgebraucht`;
    } else if (empty.length > 0) {
      msg = en ? `🚫 ${empty.length} supplements out of stock` : `🚫 ${empty.length} Supplements aufgebraucht`;
    } else if (low.length === 1) {
      const d = first.status.daysLeft;
      msg = d !== null
        ? (en ? `⚠️ ${first.sup.name}: approx. ${d} days left` : `⚠️ ${first.sup.name}: noch ca. ${d} Tage`)
        : (en ? `⚠️ ${first.sup.name} is running low` : `⚠️ ${first.sup.name} wird knapp`);
    } else {
      msg = en ? `⚠️ ${low.length} supplements running low` : `⚠️ ${low.length} Supplements werden knapp`;
    }

    localStorage.setItem(SUPPLY_NOTICE_KEY, today);
    showToast(msg);
  } catch (e) {
    console.warn('[Supplements] Vorrats-Hinweis fehlgeschlagen:', e);
  }
}
window.maybeShowSupplyNotice = maybeShowSupplyNotice;

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
  if (!name) { showAlert(t('enterName')); return; }
  const dosage = parseFloat(document.getElementById('suppDosage').value) || 1;
  const newSupplySize = parseFloat(document.getElementById('suppSupplySize').value) || 0;

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
    supplySize: newSupplySize,
    active: document.getElementById('suppActive').checked,
    color: _selectedSuppColor
  };

  if (editingSuppId) {
    const s = db.supplements.find(x => x.id === editingSuppId);
    if (s) {
      if (s.supplySize !== newSupplySize) {
        const takenTotal = db.supplementLog.filter(l => l.supId === editingSuppId && l.taken).length;
        data.lastRefillTakenCount = takenTotal;
      } else {
        data.lastRefillTakenCount = s.lastRefillTakenCount || 0;
      }
      Object.assign(s, data);
    }
  } else {
    data.id = 'sup_' + uid();
    data.createdAt = Date.now();
    data.lastRefillTakenCount = 0;
    db.supplements.push(data);
  }
  save();
  closeModal('supplementModal');
  renderSupplements();
  showToast(t('save') + ' ✓');
  haptic('success');
}

async function deleteSupplement() {
  if (!editingSuppId) return;
  if (!await showConfirm(t('suppConfirmDelete'))) return;
  db.supplements = db.supplements.filter(x => x.id !== editingSuppId);
  db.supplementLog = db.supplementLog.filter(l => l.supId !== editingSuppId);
  save();
  closeModal('supplementModal');
  renderSupplements();
  haptic('light');
}

function refillSupplement(id) {
  const s = db.supplements.find(x => x.id === id);
  if (!s) return;
  
  const defaultAmount = s.supplySize || 100;
  const msg = lang === 'en' 
    ? `Refill supply for ${s.name}? Enter amount to add (in ${s.dosageUnit}):` 
    : `Vorrat für ${s.name} auffüllen? Menge zum Hinzufügen eingeben (in ${s.dosageUnit}):`;
    
  const takenTotal = db.supplementLog.filter(l => l.supId === s.id && l.taken).length;
  s.lastRefillTakenCount = takenTotal;
  s.updated_at = Date.now();
  
  save();
  renderSupplements();
  showToast((lang === 'en' ? 'Refilled to: ' : 'Aufgefüllt auf: ') + s.supplySize + ' ' + s.dosageUnit + ' ✓');
  haptic('success');
}
