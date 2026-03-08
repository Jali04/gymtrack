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
  "Your comfort zone will kill you.",
  "Stop waiting for Friday, for summer, for someone to fall in love with you, for life. Happiness is achieved when you stop waiting for it and make the most of the moment you are in now.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes later becomes never. Do it now.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Don't stop until you're proud.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "When you feel like quitting, remember why you started.",
  "Make it happen. Shock everyone.",
  "Grateful for where I'm at, excited about where I'm going.",
  "Focus on your goal. Don't look in any direction but ahead."
];

function initSplash() {
  const el = document.getElementById('splashScreen');
  if (!el) return;

  // Select quote randomly instead of daily so it changes on every load
  const randomIndex = Math.floor(Math.random() * SPLASH_QUOTES.length);
  document.getElementById('splashQuote').textContent = '\u201C' + SPLASH_QUOTES[randomIndex] + '\u201D';

  // Make splash visible on every app load
  el.style.display = 'flex';
}

function enterApp() {
  const el = document.getElementById('splashScreen');
  el.classList.add('fade-out');
  setTimeout(() => { el.style.display = 'none'; }, 620);
  try { haptic('medium'); } catch(e) {}
}
