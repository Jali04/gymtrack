/* =============================================
   GYMTRACK / DSCPLN — Authentication & Client
   ============================================= */

window.supabaseClient = null;
window.currentSession = null;

function initSupabase() {
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' &&
      SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY') {
    try {
      window.supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log('[Supabase] Initialized client successfully');
    } catch (e) {
      console.error('[Supabase] Failed to initialize client:', e);
    }
  } else {
    console.warn('[Supabase] Project URL and Anon Key are not configured. Cloud sync is disabled.');
  }
}

// Initialise auth and listeners on page load
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupAuthListeners();
});

function setupAuthListeners() {
  if (!window.supabaseClient) {
    updateSettingsAccountButton(null);
    return;
  }

  window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
    window.currentSession = session;
    console.log(`[Supabase Auth Event] ${event}`);

    const user = session?.user;
    updateSettingsAccountButton(user);
    updateAuthModalUI(user);

    if (event === 'SIGNED_IN') {
      showToast(lang === 'de' ? 'Erfolgreich angemeldet!' : 'Successfully signed in!');
      // Trigger data migration & sync
      if (typeof syncAll === 'function') {
        try {
          await syncAll();
        } catch (e) {
          console.error('[Sync] Post-login sync failed:', e);
        }
      }
    } else if (event === 'SIGNED_OUT') {
      showToast(lang === 'de' ? 'Abgemeldet.' : 'Signed out.');
      // Optional: Clear active cached user states
    }
  });
}

function updateSettingsAccountButton(user) {
  const btn = document.getElementById('btnSettingsAccount');
  const desc = document.getElementById('btnSettingsAccountDesc') || document.getElementById('lblSettingsAccountDesc');
  if (!btn) return;

  const isDe = (lang === 'de');
  if (user) {
    btn.textContent = isDe ? 'Verwalten' : 'Manage';
    btn.style.color = 'var(--accent)';
    if (desc) desc.textContent = isDe ? `Verbunden mit ${user.email}` : `Connected as ${user.email}`;
  } else {
    btn.textContent = isDe ? 'Verbinden' : 'Connect';
    btn.style.color = 'var(--accent2)';
    if (desc) desc.textContent = isDe ? 'Konto verbinden für automatische Sicherung' : 'Connect account for cloud backups';
  }
}

function updateAuthModalUI(user) {
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  const loggedInPanel = document.getElementById('authLoggedInPanel');
  const tabSwitcher = document.getElementById('authTabSwitcher');
  const title = document.getElementById('authModalTitle');

  const isDe = (lang === 'de');

  if (user) {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (tabSwitcher) tabSwitcher.style.display = 'none';
    if (loggedInPanel) loggedInPanel.style.display = 'flex';
    if (title) title.textContent = isDe ? 'KONTO VERWALTEN' : 'MANAGE ACCOUNT';

    const emailDisplay = document.getElementById('authLoggedInEmail');
    if (emailDisplay) emailDisplay.textContent = user.email;
  } else {
    if (loggedInPanel) loggedInPanel.style.display = 'none';
    if (tabSwitcher) tabSwitcher.style.display = 'flex';
    if (title) title.textContent = isDe ? 'ANMELDEN' : 'SIGN IN';

    switchAuthTab('login');
  }
}

