/* =============================================
   GYMTRACK — App Initialisation
   ============================================= */

const CURRENT_VERSION = '5.00';
const savedVersion    = localStorage.getItem('dscpln_version');

if (savedVersion && savedVersion !== CURRENT_VERSION) {
  localStorage.setItem('dscpln_version', CURRENT_VERSION);
  window.location.reload(true);
} else if (!savedVersion) {
  localStorage.setItem('dscpln_version', CURRENT_VERSION);
}

function initUI() {
  try {
    renderLog();
  } catch (e) {
    console.error("Error in renderLog:", e);
  }

  try {
    if (typeof renderProgress === 'function') renderProgress();
  } catch (e) {
    console.error("Error in renderProgress:", e);
  }

  try {
    if (typeof renderPrograms === 'function') {
      renderPrograms();
      updateActiveProgramBanner();
    }
  } catch (e) {
    console.error("Error in renderPrograms:", e);
  }

  // Mobility-Abteilung: teilt sich Übungen und Routinen mit dem Gym, hat aber
  // eigene Kennzahlen und einen eigenen Schnellstart.
  try {
    if (typeof renderMobilityDepartment === 'function') renderMobilityDepartment();
  } catch (e) {
    console.error("Error in renderMobilityDepartment:", e);
  }

  try {
    if (typeof renderAchievements === 'function') renderAchievements();
  } catch (e) {
    console.error("Error in renderAchievements:", e);
  }

  try {
    if (typeof renderSupplements === 'function') renderSupplements();
    else if (typeof updateSuppNavBadge === 'function') updateSuppNavBadge();
  } catch (e) {
    console.error("Error in renderSupplements:", e);
  }

  try {
    if (typeof initUIEffects === 'function') initUIEffects();
  } catch (e) {
    console.error("Error in initUIEffects:", e);
  }
}

// Boot on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    initSplash();
  } catch (e) {
    console.error("Error in initSplash:", e);
  }

  try {
    applyTranslations();
  } catch (e) {
    console.error("Error in applyTranslations:", e);
  }

  try {
    initUI();
  } catch (e) {
    console.error("Error in initUI:", e);
  }

  // Nach einem Neuladen die zuletzt gewählte Abteilung wiederherstellen und die
  // laufende Einheit dort einhängen, wo sie gestartet wurde.
  try {
    const running = db.currentWorkout;
    const startPage = (running && running.intendedDomain === DOMAIN_MOBILITY) ? 'mobility' : 'gym';
    showPage(startPage, document.querySelector(`.nav-btn[data-page="${startPage}"]`));
  } catch (e) {
    console.error("Error restoring department:", e);
  }
});

// Modal backdrop — tap outside to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  if (overlay.id === 'templateModal' || overlay.id === 'editWorkoutModal') return;
  overlay.addEventListener('click', e => {
    if (e.target !== overlay) return;
    if (overlay.id === 'tmplExPickerModal') { closeModal('tmplExPickerModal'); openModal('templateModal'); return; }
    if (overlay.id === 'workoutSummaryModal') { closeWorkoutSummary(); return; }
    if (SUB_MODALS.includes(overlay.id)) { closeSubModal(overlay.id); return; }
    closeModal(overlay.id);
  });
});
