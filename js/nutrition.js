/* =============================================
   GYMTRACK / DSCPLN — Nutrition & Calorie Tracker
   ============================================= */

let currentNutritionDate = new Date();
let editingLoggedFoodId = null;
let isEditingMealPlan = false;

// Global exports
Object.defineProperty(window, 'currentNutritionDate', {
  get() { return currentNutritionDate; },
  set(v) { currentNutritionDate = v; }
});

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ---------------------------------------------
// SUBTAB ROUTING
// ---------------------------------------------
function switchNutritionSubTab(subTabId) {
  // Update class active on buttons
  document.querySelectorAll('.nutrition-subtab').forEach(btn => {
    const isTarget = (subTabId === 'calories' && btn.id === 'tabNutriCalories') ||
                     (subTabId === 'meal-plans' && btn.id === 'tabNutriMealPlans') ||
                     (subTabId === 'supplements' && btn.id === 'tabNutriSupplements');
    btn.classList.toggle('active', isTarget);
    if (isTarget) {
      btn.style.background = 'var(--accent)';
      btn.style.color = '#0a0a0a';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--muted)';
    }
  });

  // Toggle subpages display
  document.querySelectorAll('.nutrition-subpage-content').forEach(div => {
    div.style.display = div.id === 'nutri-subpage-' + subTabId ? 'block' : 'none';
  });

  // Render contents
  if (subTabId === 'calories') {
    renderCalories();
  } else if (subTabId === 'meal-plans') {
    renderMealPlans();
  } else if (subTabId === 'supplements') {
    if (typeof renderSupplements === 'function') {
      renderSupplements();
    }
  }

  localStorage.setItem('gymtrack_nutrition_subtab', subTabId);
}
window.switchNutritionSubTab = switchNutritionSubTab;

