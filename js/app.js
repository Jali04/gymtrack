/* =============================================
   GYMTRACK — App Initialisation
   ============================================= */

const CURRENT_VERSION = '3.8';
const savedVersion    = localStorage.getItem('dscpln_version');

if (savedVersion && savedVersion !== CURRENT_VERSION) {
  localStorage.setItem('dscpln_version', CURRENT_VERSION);
  window.location.reload(true);
} else if (!savedVersion) {
  localStorage.setItem('dscpln_version', CURRENT_VERSION);
}

function initUI() {
  renderLog();
  if (typeof renderProgress === 'function') renderProgress();
  if (typeof renderPrograms === 'function') {
    renderPrograms();
    updateActiveProgramBanner();
  }
  if (typeof renderAchievements === 'function') renderAchievements();
}

// Boot
initSplash();
applyTranslations();
initUI();

// Modal backdrop — tap outside to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  if (overlay.id === 'templateModal' || overlay.id === 'editWorkoutModal') return;
  overlay.addEventListener('click', e => {
    if (e.target !== overlay) return;
    if (overlay.id === 'tmplExPickerModal') { closeModal('tmplExPickerModal'); openModal('templateModal'); return; }
    if (SUB_MODALS.includes(overlay.id)) { closeSubModal(overlay.id); return; }
    closeModal(overlay.id);
  });
});
