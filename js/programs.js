/* =============================================
   GYMTRACK — Programs (Multi-week)
   ============================================= */

let currentProgId = null;

function renderPrograms(searchQuery = '') {
  const list = document.getElementById('programsList');
  if (!list) return;
  list.innerHTML = '';
  
  const q = searchQuery.toLowerCase().trim();
  let filteredPrograms = db.programs || [];
  
  if (q) {
    filteredPrograms = filteredPrograms.filter(p => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.schedule) {
        return Object.values(p.schedule).some(tplId => {
          const tpl = db.templates.find(x => String(x.id) === String(tplId));
          return tpl && tpl.name.toLowerCase().includes(q);
        });
      }
      return false;
    });

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

    filteredPrograms.sort((a, b) => {
      const scoreA = getRelevanceScore(a.name, q);
      const scoreB = getRelevanceScore(b.name, q);
      if (scoreA !== scoreB) return scoreB - scoreA;

      const aHasTmplStart = a.schedule ? Object.values(a.schedule).some(tplId => {
        const tpl = db.templates.find(x => String(x.id) === String(tplId));
        return tpl && tpl.name.toLowerCase().startsWith(q);
      }) : false;
      const bHasTmplStart = b.schedule ? Object.values(b.schedule).some(tplId => {
        const tpl = db.templates.find(x => String(x.id) === String(tplId));
        return tpl && tpl.name.toLowerCase().startsWith(q);
      }) : false;
      if (aHasTmplStart !== bHasTmplStart) return bHasTmplStart ? 1 : -1;

      return 0;
    });
  }
  
  if (filteredPrograms.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">${t('noEntries') || 'Keine Programme vorhanden'}</div>`;
    return;
  }
  
  filteredPrograms.forEach(p => {
    const isActive = db.activeProgram && String(db.activeProgram.id) === String(p.id);
    const border = isActive ? 'border:1px solid var(--accent);' : 'border:1px solid transparent;';
    const tag = isActive ? `<span style="background:var(--accent);color:#000;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:8px;">AKTIV</span>` : '';

    // Quick summarize days (1=Mon, 2=Tue... 0=Sun)
    const displayDays = [1, 2, 3, 4, 5, 6, 0];
    let summaries = displayDays.map(d => {
      const tplId = p.schedule ? p.schedule[d] : null;
      if (!tplId) return '';
      const tpl = db.templates.find(x => String(x.id) === String(tplId));
      const dayName = t('weekDays')[d].substr(0, 2); // e.g. Mo, Di
      return `<div style="font-size:12px;color:var(--muted);"><span style="display:inline-block;width:30px;font-weight:600;">${dayName}</span> ${tpl ? tpl.name : 'Unbekannt'}</div>`;
    }).filter(Boolean).join('');
    
    if (!summaries) summaries = `<div style="font-size:12px;color:var(--muted);">Keine Workouts geplant</div>`;

    list.innerHTML += `
      <div class="card" style="margin-bottom:12px;${border};cursor:pointer;" onclick="openEditProgram('${p.id}')">
        <div style="font-weight:700;font-size:16px;display:flex;align-items:center;">
          ${p.name}${tag}
        </div>
        <div style="margin-top:8px;">${summaries}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          ${isActive
             ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();quitProgram()">Programm beenden</button>`
             : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();activateProgram('${p.id}')">Aktivieren</button>`
          }
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openProgramShare('${p.id}')">📤 Teilen</button>
        </div>
      </div>
    `;
  });
}

function activateProgram(id) {
  db.activeProgram = { id: String(id) };
  save();
  renderPrograms();
  updateActiveProgramBanner();
  showToast(lang==='en'?'Program activated':'Programm aktiviert');
}

function updateActiveProgramBanner() {
  const banner = document.getElementById('activeProgramBanner');
  if (!banner) return;
  
  if (!db.activeProgram || !db.activeProgram.id) {
    banner.style.display = 'none';
    return;
  }
  
  const prog = db.programs.find(x => String(x.id) === String(db.activeProgram.id));
  if (!prog || !prog.schedule) {
    db.activeProgram = null;
    save();
    banner.style.display = 'none';
    return;
  }
  
  const todayDayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayTplId = prog.schedule[todayDayIndex];
  
  document.getElementById('activeProgramName').textContent = prog.name;
  
  if (!todayTplId) {
    document.getElementById('activeProgramNext').innerHTML = `Heute: <span style="color:var(--muted);font-weight:700;">Ruhetag</span>`;
    banner.style.display = 'block';
    return;
  }
  
  const tpl = db.templates.find(x => String(x.id) === String(todayTplId));
  const tplName = tpl ? tpl.name : 'Gelöschte Vorlage';
  
  let typeObj = tpl ? (tpl.type || 'training') : 'training';
  let typeLabel = typeObj === 'training' ? 'TRAINING' : typeObj === 'rest' ? 'ACTIVE REST' : 'COUCH POTATO';
  const typeColors = { 'training': 'var(--accent)', 'rest': '#f5a623', 'couch': '#d0021b' };
  
  document.getElementById('activeProgramNext').innerHTML = `Heute: <span style="color:${typeColors[typeObj]};font-weight:700;">${tplName} (${typeLabel})</span>`;
  banner.style.display = 'block';
}

function quitProgram() {
  db.activeProgram = null;
  save();
  renderPrograms();
  updateActiveProgramBanner();
  showToast(lang==='en'?'Program ended':'Programm beendet');
}

async function startNextProgramDay() {
  if (!db.activeProgram || db.currentWorkout) return;
  const prog = db.programs.find(x => String(x.id) === String(db.activeProgram.id));
  if (!prog || !prog.schedule) return;
  
  const todayDayIndex = new Date().getDay();
  const todayTplId = prog.schedule[todayDayIndex];
  
  if (!todayTplId) {
    showAlert('Heute ist ein Ruhetag! Kein Workout geplant.');
    return;
  }

  const tpl = db.templates.find(x => String(x.id) === String(todayTplId));
  if (!tpl) {
    showAlert(lang === 'en' ? 'The template for today was deleted.' : 'Die Vorlage für heute wurde gelöscht.');
    return;
  }

  if (tpl.type === 'couch' || tpl.type === 'rest') {
     if(!await showConfirm(`Heute ist als "${tpl.type === 'rest' ? 'Active Rest' : 'Couch Potato'}" markiert. Dennoch ein Training dafür dokumentieren?`, { danger: false, confirmText: 'Ja' })) {
       return;
     }
  }
  
  const wo = {
    id: uid(),
    date: Date.now(),
    startTime: Date.now(),
    endTime: null,
    exercises: (tpl.exerciseIds || []).map(exId => ({ exId, sets: [] }))
  };
  
  wo.programDayId = `${prog.id}_wday${todayDayIndex}`;
  wo.programId = prog.id;
  wo.templateId = todayTplId;
  
  db.currentWorkout = wo;
  save();
  
  updateActiveProgramBanner();
  initUI();
}

/* --- Program Builder Modal --- */

function _buildProgramDayRows(schedule = {}) {
  const list = document.getElementById('progDaysList');
  list.innerHTML = '';
  // 1=Mon, 2=Tue... 6=Sat, 0=Sun
  const displayDays = [1, 2, 3, 4, 5, 6, 0];
  
  let tmplOptions = `<option value="">-- Ruhetag --</option>`;
  db.templates.forEach(t => {
    tmplOptions += `<option value="${t.id}">${t.name}</option>`;
  });
  
  displayDays.forEach(d => {
    const dayName = t('weekDays')[d];
    const selTmpl = schedule[d] || '';
    
    const div = document.createElement('div');
    div.className = 'card prog-day-row';
    div.style.padding = '10px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    
    div.innerHTML = `
      <div style="font-weight:700;width:90px;">${dayName}</div>
      <select class="form-input prog-day-select" data-day="${d}" style="margin:0;">
        ${tmplOptions}
      </select>
    `;
    
    // Set selected value
    div.querySelector('select').value = selTmpl;
    list.appendChild(div);
  });
}

function openCreateProgram() {
  currentProgId = null;
  document.getElementById('progName').value = '';
  document.getElementById('deleteProgBtn').style.display = 'none';
  document.getElementById('programModalTitle').textContent = 'Programm erstellen';
  
  _buildProgramDayRows({});
  openModal('programModal');
}

function openEditProgram(id) {
  const p = db.programs.find(x => String(x.id) === String(id));
  if (!p) return;
  currentProgId = id;
  
  document.getElementById('programModalTitle').textContent = 'Programm bearbeiten';
  document.getElementById('progName').value = p.name;
  document.getElementById('deleteProgBtn').style.display = 'block';
  
  _buildProgramDayRows(p.schedule || {});
  openModal('programModal');
}

function saveProgram() {
  const name = document.getElementById('progName').value.trim();
  if (!name) return showAlert('Name fehlt');
  
  const daySelects = document.querySelectorAll('.prog-day-select');
  const schedule = {};
  let hasWorkout = false;
  
  daySelects.forEach(sel => {
    const dayIdx = sel.getAttribute('data-day');
    if (sel.value) {
      schedule[dayIdx] = sel.value;
      hasWorkout = true;
    }
  });
  
  if (!hasWorkout) return showAlert('Mindestens ein Tag muss eine Vorlage haben');
  
  if (currentProgId) {
    const p = db.programs.find(x => String(x.id) === String(currentProgId));
    if (p) {
      p.name = name;
      p.schedule = schedule;
    }
  } else {
    db.programs.push({
      id: uid(),
      name: name,
      schedule: schedule
    });
  }
  
  save();
  closeModal('programModal');
  renderPrograms();
  updateActiveProgramBanner();
}

async function deleteProgram() {
  if (!currentProgId) return;
  if (!await showConfirm('Programm wirklich löschen?')) return;
  db.programs = db.programs.filter(x => String(x.id) !== String(currentProgId));
  if (db.activeProgram && String(db.activeProgram.id) === String(currentProgId)) {
    db.activeProgram = null;
  }
  save();
  closeModal('programModal');
  renderPrograms();
  updateActiveProgramBanner();
}

async function openProgramShare(id) {
  const prog = db.programs.find(x => String(x.id) === String(id));
  if (!prog) return;

  // Collect all templates referenced by this program
  const tmplIds = [...new Set(Object.values(prog.schedule || {}))];
  const templates = tmplIds
    .map(tid => db.templates.find(t => String(t.id) === String(tid)))
    .filter(Boolean)
    .map(({ id, name, type, exerciseIds }) => ({ id, name, type: type || 'training', exerciseIds: exerciseIds || [] }));

  // Collect all exercises referenced by those templates
  const exIds = [...new Set(templates.flatMap(t => t.exerciseIds))];
  const exercises = exIds
    .map(eid => db.exercises.find(e => e.id === eid))
    .filter(Boolean)
    .map(({ id, name, category, notes }) => ({ id, name, category, ...(notes ? { notes } : {}) }));

  const payload = { v: 'p', p: { id: prog.id, name: prog.name, schedule: prog.schedule }, t: templates, e: exercises };
  const code = await compressPayload(payload);

  // Re-use the template share modal
  document.getElementById('tmplShareCode').value = code;
  document.getElementById('tmplShareName').textContent = prog.name;
  document.getElementById('tmplShareDesc').textContent = `${Object.values(prog.schedule || {}).length} Tage · ${templates.length} Vorlagen`;
  document.getElementById('tmplShareCopyConfirm').style.display = 'none';
  openModal('tmplShareModal');
}
