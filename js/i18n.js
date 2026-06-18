/* =============================================
   GYMTRACK — Internationalisation
   ============================================= */

const TR = {
  de: {
    navTraining: 'Training', navGymLab: 'GymLab', navStats: 'Stats', navCalendar: 'Kalender', allLabel: 'Alles',
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
    cats: { Brust: 'Brust', Rücken: 'Rücken', Schultern: 'Schultern', Arme: 'Arme', Beine: 'Beine', Core: 'Core', Cardio: 'Cardio', Dehnen: 'Dehnen', new_custom: '+ Neue Kategorie...' },
    catHint: { strength: '📊 Kraft: kg & Wiederholungen', cardio: '🏃 Cardio: Distanz (km) & Zeit → Tempo wird berechnet', stretch: '🧘 Dehnen: Dauer in Minuten' },
    lastPerf: 'Letztes Mal', kg: 'kg', reps: 'Wdh', addSet: '+ Satz', saveSets: 'Speichern',
    colKm: 'km', colTime: 'Zeit', colPace: 'Tempo', colMin: 'Min',
    exportTitle: 'Daten exportieren', exportDesc: 'Code kopieren, als Datei herunterladen oder direkt zu Notizen teilen.',
    copyCode: '📋 Code kopieren', copied: '✓ Kopiert!', close: 'Schließen',
    exportFileSuccess: '✓ Datei heruntergeladen!', exportFileError: 'Fehler beim Download.',
    importTitle: 'Daten importieren', importDesc: 'Datei vom anderen Gerät auswählen oder Export-Code einfügen:',
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
    tmplShareDesc: 'Code kopieren oder direkt teilen – nur Vorlage & Übungen, kein Verlauf.',
    tmplImportSuccess: '✓ Vorlage importiert!',
    // Workout Stopwatch
    swLabel: 'Stoppuhr', swBook: 'Buchen', swBookTitle: 'Zeit buchen',
    swBookTime: 'Gemessene Zeit:', swBookWhich: 'Auf welche Übung buchen?',
    swNoEx: 'Zuerst eine Übung hinzufügen!', swSaved: 'gespeichert',
    // Timer Targets
    targetCurrentEx: 'Aktuelle Übungen', targetMuscleGroup: 'Muskelgruppe (Freies Training)',
    targetGymLab: 'Aus GymLab wählen', targetNewEx: 'Neue Übung erstellen',
    hiitAllRounds: 'Alle Runden gleich', hiitPerRound: 'Pro Runde wählen',
    hiitLogRound: 'Runde',
    // Set Types
    setNormal: 'N', setWarmup: 'W', setDrop: 'D', 
    setNormalTitle: 'Normal', setWarmupTitle: 'Aufwärmsatz', setDropTitle: 'Dropsatz',
    colType: 'Typ', colRpe: 'RPE',
    // Tools
    ttlTools: 'Rechner & Tools', lbl1RmDesc: '1RM Rechner (Epley)',
    plateEnterTarget: 'Geben Sie ein Zielgewicht ein', plateInvalid: 'Ziel muss größer oder gleich Hantel sein', plateEmptyBar: 'Nur Stange erforderlich',
    // Progress & Pics
    navProgress: 'Progress', ttlProgress: 'Fortschritt',
    lblMeasureWeight: 'Körpergewicht (kg)', lblMeasureBf: 'Körperfettanteil (%) - optional',
    lblMeasureNote: 'Notiz', invalidInput: 'Ungültige Eingabe', confirmDel: 'Eintrag löschen?',
    // Programs
    ttlPrograms: 'Programme', programModalTitle: 'Programm',
    // UX Improvements
    searchExercise: 'Übung suchen…', frequentlyUsed: 'Häufig verwendet',
    quickStartTemplates: 'Schnellstart', noTemplatesQuick: 'Vorlagen erstellen im GymLab',
    programFilter: 'Programm-Filter', allPrograms: 'Alle Programme', thisProgram: 'Dieses Programm',
    quickAddPlaceholder: 'Neue Übung…', quickAddBtn: 'Erstellen & hinzufügen',
    suggestNextEx: 'Nächste Übung?', fromSameCat: 'Gleiche Kategorie',
    noSearchResults: 'Keine Treffer',
    weekDays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    // Supplements
    navSupps: 'Supps', suppToday: 'Heute fällig', suppMySupps: 'Meine Supplements',
    suppNew: 'Supplement hinzufügen', suppEdit: 'Supplement bearbeiten',
    suppTaken: 'genommen', suppNoneDue: 'Heute keine Supplements fällig',
    suppEmpty: 'Noch keine Supplements angelegt', suppAdherence: 'Treue 30d',
    suppLeft: 'übrig', suppRefill: 'Auffüllen', suppConfirmDelete: 'Supplement wirklich löschen?',
    suppShowAll: 'Alle aktiven anzeigen',
    suppFormLabel: 'Form', suppDosageLabel: 'Dosierung', suppUnitLabel: 'Einheit',
    suppScoopLabel: 'Löffelmaß', suppFreqLabel: 'Frequenz', suppFreqDaily: 'Täglich',
    suppFreqEveryX: 'Alle X Tage', suppFreqWeekdays: 'Bestimmte Wochentage',
    suppFreqEveryLabel: 'Alle wie viele Tage?', suppTimesLabel: 'Einnahmen pro Tag',
    suppTimeLabel: 'Tageszeit', suppSupplyLabel: 'Packungsgröße (Gesamt)',
    suppSupplyHint: 'z.B. 90 für 90 Kapseln', suppColorLabel: 'Farbe',
    suppActiveLabel: 'Aktiv', suppScoopPlaceholder: 'z.B. 1 Messlöffel = 5g',
    suppNotesLabel: 'Notizen', suppNotesPlaceholder: 'z.B. Mit Mahlzeit einnehmen...',
    // Template persistence
    saveToTemplate: '📌 Zur Vorlage', savedToTemplate: '✓ In Vorlage gespeichert',
    tmplUpdateTitle: 'Vorlage aktualisieren?', tmplUpdateDesc: 'Du hast neue Übungen hinzugefügt. Sollen sie dauerhaft in der Vorlage gespeichert werden?',
    tmplUpdateConfirm: 'Ausgewählte übernehmen', tmplUpdateSkip: 'Überspringen',
    lblCopyrightTitle: '© Urheberrechtsschutz',
    lblCopyrightText: 'Diese App, ihr Design, der Quellcode sowie alle Inhalte sind geistiges Eigentum des Urhebers. Jede unbefugte Vervielfältigung, Verbreitung, Modifikation oder das Kopieren (auch auszugsweise) ist strengstens untersagt. Alle Rechte vorbehalten.',
    // User Guide / Onboarding
    guideHeaderTitle: 'Anleitung & Hilfe',
    guideBannerTitle: 'Neu bei DSCPLN? 🚀',
    guideBannerText: 'Lerne in 2 Minuten, wie du deine Workouts loggst, Pläne erstellst und den AI Coach nutzt!',
    guideBannerStart: 'Schnelle Tour',
    guideBannerDismiss: 'Schließen',
    guideTabTour: 'Interaktive Tour',
    guideTabFaq: 'Komplette Anleitung',
    guideShowMe: 'Zeig es mir! ➔',
    guideHighlightToast: 'Hier findest du diesen Bereich. Schau dich in Ruhe um!',
    // Settings Hub
    settingsHubTitle: 'Einstellungen & Backup',
    settingsThemeLabel: 'Design wechseln',
    settingsThemeDesc: 'Zwischen hellem und dunklem Design wechseln',
    settingsThemeBtn: 'Design ändern',
    settingsLangLabel: 'Sprache (Language)',
    settingsLangDesc: 'Sprache der App ändern / Change app language',
    settingsLangBtn: 'English',
    settingsTourLabel: 'Hilfe & Anleitung',
    settingsTourDesc: 'Die interaktive App-Tour erneut starten',
    settingsTourBtn: 'Tour starten',
    tabCalories: '🥣 Kalorien',
    tabMealPlans: '📋 Pläne',
    tabSupplements: '💊 Supps',
    tabFoodLibrary: '🍎 Lebensmittel',
    lblLibFoodTitleEdit: 'Lebensmittel bearbeiten',
    lblLibFoodTitleNew: 'Lebensmittel hinzufügen',
    lblLibFoodName: 'Name des Lebensmittels',
    lblLibFoodServing: 'Standard-Einheit',
    lblLibMacrosTitle: 'Referenz-Nährwerte (pro Einheit)',
    libFoodNamePlaceholder: 'z.B. Erdnussbutter',
    libFoodServing100: 'Gramm (100g / 100ml)',
    libFoodServing1: 'Stück (1 Stk.)',
    libFoodSearchPlaceholder: 'Lebensmittel suchen...',
    libFoodNewBtn: '+ Neu',
    libFoodStandardBadge: 'Standard',
    libFoodConfirmDelete: 'Lebensmittel wirklich aus der Bibliothek löschen?',
    lblNutriFoodName: 'Name (tippen zum Suchen)',
    nutriFoodNamePlaceholder: 'z.B. Haferflocken (tippen zum Suchen...)',
    lblNutriFoodSearchHint: '💡 Tippe den Namen ein, um in der Lebensmittelliste zu suchen oder neu anzulegen.'
  },
  en: {
    navTraining: 'Workout', navGymLab: 'GymLab', navStats: 'Stats', navCalendar: 'Calendar', allLabel: 'All',
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
    cats: { Brust: 'Chest', Rücken: 'Back', Schultern: 'Shoulders', Arme: 'Arms', Beine: 'Legs', Core: 'Core', Cardio: 'Cardio', Dehnen: 'Stretching', new_custom: '+ New Category...' },
    catHint: { strength: '📊 Strength: kg & reps', cardio: '🏃 Cardio: distance (km) & time → pace calculated', stretch: '🧘 Stretching: duration in minutes' },
    lastPerf: 'Last Time', kg: 'kg', reps: 'Reps', addSet: '+ Set', saveSets: 'Save',
    colKm: 'km', colTime: 'Time', colPace: 'Pace', colMin: 'Min',
    exportTitle: 'Export Data', exportDesc: 'Copy code, download as file, or share directly to Notes.',
    copyCode: '📋 Copy Code', copied: '✓ Copied!', close: 'Close',
    exportFileSuccess: '✓ File downloaded!', exportFileError: 'Download failed.',
    importTitle: 'Import Data', importDesc: 'Choose file from other device or paste export code:',
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
    tmplShareDesc: 'Copy or share directly – only template & exercises, no history.',
    tmplImportSuccess: '✓ Template imported!',
    // Workout Stopwatch
    swLabel: 'Stopwatch', swBook: 'Log', swBookTitle: 'Log Time',
    swBookTime: 'Measured time:', swBookWhich: 'Log to which exercise?',
    swNoEx: 'Add an exercise first!', swSaved: 'saved',
    // Timer Targets
    targetCurrentEx: 'Current Exercises', targetMuscleGroup: 'Muscle Group (Free Training)',
    targetGymLab: 'Choose from GymLab', targetNewEx: 'Create New Exercise',
    hiitAllRounds: 'All rounds same', hiitPerRound: 'Choose per round',
    hiitLogRound: 'Round',
    // Set Types
    setNormal: 'N', setWarmup: 'W', setDrop: 'D',
    setNormalTitle: 'Normal', setWarmupTitle: 'Warmup', setDropTitle: 'Drop Set',
    colType: 'Type', colRpe: 'RPE',
    // Tools
    ttlTools: 'Calculators & Tools', lbl1RmDesc: '1RM Calculator (Epley)',
    plateEnterTarget: 'Enter a target weight', plateInvalid: 'Target must be ≥ barbell', plateEmptyBar: 'Only the bar is needed',
    // Progress & Pics
    navProgress: 'Progress', ttlProgress: 'Progress',
    lblMeasureWeight: 'Body Weight (kg)', lblMeasureBf: 'Body Fat (%) - optional',
    lblMeasureNote: 'Notes', invalidInput: 'Invalid Input', confirmDel: 'Delete Entry?',
    // Programs
    ttlPrograms: 'Programs', programModalTitle: 'Program',
    // UX Improvements
    searchExercise: 'Search exercise…', frequentlyUsed: 'Frequently used',
    quickStartTemplates: 'Quick Start', noTemplatesQuick: 'Create templates in GymLab',
    programFilter: 'Program Filter', allPrograms: 'All Programs', thisProgram: 'This Program',
    quickAddPlaceholder: 'New exercise…', quickAddBtn: 'Create & add',
    suggestNextEx: 'Next exercise?', fromSameCat: 'Same category',
    noSearchResults: 'No results',
    weekDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    // Supplements
    navSupps: 'Supps', suppToday: 'Due Today', suppMySupps: 'My Supplements',
    suppNew: 'Add Supplement', suppEdit: 'Edit Supplement',
    suppTaken: 'taken', suppNoneDue: 'No supplements due today',
    suppEmpty: 'No supplements added yet', suppAdherence: 'Adherence 30d',
    suppLeft: 'left', suppRefill: 'Refill', suppConfirmDelete: 'Really delete supplement?',
    suppShowAll: 'Show all active',
    suppFormLabel: 'Form', suppDosageLabel: 'Dosage', suppUnitLabel: 'Unit',
    suppScoopLabel: 'Scoop Size', suppFreqLabel: 'Frequency', suppFreqDaily: 'Daily',
    suppFreqEveryX: 'Every X Days', suppFreqWeekdays: 'Specific Weekdays',
    suppFreqEveryLabel: 'Every how many days?', suppTimesLabel: 'Doses per Day',
    suppTimeLabel: 'Time of Day', suppSupplyLabel: 'Package Size (Total)',
    suppSupplyHint: 'e.g. 90 for 90 capsules', suppColorLabel: 'Color',
    suppActiveLabel: 'Active', suppScoopPlaceholder: 'e.g. 1 scoop = 5g',
    suppNotesLabel: 'Notes', suppNotesPlaceholder: 'e.g. Take with meal...',
    // Template persistence
    saveToTemplate: '📌 Save to Template', savedToTemplate: '✓ Saved to Template',
    tmplUpdateTitle: 'Update Template?', tmplUpdateDesc: 'You added new exercises. Save them permanently to the template?',
    tmplUpdateConfirm: 'Save Selected', tmplUpdateSkip: 'Skip',
    lblCopyrightTitle: '© Copyright Protection',
    lblCopyrightText: 'This app, its design, source code, and all content are the intellectual property of the author. Any unauthorized duplication, distribution, modification, or copying (even in part) is strictly prohibited. All rights reserved.',
    // User Guide / Onboarding
    guideHeaderTitle: 'Guide & Help',
    guideBannerTitle: 'New to DSCPLN? 🚀',
    guideBannerText: 'Learn in 2 minutes how to log your workouts, create templates, and use the AI Coach!',
    guideBannerStart: 'Quick Tour',
    guideBannerDismiss: 'Dismiss',
    guideTabTour: 'Interactive Tour',
    guideTabFaq: 'Full Guide',
    guideShowMe: 'Show me! ➔',
    guideHighlightToast: 'Here is this section. Take a look around!',
    // Settings Hub
    settingsHubTitle: 'Settings & Backup',
    settingsThemeLabel: 'Switch Design',
    settingsThemeDesc: 'Toggle between light and dark mode',
    settingsThemeBtn: 'Toggle Theme',
    settingsLangLabel: 'Language (Sprache)',
    settingsLangDesc: 'Change app language / Sprache der App ändern',
    settingsLangBtn: 'Deutsch',
    settingsTourLabel: 'Help & Guide',
    settingsTourDesc: 'Restart the interactive walkthrough tour',
    settingsTourBtn: 'Start Tour',
    tabCalories: '🥣 Calories',
    tabMealPlans: '📋 Plans',
    tabSupplements: '💊 Supps',
    tabFoodLibrary: '🍎 Foods',
    lblLibFoodTitleEdit: 'Edit Food',
    lblLibFoodTitleNew: 'Add Food',
    lblLibFoodName: 'Food Name',
    lblLibFoodServing: 'Serving Unit',
    lblLibMacrosTitle: 'Reference Nutrients (per unit)',
    libFoodNamePlaceholder: 'e.g. Peanut Butter',
    libFoodServing100: 'Grams (100g / 100ml)',
    libFoodServing1: 'Piece (1 pc)',
    libFoodSearchPlaceholder: 'Search foods...',
    libFoodNewBtn: '+ New',
    libFoodStandardBadge: 'Standard',
    libFoodConfirmDelete: 'Really delete this food from library?',
    lblNutriFoodName: 'Name (type to search)',
    nutriFoodNamePlaceholder: 'e.g. Oats (type to search...)',
    lblNutriFoodSearchHint: '💡 Type the name to search from the food list or create new.'
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
    stats: renderStats,
    supps: () => {
      const activeSub = localStorage.getItem('gymtrack_nutrition_subtab') || 'calories';
      if (typeof switchNutritionSubTab === 'function') switchNutritionSubTab(activeSub);
    },
    progress: () => {
      const activeSub = localStorage.getItem('gymtrack_progress_subtab') || 'calendar-stats';
      if (typeof switchProgressSubTab === 'function') switchProgressSubTab(activeSub);
    }
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
  const navMap = { log: 'navTraining', gymlab: 'navGymLab', calendar: 'navCalendar', stats: 'navStats', supps: 'navSupps', progress: 'navProgress' };
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
  s('tabGymLabAll', 'allLabel');
  s('tabGymLabPrograms', 'ttlPrograms');
  s('tabGymLabTemplates', 'templates');
  s('tabGymLabExercises', 'myExercisesShort');
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
  s('colLabelType', 'colType'); s('colLabelRpe', 'colRpe');

  // Export / import (Settings Hub)
  s('settingsHubTitle', 'settingsHubTitle');
  s('lblSettingsTheme', 'settingsThemeLabel');
  s('lblSettingsThemeDesc', 'settingsThemeDesc');
  s('btnSettingsTheme', 'settingsThemeBtn');
  s('lblSettingsLang', 'settingsLangLabel');
  s('lblSettingsLangDesc', 'settingsLangDesc');
  s('btnSettingsLang', 'settingsLangBtn');
  s('lblSettingsTour', 'settingsTourLabel');
  s('lblSettingsTourDesc', 'settingsTourDesc');
  s('btnSettingsTour', 'settingsTourBtn');
  s('ttlExport', 'exportTitle'); s('txtExportDesc', 'exportDesc');
  // Tools modal
  s('ttlTools', 'ttlTools');

  // Nutrition subtabs & library modal
  s('tabNutriCalories', 'tabCalories');
  s('tabNutriMealPlans', 'tabMealPlans');
  s('tabNutriSupplements', 'tabSupplements');
  s('tabNutriFoodLibrary', 'tabFoodLibrary');
  s('lblLibFoodName', 'lblLibFoodName');
  s('lblLibFoodServing', 'lblLibFoodServing');
  s('lblLibMacrosTitle', 'lblLibMacrosTitle');
  s('btnCancelLibFood', 'cancel');
  s('btnSaveLibFood', 'save');
  sp('libFoodName', 'libFoodNamePlaceholder');

  // Logged Food search translation
  s('lblNutriFoodName', 'lblNutriFoodName');
  sp('nutriFoodName', 'nutriFoodNamePlaceholder');
  s('lblNutriFoodSearchHint', 'lblNutriFoodSearchHint');
  sp('foodLibSearch', 'libFoodSearchPlaceholder');
  const btnNewLibFood = document.getElementById('btnNewLibFood');
  if (btnNewLibFood) btnNewLibFood.title = t('libFoodNewBtn');
  const opt100 = document.querySelector('#libFoodServingType option[value="100"]');
  if (opt100) opt100.textContent = t('libFoodServing100');
  const opt1 = document.querySelector('#libFoodServingType option[value="1"]');
  if (opt1) opt1.textContent = t('libFoodServing1');
  
  // Progress
  s('navProgress', 'navProgress');
  s('ttlProgress', 'ttlProgress');
  s('ttlMeasure', 'ttlMeasure');
  s('lblMeasureWeight', 'lblMeasureWeight');
  s('lblMeasureBf', 'lblMeasureBf');
  s('lblMeasureNote', 'lblMeasureNote');
  
  // Programs
  s('ttlPrograms', 'ttlPrograms');
  s('programModalTitle', 'programModalTitle');
  
  s('btnCopyExport', 'copyCode'); s('btnCloseExport', 'close');
  s('ttlImport', 'importTitle'); s('txtImportDesc', 'importDesc'); s('txtImportWarn', 'importWarn');
  sp('importText', 'importPlaceholder'); s('btnDoImport', 'doImport'); s('btnCancelImport', 'cancel');
  s('ttlChooseExercise', 'chooseExercise');
  s('lblCopyrightTitle', 'lblCopyrightTitle'); s('lblCopyrightText', 'lblCopyrightText');

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
  
  if (typeof applyAiTranslations === 'function') applyAiTranslations();
  if (typeof renderGuide === 'function') renderGuide();
}

function updateCategoryHint() {
  const sel  = document.getElementById('exCategory');
  const hint = document.getElementById('categoryHint');
  if (!sel || !hint) return;
  hint.textContent = t('catHint')[getCatType(sel.value)] || '';
  if (typeof _updateExerciseAiAnalysis === 'function' && typeof editingExId !== 'undefined' && editingExId) {
    _updateExerciseAiAnalysis(editingExId);
  }
}