// ---------------------------------------------
// CALORIE TRACKER
// ---------------------------------------------
function renderCalories() {
  const page = document.getElementById('page-supps');
  if (!page) return;
  const container = page.querySelector('.calories-content');
  if (!container) return;

  const targetDateKey = _dateKey(currentNutritionDate);
  const isTargetToday = targetDateKey === _todayKey();
  const maxDate = _todayKey();

  // Date navigation
  let dateNavHtml = `
    <div class="supp-date-nav" style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 12px;margin-bottom:16px;">
      <button class="cal-nav" onclick="changeNutritionDate(-1)" style="font-family:'DM Sans',sans-serif;font-weight:bold;">‹</button>
      <div style="position:relative;font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;user-select:none;">
        <span style="font-size:14px;color:var(--accent);">📅</span>
        <span id="nutritionDateLabel">${_formatNutritionDate(currentNutritionDate)}</span>
        <input type="date" id="nutritionDatePicker" value="${targetDateKey}" max="${maxDate}" onchange="onNutritionDatePickerChange(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
      </div>
      <button class="cal-nav" id="nutritionDateNextBtn" onclick="changeNutritionDate(1)" ${isTargetToday ? 'disabled style="opacity:0.25;cursor:default;"' : ''} style="font-family:'DM Sans',sans-serif;font-weight:bold;">›</button>
    </div>
  `;

  // Macro target & consumption math
  const goals = db.nutritionGoals || { calories: 2000, protein: 150, carbs: 200, fat: 70 };
  const targetKcal = Number(goals.calories || 2000);
  const targetProt = Number(goals.protein || 150);
  const targetCarb = Number(goals.carbs || 200);
  const targetFat = Number(goals.fat || 70);

  const logs = db.nutritionLog || [];
  const todayLogs = logs.filter(l => l.date === targetDateKey);

  let totalKcal = 0;
  let totalProt = 0;
  let totalCarb = 0;
  let totalFat = 0;

  todayLogs.forEach(l => {
    totalKcal += Number(l.calories || 0);
    totalProt += Number(l.protein || 0);
    totalCarb += Number(l.carbs || 0);
    totalFat += Number(l.fat || 0);
  });

  totalKcal = Math.round(totalKcal);
  totalProt = Math.round(totalProt * 10) / 10;
  totalCarb = Math.round(totalCarb * 10) / 10;
  totalFat = Math.round(totalFat * 10) / 10;

  const remainingKcal = targetKcal - totalKcal;
  const kcalColor = remainingKcal >= 0 ? 'var(--accent)' : 'var(--accent2)';
  const kcalPercent = Math.min(100, Math.round((totalKcal / targetKcal) * 100));

  const protPercent = Math.min(100, Math.round((totalProt / targetProt) * 100));
  const carbPercent = Math.min(100, Math.round((totalCarb / targetCarb) * 100));
  const fatPercent = Math.min(100, Math.round((totalFat / targetFat) * 100));

  const isDe = (lang === 'de');

  let dashboardHtml = `
    <div class="macro-dashboard">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:28px; font-weight:800; font-family:'Orbitron', sans-serif; color:${kcalColor};">${totalKcal} / ${targetKcal} <span style="font-size:14px; font-weight:600; color:var(--muted);">kcal</span></div>
          <div style="font-size:12px; color:var(--muted); margin-top:2px;">
            ${remainingKcal >= 0 
              ? (isDe ? `${remainingKcal} kcal übrig` : `${remainingKcal} kcal remaining`)
              : (isDe ? `${Math.abs(remainingKcal)} kcal über Ziel` : `${Math.abs(remainingKcal)} kcal over target`)
            }
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openNutritionGoalsModal()" style="margin:0; font-family:'DM Sans', sans-serif; font-size:11px; font-weight:600; padding:6px 12px; border-radius:10px;">⚙️ Ziele</button>
      </div>

      <div class="macro-bar-container" style="height:8px; margin-top:14px; margin-bottom:4px;">
        <div class="macro-bar-fill" style="width:${kcalPercent}%; background:${kcalColor};"></div>
      </div>

      <div class="macro-progress-row">
        <div class="macro-progress-box">
          <div style="font-size:11px; color:var(--muted); font-weight:700;">PROT</div>
          <div style="font-size:14px; font-weight:700; font-family:'Orbitron', sans-serif; margin-top:2px; color:var(--text);">${totalProt}g</div>
          <div class="macro-bar-container">
            <div class="macro-bar-fill" style="width:${protPercent}%; background:#9B5CF6;"></div>
          </div>
          <div style="font-size:9.5px; color:var(--muted);">${targetProt}g</div>
        </div>

        <div class="macro-progress-box">
          <div style="font-size:11px; color:var(--muted); font-weight:700;">CARB</div>
          <div style="font-size:14px; font-weight:700; font-family:'Orbitron', sans-serif; margin-top:2px; color:var(--text);">${totalCarb}g</div>
          <div class="macro-bar-container">
            <div class="macro-bar-fill" style="width:${carbPercent}%; background:#38bdf8;"></div>
          </div>
          <div style="font-size:9.5px; color:var(--muted);">${targetCarb}g</div>
        </div>

        <div class="macro-progress-box">
          <div style="font-size:11px; color:var(--muted); font-weight:700;">FAT</div>
          <div style="font-size:14px; font-weight:700; font-family:'Orbitron', sans-serif; margin-top:2px; color:var(--text);">${totalFat}g</div>
          <div class="macro-bar-container">
            <div class="macro-bar-fill" style="width:${fatPercent}%; background:#f59e0b;"></div>
          </div>
          <div style="font-size:9.5px; color:var(--muted);">${targetFat}g</div>
        </div>
      </div>
    </div>
  `;

  // Grouped Meal logging sections
  const meals = {
    breakfast: { title: isDe ? '🥣 Frühstück' : '🥣 Breakfast', items: [] },
    lunch: { title: isDe ? '☀️ Mittagessen' : '☀️ Lunch', items: [] },
    dinner: { title: isDe ? '🌙 Abendessen' : '🌙 Dinner', items: [] },
    snack: { title: isDe ? '🍎 Snacks / Sonstiges' : '🍎 Snacks / Other', items: [] }
  };

  todayLogs.forEach(l => {
    const mealKey = l.timeOfDay || 'snack';
    if (meals[mealKey]) {
      meals[mealKey].items.push(l);
    } else {
      meals['snack'].items.push(l);
    }
  });

  let foodLogHtml = '';
  Object.entries(meals).forEach(([key, meal]) => {
    foodLogHtml += `
      <div class="food-list-section">
        <div class="food-section-header">
          <div class="food-section-title">${meal.title}</div>
          <button class="food-section-add-btn" onclick="openNutritionFoodModal('${key}')">+</button>
        </div>
    `;

    if (meal.items.length > 0) {
      meal.items.forEach(item => {
        const foodMacrosStr = `${Math.round(item.protein)}P · ${Math.round(item.carbs)}C · ${Math.round(item.fat)}F`;
        const sizeStr = item.grams ? `${item.grams}g` : '1 Portion';
        foodLogHtml += `
          <div class="food-log-item" onclick="openEditLoggedFood('${item.id}')">
            <div>
              <div class="food-log-title">${item.name}</div>
              <div class="food-log-meta">${sizeStr} · ${foodMacrosStr}</div>
            </div>
            <div class="food-log-macros">${Math.round(item.calories)} <span style="font-size:10px; font-weight:600; color:var(--muted);">kcal</span></div>
          </div>
        `;
      });
    } else {
      foodLogHtml += `
        <div style="font-size:12px; color:var(--muted); text-align:center; padding:12px; border:1px dashed var(--border); border-radius:12px; margin-bottom:8px; cursor:pointer;" onclick="openNutritionFoodModal('${key}')">
          ${isDe ? '+ Lebensmittel hinzufügen' : '+ Add food'}
        </div>
      `;
    }
    foodLogHtml += `</div>`;
  });

  container.innerHTML = `
    ${dateNavHtml}
    ${dashboardHtml}
    ${foodLogHtml}
  `;
}
window.renderCalories = renderCalories;

