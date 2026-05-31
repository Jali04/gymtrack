/* =============================================
   DSCPLN — Onboarding & Guide System
   ============================================= */

// Guide Data in German and English
const GUIDE_CONTENT = {
  de: {
    tour: [
      {
        id: 'log',
        icon: '🏋️‍♂️',
        title: 'Training & Verlauf',
        text: 'Starte ein leeres Training oder wähle eine Vorlage. Protokolliere Sätze (N = Normal, W = Aufwärmen, D = Drop), Gewicht und Wiederholungen. Nutze den automatischen Pausen-Countdown!',
        target: '#btnNewWorkout',
        page: 'log',
        toast: 'Tippe auf "+ Neues Training", um dein erstes Workout zu starten!'
      },
      {
        id: 'gymlab',
        icon: '🧪',
        title: 'GymLab (Vorlagen & Programme)',
        text: 'Erstelle eigene Übungen, erstelle Workouts als wiederverwendbare "Vorlagen" oder plane sie in einem mehrwöchigen "Programm" (z.B. Push-Pull-Legs).',
        target: '.gymlab-tabs',
        page: 'gymlab',
        toast: 'Im GymLab verwaltest du deine Übungen, Vorlagen und Programme!'
      },
      {
        id: 'aicoach',
        icon: '🤖',
        title: 'AI Coach',
        text: 'Dein persönlicher Trainer! Er analysiert dein echtes Training und erstellt dir maßgeschneiderte Programme (json-gymtrack), die du mit einem Klick importieren kannst.',
        target: '#aiCoachBtn',
        page: 'log',
        toast: 'Frage den AI Coach nach Tipps oder lasse dir einen Trainingsplan erstellen!'
      },
      {
        id: 'calendar',
        icon: '📅',
        title: 'Kalender & Statistiken',
        text: 'Sieh dir deine vergangenen Trainingstage im interaktiven Kalender an, verfolge deine Trainingsstrecke (Streak) und analysiere dein monatliches Workout-Recap.',
        target: '.cal-header',
        page: 'calendar',
        toast: 'Hier siehst du deine Trainingsstatistiken und deinen Streak-Kalender!'
      },
      {
        id: 'supps',
        icon: '💊',
        title: 'Supplements Tracker',
        text: 'Erstelle Einnahmepläne für deine Nahrungsergänzungsmittel (z.B. Kreatin, Vitamine) mit Angabe von Frequenz, Restmenge und Einnahmezeiten.',
        target: '.supp-content',
        page: 'supps',
        toast: 'Trage deine Supplements ein und logge deine tägliche Einnahme!'
      },
      {
        id: 'progress',
        icon: '📈',
        title: 'Fortschritt & PIN-Schutz',
        text: 'Dokumentiere dein Körpergewicht und deinen KFA. Sichere deine Fortschritts-Fotos mit einer privaten 4-stelligen PIN (vollständig lokal verschlüsselt).',
        target: '#btnWeightMod',
        page: 'progress',
        toast: 'Verfolge dein Gewicht und schütze deine Fortschrittsfotos mit einer PIN!'
      }
    ],
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
    tour: [
      {
        id: 'log',
        icon: '🏋️‍♂️',
        title: 'Workout & Log',
        text: 'Start an empty workout or select a template. Log sets (N = Normal, W = Warmup, D = Drop), weight, and reps. Use the automatic rest timer countdown!',
        target: '#btnNewWorkout',
        page: 'log',
        toast: 'Tap "+ New Workout" to start your first session!'
      },
      {
        id: 'gymlab',
        icon: '🧪',
        title: 'GymLab (Templates & Programs)',
        text: 'Create custom exercises, save workouts as reusable "Templates", or schedule them in a multi-week "Program" (e.g. Push-Pull-Legs).',
        target: '.gymlab-tabs',
        page: 'gymlab',
        toast: 'Manage your custom exercises, templates, and programs in GymLab!'
      },
      {
        id: 'aicoach',
        icon: '🤖',
        title: 'AI Coach',
        text: 'Your personal trainer! He analyzes your workout history and generates tailor-made programs (json-gymtrack) that you can import with a single tap.',
        target: '#aiCoachBtn',
        page: 'log',
        toast: 'Ask the AI Coach for tips or let him generate a workout plan for you!'
      },
      {
        id: 'calendar',
        icon: '📅',
        title: 'Calendar & Stats',
        text: 'Review past workout days on the interactive calendar, track your workout streak, and analyze your monthly recap summaries.',
        target: '.cal-header',
        page: 'calendar',
        toast: 'Track your workout statistics and streak calendar here!'
      },
      {
        id: 'supps',
        icon: '💊',
        title: 'Supplements Tracker',
        text: 'Create intake schedules for your supplements (e.g., creatine, vitamins) with specific frequencies, remaining supply, and times of day.',
        target: '.supp-content',
        page: 'supps',
        toast: 'Add your supplements and track your daily intake easily!'
      },
      {
        id: 'progress',
        icon: '📈',
        title: 'Progress & PIN Lock',
        text: 'Log your body weight and body fat %. Protect your private progress photos with a 4-digit PIN (fully encrypted locally).',
        target: '#btnWeightMod',
        page: 'progress',
        toast: 'Track your weight and protect progress photos with a secure PIN!'
      }
    ],
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

// State
let activeGuideTab = 'tour';

// Init Guide UI on app load
function initGuide() {
  checkOnboardingStatus();
  renderGuide();
}

// Check if user is new or has completed/dismissed guide
function checkOnboardingStatus() {
  const onboarded = localStorage.getItem('dscpln_onboarded');
  const welcomeBanner = document.getElementById('guideWelcomeBanner');
  const badgePulse = document.getElementById('guideBadgePulse');
  
  if (!onboarded) {
    if (welcomeBanner) welcomeBanner.style.display = 'block';
    if (badgePulse) badgePulse.style.display = 'block';
  } else {
    if (welcomeBanner) welcomeBanner.style.display = 'none';
    if (badgePulse) badgePulse.style.display = 'none';
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

// Switch between Tour and FAQ tabs inside Help modal
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

// Toggle FAQ item expansion
function toggleFaq(index) {
  const items = document.querySelectorAll('.guide-faq-item');
  if (items[index]) {
    const isActive = items[index].classList.contains('active');
    // Close other FAQ items
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
  const data = GUIDE_CONTENT[currentLang] || GUIDE_CONTENT['de'];
  
  // Set UI Element translations
  const s = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  s('lblGuideHeaderTitle', 'guideHeaderTitle');
  s('btnGuideTabTour', 'guideTabTour');
  s('btnGuideTabFaq', 'guideTabFaq');
  s('btnGuideModalClose', 'close');
  
  s('lblGuideBannerTitle', 'guideBannerTitle');
  s('lblGuideBannerText', 'guideBannerText');
  s('btnGuideBannerStart', 'guideBannerStart');
  s('btnGuideBannerDismiss', 'guideBannerDismiss');
  
  // Render Interactive Tour Cards
  const tourContainer = document.getElementById('guideTourList');
  if (tourContainer) {
    tourContainer.innerHTML = '';
    data.tour.forEach(item => {
      const card = document.createElement('div');
      card.className = 'guide-tour-card';
      card.innerHTML = `
        <div class="guide-tour-header">
          <span class="guide-tour-icon">${item.icon}</span>
          <h4 class="guide-tour-title">${item.title}</h4>
        </div>
        <p class="guide-tour-text">${item.text}</p>
        <button class="guide-tour-btn" onclick="showMeFeature('${item.id}')">
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
    data.faq.forEach((item, index) => {
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

// Interactive highlight guide walkthrough
function showMeFeature(id) {
  const currentLang = (typeof lang !== 'undefined') ? lang : 'de';
  const data = GUIDE_CONTENT[currentLang] || GUIDE_CONTENT['de'];
  const config = data.tour.find(item => item.id === id);
  if (!config) return;
  
  // 1. Close Modal
  closeModal('helpGuideModal');
  
  // 2. Mark onboarding welcome banner as dismissed
  localStorage.setItem('dscpln_onboarded', '1');
  checkOnboardingStatus();
  
  if (typeof haptic === 'function') haptic('medium');
  
  // 3. Switch to target page
  if (id === 'aicoach') {
    // If AI coach, open it via its global function
    if (typeof openAiCoach === 'function') openAiCoach();
  } else {
    // Navigate to page using nav.js API
    const navBtn = document.querySelector(`.nav-btn[data-page="${config.page}"]`);
    if (typeof showPage === 'function') {
      showPage(config.page, navBtn);
      if (navBtn) navBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
  
  // 4. Highlight target element after a tiny delay for DOM transition
  setTimeout(() => {
    const el = document.querySelector(config.target);
    if (el) {
      // Remove any existing highlights
      document.querySelectorAll('.guide-highlight-pulse').forEach(item => {
        item.classList.remove('guide-highlight-pulse');
      });
      
      // Apply highlight class
      el.classList.add('guide-highlight-pulse');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Create and show guidance toast
      showGuideToast(config.toast);
      
      // Auto cleanup after 3.5s
      setTimeout(() => {
        el.classList.remove('guide-highlight-pulse');
      }, 3500);
    }
  }, 350);
}

// Custom Guidance Toast for Interactive Onboarding Tour
function showGuideToast(message) {
  let toast = document.querySelector('.guide-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'guide-toast';
    document.body.appendChild(toast);
  }
  
  toast.innerHTML = `<span>💡</span> <span>${message}</span>`;
  
  // Trigger animations
  setTimeout(() => { toast.classList.add('show'); }, 10);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Auto-run initialization after DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  initGuide();
});
