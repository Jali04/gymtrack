/* =============================================
   GYMTRACK — Progress & Measurements
   ============================================= */

let bodyMetricsChart = null; // We'll build a simple HTML-based bar chart or SVG chart to keep it lightweight

function openAddMeasurementModal() {
  document.getElementById('measureWeight').value = '';
  document.getElementById('measureBf').value = '';
  document.getElementById('measureNote').value = '';
  const lbl = document.getElementById('lblMeasureWeight');
  if (lbl) lbl.textContent = `${lang === 'en' ? 'Body weight' : 'Körpergewicht'} (${unitLabel()})`;
  openModal('measurementModal');
}

function saveMeasurement() {
  const wRaw = document.getElementById('measureWeight').value;
  const bfRaw = document.getElementById('measureBf').value;
  const note = document.getElementById('measureNote').value.trim();
  
  const w = toKg(wRaw); // F2: body weight entered in display unit, stored in kg
  const bf = parseFloat(bfRaw.replace(',', '.'));

  if (w == null) {
    showAlert(t('invalidInput') || 'Ungültige Eingabe');
    return;
  }

  const entry = {
    id: uid(),
    date: new Date().toISOString(),
    weight: w,
    bf: isNaN(bf) ? null : bf,
    note: note
  };
  
  db.measurements.push(entry);
  db.measurements.sort((a,b) => new Date(b.date) - new Date(a.date));
  save();
  
  closeModal('measurementModal');
  showToast(t('savedToast') || 'Gespeichert');
  renderProgress();
}

function handlePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    // Compress image simply by drawing it to a smaller canvas
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800; // Limit size to save IndexedDB space
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      const entry = { id: uid(), date: new Date().toISOString(), dataUrl: dataUrl };
      db.progressPics.push(entry);
      // Sort desc
      db.progressPics.sort((a,b) => new Date(b.date) - new Date(a.date));
      // Write bytes to IndexedDB first (confirmed), then persist the slim blob.
      const done = () => { save(); renderProgressPics(); showToast(t('savedToast') || 'Zing!'); };
      if (typeof photoStorePut === 'function') photoStorePut(entry).then(done);
      else done();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderProgress() {
  renderMeasurements();
  renderProgressPics();
  renderExerciseProgressTracker();
}