function changeNutritionDate(offset) {
  const d = new Date(currentNutritionDate);
  d.setDate(d.getDate() + offset);
  const today = new Date(); today.setHours(0,0,0,0);
  const checkDate = new Date(d); checkDate.setHours(0,0,0,0);
  if (checkDate > today) return; // Prevent future dates
  currentNutritionDate = d;
  renderCalories();
  if (typeof haptic === 'function') haptic('light');
}
window.changeNutritionDate = changeNutritionDate;

function onNutritionDatePickerChange(val) {
  if (!val) return;
  const parts = val.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date(); today.setHours(0,0,0,0);
  if (d > today) return; // Prevent future dates
  currentNutritionDate = d;
  renderCalories();
  if (typeof haptic === 'function') haptic('light');
}
window.onNutritionDatePickerChange = onNutritionDatePickerChange;

function _formatNutritionDate(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(date); target.setHours(0,0,0,0);
  const diffTime = today - target;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return typeof lang !== 'undefined' && lang === 'en' ? 'Today' : 'Heute';
  } else if (diffDays === 1) {
    return typeof lang !== 'undefined' && lang === 'en' ? 'Yesterday' : 'Gestern';
  } else {
    return target.toLocaleDateString(typeof lang !== 'undefined' && lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}

// ---------------------------------------------
// NUTRITION GOALS MODAL ACTIONS
// ---------------------------------------------
function openNutritionGoalsModal() {
  const goals = db.nutritionGoals || { calories: 2000, protein: 150, carbs: 200, fat: 70 };
  document.getElementById('nutriGoalCal').value = goals.calories || 2000;
  document.getElementById('nutriGoalProt').value = goals.protein || 150;
  document.getElementById('nutriGoalCarb').value = goals.carbs || 200;
  document.getElementById('nutriGoalFat').value = goals.fat || 70;
  openModal('nutritionGoalsModal');
}
window.openNutritionGoalsModal = openNutritionGoalsModal;

function saveNutritionGoals() {
  const kcal = parseInt(document.getElementById('nutriGoalCal').value) || 2000;
  const prot = parseInt(document.getElementById('nutriGoalProt').value) || 150;
  const carb = parseInt(document.getElementById('nutriGoalCarb').value) || 200;
  const fat = parseInt(document.getElementById('nutriGoalFat').value) || 70;

  db.nutritionGoals = {
    calories: kcal,
    protein: prot,
    carbs: carb,
    fat: fat
  };

  save();
  renderCalories();
  
  const activeSub = localStorage.getItem('gymtrack_nutrition_subtab') || 'calories';
  if (activeSub === 'meal-plans') {
    renderMealPlans();
  }
  
  closeModal('nutritionGoalsModal');
  if (typeof haptic === 'function') haptic('success');
}
window.saveNutritionGoals = saveNutritionGoals;

// ---------------------------------------------
// FOOD LOG MODAL ACTIONS & AUTOCOMPLETE
// ---------------------------------------------
function openNutritionFoodModal(mealKey) {
  editingLoggedFoodId = null;
  
  document.getElementById('nutriFoodMeal').value = mealKey || 'breakfast';
  document.getElementById('nutriFoodName').value = '';
  document.getElementById('nutriFoodAmount').value = '100';
  document.getElementById('nutriFoodUnit').value = 'g';
  document.getElementById('nutriFoodCal100').value = '';
  document.getElementById('nutriFoodProt100').value = '';
  document.getElementById('nutriFoodCarb100').value = '';
  document.getElementById('nutriFoodFat100').value = '';
  
  const label = document.getElementById('lblNutriFoodTitle');
  if (label) {
    label.textContent = (lang === 'de') ? 'Essen eintragen' : 'Log Food';
  }

  const delBtn = document.getElementById('btnDeleteLoggedFood');
  if (delBtn) delBtn.style.display = 'none';

  const dropdown = document.getElementById('foodAutocompleteResults');
  if (dropdown) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
  }

  recalcFoodModalMacros();
  openModal('nutritionFoodModal');
}
window.openNutritionFoodModal = openNutritionFoodModal;

