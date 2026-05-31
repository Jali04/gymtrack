/* =============================================
   DSCPLN — Onboarding & Guide System
   ============================================= */

// Structured Multi-Step Onboarding Tours
const TOUR_STEPS = {
  de: {
    log: [
      {
        page: 'log',
        target: '#btnNewWorkout',
        title: 'Schritt 1 von 3: Neues Training',
        text: 'Tippe auf "+ Neues Training", um deine Trainingseinheit zu starten. Du kannst ein leeres Training starten, Vorlagen nutzen oder aus Programmen wählen.'
      },
      {
        page: 'log',
        target: '#btnStartEmpty',
        title: 'Schritt 2 von 3: Freies Training',
        text: 'Wähle "Leeres Training", um ein freies Workout ohne Vorlage zu beginnen. Hier lernst du das Protokollieren deiner Sätze.',
        onEnter: () => { if (typeof openStartOptionsModal === 'function') openStartOptionsModal(); },
        onLeave: () => { if (typeof closeModal === 'function') closeModal('startOptionsModal'); }
      },
      {
        page: 'log',
        target: '#btnFinishWorkout',
        title: 'Schritt 3 von 3: Training loggen & Sätze',
        text: 'Dein Workout läuft! Hier kannst du Übungen hinzufügen, deine Sätze protokollieren (Typen: Normal, Warmup, Dropsatz) und dein Training mit "Fertig" speichern.',
        onEnter: () => { 
          if (typeof closeModal === 'function') closeModal('startOptionsModal'); 
          if (typeof openNewWorkout === 'function') openNewWorkout(); 
        },
        onLeave: () => { 
          // Silently discard mock workout to keep database clean
          if (typeof stopTimer === 'function') stopTimer();
          if (typeof swReset === 'function') swReset();
          db.currentWorkout = null;
          save();
          const activeWo = document.getElementById('activeWorkout');
          const qs = document.getElementById('quickStart');
          if (activeWo) activeWo.style.display = 'none';
          if (qs) qs.style.display = 'block';
          if (typeof renderLog === 'function') renderLog();
        }
      }
    ],
    gymlab: [
      {
        page: 'gymlab',
        target: '#btnCreateTemplate',
        title: 'Schritt 1 von 2: Übungen & Vorlagen',
        text: 'Im GymLab verwaltest du deine Workouts. Erstelle hier eine Vorlage (z.B. Push Day), um vordefinierte Übungen schnell zu laden.',
        onEnter: () => { if (typeof switchGymLabTab === 'function') switchGymLabTab('templates'); }
      },
      {
        page: 'gymlab',
        target: '#btnCreateProgram',
        title: 'Schritt 2 von 2: Wochen-Programme',
        text: 'Plane deinen Trainingszyklus! Erstelle mehrwöchige Programme und weise den Wochentagen deine erstellten Vorlagen zu.',
        onEnter: () => { if (typeof switchGymLabTab === 'function') switchGymLabTab('programs'); }
      }
    ],
    aicoach: [
      {
        page: 'log',
        target: '.ai-chat-input-row',
        title: 'Schritt 1 von 2: AI Coach Chat',
        text: 'Stelle deinem AI Coach Fragen wie "Was kann ich gegen Plateaus beim Bankdrücken tun?". Er kennt deine echte Trainingshistorie!',
        onEnter: () => { if (typeof openAiCoach === 'function') openAiCoach(); },
        onLeave: () => { if (typeof closeModal === 'function') closeModal('aiCoachModal'); }
      },
      {
        page: 'log',
        target: '.ai-suggestions-row',
        title: 'Schritt 2 von 2: Schnell-Vorlagen',
        text: 'Nutze die Buttons wie "Plan erstellen" oder "Wochenrückblick", um mit einem Klick strukturierte Antworten zu generieren.',
        onEnter: () => { if (typeof openAiCoach === 'function') openAiCoach(); },
        onLeave: () => { if (typeof closeModal === 'function') closeModal('aiCoachModal'); }
      }
    ],
    calendar: [
      {
        page: 'progress',
        target: '.cal-grid',
        title: 'Schritt 1 von 2: Trainingskalender & Streak',
        text: 'Hier siehst du deine Trainingstage. Die farbigen Punkte unter den Daten zeigen dir, ob du Kraft, Cardio oder Stretching trainiert hast.',
        onEnter: () => { if (typeof switchProgressSubTab === 'function') switchProgressSubTab('calendar-stats'); }
      },
      {
        page: 'progress',
        target: '#monthlyRecap',
        title: 'Schritt 2 von 2: Monats-Zusammenfassung',
        text: 'Weiter unten findest du dein Monats-Recap mit der Gesamtzahl der Sätze und Trainings sowie individuellen Übungs-Statistiken.',
        onEnter: () => { if (typeof switchProgressSubTab === 'function') switchProgressSubTab('calendar-stats'); }
      }
    ],
    supps: [
      {
        page: 'supps',
        target: '.supp-date-nav',
        title: 'Schritt 1 von 2: Einnahmen protokollieren',
        text: 'Deine heute fälligen Nahrungsergänzungsmittel werden hier angezeigt. Tippe auf ein Supplement, um die Einnahme abzuhaken.'
      },
      {
        page: 'supps',
        target: '#page-supps .btn-primary.btn-sm',
        title: 'Schritt 2 von 2: Supplement anlegen',
        text: 'Klicke auf das "+", um neue Supplements mit Dosierung, Restbestand und Erinnerungen (z.B. täglich oder bestimmte Wochentage) anzulegen.'
      }
    ],
    progress: [
      {
        page: 'progress',
        target: '#btnWeightMod',
        title: 'Schritt 1 von 3: Körperwerte verfolgen',
        text: 'Trage regelmäßig dein Gewicht und Körperfettanteil ein. DSCPLN generiert automatisch einen Verlaufsgraphen für dich.'
      },
      {
        page: 'progress',
        target: '#btnPicsMod',
        title: 'Schritt 2 von 3: Fortschritts-Fotos',
        text: 'Speichere Bilder deiner optischen Transformation. Alle Fotos werden sicher lokal verschlüsselt und sind nur per 4-stelliger PIN einsehbar.'
      },
      {
        page: 'progress',
        target: '#exerciseProgressTracker',
        title: 'Schritt 3 von 3: Kraftsteigerung',
        text: 'Hier unten siehst du die Leistungssteigerung deines geschätzten Maximalgewichts (1RM) für jede einzelne Übung.'
      }
    ]
  },
  en: {
    log: [
      {
        page: 'log',
        target: '#btnNewWorkout',
        title: 'Step 1 of 3: New Workout',
        text: 'Tap "+ New Workout" to start your session. You can start empty, load a template, or follow a program.'
      },
      {
        page: 'log',
        target: '#btnStartEmpty',
        title: 'Step 2 of 3: Free Workout',
        text: 'Select "Empty Workout" to start a free workout without a template. Here you will learn how to log sets.',
        onEnter: () => { if (typeof openStartOptionsModal === 'function') openStartOptionsModal(); },
        onLeave: () => { if (typeof closeModal === 'function') closeModal('startOptionsModal'); }
      },
      {
        page: 'log',
        target: '#btnFinishWorkout',
        title: 'Step 3 of 3: Log & Edit Sets',
        text: 'Your workout is now running! Here you can add exercises, log sets (Normal, Warmup, Drop Sets), and tap "Done" to save.',
        onEnter: () => { 
          if (typeof closeModal === 'function') closeModal('startOptionsModal'); 
          if (typeof openNewWorkout === 'function') openNewWorkout(); 
        },
        onLeave: () => { 
          // Silently discard mock workout to keep database clean
          if (typeof stopTimer === 'function') stopTimer();
          if (typeof swReset === 'function') swReset();
          db.currentWorkout = null;
          save();
          const activeWo = document.getElementById('activeWorkout');
          const qs = document.getElementById('quickStart');
          if (activeWo) activeWo.style.display = 'none';
          if (qs) qs.style.display = 'block';
          if (typeof renderLog === 'function') renderLog();
        }
      }
    ],
    gymlab: [
      {
        page: 'gymlab',
        target: '#btnCreateTemplate',
        title: 'Step 1 of 2: Reusable Templates',
        text: 'In GymLab, create a Template (e.g. Chest Day) to easily preload sets and exercises for your next workouts.',
        onEnter: () => { if (typeof switchGymLabTab === 'function') switchGymLabTab('templates'); }
      },
      {
        page: 'gymlab',
        target: '#btnCreateProgram',
        title: 'Step 2 of 2: Program Schedules',
        text: 'Schedule structured training cycles over multiple weeks, assigning templates to specific workout weekdays.',
        onEnter: () => { if (typeof switchGymLabTab === 'function') switchGymLabTab('programs'); }
      }
    ],
    aicoach: [
      {
        page: 'log',
        target: '.ai-chat-input-row',
        title: 'Step 1 of 2: Chat with Coach',
        text: 'Ask your AI Coach any fitness questions. He understands your complete workout history and weight progress!',
        onEnter: () => { if (typeof openAiCoach === 'function') openAiCoach(); },
        onLeave: () => { if (typeof closeModal === 'function') closeModal('aiCoachModal'); }
      },
      {
        page: 'log',
        target: '.ai-suggestions-row',
        title: 'Step 2 of 2: Quick Suggestions',
        text: 'Tap suggestion buttons like "Create Plan" or "Weekly Summary" to quickly generate tailored programs.',
        onEnter: () => { if (typeof openAiCoach === 'function') openAiCoach(); },
        onLeave: () => { if (typeof closeModal === 'function') closeModal('aiCoachModal'); }
      }
    ],
    calendar: [
      {
        page: 'progress',
        target: '.cal-grid',
        title: 'Step 1 of 2: Workout Calendar',
        text: 'Review past workout days. Dot indicators represent logged training categories (Strength, Cardio, Stretch).',
        onEnter: () => { if (typeof switchProgressSubTab === 'function') switchProgressSubTab('calendar-stats'); }
      },
      {
        page: 'progress',
        target: '#monthlyRecap',
        title: 'Step 2 of 2: Monthly Recap & Stats',
        text: 'Scroll down to review monthly summaries, check total reps, sets, and view detailed individual exercises stats.',
        onEnter: () => { if (typeof switchProgressSubTab === 'function') switchProgressSubTab('calendar-stats'); }
      }
    ],
    supps: [
      {
        page: 'supps',
        target: '.supp-date-nav',
        title: 'Step 1 of 2: Log Supplement Intake',
        text: 'Active supplements due today are listed here. Tap any card to log your daily dosage.'
      },
      {
        page: 'supps',
        target: '#page-supps .btn-primary.btn-sm',
        title: 'Step 2 of 2: Create Supplements',
        text: 'Tap "+" to log new supplements, specify dosage, configure remaining supply, and set weekly/daily schedules.'
      }
    ],
    progress: [
      {
        page: 'progress',
        target: '#btnWeightMod',
        title: 'Step 1 of 3: Weight & Body Fat',
        text: 'Log body weight and fat %. The app will automatically build charts demonstrating weight trends over time.'
      },
      {
        page: 'progress',
        target: '#btnPicsMod',
        title: 'Step 2 of 3: Transform Progress Pics',
        text: 'Save transformation pictures. Progress pictures remain secure in local sandbox memory, protected by a 4-digit PIN.'
      },
      {
        page: 'progress',
        target: '#exerciseProgressTracker',
        title: 'Step 3 of 3: Force & Max Reps',
        text: 'Review progressive overload stats. Line graphs display changes in your estimated One Rep Max (1RM).'
      }
    ]
  }
};

