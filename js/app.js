/* =============================================
   GYMTRACK — App Initialisation
   ============================================= */

const CURRENT_VERSION = '3.4';
const savedVersion    = localStorage.getItem('gymtrack_version');

if (savedVersion && savedVersion !== CURRENT_VERSION) {
  localStorage.setItem('gymtrack_version', CURRENT_VERSION);
  window.location.reload(true);
} else if (!savedVersion) {
  localStorage.setItem('gymtrack_version', CURRENT_VERSION);
}

// Boot
applyTranslations();
renderLog();
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