function openEditLoggedFood(logId) {
  const logs = db.nutritionLog || [];
  const logItem = logs.find(l => l.id === logId);
  if (!logItem) return;

  editingLoggedFoodId = logId;

  document.getElementById('nutriFoodMeal').value = logItem.timeOfDay || 'breakfast';
  document.getElementById('nutriFoodName').value = logItem.name;
  
  const amount = logItem.grams || 100;
  const libItem = (db.foodLibrary || []).find(f => f.name.toLowerCase() === logItem.name.toLowerCase());
  
  let unit = 'g';
  let perCal = 0;
  let perProt = 0;
  let perCarb = 0;
  let perFat = 0;

  if (libItem) {
    perCal = libItem.calories;
    perProt = libItem.protein;
    perCarb = libItem.carbs;
    perFat = libItem.fat;
    if (libItem.servingSize === 1) {
      unit = 'pcs';
    }
  } else {
    unit = 'g';
    const factor = amount / 100;
    if (factor > 0) {
      perCal = Math.round(logItem.calories / factor);
      perProt = Math.round((logItem.protein / factor) * 10) / 10;
      perCarb = Math.round((logItem.carbs / factor) * 10) / 10;
      perFat = Math.round((logItem.fat / factor) * 10) / 10;
    } else {
      perCal = logItem.calories;
      perProt = logItem.protein;
      perCarb = logItem.carbs;
      perFat = logItem.fat;
    }
  }

  document.getElementById('nutriFoodAmount').value = amount;
  document.getElementById('nutriFoodUnit').value = unit;
  document.getElementById('nutriFoodCal100').value = perCal;
  document.getElementById('nutriFoodProt100').value = perProt;
  document.getElementById('nutriFoodCarb100').value = perCarb;
  document.getElementById('nutriFoodFat100').value = perFat;

  const label = document.getElementById('lblNutriFoodTitle');
  if (label) {
    label.textContent = (lang === 'de') ? 'Eintrag bearbeiten' : 'Edit Log';
  }

  const delBtn = document.getElementById('btnDeleteLoggedFood');
  if (delBtn) delBtn.style.display = 'block';

  const dropdown = document.getElementById('foodAutocompleteResults');
  if (dropdown) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
  }

  recalcFoodModalMacros();
  openModal('nutritionFoodModal');
}
window.openEditLoggedFood = openEditLoggedFood;

function onFoodNameInput(val) {
  const dropdown = document.getElementById('foodAutocompleteResults');
  if (!dropdown) return;

  const query = val.trim().toLowerCase();
  if (!query) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
    return;
  }

  const library = db.foodLibrary || [];
  const matches = library.filter(f => f.name.toLowerCase().includes(query)).slice(0, 5);

  if (matches.length === 0) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
    return;
  }

  let html = '';
  matches.forEach(item => {
    const macrosStr = `${Math.round(item.calories)} kcal · ${Math.round(item.protein)}P · ${Math.round(item.carbs)}C · ${Math.round(item.fat)}F`;
    const itemStr = btoa(unescape(encodeURIComponent(JSON.stringify(item))));
    html += `
      <div class="autocomplete-suggestion" onclick="selectAutocompleteFood('${itemStr}')">
        <div style="font-weight:600;">${item.name}</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">${macrosStr} (${item.servingSize || 100}g)</div>
      </div>
    `;
  });

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}
window.onFoodNameInput = onFoodNameInput;

function selectAutocompleteFood(itemStr) {
  try {
    const item = JSON.parse(decodeURIComponent(escape(atob(itemStr))));
    
    document.getElementById('nutriFoodName').value = item.name;
    document.getElementById('nutriFoodCal100').value = item.calories;
    document.getElementById('nutriFoodProt100').value = item.protein;
    document.getElementById('nutriFoodCarb100').value = item.carbs;
    document.getElementById('nutriFoodFat100').value = item.fat;
    document.getElementById('nutriFoodUnit').value = item.servingSize === 1 ? 'pcs' : 'g';
    
    const dropdown = document.getElementById('foodAutocompleteResults');
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    }

    recalcFoodModalMacros();
  } catch(e) {
    console.error("Failed to parse autocomplete item", e);
  }
}
window.selectAutocompleteFood = selectAutocompleteFood;

function recalcFoodModalMacros() {
  const amount = parseFloat(document.getElementById('nutriFoodAmount').value) || 100;
  const unit = document.getElementById('nutriFoodUnit').value;

  const cal100 = parseFloat(document.getElementById('nutriFoodCal100').value) || 0;
  const prot100 = parseFloat(document.getElementById('nutriFoodProt100').value) || 0;
  const carb100 = parseFloat(document.getElementById('nutriFoodCarb100').value) || 0;
  const fat100 = parseFloat(document.getElementById('nutriFoodFat100').value) || 0;

  let factor = amount / 100;
  if (unit === 'pcs') {
    factor = amount;
  }

  const totalCals = Math.round(cal100 * factor);
  const totalProt = Math.round(prot100 * factor * 10) / 10;
  const totalCarb = Math.round(carb100 * factor * 10) / 10;
  const totalFat = Math.round(fat100 * factor * 10) / 10;

  const summary = document.getElementById('nutriFoodTotalSummary');
  if (summary) {
    const isDe = (lang === 'de');
    summary.innerHTML = isDe 
      ? `Gesamt: <strong>${totalCals} kcal</strong> (${totalProt}g P · ${totalCarb}g K · ${totalFat}g F)`
      : `Total: <strong>${totalCals} kcal</strong> (${totalProt}g P · ${totalCarb}g C · ${totalFat}g F)`;
  }
}
window.recalcFoodModalMacros = recalcFoodModalMacros;

