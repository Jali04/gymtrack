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
function renderExerciseProgressTracker() {
  const progList  = document.getElementById('exerciseProgressTracker');
  if(!progList) return;
  const activeExs = db.exercises.filter(ex => db.workouts.some(w => w.exercises.some(e => e.exId === ex.id)));

  if (activeExs.length === 0) {
    progList.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📈</div><div class="empty-text">Noch keine Trainingsdaten für Übungen verfügbar.</div></div>`;
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

  progList.innerHTML = cats.map(cat => {
    const type     = getCatType(cat);
    const catClass = type === 'cardio' ? 'cat-cardio' : type === 'stretch' ? 'cat-stretch' : 'cat-strength';
    const catLabel = t('cats')[cat] || cat;
    const exs      = activeExs.filter(e => e.category === cat);
    // Sort exercises alphabetically
    exs.sort((a,b) => a.name.localeCompare(b.name));
    
    const catId    = 'progCat_' + cat.replace(/[^a-z]/gi, '');
    const isOpen   = localStorage.getItem('gymtrack_acc_' + cat) === 'true';

    const exCards = exs.map(ex => _buildExCard(ex, type, locale, catClass)).join('');
    return `<div class="prog-cat-group">
      <div class="prog-cat-header" onclick="toggleProgCat('${catId}', '${cat}')">
        <span class="cat-badge ${catClass}">${catLabel}</span>
        <span class="prog-cat-count">${exs.length} ${t('exercises')}</span>
        <span class="prog-cat-chevron" id="${catId}_chevron" style="transform:${isOpen ? 'rotate(180deg)' : 'none'};transition:0.2s;">▾</span>
      </div>
      <div class="prog-cat-body" id="${catId}" style="display:${isOpen ? 'block' : 'none'};">${exCards}</div>
    </div>`;
  }).join('');
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
  const workoutsWithEx = db.workouts
    .filter(w => w.exercises.some(e => e.exId === ex.id))
    .sort((a, b) => new Date(a.date||a.startTime).getTime() - new Date(b.date||b.startTime).getTime());

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
  } else {
    sparkValues = sessions.map(w => {
      const e = w.exercises.find(x => x.exId === ex.id);
      return e ? Math.max(...e.sets.map(s => s.weight)) : 0;
    });
    const maxW = Math.max(...lastEntry.sets.map(s => s.weight));
    mainValue = maxW; mainUnit = 'kg';
    if (workoutsWithEx.length >= 2) {
      const prev     = workoutsWithEx[workoutsWithEx.length - 2];
      const prevEntry = prev.exercises.find(e => e.exId === ex.id);
      const prevMax  = Math.max(...prevEntry.sets.map(s => s.weight));
      const totalReps = lastEntry.sets.reduce((a, s) => a + s.reps, 0);
      const prevReps  = prevEntry.sets.reduce((a, s) => a + s.reps, 0);
      const wDiff = maxW - prevMax, rDiff = totalReps - prevReps;
      if (wDiff > 0)      progressTag = `<span class="progress-tag up">↑ +${wDiff}${t('weightUp')}</span>`;
      else if (wDiff < 0) progressTag = `<span class="progress-tag down">↓ ${wDiff}${t('weightDown')}</span>`;
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
        if (wD > 0)      diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">+${wD}kg</span>`;
        else if (wD < 0) diff = `<span style="color:var(--accent2);font-size:11px;margin-left:4px;">${wD}kg</span>`;
        else if (rD > 0) diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">+${rD} ${t('reps')}</span>`;
        else if (rD < 0) diff = `<span style="color:var(--accent2);font-size:11px;margin-left:4px;">${rD} ${t('reps')}</span>`;
      } else if (prevSets && !prevSets[i]) {
        diff = `<span style="color:var(--accent);font-size:11px;margin-left:4px;">${t('newBadge')}</span>`;
      }
      return `<div style="display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
        <span style="color:var(--muted);font-size:11px;margin-right:4px;">S${i + 1}</span>${s.weight}kg × ${s.reps}${diff}
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