function openAuthModal() {
  openModal('authModal');
  const msgEl = document.getElementById('authMessage');
  if (msgEl) msgEl.style.display = 'none';
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  const tabLogin = document.getElementById('tabAuthLogin');
  const tabRegister = document.getElementById('tabAuthRegister');
  const title = document.getElementById('authModalTitle');

  const isDe = (lang === 'de');

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'flex';
    if (registerForm) registerForm.style.display = 'none';
    if (title) title.textContent = isDe ? 'ANMELDEN' : 'SIGN IN';

    if (tabLogin) {
      tabLogin.className = 'btn btn-sm';
      tabLogin.style.background = 'var(--accent)';
      tabLogin.style.color = '#000';
    }
    if (tabRegister) {
      tabRegister.className = 'btn btn-sm btn-secondary';
      tabRegister.style.background = '';
      tabRegister.style.color = '';
    }
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    if (title) title.textContent = isDe ? 'REGISTRIEREN' : 'REGISTER';

    if (tabRegister) {
      tabRegister.className = 'btn btn-sm';
      tabRegister.style.background = 'var(--accent)';
      tabRegister.style.color = '#000';
    }
    if (tabLogin) {
      tabLogin.className = 'btn btn-sm btn-secondary';
      tabLogin.style.background = '';
      tabLogin.style.color = '';
    }
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  if (!window.supabaseClient) return;

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('authMessage');

  const isDe = (lang === 'de');
  showAuthMessage(isDe ? 'Melde an...' : 'Logging in...', 'var(--accent)');

  try {
    const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    closeModal('authModal');
    // Session state trigger handles the rest
  } catch (error) {
    console.error('[Auth Error]', error);
    showAuthMessage(error.message, 'var(--accent2)');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  if (!window.supabaseClient) return;

  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerPasswordConfirm').value;
  const msgEl = document.getElementById('authMessage');

  const isDe = (lang === 'de');

  if (password !== confirmPassword) {
    showAuthMessage(isDe ? 'Passwörter stimmen nicht überein.' : 'Passwords do not match.', 'var(--accent2)');
    return;
  }

  showAuthMessage(isDe ? 'Erstelle Konto...' : 'Creating account...', 'var(--accent)');

  try {
    const { data, error } = await window.supabaseClient.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) throw error;

    // Check if user is auto-confirmed or needs email confirmation
    if (data.session) {
      closeModal('authModal');
    } else {
      showAuthMessage(
        isDe 
          ? 'Konto erstellt! Bitte überprüfe deine E-Mails, um dein Konto zu aktivieren.' 
          : 'Account created! Please check your email to activate your account.', 
        'var(--accent)'
      );
    }
  } catch (error) {
    console.error('[Register Error]', error);
    showAuthMessage(error.message, 'var(--accent2)');
  }
}

async function handleLogout() {
  if (!window.supabaseClient) return;
  const isDe = (lang === 'de');

  if (!await showConfirm(isDe ? 'Möchtest du dich wirklich abmelden?' : 'Are you sure you want to log out?',
    { danger: false, confirmText: isDe ? 'Abmelden' : 'Log out' })) {
    return;
  }

  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    closeModal('authModal');
  } catch (error) {
    console.error('[Logout Error]', error);
    showToast(isDe ? 'Abmeldung fehlgeschlagen' : 'Logout failed');
  }
}

function showAuthMessage(text, color) {
  const msgEl = document.getElementById('authMessage');
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.style.color = '#fff';
  msgEl.style.background = color === 'var(--accent2)' ? 'rgba(208,2,27,0.15)' : 'rgba(232,255,71,0.15)';
  msgEl.style.border = `1px solid ${color}`;
  msgEl.style.display = 'block';
}

async function triggerManualSync() {
  const syncBtn = document.getElementById('btnAuthManualSync');
  const statusText = document.getElementById('authLoggedInSyncStatus');
  const isDe = (lang === 'de');

  if (syncBtn) syncBtn.disabled = true;
  if (statusText) statusText.textContent = isDe ? 'Synchronisiere...' : 'Syncing data...';

  try {
    if (typeof syncAll === 'function') {
      await syncAll();
      showToast(isDe ? 'Synchronisierung abgeschlossen!' : 'Sync completed successfully!');
      if (statusText) statusText.textContent = isDe ? 'Synchronisierung erfolgreich abgeschlossen.' : 'Sync completed successfully.';
    } else {
      throw new Error('Sync module not loaded');
    }
  } catch (e) {
    console.error('[Manual Sync Failed]', e);
    showToast(isDe ? 'Sync fehlgeschlagen' : 'Sync failed');
    if (statusText) statusText.textContent = isDe ? `Synchronisierung fehlgeschlagen: ${e.message}` : `Sync failed: ${e.message}`;
  } finally {
    if (syncBtn) syncBtn.disabled = false;
  }
}