function saveLoggedFood() {
  const name = document.getElementById('nutriFoodName').value.trim();
  if (!name) {
    alert(lang === 'de' ? 'Bitte gib einen Namen ein.' : 'Please enter a name.');
    return;
  }

  const meal = document.getElementById('nutriFoodMeal').value;
  const amount = parseFloat(document.getElementById('nutriFoodAmount').value) || 100;
  const unit = document.getElementById('nutriFoodUnit').value;

  const cal100 = parseFloat(document.getElementById('nutriFoodCal100').value) || 0;
  const prot100 = parseFloat(document.getElementById('nutriFoodProt100').value) || 0;
  const carb100 = parseFloat(document.getElementById('nutriFoodCarb100').value) || 0;
  const fat100 = parseFloat(document.getElementById('nutriFoodFat100').value) || 0;

  let factor = amount / 100;
  if (unit === 'pcs') {
    factor = amount;
  }

  const totalCals = Math.round(cal100 * factor);
  const totalProt = Math.round(prot100 * factor * 10) / 10;
  const totalCarb = Math.round(carb100 * factor * 10) / 10;
  const totalFat = Math.round(fat100 * factor * 10) / 10;

  const dateKey = _dateKey(currentNutritionDate);

  if (editingLoggedFoodId) {
    const logs = db.nutritionLog || [];
    const index = logs.findIndex(l => l.id === editingLoggedFoodId);
    if (index !== -1) {
      logs[index] = {
        ...logs[index],
        timeOfDay: meal,
        name: name,
        calories: totalCals,
        protein: totalProt,
        carbs: totalCarb,
        fat: totalFat,
        grams: amount,
        updated_at: Date.now()
      };
    }
  } else {
    const newLog = {
      id: uid(),
      date: dateKey,
      timeOfDay: meal,
      name: name,
      calories: totalCals,
      protein: totalProt,
      carbs: totalCarb,
      fat: totalFat,
      grams: amount,
      updated_at: Date.now()
    };
    if (!db.nutritionLog) db.nutritionLog = [];
    db.nutritionLog.push(newLog);
  }

  const library = db.foodLibrary || [];
  const existsInLib = library.some(f => f.name.toLowerCase() === name.toLowerCase());
  if (!existsInLib) {
    const newLibItem = {
      id: uid(),
      name: name,
      calories: cal100,
      protein: prot100,
      carbs: carb100,
      fat: fat100,
      servingSize: unit === 'pcs' ? 1 : 100,
      isCustom: true,
      updated_at: Date.now()
    };
    db.foodLibrary.push(newLibItem);
  }

  save();
  renderCalories();
  closeModal('nutritionFoodModal');
  if (typeof haptic === 'function') haptic('success');
}
window.saveLoggedFood = saveLoggedFood;

function deleteLoggedFood() {
  if (!editingLoggedFoodId) return;

  const confirmMsg = lang === 'de' ? 'Diesen Eintrag wirklich löschen?' : 'Delete this entry?';
  if (!confirm(confirmMsg)) return;

  const logs = db.nutritionLog || [];
  const index = logs.findIndex(l => l.id === editingLoggedFoodId);
  if (index !== -1) {
    logs.splice(index, 1);
    save();
  }

  renderCalories();
  closeModal('nutritionFoodModal');
  if (typeof haptic === 'function') haptic('warning');
}
window.deleteLoggedFood = deleteLoggedFood;