function renderMeasurements() {
  const list = document.getElementById('progressList');
  const chart = document.getElementById('progressChart');
  list.innerHTML = '';
  chart.innerHTML = '';
  
  if (!db.measurements || db.measurements.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Keine Einträge</div>`;
    return;
  }
  
  // Render List
  let html = '';
  db.measurements.forEach(m => {
    const d = new Date(m.date);
    const dateStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
    const bfStr = m.bf ? `<span style="margin-left:8px;opacity:0.6;">${m.bf}% KFA</span>` : '';
    const noteStr = m.note ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${m.note}</div>` : '';
    
    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:12px;color:var(--muted);">${dateStr}</div>
          <div style="font-weight:700;font-size:16px;">${fmtWeight(m.weight)}${bfStr}</div>
          ${noteStr}
        </div>
        <button class="icon-btn" style="color:var(--accent2);width:30px;height:30px;" onclick="deleteMeasurement('${m.id}')">✕</button>
      </div>
    `;
  });
  list.innerHTML = html;
  
  // Render SVG Line Chart (Last 12 entries, oldest on left)
  const chartData = db.measurements.slice(0, 12).reverse();
  if (chartData.length < 2) {
    chart.innerHTML = `<div style="text-align:center;width:100%;color:var(--muted);font-size:12px;padding:20px 0;">Mehr Daten für Diagramm benötigt</div>`;
    return;
  }
  const points = chartData.map(d => {
    const date = new Date(d.date);
    return { x: `${date.getDate()}.${date.getMonth()+1}.`, y: fmtWeightNum(d.weight) };
  });
  chart.style.display = 'block';
  chart.innerHTML = _buildLineChart(points, { width: 320, height: 140, color: 'var(--accent)' });
}

async function deleteMeasurement(id) {
  if (!await showConfirm(t('confirmDel') || 'Eintrag löschen?')) return;
  db.measurements = db.measurements.filter(m => m.id !== id);
  save();
  renderProgress();
}

function requestPicsAccess() {
  const pin = localStorage.getItem('gymtrack_pics_pin');
  if (!pin) {
    window._picsUnlocked = true;
    renderProgressPics();
    return;
  }
  openPinModal('access', () => {
    window._picsUnlocked = true;
    renderProgressPics();
  });
}

function configurePicPin() {
  const currentPin = localStorage.getItem('gymtrack_pics_pin');
  if (currentPin) {
    openModal('pinConfigModal');
  } else {
    openPinModal('setup', null);
  }
}

/* ---- Custom PIN Numpad ---- */
const _pinState = { mode: 'access', value: '', setupTemp: '', onSuccess: null };

function openPinModal(mode, onSuccess) {
  _pinState.mode      = mode;
  _pinState.value     = '';
  _pinState.setupTemp = '';
  _pinState.onSuccess = onSuccess;
  const sub   = document.getElementById('pinModalSubtitle');
  const title = document.getElementById('pinModalTitle');
  const err   = document.getElementById('pinError');
  const labels = {
    access:        ['Fotos entsperren',    'PIN eingeben'],
    setup:         ['Schutz einrichten',   'Neue PIN wählen'],
    change_verify: ['PIN ändern',          'Aktuelle PIN'],
    remove_verify: ['Schutz entfernen',    'Aktuelle PIN'],
  };
  const [s, ti] = labels[mode] || ['', 'PIN eingeben'];
  if (sub)   sub.textContent   = s;
  if (title) title.textContent = ti;
  if (err)   err.textContent   = '';
  _updatePinDots();
  openModal('pinModal');
}

function closePinModal() { closeModal('pinModal'); }

function pinInput(digit) {
  if (_pinState.value.length >= 4) return;
  _pinState.value += digit;
  _updatePinDots();
  haptic('light');
  if (_pinState.value.length === 4) setTimeout(_pinSubmit, 180);
}

function pinDelete() {
  if (!_pinState.value.length) return;
  _pinState.value = _pinState.value.slice(0, -1);
  _updatePinDots();
  haptic('light');
}

function _updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('pinDot' + i);
    if (d) d.classList.toggle('filled', i < _pinState.value.length);
  }
}

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function _pinSubmit() {
  const { mode, value: val, setupTemp, onSuccess } = _pinState;
  const storedPin = localStorage.getItem('gymtrack_pics_pin');
  const titleEl   = document.getElementById('pinModalTitle');
  const subEl     = document.getElementById('pinModalSubtitle');
  const errEl     = document.getElementById('pinError');

  async function verifyPin(entered, stored) {
    if (!stored) return false;
    const hashed = await hashPin(entered);
    if (stored.length === 64) {
      return hashed === stored;
    } else {
      // Legacy unhashed comparison
      if (entered === stored) {
        // Upgrade to hashed PIN
        localStorage.setItem('gymtrack_pics_pin', hashed);
        return true;
      }
      return false;
    }
  }

  if (mode === 'access') {
    const isValid = await verifyPin(val, storedPin);
    if (isValid) {
      closeModal('pinModal');
      if (onSuccess) onSuccess();
    } else { _pinError('Falsche PIN'); }

  } else if (mode === 'setup') {
    _pinState.setupTemp = val;
    _pinState.mode      = 'setup_confirm';
    _pinState.value     = '';
    titleEl.textContent = 'PIN wiederholen';
    subEl.textContent   = 'Bestätigen';
    if (errEl) errEl.textContent = '';
    _updatePinDots();

  } else if (mode === 'setup_confirm') {
    if (val === setupTemp) {
      const hashed = await hashPin(val);
      localStorage.setItem('gymtrack_pics_pin', hashed);
      window._picsUnlocked = true;
      closeModal('pinModal');
      showToast(lang==='en'?'🔒 PIN protection enabled':'🔒 PIN-Schutz aktiviert');
      renderProgressPics();
    } else {
      _pinState.mode      = 'setup';
      _pinState.setupTemp = '';
      _pinState.value     = '';
      titleEl.textContent = 'Neue PIN wählen';
      subEl.textContent   = 'Nochmal versuchen';
      _pinError('PINs stimmen nicht überein');
    }

  } else if (mode === 'change_verify') {
    const isValid = await verifyPin(val, storedPin);
    if (isValid) {
      _pinState.mode  = 'setup';
      _pinState.value = '';
      titleEl.textContent = 'Neue PIN wählen';
      subEl.textContent   = 'Neue PIN';
      if (errEl) errEl.textContent = '';
      _updatePinDots();
    } else { _pinError('Falsche PIN'); }

  } else if (mode === 'remove_verify') {
    const isValid = await verifyPin(val, storedPin);
    if (isValid) {
      localStorage.removeItem('gymtrack_pics_pin');
      window._picsUnlocked = false;
      closeModal('pinModal');
      showToast('PIN-Schutz entfernt');
      renderProgressPics();
    } else { _pinError('Falsche PIN'); }
  }
}

function _pinError(msg) {
  const errEl  = document.getElementById('pinError');
  const dotsEl = document.getElementById('pinDots');
  if (errEl) errEl.textContent = msg;
  _pinState.value = '';
  _updatePinDots();
  haptic('error');
  if (dotsEl) {
    dotsEl.classList.add('pin-shake');
    setTimeout(() => dotsEl.classList.remove('pin-shake'), 500);
  }
}

function renderProgressPics() {
  const container = document.getElementById('photoGalleryContainer');
  if (!container) return;
  
  const pin = localStorage.getItem('gymtrack_pics_pin');
  
  // If PIN is active and not unlocked in this session:
  if (pin && !window._picsUnlocked) {
    container.innerHTML = `
      <div class="photo-locked-card">
        <div style="font-size:36px;margin-bottom:12px;">🔒</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:6px;">Fotos sind PIN-geschützt</div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px;">Gib deine PIN ein, um deine Transformation zu sehen.</p>
        <button class="btn btn-primary" style="margin:0 auto;width:auto;" onclick="requestPicsAccess()">Entsperren</button>
      </div>
    `;
    return;
  }
  
  // Otherwise, render upload button + gallery grid
  let uploadBtnHtml = `
    <label class="btn btn-primary" style="margin-bottom:16px;cursor:pointer;display:block;text-align:center;padding:12px;color:#000;">
      + Neues Foto
      <input type="file" id="progressPicUpload" accept="image/*" style="display:none;" onchange="handlePicUpload(event)">
    </label>
  `;
  
  let galleryGridHtml = '';
  if (!db.progressPics || db.progressPics.length === 0) {
    galleryGridHtml = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Keine Fotos</div>`;
  } else {
    let itemsHtml = db.progressPics.map(p => {
      const d = new Date(p.date);
      const dateStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
      // dataUrl may still be loading from IndexedDB — show a placeholder tile
      // (the gallery re-renders once hydration finishes).
      const inner = p.dataUrl
        ? `<img src="${p.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:20px;">⏳</div>`;
      return `
        <div style="position:relative;width:100%;aspect-ratio:3/4;border-radius:8px;overflow:hidden;cursor:pointer;background:var(--surface2);" onclick="openPic('${p.id}')">
          ${inner}
          <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);padding:6px;font-size:11px;text-align:center;font-weight:600;backdrop-filter:blur(4px);">${dateStr}</div>
        </div>
      `;
    }).join('');
    galleryGridHtml = `<div id="progressGallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${itemsHtml}</div>`;
  }
  
  container.innerHTML = uploadBtnHtml + galleryGridHtml;
}

