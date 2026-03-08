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
    resDiv.innerHTML = `<span style="color:var(--muted);font-size:13px;">${t('plateEmptyBar') || 'Nur Stange erforderlich'}</span>`;
    return;
  }
  
  let html = '';
  const colors = {
    25: '#e74c3c', 20: '#3498db', 15: '#f1c40f', 10: '#2ecc71', 5: '#ecf0f1', 2.5: '#95a5a6', 1.25: '#34495e'
  };
  
  platesUsed.forEach(p => {
    for (let i = 0; i < p.count; i++) {
       const color = colors[p.plate] || 'var(--text)';
       html += `<div style="background:var(--surface);border:1px solid ${color};border-radius:4px;width:32px;height:40px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${color};flex-shrink:0;">${p.plate}</div>`;
    }
  });
  
  if (remainder > 0.01) {
    html += `<div style="width:100%;text-align:center;font-size:12px;color:var(--muted);margin-top:4px;">+ ${Math.round(remainder*2*10)/10}kg Rest</div>`;
  }
  
  resDiv.innerHTML = html;
}