// ---------------------------------------------
// MEAL PLAN
// ---------------------------------------------
function renderMealPlans() {
  const container = document.querySelector('.meal-plans-content');
  if (!container) return;

  const goals = db.nutritionGoals || { calories: 2000, protein: 150, carbs: 200, fat: 70 };
  const mealPlanText = db.mealPlanText || (lang === 'de' 
    ? 'Hier kannst du deinen Ernährungsplan festhalten. Tippe unten auf "Bearbeiten", um deinen eigenen Plan zu schreiben oder kopiere Vorschläge deines AI Coaches hierher.' 
    : 'You can write your meal plan here. Tap "Edit" below to write your own plan or copy suggestions from your AI Coach.');

  let targetSummaryHtml = `
    <div class="card" style="margin-bottom:16px; background:var(--surface); border:1px solid var(--border);">
      <div style="font-weight:700; font-size:15px; margin-bottom:10px; color:var(--accent);">${lang === 'de' ? 'Aktuelle Tagesziele' : 'Current Daily Goals'}</div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; text-align:center;">
        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:8px 4px;">
          <div style="font-size:10px; color:var(--muted); font-weight:700;">KCAL</div>
          <div style="font-size:15px; font-weight:700; font-family:'Orbitron', sans-serif; color:var(--text); margin-top:2px;">${goals.calories}</div>
        </div>
        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:8px 4px;">
          <div style="font-size:10px; color:var(--muted); font-weight:700; color:#9B5CF6;">PROT</div>
          <div style="font-size:15px; font-weight:700; font-family:'Orbitron', sans-serif; color:var(--text); margin-top:2px;">${goals.protein}g</div>
        </div>
        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:8px 4px;">
          <div style="font-size:10px; color:var(--muted); font-weight:700; color:#38bdf8;">CARB</div>
          <div style="font-size:15px; font-weight:700; font-family:'Orbitron', sans-serif; color:var(--text); margin-top:2px;">${goals.carbs}g</div>
        </div>
        <div style="background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:8px 4px;">
          <div style="font-size:10px; color:var(--muted); font-weight:700; color:#f59e0b;">FAT</div>
          <div style="font-size:15px; font-weight:700; font-family:'Orbitron', sans-serif; color:var(--text); margin-top:2px;">${goals.fat}g</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openNutritionGoalsModal()" style="margin:12px 0 0 0; width:100%; font-size:12px;">Ziele anpassen</button>
    </div>
  `;

  let planEditorHtml = '';
  if (isEditingMealPlan) {
    planEditorHtml = `
      <div class="card" style="background:var(--surface); border:1px solid var(--border); padding:16px;">
        <div style="font-weight:700; font-size:15px; margin-bottom:12px;">${lang === 'de' ? 'Ernährungsplan bearbeiten' : 'Edit Meal Plan'}</div>
        <textarea id="mealPlanTextarea" class="form-input" style="width:100%; height:250px; resize:none; line-height:1.5; font-family:'DM Sans', sans-serif; font-size:13.5px; margin-bottom:12px; padding:12px; background:var(--surface2); border:1px solid var(--border); border-radius:12px; color:var(--text);" placeholder="${lang === 'de' ? 'Schreibe deinen Plan hier...' : 'Write your plan here...'}">${mealPlanText}</textarea>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="cancelEditMealPlan()" style="margin:0; flex:1;">Abbrechen</button>
          <button class="btn btn-primary" onclick="saveMealPlan()" style="margin:0; flex:1;">Speichern</button>
        </div>
      </div>
    `;
  } else {
    const renderedText = mealPlanText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\* (.*?)(<br>|$)/g, '<div style="margin-left:14px; display:list-item; list-style-type:disc; margin-bottom:4px;">$1</div>')
      .replace(/- (.*?)(<br>|$)/g, '<div style="margin-left:14px; display:list-item; list-style-type:disc; margin-bottom:4px;">$1</div>');

    planEditorHtml = `
      <div class="card" style="background:var(--surface); border:1px solid var(--border); padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:700; font-size:15px; color:var(--accent);">${lang === 'de' ? 'Mein Ernährungsplan' : 'My Meal Plan'}</div>
          <button class="close-btn" onclick="startEditMealPlan()" style="width:auto; padding:4px 10px; border-radius:8px; font-size:11.5px; font-family:'DM Sans',sans-serif; font-weight:600;">✏️ Bearbeiten</button>
        </div>
        <div style="font-size:13.5px; line-height:1.6; color:var(--text); min-height:80px;">
          ${renderedText}
        </div>
      </div>
    `;
  }

  const aiCoachCardHtml = `
    <div class="card" style="margin-top:16px; background: linear-gradient(135deg, rgba(155,92,246,0.12), rgba(232,255,71,0.04)); border: 1px solid rgba(155,92,246,0.25); border-radius: 14px; padding: 14px; cursor:pointer;" onclick="askCoachAboutNutrition()">
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div style="font-size:24px; line-height:1; flex-shrink:0; filter:drop-shadow(0 2px 8px rgba(155,92,246,0.4));">🤖</div>
        <div>
          <div style="font-size:10px; text-transform:uppercase; font-weight:700; letter-spacing:0.8px; color:var(--accent2);">AI Coach · Ernährung</div>
          <p style="font-size:13px; line-height:1.45; color:var(--text); margin:6px 0 0 0; font-family:'DM Sans', sans-serif;">
            ${lang === 'de' 
              ? 'Lass deinen Coach deinen Ernährungsplan analysieren und optimieren oder erstelle einen neuen Plan basierend auf deiner Gewichtsentwicklung!'
              : 'Let your Coach analyze and optimize your nutrition plan or create a new plan based on your weight progress!'}
          </p>
          <div style="font-size:11.5px; font-weight:600; color:var(--accent); margin-top:8px;">${lang === 'de' ? 'Plan optimieren ➔' : 'Optimize Plan ➔'}</div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    ${targetSummaryHtml}
    ${planEditorHtml}
    ${aiCoachCardHtml}
  `;
}
window.renderMealPlans = renderMealPlans;