// FAQ Content in German and English
const GUIDE_CONTENT = {
  de: {
    faq: [
      {
        q: 'Wie erstelle ich einen Trainingsplan?',
        a: 'Gehe in das <strong>GymLab</strong> und klicke auf das "+" bei "Vorlagen" für einzelne Workouts, oder bei "Programme" für einen wöchentlich rollierenden Plan. Du kannst auch den <strong>AI Coach</strong> fragen: "Erstelle mir einen Push/Pull Plan" – er generiert dir einen importierbaren Entwurf!'
      },
      {
        q: 'Was bedeuten die Satz-Typen (N, W, D)?',
        a: 'Beim Eintragen deiner Sätze kannst du den Typ umschalten:<br><strong>N (Normal)</strong>: Dein regulärer Arbeitssatz.<br><strong>W (Warmup)</strong>: Ein Aufwärmsatz, der in Statistiken gesondert markiert wird.<br><strong>D (Drop Set)</strong>: Ein Reduktionssatz, bei dem du das Gewicht sofort verringerst.'
      },
      {
        q: 'Wie funktioniert der Pausentimer?',
        a: 'Aktiviere auf dem Trainings-Bildschirm die "Satzpause" und stelle deine Wunschzeit ein (z.B. 1:30). Sobald du in einer Übung ein Häkchen bei einem Satz setzt, startet automatisch ein kreisförmiger Timer unten im Bildschirm, der per Sound/Vibration das Ende der Pause signalisiert.'
      },
      {
        q: 'Wie sichere ich meine Daten?',
        a: 'Klicke oben rechts auf das Einstellungen-Zahnrad (Backup & Restore). Du kannst deine Daten als Datei sichern oder einen Export-Code kopieren. Da DSCPLN deine Daten komplett lokal speichert (offline-first), solltest du regelmäßig ein Backup machen!'
      },
      {
        q: 'Sind meine Fortschritts-Fotos sicher?',
        a: 'Ja. Wenn du auf "Fotos" klickst, wirst du aufgefordert, eine 4-stellige PIN zu vergeben. Alle Fotos verbleiben sicher in der lokalen Sandbox deines Geräts und sind ohne PIN nicht einsehbar. Sie werden niemals auf fremde Server geladen.'
      }
    ]
  },
  en: {
    faq: [
      {
        q: 'How do I create a workout plan?',
        a: 'Go to <strong>GymLab</strong> and tap the "+" on "Templates" for single workouts, or "Programs" for a weekly routine calendar. You can also ask the <strong>AI Coach</strong>: "Create a Push/Pull plan" – he will generate an importable layout for you!'
      },
      {
        q: 'What do the set types (N, W, D) stand for?',
        a: 'When logging sets, tap the type button to toggle:<br><strong>N (Normal)</strong>: Your standard working set.<br><strong>W (Warmup)</strong>: A warmup set, tracked separately in stats.<br><strong>D (Drop Set)</strong>: A drop set, where you drop weight and immediately perform reps.'
      },
      {
        q: 'How does the rest timer countdown work?',
        a: 'Activate "Rest timer" on the training log page and select your duration (e.g., 1:30). When you check a set as completed during your workout, a round timer overlay starts automatically at the bottom, alerting you with sound/vibration when it is time to lift again.'
      },
      {
        q: 'How do I backup my data?',
        a: 'Tap the settings gear icon in the top header (Backup & Restore). You can download your data as a file or copy a code. Since DSCPLN stores all data locally (offline-first), we recommend regular backups!'
      },
      {
        q: 'Are my progress photos secure?',
        a: 'Yes. When you open "Photos", you will be prompted to create a 4-digit PIN. All photos remain in your device\'s local storage and cannot be viewed without the PIN. They are never uploaded to any servers.'
      }
    ]
  }
};

