/* =============================================
   GYMTRACK — Programs (Multi-week)
   ============================================= */

let currentProgId = null;

function renderPrograms() {
  const list = document.getElementById('programsList');
  if (!list) return;
  list.innerHTML = '';
  
  if (!db.programs || db.programs.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">${t('noEntries') || 'Keine Programme vorhanden'}</div>`;
    return;
  }
  
  db.programs.forEach(p => {
    const isActive = db.activeProgram && db.activeProgram.id === p.id;
    const border = isActive ? 'border:1px solid var(--accent);' : 'border:1px solid transparent;';
    const tag = isActive ? `<span style="background:var(--accent);color:#000;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:8px;">AKTIV</span>` : '';
    
    // Quick summarize days
    let summaries = p.days.map((d, i) => {
      const tpl = db.templates.find(x => x.id === d.templateId);
      return `<div style="font-size:12px;color:var(--muted);">Tag ${i+1}: ${tpl ? tpl.name : 'Unbekannt'}</div>`;
    }).join('');
    
    list.innerHTML += `
      <div class="card" style="margin-bottom:12px;${border};cursor:pointer;" onclick="openEditProgram('${p.id}')">
        <div style="font-weight:700;font-size:16px;display:flex;align-items:center;">
          ${p.name}${tag}
        </div>
        <div style="margin-top:8px;">${summaries}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          ${isActive 
             ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();quitProgram()">Programm beenden</button>` 
             : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openStartProgramModal('${p.id}')">Aktivieren</button>`
          }
        </div>
      </div>
    `;
  });
}

let pendingStartProgramId = null;
function openStartProgramModal(id) {
  pendingStartProgramId = id;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dEl = document.getElementById('progStartDate');
  if (dEl) dEl.value = `${y}-${m}-${day}`;
  openModal('startProgramModal');
}

function confirmStartProgram() {
  const dEl = document.getElementById('progStartDate');
  if (!dEl || !dEl.value) { alert('Bitte ein valides Datum wählen'); return; }
  setProgramActive(pendingStartProgramId, dEl.value);
  closeModal('startProgramModal');
}

function updateActiveProgramBanner() {
  const banner = document.getElementById('activeProgramBanner');
  if (!banner) return;
  
  if (!db.activeProgram || !db.activeProgram.id) {
    banner.style.display = 'none';
    return;
  }
  
  const prog = db.programs.find(x => x.id === db.activeProgram.id);
  if (!prog || !prog.days.length) {
    db.activeProgram = null;
    save();
    banner.style.display = 'none';
    return;
  }
  
  // Protect legacy programs
  if (!db.activeProgram.startDate) {
     const dummyStart = new Date();
     dummyStart.setDate(dummyStart.getDate() - (db.activeProgram.currentDayIndex || 0));
     const y = dummyStart.getFullYear();
     const m = String(dummyStart.getMonth() + 1).padStart(2, '0');
     const d = String(dummyStart.getDate()).padStart(2, '0');
     db.activeProgram.startDate = `${y}-${m}-${d}`;
     save();
  }
  
  // Calculate relative day
  const startD = new Date(db.activeProgram.startDate);
  startD.setHours(0,0,0,0);
  const now = new Date();
  now.setHours(0,0,0,0);
  const diffTime = now - startD;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // If diffDays is negative, program hasn't started yet
  if (diffDays < 0) {
    document.getElementById('activeProgramName').textContent = prog.name;
    document.getElementById('activeProgramNext').textContent = `Beginnt in ${Math.abs(diffDays)} Tag(en)`;
    banner.style.display = 'block';
    return;
  }
  
  // Wrap around based on program length
  const currDayIndex = diffDays % prog.days.length;
  let nextDay = prog.days[currDayIndex];
  
  const tpl = db.templates.find(x => x.id === nextDay.templateId);
  const tplName = tpl ? tpl.name : 'Gelöschte Vorlage';
  
  let typeObj = tpl ? (tpl.type || 'training') : 'training';
  let typeLabel = typeObj === 'training' ? 'TRAINING' : typeObj === 'rest' ? 'ACTIVE REST' : 'COUCH POTATO';
  const typeColors = { 'training': 'var(--accent)', 'rest': '#f5a623', 'couch': '#d0021b' };
  
  document.getElementById('activeProgramName').textContent = prog.name;
  document.getElementById('activeProgramNext').innerHTML = `Heute: Tag ${currDayIndex + 1} &mdash; <span style="color:${typeColors[typeObj]};font-weight:700;">${tplName} (${typeLabel})</span>`;
  banner.style.display = 'block';
}

function setProgramActive(id, startDateIsoStr) {
  db.activeProgram = { id: id, startDate: startDateIsoStr, currentDayIndex: 0 };
  save();
  renderPrograms();
  updateActiveProgramBanner();
  showToast('Programm aktiviert');
}

function quitProgram() {
  db.activeProgram = null;
  save();
  renderPrograms();
  updateActiveProgramBanner();
  showToast('Programm beendet');
}

function startNextProgramDay() {
  if (!db.activeProgram || db.currentWorkout) return;
  const prog = db.programs.find(x => x.id === db.activeProgram.id);
  if (!prog || !prog.days.length || !db.activeProgram.startDate) return;
  
  const startD = new Date(db.activeProgram.startDate);
  startD.setHours(0,0,0,0);
  const now = new Date();
  now.setHours(0,0,0,0);
  const diffTime = now - startD;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    alert('Dieses Programm hat noch nicht begonnen.');
    return;
  }
  
  const currDayIndex = diffDays % prog.days.length;
  const nextDay = prog.days[currDayIndex];
  if (!nextDay) return;
  
  const tpl = db.templates.find(x => x.id === nextDay.templateId);
  if (!tpl) {
    alert('Die Vorlage für diesen Tag wurde gelöscht.');
    return;
  }
  
  // Even if it's a rest day, we could start the workout with the rest template or not
  if (tpl.type === 'couch' || tpl.type === 'rest') {
     if(!confirm(`Heute ist als "${tpl.type === 'rest' ? 'Active Rest' : 'Couch Potato'}" markiert. Dennoch ein Training dafür dokumentieren?`)) {
       return;
     }
  }
  
  // Create a workout from the template
  const wo = {
    id: uid(),
    startTime: new Date().toISOString(),
    endTime: null,
    exercises: JSON.parse(JSON.stringify(tpl.exercises || [])) // deep copy template
  };
  
  // Add reference to track that this came from a program day
  wo.programDayId = `${prog.id}_day${currDayIndex}`;
  
  // Clear any existing timerSec or completed sets
  wo.exercises.forEach(e => {
    e.sets = [];
    e.timerSec = 0;
    e.hiitSets = [];
  });
  
  db.currentWorkout = wo;
  save();
  
  updateActiveProgramBanner();
  initUI();
}

/* --- Program Builder Modal --- */

function openCreateProgram() {
  currentProgId = null;
  document.getElementById('progName').value = '';
  document.getElementById('deleteProgBtn').style.display = 'none';
  document.getElementById('programModalTitle').textContent = 'Programm erstellen';
  
  document.getElementById('progDaysList').innerHTML = '';
  addProgramDay(); // Start with 1 day
  
  openModal('programModal');
}

function openEditProgram(id) {
  const p = db.programs.find(x => x.id === id);
  if (!p) return;
  currentProgId = id;
  
  document.getElementById('programModalTitle').textContent = 'Programm bearbeiten';
  document.getElementById('progName').value = p.name;
  document.getElementById('deleteProgBtn').style.display = 'block';
  
  const list = document.getElementById('progDaysList');
  list.innerHTML = '';
  
  p.days.forEach(d => {
    addProgramDay(d.templateId);
  });
  
  openModal('programModal');
}

function addProgramDay(selectedTemplateId = '') {
  const list = document.getElementById('progDaysList');
  const div = document.createElement('div');
  div.className = 'card prog-day-row';
  div.style.padding = '10px';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '8px';
  
  const dayIndex = list.children.length + 1;
  const lbl = document.createElement('div');
  lbl.style.fontWeight = '700';
  lbl.style.width = '50px';
  lbl.textContent = `Tag ${dayIndex}`;
  
  const sel = document.createElement('select');
  sel.className = 'form-input prog-day-select';
  sel.style.margin = '0';
  
  // Populate templates
  sel.innerHTML = `<option value="">-- Vorlage wählen --</option>`;
  db.templates.forEach(t => {
    sel.innerHTML += `<option value="${t.id}" ${t.id === selectedTemplateId ? 'selected' : ''}>${t.name}</option>`;
  });
  
  const delBtn = document.createElement('button');
  delBtn.className = 'close-btn'; // Restyling the X button
  delBtn.style.padding = '6px';
  delBtn.textContent = '✕';
  delBtn.onclick = () => {
    div.remove();
    renumberProgramDays();
  };
  
  div.appendChild(lbl);
  div.appendChild(sel);
  div.appendChild(delBtn);
  list.appendChild(div);
}

function renumberProgramDays() {
  const list = document.getElementById('progDaysList');
  Array.from(list.children).forEach((row, idx) => {
    row.children[0].textContent = `Tag ${idx + 1}`;
  });
}

function saveProgram() {
  const name = document.getElementById('progName').value.trim();
  if (!name) return alert('Name fehlt');
  
  const daySelects = document.querySelectorAll('.prog-day-select');
  const days = [];
  
  daySelects.forEach(sel => {
    if (sel.value) {
      days.push({ templateId: sel.value });
    }
  });
  
  if (days.length === 0) return alert('Mindestens ein Tag muss eine Vorlage haben');
  
  if (currentProgId) {
    const p = db.programs.find(x => x.id === currentProgId);
    if (p) {
      p.name = name;
      p.days = days;
    }
  } else {
    db.programs.push({
      id: uid(),
      name: name,
      days: days
    });
  }
  
  save();
  closeModal('programModal');
  renderPrograms();
  updateActiveProgramBanner();
}

function deleteProgram() {
  if (!currentProgId) return;
  if (confirm('Programm wirklich löschen?')) {
    db.programs = db.programs.filter(x => x.id !== currentProgId);
    if (db.activeProgram && db.activeProgram.id === currentProgId) {
      db.activeProgram = null;
    }
    save();
    closeModal('programModal');
    renderPrograms();
    updateActiveProgramBanner();
  }
}