function startEditMealPlan() {
  isEditingMealPlan = true;
  renderMealPlans();
  if (typeof haptic === 'function') haptic('light');
}
window.startEditMealPlan = startEditMealPlan;

function cancelEditMealPlan() {
  isEditingMealPlan = false;
  renderMealPlans();
  if (typeof haptic === 'function') haptic('light');
}
window.cancelEditMealPlan = cancelEditMealPlan;

function saveMealPlan() {
  const text = document.getElementById('mealPlanTextarea').value;
  db.mealPlanText = text;
  save();
  isEditingMealPlan = false;
  renderMealPlans();
  if (typeof haptic === 'function') haptic('success');
}
window.saveMealPlan = saveMealPlan;

// Hiding autocomplete list when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('foodAutocompleteResults');
  if (dropdown && !e.target.closest('#nutriFoodName') && !e.target.closest('#foodAutocompleteResults')) {
    dropdown.style.display = 'none';
  }
});

// ---------------------------------------------
// DAILY GOALS CALCULATOR (Harris-Benedict / Mifflin-St Jeor)
// ---------------------------------------------
function toggleGoalsCalculator() {
  const box = document.getElementById('goalsCalculatorBox');
  if (!box) return;
  const isVisible = box.style.display !== 'none';
  box.style.display = isVisible ? 'none' : 'block';
  
  const btn = document.getElementById('btnToggleGoalCalc');
  if (btn) {
    btn.textContent = isVisible ? '🤖 Kalorienbedarf berechnen' : '🤖 Berechner ausblenden';
  }

  // Pre-fill weight if available in db.measurements
  if (!isVisible && db.measurements && db.measurements.length > 0) {
    const sorted = [...db.measurements].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (sorted[0] && !document.getElementById('calcWeight').value) {
      document.getElementById('calcWeight').value = sorted[0].weight;
    }
  }
}
window.toggleGoalsCalculator = toggleGoalsCalculator;

function onCalcGoalChange(val) {
  const customRow = document.getElementById('calcGoalCustomRow');
  if (customRow) {
    customRow.style.display = val === 'custom' ? 'block' : 'none';
  }
}
window.onCalcGoalChange = onCalcGoalChange;

function calculateAiGoals() {
  const weight = parseFloat(document.getElementById('calcWeight').value);
  const height = parseFloat(document.getElementById('calcHeight').value);
  const age = parseInt(document.getElementById('calcAge').value);
  const gender = document.getElementById('calcGender').value;
  const activity = document.getElementById('calcActivity').value;
  const goal = document.getElementById('calcGoal').value;

  if (!weight || !height || !age) {
    alert(lang === 'de' ? 'Bitte gib Gewicht, Größe und Alter ein.' : 'Please enter weight, height, and age.');
    return;
  }

  // Mifflin-St Jeor Formula
  let bmr = 0;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const multiplier = activityMultipliers[activity] || 1.2;
  let tdee = bmr * multiplier;

  // Calorie deficit/surplus adjustment
  let offset = 0;
  if (goal === 'custom') {
    const customOffsetVal = document.getElementById('calcGoalCustom').value;
    offset = parseInt(customOffsetVal) || 0;
  } else {
    offset = parseInt(goal) || 0;
  }
  let targetCal = tdee + offset;

  targetCal = Math.max(1200, Math.round(targetCal)); // Floor floor limit

  // Macro split rules (fitness recommended)
  const targetProt = Math.round(weight * 2.0); // 2g per kg
  const targetFat = Math.round(weight * 0.9);   // 0.9g per kg

  const protKcal = targetProt * 4;
  const fatKcal = targetFat * 9;
  const remainingKcal = targetCal - (protKcal + fatKcal);
  const targetCarb = Math.max(50, Math.round(remainingKcal / 4)); // Carbs floor

  // Assign inputs
  document.getElementById('nutriGoalCal').value = targetCal;
  document.getElementById('nutriGoalProt').value = targetProt;
  document.getElementById('nutriGoalCarb').value = targetCarb;
  document.getElementById('nutriGoalFat').value = targetFat;

  toggleGoalsCalculator();
  if (typeof haptic === 'function') haptic('success');
  
  alert(lang === 'de' 
    ? `Empfehlungen berechnet!\nKalorien: ${targetCal} kcal\nProtein: ${targetProt}g\nKohlenhydrate: ${targetCarb}g\nFett: ${targetFat}g` 
    : `Recommendations calculated!\nCalories: ${targetCal} kcal\nProtein: ${targetProt}g\nCarbs: ${targetCarb}g\nFat: ${targetFat}g`
  );
}
window.calculateAiGoals = calculateAiGoals;

// ---------------------------------------------
// BARCODE SCANNER (html5-qrcode + Open Food Facts API)
// ---------------------------------------------
let html5QrScanner = null;

