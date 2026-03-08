/* =============================================
   GYMTRACK — Internationalisation
   ============================================= */

const TR = {
  de: {
    navTraining: 'Training', navGymLab: 'GymLab', navStats: 'Stats', navCalendar: 'Kalender',
    startTraining: 'Training starten', newWorkout: '+ Neues Training', lastWorkouts: 'Verlauf',
    gymLab: 'GymLab', myTemplates: 'Vorlagen', myExercisesShort: 'Übungen',
    fromTemplate: '📋 Aus Vorlage starten', noWorkoutYet: 'Noch kein Training aufgezeichnet',
    activeWorkout: 'Aktives Training', done: 'Fertig ✓', addExercise: '+ Übung hinzufügen',
    cancelWorkout: 'Training abbrechen',
    templates: 'Vorlagen', createTemplate: '+ Vorlage erstellen', noTemplatesYet: 'Noch keine Vorlagen erstellt',
    startWorkout: '▶ Training starten', editTmpl: 'Bearbeiten',
    tmplNewTitle: 'Vorlage erstellen', tmplEditTitle: 'Vorlage bearbeiten',
    tmplName: 'Name', tmplNamePlaceholder: 'z.B. Push Day', tmplExercises: 'Übungen',
    addExToTmpl: '+ Übung hinzufügen', deleteTmpl: 'Vorlage löschen',
    confirmDeleteTmpl: 'Vorlage wirklich löschen?', tmplExPickerTitle: 'Übungen auswählen',
    selectedCount: 'ausgewählt',
    myExercises: 'Meine Übungen', createExercise: '+ Übung erstellen',
    noTrainingYet: 'Noch kein Training', lastTime: 'Letztes Mal',
    history: 'Verlauf', noHistoryYet: 'Noch kein Training gespeichert', sets: 'Sätze',
    stats: 'Statistiken', totalWorkouts: 'Trainings gesamt', thisWeek: 'Diese Woche',
    totalSets: 'Sätze gesamt', exercises: 'Übungen', progressPerEx: 'Progress pro Übung',
    noDataYet: 'Noch keine Daten', trainedX: '× trainiert', max: 'Max', data: 'Daten',
    exportData: '📤 Daten exportieren', importData: '📥 Daten importieren',
    chooseExercise: 'Übung wählen', newExercise: 'Neue Übung', editExercise: 'Übung bearbeiten',
    name: 'Name', category: 'Kategorie', save: 'Speichern', cancel: 'Abbrechen',
    deleteExercise: 'Übung löschen', namePlaceholder: 'z.B. Bankdrücken',
    cats: { Brust: 'Brust', Rücken: 'Rücken', Schultern: 'Schultern', Arme: 'Arme', Beine: 'Beine', Core: 'Core', Cardio: 'Cardio', Dehnen: 'Dehnen' },
    catHint: { strength: '📊 Kraft: kg & Wiederholungen', cardio: '🏃 Cardio: Distanz (km) & Zeit → Tempo wird berechnet', stretch: '🧘 Dehnen: Dauer in Minuten' },
    lastPerf: 'Letztes Mal', kg: 'kg', reps: 'Wdh', addSet: '+ Satz', saveSets: 'Speichern',
    colKm: 'km', colTime: 'Zeit', colPace: 'Tempo', colMin: 'Min',
    exportTitle: 'Daten exportieren', exportDesc: 'Kopiere diesen Code und schicke ihn per WhatsApp oder E-Mail an dein anderes Gerät.',
    copyCode: '📋 Code kopieren', copied: '✓ Kopiert!', close: 'Schließen',
    importTitle: 'Daten importieren', importDesc: 'Export-Code hier einfügen:',
    importWarn: '⚠️ Achtung: Bestehende Daten werden zusammengeführt, nichts geht verloren.',
    importPlaceholder: 'Export-Code hier einfügen...', doImport: '✓ Importieren',
    importSuccess: '✓ Import erfolgreich! Daten wurden zusammengeführt.', importError: 'Ungültiger Code.',
    weightUp: 'kg Gewicht', weightDown: 'kg Gewicht',
    repsUp: ' Wdh (gleich Gewicht)', repsDown: ' Wdh (gleich Gewicht)', same: '= Gleich',
    distanceUp: ' km Distanz', distanceDown: ' km Distanz',
    fasterSame: '↑ Schneller (gleiche Distanz)', slowerSame: '↓ Langsamer (gleiche Distanz)',
    longerStretch: ' Min länger', shorterStretch: ' Min kürzer',
    pb: '🏆 Bestzeit',
    confirmCancelWorkout: 'Training wirklich abbrechen?',
    confirmDeleteExercise: 'Übung wirklich löschen?', confirmDeleteWorkout: 'Training wirklich löschen?',
    noEntries: 'Keine Einträge', enterExercise: 'Füge eine Übung hinzu',
    minOneSet: 'Mindestens einen Eintrag hinzufügen!', alreadyAdded: 'Übung ist bereits im Training!',
    enterName: 'Name eingeben!', minValidSet: 'Mindestens einen gültigen Eintrag!',
    enterExportCode: 'Bitte Export-Code einfügen!',
    editSets: 'Bearbeiten', enterSets: '+ Eintragen', newBadge: 'neu',
    noExercisesYet: 'Noch keine Übungen', minOneExercise: 'Mindestens eine Übung hinzufügen!',
    paceLabel: 'Tempo', exNotes: 'Notizen', exNotesPlaceholder: 'z.B. Schulterblätter zusammenziehen...',
    sessionNote: 'Anmerkung (optional)', sessionNotePlaceholder: 'z.B. Schulter hat gezwickt...',
    saveChanges: 'Änderungen speichern',
    calNoWorkout: 'Kein Training an diesem Tag', calStreak: 'Streak', calDays: 'Tage',
    calThisMonth: 'Dieser Monat', calWorkouts: 'Trainings',
    calDuration: 'Dauer', calFrom: 'Von', calTo: 'Bis',
    calMonths: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    calDayShort: ['Mo','Di','Mi','Do','Fr','Sa','So'],
    calSets: 'Sätze', calRestDay: 'Ruhetag 😴', calTotalMin: 'Min gesamt',
    workoutDone: '💪 Training abgeschlossen!',
    // HIIT Timer
    hiitTimer: 'HIIT Timer', hiitTabata: 'Tabata', hiitEmom: 'EMOM', hiitCustom: 'Custom', hiitAmrap: 'AMRAP',
    hiitWork: 'Arbeit', hiitRest: 'Pause', hiitRounds: 'Runden', hiitRound: 'Runde',
    hiitReady: 'BEREIT', hiitDone: 'FERTIG!',
    hiitStart: 'Starten', hiitPause: 'Pause', hiitResume: 'Weiter', hiitReset: 'Zurücksetzen', hiitSkip: 'Überspringen',
    hiitAmrapHint: 'Läuft einfach hoch – so viele Runden wie möglich!',
    openTimer: '⏱ Timer',
    // Rest Timer
    restTimer: 'Pausenzeit', restDone: 'Los geht\'s!', restSkip: 'Überspringen',
    // Template share
    shareTmpl: 'Vorlage teilen', tmplShareTitle: 'Vorlage teilen',
    tmplShareDesc: 'Diesen kompakten Code teilen – nur Vorlage & Übungen, kein Verlauf.',
    tmplImportSuccess: '✓ Vorlage importiert!',
    // Workout Stopwatch
    swLabel: 'Stoppuhr', swBook: 'Buchen', swBookTitle: 'Zeit buchen',
    swBookTime: 'Gemessene Zeit:', swBookWhich: 'Auf welche Übung buchen?',
    swNoEx: 'Zuerst eine Übung hinzufügen!', swSaved: 'gespeichert',
  },
  en: {
    navTraining: 'Workout', navGymLab: 'GymLab', navStats: 'Stats', navCalendar: 'Calendar',
    startTraining: 'Start Workout', newWorkout: '+ New Workout', lastWorkouts: 'History',
    gymLab: 'GymLab', myTemplates: 'Templates', myExercisesShort: 'Exercises',
    fromTemplate: '📋 Start from Template', noWorkoutYet: 'No workouts recorded yet',
    activeWorkout: 'Active Workout', done: 'Done ✓', addExercise: '+ Add Exercise',
    cancelWorkout: 'Cancel Workout',
    templates: 'Templates', createTemplate: '+ Create Template', noTemplatesYet: 'No templates created yet',
    startWorkout: '▶ Start Workout', editTmpl: 'Edit',
    tmplNewTitle: 'Create Template', tmplEditTitle: 'Edit Template',
    tmplName: 'Name', tmplNamePlaceholder: 'e.g. Push Day', tmplExercises: 'Exercises',
    addExToTmpl: '+ Add Exercise', deleteTmpl: 'Delete Template',
    confirmDeleteTmpl: 'Really delete template?', tmplExPickerTitle: 'Select Exercises',
    selectedCount: 'selected',
    myExercises: 'My Exercises', createExercise: '+ Create Exercise',
    noTrainingYet: 'No training yet', lastTime: 'Last time',
    history: 'History', noHistoryYet: 'No workouts saved yet', sets: 'Sets',
    stats: 'Statistics', totalWorkouts: 'Total Workouts', thisWeek: 'This Week',
    totalSets: 'Total Sets', exercises: 'Exercises', progressPerEx: 'Progress per Exercise',
    noDataYet: 'No data yet', trainedX: '× trained', max: 'Max', data: 'Data',
    exportData: '📤 Export Data', importData: '📥 Import Data',
    chooseExercise: 'Choose Exercise', newExercise: 'New Exercise', editExercise: 'Edit Exercise',
    name: 'Name', category: 'Category', save: 'Save', cancel: 'Cancel',
    deleteExercise: 'Delete Exercise', namePlaceholder: 'e.g. Bench Press',
    cats: { Brust: 'Chest', Rücken: 'Back', Schultern: 'Shoulders', Arme: 'Arms', Beine: 'Legs', Core: 'Core', Cardio: 'Cardio', Dehnen: 'Stretching' },
    catHint: { strength: '📊 Strength: kg & reps', cardio: '🏃 Cardio: distance (km) & time → pace calculated', stretch: '🧘 Stretching: duration in minutes' },
    lastPerf: 'Last Time', kg: 'kg', reps: 'Reps', addSet: '+ Set', saveSets: 'Save',
    colKm: 'km', colTime: 'Time', colPace: 'Pace', colMin: 'Min',
    exportTitle: 'Export Data', exportDesc: 'Copy this code and send it via WhatsApp or Email to your other device.',
    copyCode: '📋 Copy Code', copied: '✓ Copied!', close: 'Close',
    importTitle: 'Import Data', importDesc: 'Paste export code here:',
    importWarn: '⚠️ Warning: Data will be merged, nothing will be lost.',
    importPlaceholder: 'Paste export code here...', doImport: '✓ Import',
    importSuccess: '✓ Import successful! Data has been merged.', importError: 'Invalid code.',
    weightUp: ' kg weight', weightDown: ' kg weight',
    repsUp: ' reps (same weight)', repsDown: ' reps (same weight)', same: '= Same',
    distanceUp: ' km distance', distanceDown: ' km distance',
    fasterSame: '↑ Faster (same distance)', slowerSame: '↓ Slower (same distance)',
    longerStretch: ' min longer', shorterStretch: ' min shorter',
    pb: '🏆 Personal Best',
    confirmCancelWorkout: 'Really cancel workout?',
    confirmDeleteExercise: 'Really delete exercise?', confirmDeleteWorkout: 'Really delete workout?',
    noEntries: 'No entries', enterExercise: 'Add an exercise',
    minOneSet: 'Add at least one entry!', alreadyAdded: 'Exercise already in workout!',
    enterName: 'Enter a name!', minValidSet: 'Enter at least one valid entry!',
    enterExportCode: 'Please paste export code!',
    editSets: 'Edit', enterSets: '+ Log', newBadge: 'new',
    noExercisesYet: 'No exercises yet', minOneExercise: 'Add at least one exercise!',
    paceLabel: 'Pace', exNotes: 'Notes', exNotesPlaceholder: 'e.g. retract shoulder blades...',
    sessionNote: 'Note (optional)', sessionNotePlaceholder: 'e.g. shoulder felt tight...',
    saveChanges: 'Save Changes',
    calNoWorkout: 'No workout on this day', calStreak: 'Streak', calDays: 'days',
    calThisMonth: 'This Month', calWorkouts: 'Workouts',
    calDuration: 'Duration', calFrom: 'From', calTo: 'To',
    calMonths: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    calDayShort: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    calSets: 'Sets', calRestDay: 'Rest Day 😴', calTotalMin: 'min total',
    workoutDone: '💪 Workout complete!',
    // HIIT Timer
    hiitTimer: 'HIIT Timer', hiitTabata: 'Tabata', hiitEmom: 'EMOM', hiitCustom: 'Custom', hiitAmrap: 'AMRAP',
    hiitWork: 'Work', hiitRest: 'Rest', hiitRounds: 'Rounds', hiitRound: 'Round',
    hiitReady: 'READY', hiitDone: 'DONE!',
    hiitStart: 'Start', hiitPause: 'Pause', hiitResume: 'Resume', hiitReset: 'Reset', hiitSkip: 'Skip',
    hiitAmrapHint: 'Just counts up – as many rounds as possible!',
    openTimer: '⏱ Timer',
    // Rest Timer
    restTimer: 'Rest', restDone: 'Go!', restSkip: 'Skip',
    // Template share
    shareTmpl: 'Share Template', tmplShareTitle: 'Share Template',
    tmplShareDesc: 'Share this compact code – only template & exercises, no history.',
    tmplImportSuccess: '✓ Template imported!',
    // Workout Stopwatch
    swLabel: 'Stopwatch', swBook: 'Log', swBookTitle: 'Log Time',
    swBookTime: 'Measured time:', swBookWhich: 'Log to which exercise?',
    swNoEx: 'Add an exercise first!', swSaved: 'saved',
  }
};