// Guide Card list for Interactive Menu rendering
const GUIDE_TOUR_ITEMS = {
  de: [
    { id: 'log', icon: '🏋️‍♂️', title: 'Training & Verlauf', text: 'Workouts starten, Sätze loggen, Timer nutzen.' },
    { id: 'gymlab', icon: '🧪', title: 'GymLab (Vorlagen)', text: 'Vorlagen & Programme über Wochen hinweg planen.' },
    { id: 'aicoach', icon: '🤖', title: 'AI Coach', text: 'Chatte mit dem Coach, um Pläne per Klick zu importieren.' },
    { id: 'calendar', icon: '📅', title: 'Kalender & Statistiken', text: 'Trainingskalender, Streaks und monatliche Recaps.' },
    { id: 'supps', icon: '💊', title: 'Supplements', text: 'Tägliche Einnahmen planen, loggen und Vorrat verwalten.' },
    { id: 'progress', icon: '📈', title: 'Fortschritt & Fotos', text: 'Gewichtsverlauf und PIN-gesicherte Progress-Fotos.' }
  ],
  en: [
    { id: 'log', icon: '🏋️‍♂️', title: 'Workout & Log', text: 'Start workouts, log sets, and use the rest timer.' },
    { id: 'gymlab', icon: '🧪', title: 'GymLab (Templates)', text: 'Schedule templates and structured programs.' },
    { id: 'aicoach', icon: '🤖', title: 'AI Coach', text: 'Chat with the coach to generate importable plans.' },
    { id: 'calendar', icon: '📅', title: 'Calendar & Stats', text: 'Streak calendars, workouts history and statistics.' },
    { id: 'supps', icon: '💊', title: 'Supplements', text: 'Schedule supplements intake and track stock.' },
    { id: 'progress', icon: '📈', title: 'Progress & Photos', text: 'Body weight trends and PIN-locked progress photos.' }
  ]
};