function openBarcodeScanner() {
  closeModal('nutritionFoodModal');
  openModal('barcodeScannerModal');
  
  const statusEl = document.getElementById('barcodeStatus');
  if (statusEl) {
    statusEl.textContent = (lang === 'de') ? 'Kamera wird gestartet...' : 'Starting camera...';
    statusEl.style.color = 'var(--muted)';
  }

  if (typeof Html5Qrcode === 'undefined') {
    if (statusEl) {
      statusEl.textContent = (lang === 'de') 
        ? 'Scanner-Bibliothek konnte nicht geladen werden. Bitte gib den Code manuell ein.' 
        : 'Scanner library load failed. Please enter the barcode manually.';
      statusEl.style.color = 'var(--accent2)';
    }
    return;
  }

  setTimeout(() => {
    try {
      html5QrScanner = new Html5Qrcode("barcodeReader");
      html5QrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 }
        },
        (decodedText, decodedResult) => {
          stopBarcodeScanner();
          closeModal('barcodeScannerModal');
          openModal('nutritionFoodModal');
          
          if (typeof haptic === 'function') haptic('success');
          lookupBarcode(decodedText);
        },
        (errorMessage) => {
          // Scan in progress
        }
      ).then(() => {
        if (statusEl) {
          statusEl.textContent = (lang === 'de') 
            ? 'Kamera aktiv. Halte den Barcode im Sucher.' 
            : 'Camera active. Position barcode in the viewfinder.';
          statusEl.style.color = 'var(--accent)';
        }
      }).catch(err => {
        console.error("Barcode start failed:", err);
        if (statusEl) {
          statusEl.textContent = (lang === 'de') 
            ? 'Kamerafehler. Bitte gib den Code manuell ein.' 
            : 'Camera error. Please enter the barcode manually.';
          statusEl.style.color = 'var(--accent2)';
        }
      });
    } catch(e) {
      console.error("Scanner setup failed", e);
    }
  }, 300);
}
window.openBarcodeScanner = openBarcodeScanner;

function stopBarcodeScanner() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner = null;
    }).catch(err => {
      console.error("Error stopping scanner:", err);
      html5QrScanner = null;
    });
  }
}

function closeBarcodeScanner() {
  stopBarcodeScanner();
  closeModal('barcodeScannerModal');
  openModal('nutritionFoodModal');
}
window.closeBarcodeScanner = closeBarcodeScanner;

function lookupBarcodeDirect() {
  const code = document.getElementById('manualBarcodeVal').value.trim();
  if (!code) {
    alert(lang === 'de' ? 'Bitte gib einen Barcode ein.' : 'Please enter a barcode.');
    return;
  }
  closeModal('barcodeScannerModal');
  openModal('nutritionFoodModal');
  lookupBarcode(code);
}
window.lookupBarcodeDirect = lookupBarcodeDirect;

async function lookupBarcode(barcode) {
  const isDe = (lang === 'de');
  showToast(isDe ? 'Suche Produkt in Open Food Facts...' : 'Searching Open Food Facts...');

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.status === 1 && data.product) {
      const p = data.product;
      const name = p.product_name_de || p.product_name || p.product_name_en || (isDe ? 'Unbekanntes Produkt' : 'Unknown Product');
      
      const nut = p.nutriments || {};
      
      let kcal = nut['energy-kcal_100g'] || nut['energy-kcal'] || 0;
      if (!kcal && nut['energy_100g']) {
        kcal = Math.round(nut['energy_100g'] / 4.184);
      }
      
      const protein = nut.proteins_100g || nut.proteins || 0;
      const carbs = nut.carbohydrates_100g || nut.carbohydrates || 0;
      const fat = nut.fat_100g || nut.fat || 0;

      // Fill modal inputs
      document.getElementById('nutriFoodName').value = name;
      document.getElementById('nutriFoodCal100').value = Math.round(kcal);
      document.getElementById('nutriFoodProt100').value = Math.round(protein * 10) / 10;
      document.getElementById('nutriFoodCarb100').value = Math.round(carbs * 10) / 10;
      document.getElementById('nutriFoodFat100').value = Math.round(fat * 10) / 10;
      document.getElementById('nutriFoodAmount').value = '100';
      document.getElementById('nutriFoodUnit').value = 'g';

      recalcFoodModalMacros();
      showToast(isDe ? 'Produkt erfolgreich geladen!' : 'Product loaded successfully!');
      if (typeof haptic === 'function') haptic('success');
    } else {
      alert(isDe 
        ? `Produkt nicht gefunden (Code: ${barcode}). Bitte trage die Nährwerte manuell ein.` 
        : `Product not found (Code: ${barcode}). Please enter values manually.`
      );
    }
  } catch(e) {
    console.error("Failed to lookup barcode", e);
    alert(isDe 
      ? 'Fehler bei der Produktsuche. Netzwerkverbindung prüfen.' 
      : 'Product search failed. Check network connection.'
    );
  }
}
window.lookupBarcode = lookupBarcode;
