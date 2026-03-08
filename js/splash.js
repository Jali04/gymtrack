/* =============================================
   DSCPLN — Splash Screen
   ============================================= */

const SPLASH_QUOTES = [
  "Discipline is the bridge between goals and accomplishment.",
  "The only bad workout is the one that didn't happen.",
  "Pain is temporary. Glory is forever.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Be stronger than your excuses.",
  "Every rep you do when you don't want to is the one that changes you.",
  "The iron never lies to you.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "It never gets easier. You just get stronger.",
  "Train hard. Stay humble. Show up again tomorrow.",
  "Fall in love with the process and the results will come.",
  "One more rep. One more set. One more day.",
  "Hard work beats talent when talent doesn't work hard.",
  "What hurts today makes you stronger tomorrow.",
  "The difference between who you are and who you want to be is what you do.",
  "Sweat now. Shine later.",
  "You don't have to be great to start, but you have to start to be great.",
  "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.",
  "No shortcuts. No excuses. Just work.",
  "Your future self is watching you right now through your memories.",
  "Push harder than yesterday if you want a different tomorrow.",
  "Discipline separates the ones who want it from the ones who have it.",
  "The clock is ticking. Are you becoming the person you want to be?",
  "Champions are made in the moments they want to quit.",
  "Fall down seven times. Stand up eight.",
  "The only person you're competing with is who you were yesterday.",
  "Results happen over time, not overnight. Work harder.",
  "Train like there's no trophy. Compete like there's no tomorrow.",
];

function initSplash() {
  const today = new Date().toISOString().slice(0, 10);
  const shown = localStorage.getItem('dscpln_splash_date');
  const el    = document.getElementById('splashScreen');
  if (!el) return;

  // Select quote by day (changes daily, same all day)
  const dayIndex = Math.floor(Date.now() / 86400000) % SPLASH_QUOTES.length;
  document.getElementById('splashQuote').textContent = '\u201C' + SPLASH_QUOTES[dayIndex] + '\u201D';

  if (shown === today) {
    // Already dismissed today — hide instantly
    el.style.display = 'none';
  }
  // Otherwise: splash stays visible until user taps ENTER
}

function enterApp() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem('dscpln_splash_date', today);
  const el = document.getElementById('splashScreen');
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 620);
  try { haptic('medium'); } catch(e) {}
}