// State
let activeGuideTab = 'tour';
let currentTourSteps = [];
let currentTourIndex = 0;

// Init Onboarding Guide
function initGuide() {
  checkOnboardingStatus();
  renderGuide();
}

// Check local storage flag
function checkOnboardingStatus() {
  const onboarded = localStorage.getItem('dscpln_onboarded');
  const welcomeBanner = document.getElementById('guideWelcomeBanner');
  const badgePulse = document.getElementById('guideBadgePulse');
  const tourBtn = document.getElementById('btnSettingsTour');
  
  if (!onboarded) {
    if (welcomeBanner) welcomeBanner.style.display = 'block';
    if (badgePulse) badgePulse.style.display = 'block';
    if (tourBtn) tourBtn.classList.add('guide-highlight-pulse');
  } else {
    if (welcomeBanner) welcomeBanner.style.display = 'none';
    if (badgePulse) badgePulse.style.display = 'none';
    if (tourBtn) tourBtn.classList.remove('guide-highlight-pulse');
  }
}

// Dismiss Onboarding Banner
function dismissGuideBanner(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  localStorage.setItem('dscpln_onboarded', '1');
  checkOnboardingStatus();
  if (typeof haptic === 'function') haptic('light');
}

// Open Guide Modal
function openGuideModal(tab) {
  if (tab) {
    switchGuideTab(tab);
  }
  openModal('helpGuideModal');
  if (typeof haptic === 'function') haptic('light');
}

