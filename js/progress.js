/* =============================================
   GYMTRACK — Progress & Measurements
   ============================================= */

let bodyMetricsChart = null; // We'll build a simple HTML-based bar chart or SVG chart to keep it lightweight

function openAddMeasurementModal() {
  document.getElementById('measureWeight').value = '';
  document.getElementById('measureBf').value = '';
  document.getElementById('measureNote').value = '';
  openModal('measurementModal');
}

function saveMeasurement() {
  const wRaw = document.getElementById('measureWeight').value;
  const bfRaw = document.getElementById('measureBf').value;
  const note = document.getElementById('measureNote').value.trim();
  
  const w = parseFloat(wRaw.replace(',', '.'));
  const bf = parseFloat(bfRaw.replace(',', '.'));
  
  if (isNaN(w)) {
    alert(t('invalidInput') || 'Ungültige Eingabe');
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
      
      db.progressPics.push({
        id: uid(),
        date: new Date().toISOString(),
        dataUrl: dataUrl
      });
      // Sort desc
      db.progressPics.sort((a,b) => new Date(b.date) - new Date(a.date));
      save();
      renderProgressPics();
      showToast(t('savedToast') || 'Zing!');
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
          <div style="font-weight:700;font-size:16px;">${m.weight} kg${bfStr}</div>
          ${noteStr}
        </div>
        <button class="icon-btn" style="color:var(--accent2);width:30px;height:30px;" onclick="deleteMeasurement('${m.id}')">✕</button>
      </div>
    `;
  });
  list.innerHTML = html;
  
  // Render Simple CSS Chart (Last 10 entries max, reversed so oldest is left)
  const chartData = db.measurements.slice(0, 10).reverse();
  if (chartData.length < 2) {
    chart.innerHTML = `<div style="text-align:center;width:100%;color:var(--muted);font-size:12px;margin-bottom:10px;">Mehr Daten für Diagramm benötigt</div>`;
    return;
  }
  
  const minW = Math.min(...chartData.map(d => d.weight)) - 2;
  const maxW = Math.max(...chartData.map(d => d.weight)) + 2;
  const range = maxW - minW;
  
  let chartHtml = ``;
  chartData.forEach(d => {
    const htPct = ((d.weight - minW) / range) * 100;
    chartHtml += `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">${d.weight}</div>
        <div style="width:100%;max-width:24px;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(5, htPct)}%;"></div>
      </div>
    `;
  });
  chart.innerHTML = chartHtml;
}

function deleteMeasurement(id) {
  if (confirm(t('confirmDel') || 'Eintrag löschen?')) {
    db.measurements = db.measurements.filter(m => m.id !== id);
    save();
    renderProgress();
  }
}

function renderProgressPics() {
  const gal = document.getElementById('progressGallery');
  gal.innerHTML = '';
  
  if (!db.progressPics || db.progressPics.length === 0) {
    gal.innerHTML = `<div style="grid-column:1 / span 2;text-align:center;padding:20px;color:var(--muted);font-size:13px;">Keine Fotos</div>`;
    return;
  }
  
  let html = '';
  db.progressPics.forEach(p => {
    const d = new Date(p.date);
    const dateStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
    html += `
      <div style="position:relative;width:100%;aspect-ratio:3/4;border-radius:8px;overflow:hidden;cursor:pointer;background:var(--surface2);" onclick="openPic('${p.id}')">
        <img src="${p.dataUrl}" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);padding:6px;font-size:11px;text-align:center;font-weight:600;backdrop-filter:blur(4px);">${dateStr}</div>
      </div>
    `;
  });
  gal.innerHTML = html;
}

let activePicId = null;
function openPic(id) {
  const p = db.progressPics.find(x => x.id === id);
  if (!p) return;
  activePicId = id;
  
  const d = new Date(p.date);
  document.getElementById('viewPicDate').textContent = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
  document.getElementById('viewPicImg').src = p.dataUrl;
  
  openModal('viewPicModal');
}

function deleteCurrentPic() {
  if (!activePicId) return;
  if (confirm(t('confirmDel') || 'Foto löschen?')) {
    db.progressPics = db.progressPics.filter(x => x.id !== activePicId);
    save();
    closeModal('viewPicModal');
    renderProgressPics();
  }
}

/* ---- Exercise Progress Tracker (Phase 2) ---- */
function renderExerciseProgressTracker() {
  const container = document.getElementById('exerciseProgressTracker');
  if (!container) return;
  
  // Find which exercises have data
  const activeExIds = new Set();
  db.workouts.forEach(w => {
    if(!w.exercises) return;
    w.exercises.forEach(e => {
      if (e.sets && e.sets.length > 0) activeExIds.add(e.exId);
    });
  });
  
  const activeExs = db.exercises.filter(ex => activeExIds.has(ex.id));
  if (activeExs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">Noch keine Trainingsdaten für Übungen verfügbar.</div></div>`;
    return;
  }
  
  // Group by Category
  const byCat = {};
  activeExs.forEach(ex => {
    if (!byCat[ex.category]) byCat[ex.category] = [];
    byCat[ex.category].push(ex);
  });
  
  let html = '';
  // Fix the order
  const CAT_ORDER = ['Brust', 'Rücken', 'Beine', 'Schultern', 'Arme', 'Core', 'Cardio', 'Dehnen'];
  const allCats = Object.keys(byCat);
  allCats.sort((a,b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    return (ia===-1?99:ia) - (ib===-1?99:ib);
  });
  
  allCats.forEach(cat => {
    const isOpen = localStorage.getItem('gymtrack_acc_' + cat) === 'true';
    const exs = byCat[cat];
    
    // Sort exercises alphabetically
    exs.sort((a,b) => a.name.localeCompare(b.name));
    
    html += `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;cursor:pointer;background:var(--surface2);" onclick="toggleProgressAcc('${cat}')">
        <div style="font-weight:700;font-size:16px;">${t('cats')[cat] || cat} <span style="font-size:12px;color:var(--muted);font-weight:400;margin-left:6px;">(${exs.length})</span></div>
        <div id="acc_icon_${cat}" style="color:var(--muted);transform:${isOpen ? 'rotate(180deg)' : 'none'};transition:0.2s;">▼</div>
      </div>
      <div id="acc_content_${cat}" style="display:${isOpen ? 'block' : 'none'};">
        ${exs.map(ex => `
          <div style="padding:14px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="openExGraph('${ex.id}')">
            <div style="font-size:15px;font-weight:600;">${ex.name}</div>
            <div style="color:var(--accent);font-size:16px;">›</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
}

window.toggleProgressAcc = function(cat) {
  const content = document.getElementById('acc_content_' + cat);
  const icon = document.getElementById('acc_icon_' + cat);
  if (!content) return;
  const isNowOpen = content.style.display === 'none';
  content.style.display = isNowOpen ? 'block' : 'none';
  icon.style.transform = isNowOpen ? 'rotate(180deg)' : 'none';
  localStorage.setItem('gymtrack_acc_' + cat, isNowOpen);
};

window.openExGraph = function(exId) {
  const ex = db.exercises.find(x => x.id === exId);
  if (!ex) return;
  
  document.getElementById('exGraphTitle').textContent = ex.name;
  const chartContainer = document.getElementById('exGraphChart');
  chartContainer.innerHTML = '';
  
  // Collect max weight per workout date
  const dataPoints = [];
  
  // Loop oldest to newest
  const sortedWorkouts = [...db.workouts].sort((a,b) => a.startTime - b.startTime);
  
  sortedWorkouts.forEach(w => {
    if(!w.exercises) return;
    const match = w.exercises.find(e => e.exId === exId);
    if (match && match.sets && match.sets.length > 0) {
      // Find max weight in this workout for this exercise ignoring W (Warmup) sets
      let maxW = 0;
      match.sets.forEach(s => {
        if (s.type !== 'W' && s.weight > maxW) maxW = s.weight;
      });
      if (maxW > 0) {
        dataPoints.push({
          date: new Date(w.startTime),
          weight: maxW
        });
      }
    }
  });
  
  if (dataPoints.length < 2) {
    chartContainer.innerHTML = `<div style="text-align:center;width:100%;color:var(--muted);font-size:13px;padding:40px 0;">Nicht genug Daten (min. 2)</div>`;
    openModal('exGraphModal');
    return;
  }
  
  // Keep last 10 points
  const drawPoints = dataPoints.slice(-10);
  
  const minW = Math.max(0, Math.min(...drawPoints.map(d => d.weight)) * 0.8);
  const maxW = Math.max(...drawPoints.map(d => d.weight)) * 1.1; // 10% headroom
  const range = maxW - minW;
  
  let chartHtml = ``;
  drawPoints.forEach(d => {
    const htPct = Math.max(5, ((d.weight - minW) / range) * 100);
    const dateStr = `${d.date.getDate()}.${d.date.getMonth()+1}.`;
    chartHtml += `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;">
        <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:4px;">${d.weight}</div>
        <div style="width:100%;max-width:32px;background:var(--accent);border-radius:4px 4px 0 0;height:${htPct}%;opacity:0.8;"></div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px;">${dateStr}</div>
      </div>
    `;
  });
  
  chartContainer.innerHTML = chartHtml;
  openModal('exGraphModal');
};
