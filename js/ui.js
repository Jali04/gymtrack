/* =============================================
   GYMTRACK — UI Effects & Interactions
   ============================================= */

/* ---- Ripple Effect ---- */
function addRipple(e) {
  const btn  = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y    = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  const ripple = document.createElement('span');
  ripple.className     = 'ripple-effect';
  ripple.style.left    = x + 'px';
  ripple.style.top     = y + 'px';
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function initRipples() {
  document.querySelectorAll('.btn:not([data-ripple]), .exercise-card:not([data-ripple])').forEach(el => {
    el.dataset.ripple = '1';
    el.addEventListener('click', addRipple);
  });
}

/* ---- Haptic Feedback ---- */
function haptic(type) {
  // If running in Capacitor and Haptics plugin is available, use it!
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
    try {
      const haptics = window.Capacitor.Plugins.Haptics;
      if (type === 'light') haptics.impact({ style: 'LIGHT' });
      else if (type === 'medium') haptics.impact({ style: 'MEDIUM' });
      else if (type === 'success') haptics.notification({ type: 'SUCCESS' });
      else if (type === 'error') haptics.notification({ type: 'ERROR' });
      return;
    } catch (e) {
      console.warn("Capacitor Haptics failed:", e);
    }
  }

  // Fallback to HTML5 Vibrate API
  if (!navigator.vibrate) return;
  const patterns = {
    light:   [8],
    medium:  [18],
    success: [10, 40, 10],
    error:   [40, 20, 40],
  };
  navigator.vibrate(patterns[type] || [8]);
}

function testHaptic() {
  haptic('success');

  const btn = document.getElementById('btnTestHaptic');
  if (btn) {
    btn.classList.add('pin-shake');
    setTimeout(() => btn.classList.remove('pin-shake'), 400);
  }

  const hasCapacitor = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics);
  const hasVibrate = !!navigator.vibrate;

  if (hasCapacitor) {
    showToast("Haptik-Test: Erfolg (Native Vibration ausgelöst) 📳");
  } else if (hasVibrate) {
    showToast("Haptik-Test: Erfolg (Vibration im Web-Browser) 📳");
  } else {
    showToast("Haptik-Test: Simuliert (Vibration auf diesem Gerät/Browser nicht unterstützt) 📳");
  }
}

/* ---- Animated Count-Up ---- */
function animateCount(el, target, duration) {
  duration = duration || 700;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ---- Toast Notification ---- */
function showToast(message) {
  // Remove any existing toast
  const existing = document.querySelector('.success-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className   = 'success-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ---- Undo toast (A4): destructive actions with a 5s Rückgängig ---- */
let _undoTimer = null;
function showUndoToast(message, onUndo) {
  const existing = document.querySelector('.undo-toast');
  if (existing) existing.remove();
  if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; }

  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  const label = document.createElement('span');
  label.textContent = message;
  const btn = document.createElement('button');
  btn.className = 'undo-btn';
  btn.textContent = (typeof lang !== 'undefined' && lang === 'en') ? 'Undo' : 'Rückgängig';
  toast.appendChild(label);
  toast.appendChild(btn);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const dismiss = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); };
  btn.addEventListener('click', () => {
    if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; }
    dismiss();
    try { onUndo(); } catch (e) { console.error('undo failed', e); }
  });
  _undoTimer = setTimeout(dismiss, 5000);
}

function showInfo(title, text) {
  document.getElementById('infoModalTitle').textContent = title;
  document.getElementById('infoModalText').textContent = text;
  openModal('infoModal');
}

/* ---- Workout Complete Flash ---- */
function flashWorkoutComplete() {
  const flash = document.createElement('div');
  flash.className = 'finish-flash';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
}

/* ---- Auto-backup status (E3) ---- */
function _refreshAutoBackupUI() {
  const statusEl = document.getElementById('autoBackupStatus');
  const btn = document.getElementById('btnRestoreAutoBackup');
  if (!statusEl) return;
  const meta = (typeof getAutoBackupMeta === 'function') ? getAutoBackupMeta() : null;
  if (meta && meta.ts) {
    const loc = (typeof lang !== 'undefined' && lang === 'en') ? 'en-GB' : 'de-DE';
    const when = new Date(meta.ts).toLocaleString(loc, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const prefix = (typeof lang !== 'undefined' && lang === 'en') ? 'Last auto-backup: ' : 'Letztes Auto-Backup: ';
    statusEl.textContent = prefix + when;
    if (btn) btn.disabled = false;
  } else {
    statusEl.textContent = (typeof lang !== 'undefined' && lang === 'en') ? 'No auto-backup yet' : 'Noch kein Auto-Backup';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  }
}

/* ---- Training settings toggles ---- */
function toggleWakeLockSetting(checked) {
  if (!db.settings) db.settings = {};
  db.settings.wakeLock = checked;
  save();
  if (typeof applyWakeLockSetting === 'function') applyWakeLockSetting();
  haptic('light');
  showToast(checked ? t('wakeLockOn') : t('wakeLockOff'));
}

function toggleUnitSetting() {
  if (!db.settings) db.settings = {};
  db.settings.unit = (db.settings.unit === 'lbs') ? 'kg' : 'lbs';
  save();
  haptic('light');
  const btn = document.getElementById('btnSettingsUnit');
  if (btn) btn.textContent = db.settings.unit;
  // Re-render every weight-bearing surface.
  if (typeof db.currentWorkout !== 'undefined' && db.currentWorkout && typeof renderActiveWorkout === 'function') renderActiveWorkout();
  if (typeof renderLog === 'function') renderLog();
  if (typeof renderProgress === 'function') { try { renderProgress(); } catch (e) {} }
  if (typeof renderCalendar === 'function') { try { renderCalendar(); } catch (e) {} }
  showToast(db.settings.unit === 'lbs' ? (lang === 'en' ? 'Showing pounds' : 'Zeige Pfund') : (lang === 'en' ? 'Showing kilograms' : 'Zeige Kilogramm'));
}

function toggleRirSetting(checked) {
  if (!db.settings) db.settings = {};
  db.settings.rir = checked;
  save();
  haptic('light');
  if (typeof renderActiveWorkout === 'function' && db.currentWorkout) renderActiveWorkout();
  showToast(checked ? (lang === 'en' ? 'Showing RIR' : 'Zeige RIR') : (lang === 'en' ? 'Showing RPE' : 'Zeige RPE'));
}

function toggleRestSoundSetting(checked) {
  const cfg = (typeof _getRestCfg === 'function') ? _getRestCfg() : (db.restTimer = db.restTimer || {});
  cfg.sound = checked;
  save();
  haptic('light');
  if (checked && typeof _restBeep === 'function') _restBeep(880, 0.08); // audible confirmation
  showToast(checked ? t('restSoundOn') : t('restSoundOff'));
}

/* ---- Dark / Light Theme Toggle ---- */
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('gymtrack_theme', isLight ? 'light' : 'dark');
}

// Apply on load
(function() {
  if (localStorage.getItem('gymtrack_theme') === 'light') {
    document.body.classList.add('light-mode');
  }
})();

/* ---- Init (called from app.js after DOM ready) ---- */
function initUIEffects() {
  initRipples();

  // Re-apply ripples whenever a modal opens (new buttons rendered)
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    const observer = new MutationObserver(() => initRipples());
    observer.observe(overlay, { childList: true, subtree: true });
  });
}