let activePicId = null;
function openPic(id) {
  const p = db.progressPics.find(x => x.id === id);
  if (!p) return;
  if (!p.dataUrl) { showToast('⏳ Foto wird geladen …'); return; }
  activePicId = id;
  
  const d = new Date(p.date);
  document.getElementById('viewPicDate').textContent = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
  document.getElementById('viewPicImg').src = p.dataUrl;
  
  openModal('viewPicModal');
}

async function deleteCurrentPic() {
  if (!activePicId) return;
  if (!await showConfirm(t('confirmDel') || 'Foto löschen?')) return;
  const delId = activePicId;
  db.progressPics = db.progressPics.filter(x => x.id !== delId);
  if (typeof photoStoreDelete === 'function') photoStoreDelete(delId);
  save();
  closeModal('viewPicModal');
  renderProgressPics();
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
    const zipped = x.dates.map((d, i) => ({d, w: x.maxW[i]})).sort((a,b) => new Date(a.d).getTime() - new Date(b.d).getTime());
    
    const first = zipped[0];
    const last = zipped[zipped.length-1];
    
    if (last.w > first.w && first.w > 0) {
      const eName = getExName(x.id);
      const diffTime = Math.abs(new Date(last.d).getTime() - new Date(first.d).getTime());
      const diffWeeks = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)));
      const inc = last.w - first.w;
      
      milestones.push({
        title: `Kraftzuwachs: ${eName}`,
        desc: `+${inc}kg Max-Gewicht in ${diffWeeks} Wochen!`,
        icon: '📈'
      });
    }
  });
  
  // Konsistenz Milestone
  if (db.workouts.length >= 5) {
    const sortedW = [...db.workouts].sort((a,b) => new Date(a.startTime||a.date).getTime() - new Date(b.startTime||b.date).getTime());
    const firstW = sortedW[0];
    const lastW = sortedW[sortedW.length-1];
    const diffTime = Math.abs(new Date(lastW.startTime||lastW.date).getTime() - new Date(firstW.startTime||firstW.date).getTime());
    const diffWeeks = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)));
    
    milestones.push({
      title: 'Konsistenz',
      desc: `${db.workouts.length} Workouts in ${diffWeeks} Wochen geloggt!`,
      icon: '🔥'
    });
  }
  
  if (milestones.length === 0) {
    container.innerHTML = `<div style="font-size:13px;color:var(--muted);text-align:center;padding:12px;">Trainiere weiter für Meilensteine!</div>`;
    return;
  }
  
  container.innerHTML = milestones.map(m => `
    <div style="background:var(--bg);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:24px;">${m.icon}</div>
      <div>
        <div style="font-weight:700;font-size:14px;color:var(--text);">${m.title}</div>
        <div style="font-size:12px;color:var(--muted);">${m.desc}</div>
      </div>
    </div>
  `).join('');
}
let _progressTemplateFilter = null;