let lang = localStorage.getItem('gymLang') || 'de';

function t(key) {
  const val = TR[lang][key];
  return (val !== undefined && val !== null) ? val : key;
}

function toggleLang() {
  lang = lang === 'de' ? 'en' : 'de';
  localStorage.setItem('gymLang', lang);
  try { applyTranslations(); } catch(e) { console.warn('applyTranslations error:', e); }
  const active = document.querySelector('.page.active');
  if (!active) return;
  const id = active.id.replace('page-', '');
  const renders = {
    log: renderLog, gymlab: renderGymLab,
    stats: renderStats, calendar: renderCalendar
  };
  if (renders[id]) renders[id]();
  // Re-render HIIT config labels if timer modal is open
  if (document.getElementById('hiitModal') && document.getElementById('hiitModal').classList.contains('open')) {
    _hiitRenderConfig();
  }
}

function applyTranslations() {
  const s  = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  const sp = (id, key) => { const el = document.getElementById(id); if (el) el.placeholder  = t(key); };

  // Nav
  const navMap = { log: 'navTraining', gymlab: 'navGymLab', calendar: 'navCalendar', stats: 'navStats' };
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const pg = btn.dataset.page;
    if (!pg || !navMap[pg]) return;
    const tn = [...btn.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (tn) tn.textContent = '\n    ' + t(navMap[pg]) + '\n  ';
  });

  // Log page
  s('ttlStartTraining', 'startTraining'); s('btnNewWorkout', 'newWorkout'); s('btnFromTemplate', 'fromTemplate');
  s('ttlLastWorkouts', 'lastWorkouts'); s('activeWorkoutLabel', 'activeWorkout');
  s('btnFinishWorkout', 'done'); s('btnAddExercise', 'addExercise'); s('btnCancelWorkout', 'cancelWorkout');

  // GymLab
  s('ttlTemplates', 'myTemplates'); s('ttlExercises', 'myExercisesShort');
  s('templateModalTitle', (typeof editingTemplateId !== 'undefined' && editingTemplateId) ? 'tmplEditTitle' : 'tmplNewTitle');
  s('lblTmplName', 'tmplName'); sp('tmplName', 'tmplNamePlaceholder');
  s('lblTmplEx', 'tmplExercises'); s('btnAddExToTemplate', 'addExToTmpl'); s('btnConfirmTmplEx', 'addExToTmpl');
  s('btnSaveTemplate', 'save'); s('deleteTmplBtn', 'deleteTmpl'); s('btnCancelTemplate', 'cancel');
  s('ttlTmplExPicker', 'tmplExPickerTitle');

  // Exercises modal
  s('btnCreateExercise', 'createExercise');
  s('lblExName', 'name'); s('lblExCategory', 'category');
  s('lblExNotes', 'exNotes');
  s('btnSaveExercise', 'save'); s('deleteExBtn', 'deleteExercise'); s('btnCancelExercise', 'cancel');
  sp('exName', 'namePlaceholder'); sp('exNotes', 'exNotesPlaceholder');
  s('lblSessionNote', 'sessionNote'); sp('sessionNote', 'sessionNotePlaceholder');
  document.querySelectorAll('#exCategory option').forEach(o => { o.textContent = t('cats')[o.value] || o.value; });
  updateCategoryHint();

  // Stats
  s('ttlStats', 'stats'); s('ttlData', 'data');
  s('btnExport', 'exportData'); s('btnImport', 'importData');

  // Sets modal
  s('btnAddRow', 'addSet'); s('btnSaveSets', 'saveSets');

  // Export / import
  s('ttlExport', 'exportTitle'); s('txtExportDesc', 'exportDesc');
  s('btnCopyExport', 'copyCode'); s('btnCloseExport', 'close');
  s('ttlImport', 'importTitle'); s('txtImportDesc', 'importDesc'); s('txtImportWarn', 'importWarn');
  sp('importText', 'importPlaceholder'); s('btnDoImport', 'doImport'); s('btnCancelImport', 'cancel');
  s('ttlChooseExercise', 'chooseExercise');

  // HIIT Timer
  s('ttlHiitTimer', 'hiitTimer');
  const hiitTabCustom = document.getElementById('hiitTabCustom');
  if (hiitTabCustom) hiitTabCustom.textContent = t('hiitCustom');
  // Template share modal
  s('ttlTmplShare', 'tmplShareTitle');
  s('tmplShareDesc', 'tmplShareDesc');
  // Rest timer
  s('restTimerLabel', 'restTimer'); s('btnSkipRest', 'restSkip');
  // Timer button
  s('btnOpenTimer', 'openTimer');
  // Workout Stopwatch
  s('swLabel', 'swLabel'); s('swLogBtn', 'swBook');
  s('ttlLogTimer', 'swBookTitle'); s('logTimerWhich', 'swBookWhich');

  // Date & lang button
  const now = new Date();
  const dateEl = document.getElementById('headerDate');
  if (dateEl) dateEl.textContent = now.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = lang === 'de' ? 'EN' : 'DE';

  const calPage = document.getElementById('page-calendar');
  if (calPage && calPage.classList.contains('active')) renderCalendar();
}

function updateCategoryHint() {
  const sel  = document.getElementById('exCategory');
  const hint = document.getElementById('categoryHint');
  if (!sel || !hint) return;
  hint.textContent = t('catHint')[getCatType(sel.value)] || '';
}
