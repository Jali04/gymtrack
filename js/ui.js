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
  if (!navigator.vibrate) return;
  const patterns = {
    light:   [8],
    medium:  [18],
    success: [10, 40, 10],
    error:   [40, 20, 40],
  };
  navigator.vibrate(patterns[type] || [8]);
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
  toast.addEventListener('animationend', e => {
    if (e.animationName === 'toastOut') toast.remove();
  });
}

/* ---- Workout Complete Flash ---- */
function flashWorkoutComplete() {
  const flash = document.createElement('div');
  flash.className = 'finish-flash';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
}

/* ---- Init (called from app.js after DOM ready) ---- */
function initUI() {
  initRipples();

  // Re-apply ripples whenever a modal opens (new buttons rendered)
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    const observer = new MutationObserver(() => initRipples());
    observer.observe(overlay, { childList: true, subtree: true });
  });
}
