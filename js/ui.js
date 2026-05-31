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