// Switch tabs inside modal
function switchGuideTab(tabId) {
  activeGuideTab = tabId;
  const tourBtn = document.getElementById('btnGuideTabTour');
  const faqBtn = document.getElementById('btnGuideTabFaq');
  const tourContent = document.getElementById('guideTabContentTour');
  const faqContent = document.getElementById('guideTabContentFaq');
  
  if (tourBtn && faqBtn && tourContent && faqContent) {
    if (tabId === 'tour') {
      tourBtn.classList.add('active');
      faqBtn.classList.remove('active');
      tourContent.style.display = 'block';
      faqContent.style.display = 'none';
    } else {
      tourBtn.classList.remove('active');
      faqBtn.classList.add('active');
      tourContent.style.display = 'none';
      faqContent.style.display = 'block';
    }
  }
  if (typeof haptic === 'function') haptic('light');
}

// Toggle FAQ accordion item
function toggleFaq(index) {
  const items = document.querySelectorAll('.guide-faq-item');
  if (items[index]) {
    const isActive = items[index].classList.contains('active');
    items.forEach(item => item.classList.remove('active'));
    if (!isActive) {
      items[index].classList.add('active');
      if (typeof haptic === 'function') haptic('light');
    }
  }
}

// Render dynamic guides based on current language
function renderGuide() {
  const currentLang = (typeof lang !== 'undefined') ? lang : 'de';
  const rawTour = GUIDE_TOUR_ITEMS[currentLang] || GUIDE_TOUR_ITEMS['de'];
  const rawFaq = (GUIDE_CONTENT[currentLang] || GUIDE_CONTENT['de']).faq;
  
  // Update header/banner DOM
  const s = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  s('lblGuideHeaderTitle', 'guideHeaderTitle');
  s('btnGuideTabTour', 'guideTabTour');
  s('btnGuideTabFaq', 'guideTabFaq');
  s('btnGuideModalClose', 'close');
  
  s('lblGuideBannerTitle', 'guideBannerTitle');
  s('lblGuideBannerText', 'guideBannerText');
  s('btnGuideBannerStart', 'guideBannerStart');
  s('btnGuideBannerDismiss', 'guideBannerDismiss');
  
  // Render Tour Cards in Menu
  const tourContainer = document.getElementById('guideTourList');
  if (tourContainer) {
    tourContainer.innerHTML = '';
    rawTour.forEach(item => {
      const card = document.createElement('div');
      card.className = 'guide-tour-card';
      card.innerHTML = `
        <div class="guide-tour-header">
          <span class="guide-tour-icon">${item.icon}</span>
          <h4 class="guide-tour-title">${item.title}</h4>
        </div>
        <p class="guide-tour-text">${item.text}</p>
        <button class="guide-tour-btn" onclick="startTour('${item.id}')">
          <span>${t('guideShowMe')}</span>
          <span>⚡</span>
        </button>
      `;
      tourContainer.appendChild(card);
    });
  }
  
  // Render FAQ Accordion
  const faqContainer = document.getElementById('guideFaqList');
  if (faqContainer) {
    faqContainer.innerHTML = '';
    rawFaq.forEach((item, index) => {
      const faqItem = document.createElement('div');
      faqItem.className = 'guide-faq-item';
      faqItem.innerHTML = `
        <div class="guide-faq-question" onclick="toggleFaq(${index})">${item.q}</div>
        <div class="guide-faq-answer">${item.a}</div>
      `;
      faqContainer.appendChild(faqItem);
    });
  }
}

