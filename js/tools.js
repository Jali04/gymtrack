/* =============================================
   GYMTRACK — Rechner & Tools
   ============================================= */

function openToolsModal() {
  document.getElementById('tool1RmWeight').value = '';
  document.getElementById('tool1RmReps').value = '';
  document.getElementById('tool1RmResult').textContent = '— kg';
  
  document.getElementById('toolPlateTarget').value = '';
  document.getElementById('toolPlateBar').value = '20';
  document.getElementById('toolPlateResult').innerHTML = `<span style="color:var(--muted);font-size:13px;">${t('plateEnterTarget') || 'Geben Sie ein Zielgewicht ein'}</span>`;
  
  openModal('toolsModal');
}

function calculate1Rm() {
  const wInput = document.getElementById('tool1RmWeight').value;
  const rInput = document.getElementById('tool1RmReps').value;
  
  if (!wInput || !rInput) {
    document.getElementById('tool1RmResult').textContent = '— kg';
    return;
  }
  
  const w = parseFloat(wInput.replace(',', '.'));
  const r = parseInt(rInput);
  
  if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) {
    document.getElementById('tool1RmResult').textContent = '— kg';
    return;
  }
  
  // Epley Formula: 1RM = Weight * (1 + Reps/30)
  const epley = w * (1 + (r / 30));
  document.getElementById('tool1RmResult').textContent = Math.round(epley * 10) / 10 + ' kg';
}

function calculatePlates() {
  const tInput = document.getElementById('toolPlateTarget').value;
  const bInput = document.getElementById('toolPlateBar').value;
  const resDiv = document.getElementById('toolPlateResult');
  
  if (!tInput || !bInput) {
    resDiv.innerHTML = `<span style="color:var(--muted);font-size:13px;">${t('plateEnterTarget') || 'Geben Sie ein Zielgewicht ein'}</span>`;
    return;
  }
  
  const target = parseFloat(tInput.replace(',', '.'));
  const bar = parseFloat(bInput.replace(',', '.'));
  
  if (isNaN(target) || isNaN(bar) || target < bar) {
    resDiv.innerHTML = `<span style="color:var(--accent2);font-size:13px;">${t('plateInvalid') || 'Ziel muss größer als Hantel sein'}</span>`;
    return;
  }
  
  let remainder = (target - bar) / 2;
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const platesUsed = [];
  
  for (let plate of availablePlates) {
    let count = Math.floor(remainder / plate);
    if (count > 0) {
      platesUsed.push({ plate, count });
      remainder -= count * plate;
    }
  }
  
  if (platesUsed.length === 0) {
    resDiv.innerHTML = `<span style="color:var(--muted);font-size:13px;">${Math.round(remainder*2*10)/10 > 0 ? '+ ' + (Math.round(remainder*2*10)/10) + 'kg Rest' : t('plateEmptyBar') || 'Nur Stange erforderlich'}</span>`;
    return;
  }
  
  const colors = {
    25: '#e74c3c', 20: '#3498db', 15: '#f1c40f', 10: '#2ecc71', 5: '#ecf0f1', 2.5: '#95a5a6', 1.25: '#34495e'
  };
  const heights = {
    25: 60, 20: 50, 15: 40, 10: 30, 5: 24, 2.5: 20, 1.25: 16
  };
  
  let platesHtml = '';
  platesUsed.forEach(p => {
    for (let i = 0; i < p.count; i++) {
       const color = colors[p.plate] || 'var(--text)';
       const h = heights[p.plate] || 30;
       platesHtml += `<div style="background:${color};width:12px;height:${h}px;border-radius:2px;position:relative;display:flex;align-items:center;justify-content:center;margin:0 1px;">
           <span style="position:absolute;top:-18px;font-size:10px;color:var(--text);font-weight:600;">${p.plate}</span>
       </div>`;
    }
  });
  
  // Create a barbell visualization
  let html = `
  <div style="display:flex;align-items:center;justify-content:center;width:100%;margin-top:16px;">
    <!-- Left side plates (reversed order) -->
    <div style="display:flex;align-items:center;flex-direction:row-reverse;">
      ${platesHtml}
    </div>
    <!-- Barbell center -->
    <div style="width:80px;height:8px;background:#666;border-radius:2px;position:relative;margin:0 2px;">
       <div style="position:absolute;top:-20px;width:100%;text-align:center;font-size:10px;color:var(--muted);">${bar}kg Stange</div>
    </div>
    <!-- Right side plates -->
    <div style="display:flex;align-items:center;">
      ${platesHtml}
    </div>
  </div>`;
  
  if (remainder > 0.01) {
    html += `<div style="width:100%;text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">+ ${Math.round(remainder*2*10)/10}kg Rest</div>`;
  }
  
  resDiv.innerHTML = html;
}