// C5: this-week training volume grouped by muscle group (exercise category).
function renderWeeklyVolume() {
  const host = document.getElementById('weeklyVolumeSection');
  if (!host) return;
  const de = lang !== 'en';
  // Monday-based current week start
  const wkStart = (typeof _currentWeekKey === 'function')
    ? _currentWeekKey()
    : (() => { const d = new Date(); d.setHours(0,0,0,0); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.getTime(); })();

  const vol = {}; // category -> volume
  (db.workouts || []).forEach(w => {
    const ts = w.startTime || w.date;
    if (!ts || ts < wkStart) return;
    (w.exercises || []).forEach(e => {
      const ex = e.isCustom ? null : getEx(e.exId);
      const cat = e.isCustom ? (e.customCategory || 'Sonstige') : (ex ? ex.category : 'Sonstige');
      if (getCatType(cat) !== 'strength') return;
      let v = 0;
      (e.sets || []).forEach(s => { v += (Number(s.weight) || 0) * (Number(s.reps) || 0); });
      if (v > 0) vol[cat] = (vol[cat] || 0) + v;
    });
  });

  const entries = Object.entries(vol).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    host.innerHTML = `<div class="prog-cat-group" style="padding:12px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${de ? 'Wochenvolumen pro Muskelgruppe' : 'Weekly volume per muscle group'}</div>
      <div style="font-size:13px;color:var(--muted);">${de ? 'Diese Woche noch kein Kraft-Volumen.' : 'No strength volume this week yet.'}</div>
    </div>`;
    return;
  }
  const max = entries[0][1];
  const rows = entries.map(([cat, v]) => {
    const label = (t('cats') && t('cats')[cat]) ? t('cats')[cat] : cat;
    const pct = Math.max(4, Math.round((v / max) * 100));
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
        <span style="font-weight:600;">${label}</span>
        <span style="color:var(--muted);">${fmtWeightBig(v)}</span>
      </div>
      <div style="height:8px;background:var(--surface2);border-radius:6px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:6px;"></div>
      </div>
    </div>`;
  }).join('');
  host.innerHTML = `<div class="prog-cat-group" style="padding:14px;">
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">${de ? 'Wochenvolumen pro Muskelgruppe' : 'Weekly volume per muscle group'}</div>
    ${rows}
  </div>`;
}

function renderExerciseProgressTracker() {
  renderWeeklyVolume();
  const progList  = document.getElementById('exerciseProgressTracker');
  if(!progList) return;
  const activeExs = db.exercises.filter(ex => db.workouts.some(w => w.exercises.some(e => e.exId === ex.id)));

  // Build template filter dropdown
  let filterHtml = '';
  const templatesWithWorkouts = (db.templates || []).filter(t => db.workouts.some(w => w.templateId === t.id));
  if (templatesWithWorkouts.length > 0) {
    filterHtml = `<div class="prog-filter-bar">
      <select class="form-input prog-filter-select" id="progressTemplateFilter" onchange="_progressTemplateFilter=this.value||null;renderExerciseProgressTracker();">
        <option value="">Alle Vorlagen (Gesamtfortschritt)</option>
        ${templatesWithWorkouts.map(t => `<option value="${t.id}" ${_progressTemplateFilter === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>`;
  }

  if (activeExs.length === 0) {
    progList.innerHTML = filterHtml + `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📈</div><div class="empty-text">Noch keine Trainingsdaten für Übungen verfügbar.</div></div>`;
    return;
  }

  // Group by category
  const cats = [...new Set(activeExs.map(e => e.category))];
  const CAT_ORDER = ['Brust', 'Rücken', 'Beine', 'Schultern', 'Arme', 'Core', 'Cardio', 'Dehnen'];
  cats.sort((a,b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    return (ia===-1?99:ia) - (ib===-1?99:ib);
  });
  
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';

  progList.innerHTML = filterHtml + cats.map(cat => {
    const type     = getCatType(cat);
    const catClass = getCatClass(type);
    const catLabel = t('cats')[cat] || cat;
    const exs      = activeExs.filter(e => e.category === cat);
    // Sort exercises alphabetically
    exs.sort((a,b) => a.name.localeCompare(b.name));
    
    const catId    = 'progCat_' + cat.replace(/[^a-z]/gi, '');
    const isOpen   = localStorage.getItem('gymtrack_acc_' + cat) === 'true';

    const exCards = exs.map(ex => _buildExCard(ex, type, locale, catClass)).filter(Boolean).join('');
    if (!exCards) return '';
    return `<div class="prog-cat-group">
      <div class="prog-cat-header" onclick="toggleProgCat('${catId}', '${cat}')">
        <span class="cat-badge ${catClass}">${catLabel}</span>
        <span class="prog-cat-count">${exs.length} ${t('exercises')}</span>
        <span class="prog-cat-chevron" id="${catId}_chevron" style="transform:${isOpen ? 'rotate(180deg)' : 'none'};transition:0.2s;">▾</span>
      </div>
      <div class="prog-cat-body" id="${catId}" style="display:${isOpen ? 'block' : 'none'};">${exCards}</div>
    </div>`;
  }).filter(Boolean).join('');
}

window.toggleProgCat = function(id, rawCat) {
  const body    = document.getElementById(id);
  const chevron = document.getElementById(id + '_chevron');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display    = open ? 'none' : 'block';
  if (chevron) {
     chevron.style.transform = open ? 'none' : 'rotate(180deg)';
  }
  localStorage.setItem('gymtrack_acc_' + rawCat, open ? 'false' : 'true');
}

function _buildExCard(ex, type, locale, catClass) {
  let workoutsWithEx = db.workouts
    .filter(w => w.exercises.some(e => e.exId === ex.id))
    .sort((a, b) => new Date(a.date||a.startTime).getTime() - new Date(b.date||b.startTime).getTime());

  // Apply template filter if active
  if (_progressTemplateFilter) {
    workoutsWithEx = workoutsWithEx.filter(w => w.templateId === _progressTemplateFilter);
  }

  if (workoutsWithEx.length === 0) return '';

  const last      = workoutsWithEx[workoutsWithEx.length - 1];
  const lastEntry = last.exercises.find(e => e.exId === ex.id);
  const d         = new Date(last.date||last.startTime).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  // Build sparkline data (last 8 sessions)
  const sessions = workoutsWithEx.slice(-8);
  let sparkValues = [];
  let mainValue = '', mainUnit = '', progressTag = '';

  if (type === 'cardio') {
    sparkValues = sessions.map(w => {
      const e = w.exercises.find(x => x.exId === ex.id);
      return e ? Math.max(...e.sets.map(s => s.km)) : 0;
    });
    const maxKm = Math.max(...lastEntry.sets.map(s => s.km));
    mainValue = maxKm; mainUnit = 'km';
    if (workoutsWithEx.length >= 2) {
      const prev    = workoutsWithEx[workoutsWithEx.length - 2];
      const prevMax = Math.max(...prev.exercises.find(e => e.exId === ex.id).sets.map(s => s.km));
      const diff    = +(maxKm - prevMax).toFixed(2);
      if (diff > 0)      progressTag = `<span class="progress-tag up">↑ +${diff}${t('distanceUp')}</span>`;
      else if (diff < 0) progressTag = `<span class="progress-tag down">↓ ${diff}${t('distanceDown')}</span>`;
      else               progressTag = `<span class="progress-tag same">${t('same')}</span>`;
    }
  } else if (type === 'stretch') {
    sparkValues = sessions.map(w => {
      const e = w.exercises.find(x => x.exId === ex.id);
      return e ? e.sets.reduce((a, s) => a + s.minutes, 0) : 0;
    });
    const total = lastEntry.sets.reduce((a, s) => a + s.minutes, 0);
    mainValue = total; mainUnit = t('colMin');
    if (workoutsWithEx.length >= 2) {
      const prev      = workoutsWithEx[workoutsWithEx.length - 2];
      const prevTotal = prev.exercises.find(e => e.exId === ex.id).sets.reduce((a, s) => a + s.minutes, 0);
      const diff      = +(total - prevTotal).toFixed(1);
      if (diff > 0)      progressTag = `<span class="progress-tag up">↑ +${diff}${t('longerStretch')}</span>`;
      else if (diff < 0) progressTag = `<span class="progress-tag down">↓ ${diff}${t('shorterStretch')}</span>`;
      else               progressTag = `<span class="progress-tag same">${t('same')}</span>`;
    }
  } else if (type === 'isometric') {
    sparkValues = sessions.map(w => {
      const e = w.exercises.find(x => x.exId === ex.id);
      return e ? Math.max(0, ...e.sets.map(s => Number(s.secs) || 0)) : 0;
    });
    const maxSecs = Math.max(0, ...lastEntry.sets.map(s => Number(s.secs) || 0));
    mainValue = maxSecs; mainUnit = 's';
    if (workoutsWithEx.length >= 2) {
      const prev     = workoutsWithEx[workoutsWithEx.length - 2];
      const prevMax  = Math.max(0, ...prev.exercises.find(e => e.exId === ex.id).sets.map(s => Number(s.secs) || 0));
      const diff     = maxSecs - prevMax;
      if (diff > 0)      progressTag = `<span class="progress-tag up">↑ +${diff}s</span>`;
      else if (diff < 0) progressTag = `<span class="progress-tag down">↓ ${diff}s</span>`;
      else               progressTag = `<span class="progress-tag same">${t('same')}</span>`;
    }
  } else {
    sparkValues = sessions.map(w => {
      const e = w.exercises.find(x => x.exId === ex.id);
      return e ? Math.max(...e.sets.map(s => s.weight)) : 0;
    });
    const maxW = Math.max(...lastEntry.sets.map(s => s.weight));
    mainValue = fmtWeightNum(maxW); mainUnit = unitLabel();
    if (workoutsWithEx.length >= 2) {
      const prev     = workoutsWithEx[workoutsWithEx.length - 2];
      const prevEntry = prev.exercises.find(e => e.exId === ex.id);
      const prevMax  = Math.max(...prevEntry.sets.map(s => s.weight));
      const totalReps = lastEntry.sets.reduce((a, s) => a + s.reps, 0);
      const prevReps  = prevEntry.sets.reduce((a, s) => a + s.reps, 0);
      const wDiff = maxW - prevMax, rDiff = totalReps - prevReps;
      if (wDiff > 0)      progressTag = `<span class="progress-tag up">↑ +${fmtWeight(wDiff, {noUnit:true})} ${unitLabel()}</span>`;
      else if (wDiff < 0) progressTag = `<span class="progress-tag down">↓ ${fmtWeight(wDiff, {noUnit:true})} ${unitLabel()}</span>`;
      else if (rDiff > 0) progressTag = `<span class="progress-tag up">↑ +${rDiff}${t('repsUp')}</span>`;
      else if (rDiff < 0) progressTag = `<span class="progress-tag down">↓ ${rDiff}${t('repsDown')}</span>`;
      else                progressTag = `<span class="progress-tag same">${t('same')}</span>`;
    }
  }

  // Build the last sets detail
  let setsHtml = '';
  if (type === 'cardio') {
    setsHtml = lastEntry.sets.map(s => `<span class="set-badge">${s.km}km ${s.time} (${s.pace})</span>`).join('');
  } else if (type === 'stretch') {
    setsHtml = lastEntry.sets.map(s => `<span class="set-badge">${s.minutes} ${t('colMin')}</span>`).join('');
  } else if (type === 'isometric') {
    setsHtml = lastEntry.sets.map(s => `<span class="set-badge">${_fmtIsoSet(s)}</span>`).join('');
  } else {
    const prevSets = workoutsWithEx.length >= 2
      ? workoutsWithEx[workoutsWithEx.length - 2].exercises.find(e => e.exId === ex.id).sets
      : null;
    let setCounter = 0;
    setsHtml = lastEntry.sets.map((s, i) => {
      if (setCounter >= 5) return ''; setCounter++;
      let diff = '';
      if (prevSets && prevSets[i]) {
        const wD = s.weight - prevSets[i].weight, rD = s.reps - prevSets[i].reps;
        if (wD > 0)      diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">+${fmtWeight(wD, {noUnit:true})}${unitLabel()}</span>`;
        else if (wD < 0) diff = `<span style="color:var(--accent2);font-size:11px;margin-left:4px;">${fmtWeight(wD, {noUnit:true})}${unitLabel()}</span>`;
        else if (rD > 0) diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">+${rD} ${t('reps')}</span>`;
        else if (rD < 0) diff = `<span style="color:var(--accent2);font-size:11px;margin-left:4px;">${rD} ${t('reps')}</span>`;
      } else if (prevSets && !prevSets[i]) {
        diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">${t('newBadge')}</span>`;
      }
      return `<div style="display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
        <span style="color:var(--muted);font-size:11px;margin-right:4px;">S${i + 1}</span>${fmtWeight(s.weight)} × ${s.reps}${diff}
      </div>`;
    }).join('');
  }

  const sparkSvg = _buildSparkline(sparkValues, type);

  return `<div class="prog-ex-card" onclick="openExGraph('${ex.id}')" style="cursor:pointer;" title="Klicke für Fortschrittsgraph">
    <div class="prog-ex-top">
      <div class="prog-ex-info">
        <div style="font-weight:600;font-size:15px;">${ex.name}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">${d} · ${workoutsWithEx.length}× ${t('trainedX').replace('×','').trim()}</div>
        ${progressTag}
      </div>
      <div class="prog-ex-right">
        <div style="text-align:right;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:30px;color:var(--accent);line-height:1;">${mainValue}</div>
          <div style="font-size:11px;color:var(--muted);">${mainUnit}</div>
        </div>
        ${sparkSvg ? `<div class="prog-sparkline">${sparkSvg}</div>` : ''}
      </div>
    </div>
    ${setsHtml ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${setsHtml}</div>` : ''}
  </div>`;
}

function _buildSparkline(values, type) {
  if (values.length < 2) return '';
  const max = Math.max(...values);
  if (max === 0) return '';
  const color = type === 'cardio' ? 'orange' : type === 'stretch' ? '#64c8ff' : 'var(--accent)';
  const barW = 8, gap = 3, h = 40;
  const bars = values.map((v, i) => {
    const bh = Math.max(3, Math.round((v / max) * h));
    const y  = h - bh;
    const isLast = i === values.length - 1;
    return `<rect x="${i * (barW + gap)}" y="${y}" width="${barW}" height="${bh}" rx="3"
      fill="${color}" opacity="${isLast ? '1' : '0.35'}"/>`;
  }).join('');
  const totalW = values.length * (barW + gap) - gap;
  return `<svg width="${totalW}" height="${h}" viewBox="0 0 ${totalW} ${h}" style="display:block;">${bars}</svg>`;
}

let _exGraphMetric = 'weight';
let _exGraphExId   = null;

// "mm:ss" (or plain minutes) -> minutes as a float.
function _timeStrToMin(str) {
  if (!str) return 0;
  const s = String(str).trim();
  if (s.includes(':')) {
    const p = s.split(':');
    return (parseInt(p[0], 10) || 0) + ((parseInt(p[1], 10) || 0) / 60);
  }
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Total logged time (minutes) for one exercise entry: stretch minutes, cardio
// durations and any stopwatch time (timerSec) all count. Task 2.
function _exEntryMinutes(entry) {
  let mins = 0;
  (entry.sets || []).forEach(s => {
    if (s.minutes != null && s.minutes !== '') mins += Number(s.minutes) || 0;
    else if (s.secs != null && s.secs !== '') mins += (Number(s.secs) || 0) / 60;
    else if (s.time) mins += _timeStrToMin(s.time);
  });
  if (entry.timerSec) mins += entry.timerSec / 60;
  return mins;
}

// Metric definitions per exercise type. Each returns the session value (or 0).
// Task 2 adds time/distance/pace tracking so time-based exercises get a graph
// instead of the old weight-only chart that showed "not enough data".
const EX_GRAPH_METRICS = {
  strength: [
    { key: 'weight', de: 'Max. Gewicht', en: 'Max weight', unit: () => unitLabel(),
      val: e => { let v = 0; (e.sets || []).forEach(s => { if (s.type !== 'W' && Number(s.weight) > v) v = Number(s.weight); }); return v > 0 ? Number(fmtWeightNum(v)) : 0; } },
    { key: 'e1rm', de: 'e1RM', en: 'e1RM', unit: () => unitLabel(),
      val: e => { const b = (typeof _bestE1rm === 'function') ? _bestE1rm(e.sets) : 0; return b > 0 ? Number(fmtWeightNum(b)) : 0; } },
    { key: 'reps', de: 'Wdh. gesamt', en: 'Total reps', unit: () => '',
      val: e => (e.sets || []).reduce((a, s) => a + (Number(s.reps) || 0), 0) }
  ],
  cardio: [
    { key: 'km', de: 'Max. Distanz', en: 'Max distance', unit: () => 'km',
      val: e => { let v = 0; (e.sets || []).forEach(s => { if (Number(s.km) > v) v = Number(s.km); }); return v; } },
    { key: 'time', de: 'Zeit gesamt', en: 'Total time', unit: () => 'min',
      val: e => +_exEntryMinutes(e).toFixed(1) }
  ],
  stretch: [
    { key: 'time', de: 'Zeit gesamt', en: 'Total time', unit: () => 'min',
      val: e => +_exEntryMinutes(e).toFixed(1) }
  ],
  isometric: [
    { key: 'hold', de: 'Max. Haltezeit', en: 'Max hold', unit: () => 's',
      val: e => { let v = 0; (e.sets || []).forEach(s => { if (Number(s.secs) > v) v = Number(s.secs); }); return v; } },
    { key: 'load', de: 'Max. Last', en: 'Max load', unit: () => unitLabel(),
      val: e => { let v = 0; (e.sets || []).forEach(s => { if (s.type !== 'W' && Number(s.weight) > v) v = Number(s.weight); }); return v > 0 ? Number(fmtWeightNum(v)) : 0; } },
    { key: 'time', de: 'Zeit gesamt', en: 'Total time', unit: () => 'min',
      val: e => +_exEntryMinutes(e).toFixed(1) }
  ]
};

const _TIME_METRIC = { key: 'time', de: 'Zeit gesamt', en: 'Total time', unit: () => 'min', val: e => +_exEntryMinutes(e).toFixed(1) };

function _exGraphMetricsFor(type, exId) {
  const list = (EX_GRAPH_METRICS[type] || EX_GRAPH_METRICS.strength).slice();
  // If this exercise ever logged time (stopwatch/isometric hold) but sits in a
  // non-time category, still expose a time metric so it can be tracked. Task 2.
  if (!list.some(m => m.key === 'time') && exId) {
    const hasTime = db.workouts.some(w => (w.exercises || []).some(e =>
      e.exId === exId && ((e.timerSec > 0) || (e.sets || []).some(s => (s.minutes != null && s.minutes !== '') || (s.secs != null && s.secs !== '') || s.time))));
    if (hasTime) list.push(_TIME_METRIC);
  }
  return list;
}

function setExGraphMetric(metric) {
  _exGraphMetric = metric;
  document.querySelectorAll('.exg-metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === metric));
  if (_exGraphExId) _renderExGraph();
}

function _renderExGraphToggle(type) {
  const host = document.getElementById('exGraphToggle');
  if (!host) return;
  const metrics = _exGraphMetricsFor(type, _exGraphExId);
  // Reset to a valid default metric for this type if the current one isn't offered.
  if (!metrics.some(m => m.key === _exGraphMetric)) _exGraphMetric = metrics[0].key;
  host.style.display = metrics.length > 1 ? 'flex' : 'none';
  host.innerHTML = metrics.map(m =>
    `<button class="exg-metric-btn${m.key === _exGraphMetric ? ' active' : ''}" data-metric="${m.key}" onclick="setExGraphMetric('${m.key}')">${lang === 'en' ? m.en : m.de}</button>`
  ).join('');
}

function _renderExGraph() {
  const exId = _exGraphExId;
  const ex = db.exercises.find(x => x.id === exId);
  if (!ex) return;
  document.getElementById('exGraphTitle').textContent = ex.name;
  const chartContainer = document.getElementById('exGraphChart');
  chartContainer.innerHTML = '';

  const type    = getCatType(ex.category);
  const metrics = _exGraphMetricsFor(type, exId);
  const metric  = metrics.find(m => m.key === _exGraphMetric) || metrics[0];

  const dataPoints = [];
  const sortedWorkouts = [...db.workouts].sort((a, b) => (a.startTime || a.date) - (b.startTime || b.date));

  sortedWorkouts.forEach(w => {
    if (!w.exercises) return;
    const match = w.exercises.find(e => e.exId === exId);
    if (!match) return;
    const hasData = (match.sets && match.sets.length) || match.timerSec;
    if (!hasData) return;
    const val = metric.val(match);
    if (val > 0) dataPoints.push({ date: new Date(w.startTime || w.date), y: val });
  });

  if (dataPoints.length < 2) {
    chartContainer.innerHTML = `<div style="text-align:center;width:100%;color:var(--muted);font-size:13px;padding:40px 0;">${lang === 'en' ? 'Not enough data (min. 2)' : 'Nicht genug Daten (min. 2)'}</div>`;
    return;
  }

  const drawPoints = dataPoints.slice(-12);
  const unit   = metric.unit ? metric.unit() : '';
  const points = drawPoints.map(d => ({ x: `${d.date.getDate()}.${d.date.getMonth() + 1}.`, y: d.y }));
  const color  = type === 'cardio' ? 'orange' : type === 'stretch' ? '#64c8ff' : type === 'isometric' ? '#b47cff' : 'var(--accent)';
  chartContainer.innerHTML = _buildLineChart(points, { width: 320, height: 180, color, unit });
}

window.openExGraph = function(exId) {
  const ex = db.exercises.find(x => x.id === exId);
  if (!ex) return;
  _exGraphExId = exId;
  _renderExGraphToggle(getCatType(ex.category));
  _renderExGraph();
  openModal('exGraphModal');
};
window.setExGraphMetric = setExGraphMetric;
