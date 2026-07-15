/* =============================================
   DSCPLN — Screen Wake Lock (A3)
   Keeps the display awake while a workout or the
   HIIT timer is running, so the rest/HIIT UI stays
   visible instead of the phone locking on the bench.
   ============================================= */

let _wakeLock        = null;   // active WakeLockSentinel
let _wakeLockWanted  = false;  // do we currently want the screen kept awake?

function _wakeLockSupported() {
  return 'wakeLock' in navigator && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
}

function _wakeLockEnabled() {
  // Setting default: on. db.settings may not exist on very old data.
  if (typeof db === 'undefined' || !db) return true;
  if (!db.settings) return true;
  return db.settings.wakeLock !== false;
}

async function _acquireWakeLock() {
  if (!_wakeLockWanted) return;
  if (!_wakeLockSupported() || !_wakeLockEnabled()) return;
  if (_wakeLock) return; // already held
  if (document.hidden) return; // can only be acquired while visible
  try {
    _wakeLock = await navigator.wakeLock.request('screen');
    _wakeLock.addEventListener('release', () => { _wakeLock = null; });
  } catch (e) {
    // e.g. low battery / permission — non-fatal, just log.
    console.warn('[WakeLock] request failed:', e && e.message);
    _wakeLock = null;
  }
}

async function _releaseWakeLock() {
  if (!_wakeLock) return;
  try { await _wakeLock.release(); } catch (e) { /* ignore */ }
  _wakeLock = null;
}

// Public: call when a workout / HIIT timer becomes active.
function requestWakeLock() {
  _wakeLockWanted = true;
  _acquireWakeLock();
}

// Public: call when nothing needs the screen kept awake anymore.
function releaseWakeLock() {
  _wakeLockWanted = false;
  _releaseWakeLock();
}

// Public: re-evaluate whether we should hold the lock based on app state.
// Safe to call often (render, setting toggle, timer start/stop).
function refreshWakeLock() {
  const hiitRunning = (typeof hiitState !== 'undefined' && hiitState && hiitState.interval);
  const workoutActive = (typeof db !== 'undefined' && db && db.currentWorkout);
  if (workoutActive || hiitRunning) {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
}

// Browsers drop the lock when the tab is hidden; reacquire on return.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && _wakeLockWanted) _acquireWakeLock();
});

// React to the setting being toggled off while a workout is running.
function applyWakeLockSetting() {
  if (_wakeLockEnabled()) _acquireWakeLock();
  else _releaseWakeLock();
}