// Start Multi-Step Tour
function startTour(tourId) {
  const currentLang = (typeof lang !== 'undefined') ? lang : 'de';
  const group = TOUR_STEPS[currentLang] || TOUR_STEPS['de'];
  currentTourSteps = group[tourId] || [];
  currentTourIndex = 0;
  
  // Close the main modal
  closeModal('helpGuideModal');
  
  // Dismiss onboarding banner
  localStorage.setItem('dscpln_onboarded', '1');
  checkOnboardingStatus();
  
  if (currentTourSteps.length > 0) {
    goToStep(0);
  }
}

// Navigate to step index
function goToStep(index) {
  if (index < 0 || index >= currentTourSteps.length) return;
  
  // 1. Clean up active highlighting
  document.querySelectorAll('.guide-highlight-pulse').forEach(el => {
    el.classList.remove('guide-highlight-pulse');
  });
  
  // 2. Trigger onLeave on the previous step
  if (currentTourIndex < currentTourSteps.length) {
    const prevStep = currentTourSteps[currentTourIndex];
    if (prevStep && typeof prevStep.onLeave === 'function') {
      try { prevStep.onLeave(); } catch (e) { console.warn("Guide onLeave error:", e); }
    }
  }
  
  currentTourIndex = index;
  const step = currentTourSteps[index];
  
  // 3. Switch page view if needed
  if (step.page === 'aicoach') {
    if (typeof openAiCoach === 'function') openAiCoach();
  } else if (step.page) {
    const navBtn = document.querySelector(`.nav-btn[data-page="${step.page}"]`);
    if (typeof showPage === 'function') {
      showPage(step.page, navBtn);
      if (navBtn) navBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
  
  // 4. Trigger onEnter
  if (typeof step.onEnter === 'function') {
    try { step.onEnter(); } catch (e) { console.warn("Guide onEnter error:", e); }
  }
  
  if (typeof haptic === 'function') haptic('light');
  
  // 5. Highlight & render tooltip after layout stabilizes (300ms)
  setTimeout(() => {
    const el = document.querySelector(step.target);
    if (el) {
      el.classList.add('guide-highlight-pulse');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    renderGuideTooltip();
  }, 350);
}

// Next Step Action
function nextStep() {
  if (currentTourIndex < currentTourSteps.length - 1) {
    goToStep(currentTourIndex + 1);
  } else {
    endTour(true);
  }
}

// Previous Step Action
function prevStep() {
  if (currentTourIndex > 0) {
    goToStep(currentTourIndex - 1);
  }
}

// End/Cancel Tour
function endTour(completed) {
  // Clear highlights
  document.querySelectorAll('.guide-highlight-pulse').forEach(el => {
    el.classList.remove('guide-highlight-pulse');
  });
  
  // Trigger onLeave on current step
  const step = currentTourSteps[currentTourIndex];
  if (step && typeof step.onLeave === 'function') {
    try { step.onLeave(); } catch (e) { console.warn("Guide onLeave error:", e); }
  }
  
  // Fade out tooltip
  const tooltip = document.getElementById('guideTooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
    setTimeout(() => { tooltip.remove(); }, 300);
  }
  
  currentTourSteps = [];
  currentTourIndex = 0;
  
  if (typeof haptic === 'function') haptic('success');
  if (completed) {
    // Show a success message toast
    const msg = lang === 'en' ? 'Tour finished! Keep it up! 💪' : 'Tour abgeschlossen! Bleib dran! 💪';
    if (typeof showToast === 'function') showToast(msg);
  }
}

// Render/Update the floating guide tooltip element
function renderGuideTooltip() {
  let tooltip = document.getElementById('guideTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'guideTooltip';
    tooltip.className = 'guide-tooltip';
    document.body.appendChild(tooltip);
  }
  
  const step = currentTourSteps[currentTourIndex];
  const isFirst = currentTourIndex === 0;
  const isLast = currentTourIndex === currentTourSteps.length - 1;
  const total = currentTourSteps.length;
  
  // Build progress dots
  let dotsHtml = '';
  for (let i = 0; i < total; i++) {
    dotsHtml += `<span class="guide-tooltip-dot${i === currentTourIndex ? ' active' : ''}"></span>`;
  }
  
  // Labels based on language
  const btnNext = isLast ? (lang === 'en' ? 'Finish' : 'Fertig') : (lang === 'en' ? 'Next ➔' : 'Weiter ➔');
  const btnPrev = lang === 'en' ? '⬅ Back' : '⬅ Zurück';
  const btnEnd = lang === 'en' ? 'End Tour' : 'Beenden';
  
  tooltip.innerHTML = `
    <div class="guide-tooltip-header">
      <h4 class="guide-tooltip-title">${step.title}</h4>
      <span class="guide-tooltip-close" onclick="endTour(false)">✕</span>
    </div>
    <p class="guide-tooltip-body">${step.text}</p>
    <div class="guide-tooltip-dots">${dotsHtml}</div>
    <div class="guide-tooltip-footer">
      ${!isFirst ? `<button class="guide-tooltip-btn-secondary" onclick="prevStep()">${btnPrev}</button>` : `<div></div>`}
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="guide-tooltip-btn-text" onclick="endTour(false)">${btnEnd}</button>
        <button class="guide-tooltip-btn-primary" onclick="nextStep()">${btnNext}</button>
      </div>
    </div>
  `;
  
  // Show it
  setTimeout(() => { tooltip.classList.add('show'); }, 10);
}

// Auto-run init on load
document.addEventListener('DOMContentLoaded', () => {
  initGuide();
});
