/* =============================================
   GYMTRACK — AI Personal Trainer (AI Coach)
   ============================================= */

let aiSettingsVisible = false;
let aiHistoryVisible  = false;
let aiChatHistory     = [];
let aiChats           = {};
let aiActiveChatId    = '';
let aiIsLoading       = false;
let aiAbortController = null;

// Default values loaded from localStorage
let aiProvider    = localStorage.getItem('gym_ai_provider') || 'gemini';
let aiModel       = localStorage.getItem('gym_ai_model') || 'gemini-3.5-flash';
let aiCustomModel = localStorage.getItem('gym_ai_custom_model') || '';
let aiApiKey      = localStorage.getItem('gym_ai_key') || '';

// System Instruction for the AI Coach
const AI_SYSTEM_PROMPT = `
You are the "AI Coach" (Personal Trainings-Assistent), an elite personal fitness coach, nutritionist, and supplement expert built into the GymTrack (also known as DSCPLN) app.
Your tone is highly motivational, supportive, structured, and professional. 

CRITICAL PROTOCOLS:
1. LANGUAGE: Always respond in the language the user speaks. Default to German (Deutsch) since the app is configured in German by default.
2. PERSONALIZED FEEDBACK: You have direct access to the user's fitness profile and database in the prompt context. Analyze their real data (workouts, weight trends, supplements) to give custom advice instead of generic tips.
3. INTERACTIVE PLANS & IMPORTS: 
   If you suggest a workout template (a single workout day) or a program (a weekly schedule of templates), you MUST output a structured JSON block inside a code block marked with \`\`\`json-gymtrack so the app can parse it and render a single-click import button.
   Do not explain the JSON format to the user, just output it at the end of your response.
   
   TEMPLATE JSON SCHEMA (v: "t"):
   \`\`\`json-gymtrack
   {
     "v": "t",
     "t": {
       "id": "ai_temp_unique",
       "name": "Name of Template (e.g. Brust & Trizeps)",
       "type": "training",
       "exerciseIds": ["existing_ex_id_1", "ai_new_ex_id_2"]
     },
     "e": [
       {
         "id": "ai_new_ex_id_2",
         "name": "New Exercise Name",
         "category": "Brust",
         "notes": "Instruction notes if any"
       }
     ]
   }
   \`\`\`
   Note for templates:
   - "e" is an array of NEW exercises that the user doesn't have in their database yet. If you use existing exercises (supplied in context), list their IDs in "exerciseIds" and do not repeat them in "e".
   - If creating new exercises, prefix their IDs with "ai_". Categories must be one of: Brust, Rücken, Schultern, Arme, Beine, Core, Cardio, Dehnen.

   PROGRAM JSON SCHEMA (v: "p"):
   \`\`\`json-gymtrack
   {
     "v": "p",
     "p": {
       "id": "ai_prog_unique",
       "name": "Name of Program (e.g. Push-Pull-Legs Split)",
       "schedule": {
         "1": "template_id_1",
         "2": "template_id_2",
         "3": "template_id_3"
       }
     },
     "t": [
       {
         "id": "template_id_1",
         "name": "Tag 1 (Push)",
         "type": "training",
         "exerciseIds": ["e1", "ai_triceps"]
       }
     ],
     "e": [
       {
         "id": "ai_triceps",
         "name": "Trizepsdrücken Kabel",
         "category": "Arme"
       }
     ]
   }
   \`\`\`
   Note for programs:
   - Schedule days map as keys: "1" = Monday, "2" = Tuesday, "3" = Wednesday, "4" = Thursday, "5" = Friday, "6" = Saturday, "0" = Sunday.
   - "t" contains the day templates.
   - "e" contains any brand new exercises to register in their database first.

4. SAFETY: Always encourage safe execution, warm-ups, and consulting a physician for medical conditions. Keep recommendations realistic.
`;

// Initialize UI translations & Settings on script load
document.addEventListener('DOMContentLoaded', () => {
  initAiCoachSettings();
  applyAiTranslations();
});

function applyAiTranslations() {
  const isDe = (lang === 'de');
  
  // Set translated labels
  const s = (id, de, en) => { const el = document.getElementById(id); if (el) el.textContent = isDe ? de : en; };
  const sp = (id, de, en) => { const el = document.getElementById(id); if (el) el.placeholder = isDe ? de : en; };

  s('lblAiCoachTitle', 'AI Coach', 'AI Coach');
  s('lblAiNewChatBtn', 'Neu', 'New');
  s('lblAiHistoryBtn', 'Verlauf', 'History');
  s('lblAiSettingsBtn', 'Einstellungen', 'Settings');
  s('lblAiSettingsTitle', 'API EINSTELLUNGEN', 'API SETTINGS');
  s('lblAiHistoryTitle', 'CHATVERLAUF', 'CHAT HISTORY');
  s('btnNewChat', '+ Neuer Chat', '+ New Chat');
  s('lblAiProvider', 'Quelle / Provider', 'AI Provider');
  s('lblAiModel', 'Modell', 'Model');
  s('lblAiCustomModel', 'Custom Modellname', 'Custom Model Name');
  s('lnkGetApiKey', 'Kostenlosen Key holen ↗', 'Get Free API Key ↗');
  s('btnSaveAiSettings', 'Speichern & Schließen', 'Save & Close');
  
  sp('aiApiKeyInput', 'AI Studio API-Key einfügen...', 'Paste AI Studio API-Key...');
  sp('aiChatInput', 'Frag deinen Coach...', 'Ask your coach...');
  sp('aiCustomModelInput', 'z.B. gemini-3.5-pro', 'e.g. gemini-3.5-pro');

  s('chipAnalyse', 'Analyse mein Training', 'Analyze my workouts');
  s('chipNutrition', 'Ernährungsplan', 'Nutrition plan');
  s('chipSupps', 'Supplement-Check', 'Supplement check');
  s('chipPlan', 'Plan erstellen', 'Create plan');

  // Onboarding translations
  s('lblAiOnboardTitle', '🤖 Willkommen beim AI Coach!', '🤖 Welcome to AI Coach!');
  s('lblAiOnboardIntro', 'Wähle eine der folgenden zwei kostenlosen Optionen, um deinen persönlichen Coach zu starten:', 'Choose one of the following two free options to start your personal coach:');
  s('lblAiOnboardChromeDesc', 
    'Nutzt die in deinem Browser integrierte Gemini Nano KI (100% offline & gratis).\n\n⚠️ iOS (iPhone/iPad): Auf Apple-Geräten ist die lokale KI technisch nicht verfügbar (selbst wenn die App über Chrome zum Home-Bildschirm hinzugefügt wird, da iOS im Standalone-Modus immer WebKit erzwingt). Nutze dort bitte Option B.\n\n💡 PC/Mac/Android: Installiere die App in Chrome (Installations-Button in der Adressleiste) und aktiviere in chrome://flags die Optionen "Prompt API" und "Gemini Nano".', 
    'Uses the Gemini Nano AI built into your browser (100% offline & free).\n\n⚠️ iOS (iPhone/iPad): Local AI is technically unsupported on Apple devices (even if added via Chrome, as iOS forces WebKit in standalone mode). Please use Option B.\n\n💡 PC/Mac/Android: Install the app from Chrome (install icon in URL bar) and enable "Prompt API" and "Gemini Nano" in chrome://flags.'
  );
  s('lblAiOnboardGeminiDesc', 'Verbinde deinen eigenen kostenlosen Key. Erfordert keine Kreditkarte und bietet Zugriff auf das schlaue Gemini 3 Pro.', 'Connect your own free API key. Requires no credit card and gives access to the smart Gemini 3 Pro.');
  s('lblAiOnboardStep1', 'Klicke hier, um Google AI Studio zu öffnen ↗', 'Click here to open Google AI Studio ↗');
  s('lblAiOnboardStep2', 
    'Klicke auf "Get API Key" und erstelle einen neuen Schlüssel. (Tipp: Falls ein Ausweis verlangt wird, hinterlege einfach dein Geburtsdatum (18+) in deinem Google-Konto, dann entfällt die Ausweispflicht meistens).', 
    'Click on "Get API Key" and create a new key. (Tip: If an ID is requested, simply set your birthdate to 18+ in your Google Account settings, which usually bypasses the ID check).'
  );
  s('lblAiOnboardStep3', 'Kopiere den Schlüssel und füge ihn hier ein:', 'Copy the key and paste it here:');
  s('btnSaveAiOnboard', 'Schlüssel speichern & starten', 'Save Key & Start');
  sp('aiOnboardKeyInput', 'API-Key einfügen...', 'Paste API-Key...');

  const optNames = document.querySelectorAll('.ai-onboarding-screen .ai-onboard-option-name');
  if (optNames.length >= 2) {
    optNames[0].textContent = isDe ? 'Chrome Lokale KI' : 'Chrome Local AI';
    optNames[1].textContent = isDe ? 'Google Gemini API-Key' : 'Google Gemini API Key';
  }

  const txtKeyHint = document.getElementById('txtAiKeyHint');
  if (txtKeyHint) {
    txtKeyHint.innerHTML = isDe
      ? 'Der API-Key wird nur lokal in deinem Browser gesichert. Der Standard-Developer-Tarif bei Google ist absolut gratis und erfordert keine Kreditkarte.'
      : 'The API key is saved locally in your browser. The default developer tier at Google is 100% free and does not require a credit card.';
  }

  const txtChromeHint = document.getElementById('txtAiChromeHint');
  if (txtChromeHint) {
    txtChromeHint.innerHTML = isDe
      ? 'Nutzt die lokale Gemini Nano KI deines Webbrowsers (kostenlos & offline).<br><br>⚠️ <strong>iOS Hinweis (iPhone/iPad):</strong> Nicht verfügbar, da iOS für alle Browser und Home-Bildschirm-Apps im Hintergrund die WebKit-Engine erzwingt. Bitte nutze dort die Gemini API (Option B).<br><br>💡 <strong>PC/Mac/Android:</strong> Installiere die PWA aus Chrome und aktiviere in <code>chrome://flags</code> die Optionen "Prompt API" und "On-device Model".<br><br><strong>Status:</strong> <span id="aiChromeStatus" style="color:var(--accent2);font-weight:700;">Überprüfe Kompatibilität...</span>'
      : 'Uses the local Gemini Nano AI of your browser (free & offline).<br><br>⚠️ <strong>iOS Note (iPhone/iPad):</strong> Unsupported, as iOS forces the WebKit engine for all browsers and Home Screen apps. Please use the Gemini API (Option B) there.<br><br>💡 <strong>PC/Mac/Android:</strong> Install the PWA from Chrome and enable "Prompt API" and "On-device Model" in <code>chrome://flags</code>.<br><br><strong>Status:</strong> <span id="aiChromeStatus" style="color:var(--accent2);font-weight:700;">Checking compatibility...</span>';
  }
}

// Settings management
function initAiCoachSettings() {
  const pSel = document.getElementById('aiProviderSelect');
  const mSel = document.getElementById('aiModelSelect');
  const keyInput = document.getElementById('aiApiKeyInput');
  const custInput = document.getElementById('aiCustomModelInput');

  if (pSel) pSel.value = aiProvider;
  if (mSel) mSel.value = (aiModel === 'gemini-3.5-flash' || aiModel === 'gemini-3-pro') ? aiModel : 'custom';
  if (keyInput) keyInput.value = aiApiKey;
  if (custInput) custInput.value = aiCustomModel;

  onAiProviderChange();
  onAiModelChange();
}

function onAiProviderChange() {
  const provider = document.getElementById('aiProviderSelect').value;
  const geminiConfig = document.getElementById('aiGeminiConfig');
  const chromeConfig = document.getElementById('aiChromeConfig');

  if (provider === 'gemini') {
    geminiConfig.style.display = 'block';
    chromeConfig.style.display = 'none';
  } else {
    geminiConfig.style.display = 'none';
    chromeConfig.style.display = 'block';
    checkChromeAiStatus();
  }
}

function onAiModelChange() {
  const model = document.getElementById('aiModelSelect').value;
  const customRow = document.getElementById('aiCustomModelRow');
  if (model === 'custom') {
    customRow.style.display = 'block';
  } else {
    customRow.style.display = 'none';
  }
}

function saveAiSettings() {
  const provider = document.getElementById('aiProviderSelect').value;
  const modelSel = document.getElementById('aiModelSelect').value;
  const keyVal = document.getElementById('aiApiKeyInput').value.trim();
  const custVal = document.getElementById('aiCustomModelInput').value.trim();

  aiProvider = provider;
  aiApiKey = keyVal;
  
  if (modelSel === 'custom') {
    aiModel = custVal || 'gemini-3.5-flash';
    aiCustomModel = custVal;
  } else {
    aiModel = modelSel;
    aiCustomModel = '';
  }

  localStorage.setItem('gym_ai_provider', aiProvider);
  localStorage.setItem('gym_ai_model', aiModel);
  localStorage.setItem('gym_ai_custom_model', aiCustomModel);
  localStorage.setItem('gym_ai_key', aiApiKey);

  toggleAiSettings();
  checkShowOnboarding();
  updateActiveModelBadge();
  showToast(lang === 'de' ? 'Einstellungen gespeichert' : 'Settings saved');
}

function toggleAiSettings() {
  const panel = document.getElementById('aiSettingsPanel');
  if (!panel) return;
  aiSettingsVisible = !aiSettingsVisible;
  if (aiSettingsVisible) {
    panel.classList.add('open');
    aiHistoryVisible = false;
    const histPanel = document.getElementById('aiHistoryPanel');
    if (histPanel) histPanel.classList.remove('open');
  } else {
    panel.classList.remove('open');
    checkShowOnboarding(); // check onboarding state when settings is closed
  }
}

// Modal open/close
function openAiCoach() {
  openModal('aiCoachModal');
  applyAiTranslations();
  initAiCoachSettings();

  aiSettingsVisible = false;
  aiHistoryVisible = false;
  const settPanel = document.getElementById('aiSettingsPanel');
  if (settPanel) settPanel.classList.remove('open');
  const histPanel = document.getElementById('aiHistoryPanel');
  if (histPanel) histPanel.classList.remove('open');

  loadAiChats();

  renderChatFeed();
  checkShowOnboarding();
  updateSendButtonState();
  updateActiveModelBadge();
}

// Check Chrome local AI availability
async function checkChromeAiStatus() {
  const label = document.getElementById('aiChromeStatus');
  if (!label) return;

  const isDe = (lang === 'de');

  if (typeof window.ai === 'undefined' || typeof window.ai.languageModel === 'undefined') {
    label.textContent = isDe 
      ? 'Nicht verfügbar (Diese Chrome-Version unterstützt das Prompt API noch nicht. Aktiviere "Prompt API" in chrome://flags).'
      : 'Not available (This Chrome version does not support the Prompt API. Enable "Prompt API" in chrome://flags).';
    label.style.color = 'var(--accent2)';
    return;
  }

  try {
    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') {
      label.textContent = isDe ? 'Nicht bereit (Modell noch nicht heruntergeladen)' : 'Not ready (Model not downloaded yet)';
      label.style.color = 'orange';
    } else {
      label.textContent = isDe ? 'Bereit (Lokales Nano-Modell aktiv)' : 'Ready (Local Nano model active)';
      label.style.color = 'var(--accent)';
    }
  } catch (e) {
    label.textContent = isDe ? 'Fehler beim Abfragen' : 'Error checking status';
    label.style.color = 'var(--accent2)';
  }
}

// Context serialisation
function compileAiContext() {
  let context = `AKTUELLER BENUTZERSTATUS & DATENBANK-KONTEXT:\n`;
  context += `Aktuelle Sprache: ${lang === 'de' ? 'Deutsch' : 'English'}\n`;
  context += `Datum heute: ${new Date().toLocaleDateString()}\n\n`;

  // Exercises
  context += `VORHANDENE ÜBUNGEN IN DER DATENBANK:\n`;
  if (db.exercises && db.exercises.length > 0) {
    db.exercises.forEach(e => {
      context += `- ID: "${e.id}", Name: "${e.name}", Kategorie: "${e.category}"${e.notes ? `, Notiz: "${e.notes}"` : ''}\n`;
    });
  } else {
    context += `Keine Übungen registriert.\n`;
  }
  context += `\n`;

  // Active Program
  context += `AKTIVES TRAININGSPROGRAMM:\n`;
  if (db.activeProgram && db.activeProgram.id) {
    const prog = db.programs.find(p => p.id === db.activeProgram.id);
    if (prog) {
      context += `- Name: "${prog.name}"\n`;
      const wDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      context += `- Schedule:\n`;
      for (let day in (prog.schedule || {})) {
        const tplId = prog.schedule[day];
        const tpl = db.templates.find(t => t.id === tplId);
        context += `  * ${wDays[day]}: Template "${tpl ? tpl.name : 'Ruhetag'}"\n`;
      }
    }
  } else {
    context += `- Kein Programm aktiv.\n`;
  }
  context += `\n`;

  // Weight & BF logs
  context += `GEWICHTSVERLAUF (Letzte 5 Einträge):\n`;
  if (db.measurements && db.measurements.length > 0) {
    const sortedMeas = [...db.measurements]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
    sortedMeas.forEach(m => {
      const dStr = new Date(m.date).toLocaleDateString();
      context += `- Datum: ${dStr}, Gewicht: ${m.weight}kg${m.bf ? `, KFA: ${m.bf}%` : ''}${m.note ? `, Notiz: "${m.note}"` : ''}\n`;
    });
  } else {
    context += `Keine Gewichtslogs registriert.\n`;
  }
  context += `\n`;

  // Supplements
  context += `SUPPLEMENTS & EINNAHMEN:\n`;
  if (db.supplements && db.supplements.length > 0) {
    db.supplements.forEach(s => {
      const activeStr = s.active === false ? 'Inaktiv' : 'Aktiv';
      context += `- Name: "${s.name}", Form: "${s.form}", Dosierung: "${s.dosage}${s.unit}" (${activeStr}), Tageszeit: "${s.timeOfDay || 'egal'}"\n`;
    });
    // Log adherence
    if (db.supplementLog && db.supplementLog.length > 0) {
      context += `- Letzte Logs (Datum & Supplement-ID):\n`;
      const recentLogs = [...db.supplementLog]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
      recentLogs.forEach(l => {
        context += `  * Einnahme am ${l.date} (Supp-ID: "${l.supId}")\n`;
      });
    }
  } else {
    context += `Keine Supplements registriert.\n`;
  }
  context += `\n`;

  // Workout History
  context += `TRAININGSVERLAUF / LETZTE 5 WORKOUTS:\n`;
  if (db.workouts && db.workouts.length > 0) {
    const recentWos = [...db.workouts]
      .sort((a, b) => (b.date || b.startTime) - (a.date || a.startTime))
      .slice(0, 5);
    recentWos.forEach((w, index) => {
      const dStr = new Date(w.date || w.startTime).toLocaleDateString();
      const mins = w.endTime ? Math.round((w.endTime - w.startTime) / 60000) : null;
      context += `[Workout ${index + 1}] Datum: ${dStr}${mins ? `, Dauer: ${mins} Min` : ''}${w.note ? `, Gesamtnotiz: "${w.note}"` : ''}\n`;
      
      (w.exercises || []).forEach(we => {
        const ex = db.exercises.find(x => x.id === we.exId);
        const exName = we.isCustom ? we.customName : (ex ? ex.name : 'Unbekannt');
        const type = we.isCustom ? getCatType(we.customCategory) : (ex ? getCatType(ex.category) : 'strength');
        
        let setsStr = '';
        if (type === 'cardio') {
          setsStr = (we.sets || []).map(s => `${s.km}km in ${s.time} (RPE ${s.rpe || '–'})`).join(', ');
        } else if (type === 'stretch') {
          setsStr = (we.sets || []).map(s => `${s.minutes}min`).join(', ');
        } else {
          setsStr = (we.sets || []).map(s => `${s.weight}kg × ${s.reps} (RPE ${s.rpe || '–'}${s.type && s.type !== 'N' ? `, Typ: ${s.type}` : ''})`).join(', ');
        }
        context += `  * Übung: "${exName}" (${we.isCustom ? we.customCategory : (ex ? ex.category : '')}) -> Sätze: [${setsStr}]${we.note ? ` (Notiz: "${we.note}")` : ''}\n`;
      });
    });
  } else {
    context += `Noch kein Training absolviert.\n`;
  }
  
  return context;
}

// Markdown and Custom imports parser
function parseMarkdownAndImports(text) {
  if (!text) return '';
  
  const importBlocks = [];
  let cleanText = text;
  
  // Regex to match any markdown code block (e.g. ```json ... ``` or ```json-gymtrack ... ```)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\s*([\s\S]*?)```/g;
  let match;
  const blocksToRemove = [];
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const rawContent = match[2].trim();
    try {
      const payload = JSON.parse(rawContent);
      if (payload && (payload.v === 't' || payload.v === 'p')) {
        importBlocks.push(payload);
        blocksToRemove.push(match[0]); // store the entire markdown block
      }
    } catch(e) {
      // Not a valid JSON payload for import, leave it to be formatted as code block
    }
  }

  // Remove the matched import blocks from the cleanText
  blocksToRemove.forEach(block => {
    cleanText = cleanText.replace(block, '');
  });

  // 2. Format basic Markdown (escaped HTML to prevent injection)
  let html = cleanText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Convert standard code blocks to styled HTML pre/code blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\s*([\s\S]*?)```/g, '<pre style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:12px;overflow-x:auto;margin:8px 0;color:var(--accent);">$2</pre>');

  // Restore line breaks and parse lists
  let lines = html.split('\n');
  lines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return `<div style="margin-left:14px;display:list-item;list-style-type:disc;padding-left:4px;">${trimmed.substring(2)}</div>`;
    }
    const matchNum = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (matchNum) {
      return `<div style="margin-left:14px;display:list-item;list-style-type:decimal;padding-left:4px;">${matchNum[2]}</div>`;
    }
    return line;
  });
  html = lines.join('<br>');

  // Remove double line breaks that follow block-level divs
  html = html.replace(/<\/div><br>/g, '</div>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // 3. Render any action blocks at the bottom of the message
  if (importBlocks.length > 0) {
    importBlocks.forEach(payload => {
      const blockHtml = renderImportBlockCard(payload);
      html += blockHtml;
    });
  }

  return html;
}

function renderImportBlockCard(payload) {
  const isDe = (lang === 'de');
  
  if (payload.v === 't' && payload.t) {
    const name = payload.t.name || 'AI Vorlage';
    const exCount = payload.t.exerciseIds ? payload.t.exerciseIds.length : 0;
    
    // Check if already imported
    const exists = db.templates && db.templates.find(x => x.id === payload.t.id);
    const btnClass = exists ? 'ai-import-btn imported' : 'ai-import-btn';
    const btnText = exists 
      ? (isDe ? '✓ Vorlage bereits importiert' : '✓ Template already imported')
      : (isDe ? '📥 In GymLab importieren' : '📥 Import to GymLab');
    
    const uniqueId = `btn_imp_${payload.t.id || uid()}`;
    // Stringify payload to pass in click handler safely
    const payloadStr = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    return `
      <div class="ai-import-card">
        <div class="ai-import-title">📋 ${isDe ? 'Workout-Vorlage' : 'Workout Template'}</div>
        <div class="ai-import-subtitle">${name} (${exCount} ${isDe ? 'Übungen' : 'Exercises'})</div>
        <button class="${btnClass}" id="${uniqueId}" onclick="importAiPayload('${payloadStr}', '${uniqueId}')">${btnText}</button>
      </div>
    `;
  }
  
  if (payload.v === 'p' && payload.p) {
    const name = payload.p.name || 'AI Programm';
    const daysCount = payload.p.schedule ? Object.keys(payload.p.schedule).length : 0;
    
    const exists = db.programs && db.programs.find(x => x.id === payload.p.id);
    const btnClass = exists ? 'ai-import-btn imported' : 'ai-import-btn';
    const btnText = exists 
      ? (isDe ? '✓ Programm bereits importiert' : '✓ Program already imported')
      : (isDe ? '📥 In GymLab importieren' : '📥 Import to GymLab');
    
    const uniqueId = `btn_imp_${payload.p.id || uid()}`;
    const payloadStr = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    return `
      <div class="ai-import-card">
        <div class="ai-import-title">💪 ${isDe ? 'Wochen-Programm' : 'Weekly Program'}</div>
        <div class="ai-import-subtitle">${name} (${daysCount} ${isDe ? 'Tage' : 'Days'})</div>
        <button class="${btnClass}" id="${uniqueId}" onclick="importAiPayload('${payloadStr}', '${uniqueId}')">${btnText}</button>
      </div>
    `;
  }

  return '';
}

// Client action for importing template/program
function importAiPayload(payloadB64, buttonId) {
  try {
    const rawJson = decodeURIComponent(escape(atob(payloadB64)));
    const payload = JSON.parse(rawJson);
    
    // Safety check on schema values (Prompt Injection defence)
    sanitizePayload(payload);

    // Normalize payload to guarantee compatibility with _mergeImportedDb
    if (payload.v === 't') {
      if (!payload.t) payload.t = {};
      if (!payload.t.id) payload.t.id = 'ai_temp_' + uid();
      if (!payload.t.type) payload.t.type = 'training';
      if (!payload.t.exerciseIds) payload.t.exerciseIds = [];
      if (!payload.e || !Array.isArray(payload.e)) payload.e = [];
    } else if (payload.v === 'p') {
      if (!payload.p) payload.p = {};
      if (!payload.p.id) payload.p.id = 'ai_prog_' + uid();
      if (!payload.t || !Array.isArray(payload.t)) payload.t = [];
      if (!payload.e || !Array.isArray(payload.e)) payload.e = [];
      
      // Auto-assign missing IDs for templates inside the program
      payload.t.forEach(tmpl => {
        if (!tmpl.id) tmpl.id = 'ai_temp_' + uid();
        if (!tmpl.type) tmpl.type = 'training';
        if (!tmpl.exerciseIds) tmpl.exerciseIds = [];
      });

      // Auto-resolve program schedule values mapping
      if (payload.p.schedule) {
        for (let day in payload.p.schedule) {
          const ref = payload.p.schedule[day];
          if (!ref) continue;
          // Find template by ID or Name
          let targetTmpl = payload.t.find(t => t.id === ref || t.name === ref);
          if (targetTmpl) {
            payload.p.schedule[day] = targetTmpl.id;
          }
        }
      }
    }

    // Call GymTrack's existing merge function
    _mergeImportedDb(payload);
    
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.className = 'ai-import-btn imported';
      btn.textContent = lang === 'de' ? '✓ Erfolgreich importiert!' : '✓ Imported successfully!';
    }
  } catch(e) {
    console.error("Failed to import AI payload", e);
    alert(lang === 'de' ? 'Import fehlgeschlagen.' : 'Import failed.');
  }
}

// Sanitize inputs (HTML escaping to prevent injection payload execution)
function sanitizePayload(payload) {
  const cleanStr = s => {
    if (typeof s !== 'string') return s;
    return s.replace(/<\/?[^>]+(>|$)/g, ""); // Strip any HTML tags
  };

  if (payload.e) {
    payload.e.forEach(ex => {
      ex.name = cleanStr(ex.name);
      ex.category = cleanStr(ex.category);
      if (ex.notes) ex.notes = cleanStr(ex.notes);
    });
  }
  if (payload.t) {
    const list = Array.isArray(payload.t) ? payload.t : [payload.t];
    list.forEach(t => {
      t.name = cleanStr(t.name);
      t.type = cleanStr(t.type);
    });
  }
  if (payload.p) {
    payload.p.name = cleanStr(payload.p.name);
  }
}

// Rendering chat log
function renderChatFeed() {
  const feed = document.getElementById('aiChatFeed');
  if (!feed) return;
  
  feed.innerHTML = aiChatHistory.map((m, idx) => {
    const sideClass = m.role === 'user' ? 'user' : 'coach';
    const textHtml = m.role === 'coach' ? parseMarkdownAndImports(m.text) : m.text;
    
    return `
      <div class="ai-msg ${sideClass}">
        <div class="ai-msg-bubble">${textHtml}</div>
        <div class="ai-msg-time">${m.time}</div>
      </div>
    `;
  }).join('');
  
  if (aiIsLoading) {
    feed.innerHTML += `
      <div class="ai-msg coach" id="aiTypingIndicatorRow">
        <div class="ai-typing-indicator">
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
        </div>
      </div>
    `;
  }
  
  // Auto-scroll to bottom
  feed.scrollTop = feed.scrollHeight;
}

// Preset Quick Chips
function triggerAiPreset(type) {
  if (aiIsLoading) return;
  const isDe = (lang === 'de');
  
  let msg = '';
  if (type === 'analyse') {
    msg = isDe
      ? 'Führe eine detaillierte Analyse meines Trainingsverlaufs durch. Welche Fortschritte siehst du? Wo gibt es Plateaus oder Verbesserungspotenzial?'
      : 'Analyze my training history in detail. What progress do you see? Are there plateaus or areas for improvement?';
  } else if (type === 'nutrition') {
    msg = isDe
      ? 'Erstelle mir einen personalisierten Ernährungsplan basierend auf meinem Gewicht und meinen Zielen.'
      : 'Create a personalized nutrition plan for me based on my weight and fitness goals.';
  } else if (type === 'supps') {
    msg = isDe
      ? 'Schau dir meine Supplements und meine Einnahmetreue an. Welche Tipps hast du zur Dosierung oder Optimierung?'
      : 'Take a look at my supplements and my intake adherence. Do you have any tips regarding dosage or optimization?';
  } else if (type === 'plan') {
    msg = isDe
      ? 'Erstelle einen neuen Trainingsplan für mich. Schlage mir ein konkretes Programm vor, das ich direkt importieren kann.'
      : 'Create a new training plan for me. Propose a concrete program that I can import directly.';
  }

  if (msg) {
    const input = document.getElementById('aiChatInput');
    if (input) input.value = msg;
    sendAiMessage();
  }
}

// Fetch API core
async function sendAiMessage() {
  const isDe = (lang === 'de');
  
  if (aiIsLoading) {
    abortAiRequest();
    return;
  }
  
  const input = document.getElementById('aiChatInput');
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  // Push User message
  const now = new Date();
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  aiChatHistory.push({ role: 'user', text: text, time: timeStr });
  
  // Auto-generate title on first message in this chat
  if (aiChats[aiActiveChatId] && aiChats[aiActiveChatId].title === (isDe ? 'Neuer Chat' : 'New Chat')) {
    let newTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
    aiChats[aiActiveChatId].title = newTitle;
  }
  
  saveCurrentChat();
  
  input.value = '';
  aiIsLoading = true;
  updateSendButtonState();
  renderChatFeed();
  
  aiAbortController = new AbortController();
  
  try {
    const responseText = await requestAiResponse(text);
    aiChatHistory.push({ role: 'coach', text: responseText, time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) });
  } catch(e) {
    if (e.name === 'AbortError') {
      // Ignore adding error text if user aborted the call
      return;
    }
    const errText = isDe
      ? `Fehler bei der Verbindung mit der KI: ${e.message}. Bitte überprüfe deinen API-Key in den Einstellungen.`
      : `Error connecting to the AI: ${e.message}. Please check your API key in the settings.`;
    aiChatHistory.push({ role: 'coach', text: errText, time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) });
  } finally {
    aiIsLoading = false;
    aiAbortController = null;
    saveCurrentChat();
    updateSendButtonState();
    renderChatFeed();
  }
}

// Clear active chat history
function clearAiChat() {
  const isDe = (lang === 'de');
  if (!confirm(isDe ? 'Chatverlauf wirklich löschen?' : 'Really delete chat history?')) return;
  
  const welcome = isDe
    ? 'Hallo! Ich bin dein persönlicher KI-Coach. Ich unterstütze dich bei deinem Training, deiner Ernährung und deinen Supplements. Wie kann ich dir heute helfen?'
    : 'Hello! I am your personal AI Coach. I can help you optimize your training, nutrition, and supplements. How can I assist you today?';
  
  aiChatHistory = [{ role: 'coach', text: welcome, time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }];
  
  if (aiChats[aiActiveChatId]) {
    aiChats[aiActiveChatId].title = isDe ? 'Neuer Chat' : 'New Chat';
    aiChats[aiActiveChatId].history = aiChatHistory;
  }
  
  saveCurrentChat();
  renderChatFeed();
  showToast(isDe ? 'Verlauf zurückgesetzt' : 'History reset');
}

async function requestAiResponse(userMessage) {
  if (aiProvider === 'chrome') {
    return await requestChromeAi(userMessage);
  } else {
    return await requestGeminiAi(userMessage);
  }
}

async function requestGeminiAi(latestMessage) {
  if (!aiApiKey) {
    throw new Error(lang === 'de' ? 'API-Key fehlt' : 'API key is missing');
  }

  // Compile current database context
  const dbContext = compileAiContext();

  // Build official multi-turn contents array
  const contents = [];
  
  // Add all history messages except the very last user message (which we will append with context)
  for (let i = 0; i < aiChatHistory.length - 1; i++) {
    const msg = aiChatHistory[i];
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  // Add the last user message with context prepended to it
  contents.push({
    role: 'user',
    parts: [{ text: `${dbContext}\n\nUser Question: ${latestMessage}` }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    signal: aiAbortController ? aiAbortController.signal : undefined,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: {
        parts: [{ text: AI_SYSTEM_PROMPT }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const errMsg = errJson.error ? errJson.error.message : `HTTP status ${response.status}`;
    throw new Error(errMsg);
  }

  const json = await response.json();
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
    return json.candidates[0].content.parts[0].text;
  }
  
  throw new Error("Empty response received from Gemini API");
}

async function requestChromeAi(latestMessage) {
  if (typeof window.ai === 'undefined' || typeof window.ai.languageModel === 'undefined') {
    throw new Error("Chrome Prompt API is not supported in this browser.");
  }
  
  const dbContext = compileAiContext();
  
  // Build a single prompt for Chrome Nano
  let prompt = `${AI_SYSTEM_PROMPT}\n\n${dbContext}\n\nCONVERSATION HISTORY:\n`;
  aiChatHistory.forEach(h => {
    prompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}\n`;
  });
  prompt += `Assistant:`;
  
  const session = await window.ai.languageModel.create({
    temperature: 0.7
  });
  
  const response = await session.prompt(prompt);
  session.destroy();
  return response;
}

/* Onboarding Logic */
function checkShowOnboarding() {
  const onboardScreen = document.getElementById('aiOnboardingScreen');
  const chatFeed = document.getElementById('aiChatFeed');
  const chatInputRow = document.querySelector('.ai-chat-input-row');
  const suggestionsRow = document.getElementById('aiSuggestionsRow');
  
  if (!onboardScreen) return;

  const isGeminiMissingKey = (aiProvider === 'gemini' && !aiApiKey);
  const isChromeUnsupported = (aiProvider === 'chrome' && (typeof window.ai === 'undefined' || typeof window.ai.languageModel === 'undefined'));

  if (isGeminiMissingKey || isChromeUnsupported) {
    // Show onboarding
    onboardScreen.style.display = 'block';
    if (chatFeed) chatFeed.style.display = 'none';
    if (chatInputRow) chatInputRow.style.display = 'none';
    if (suggestionsRow) suggestionsRow.style.display = 'none';
    
    // Render Chrome status inside onboarding
    renderOnboardChromeStatus();
  } else {
    // Hide onboarding, show chat
    onboardScreen.style.display = 'none';
    if (chatFeed) chatFeed.style.display = 'flex';
    if (chatInputRow) chatInputRow.style.display = 'flex';
    if (suggestionsRow) suggestionsRow.style.display = 'flex';
  }
}

function saveAiOnboardKey() {
  const input = document.getElementById('aiOnboardKeyInput');
  if (!input) return;
  const key = input.value.trim();
  const isDe = (lang === 'de');
  
  if (!key) {
    alert(isDe ? 'Bitte gib einen gültigen API-Key ein.' : 'Please enter a valid API key.');
    return;
  }
  
  aiApiKey = key;
  aiProvider = 'gemini';
  
  localStorage.setItem('gym_ai_provider', aiProvider);
  localStorage.setItem('gym_ai_key', aiApiKey);
  
  // Sync to settings inputs
  const keyInput = document.getElementById('aiApiKeyInput');
  if (keyInput) keyInput.value = aiApiKey;
  const pSel = document.getElementById('aiProviderSelect');
  if (pSel) pSel.value = aiProvider;
  
  onAiProviderChange();
  checkShowOnboarding();
  
  showToast(isDe ? 'API-Key gespeichert & Coach gestartet!' : 'API Key saved & Coach started!');
}

function enableOnboardChromeAi() {
  const isDe = (lang === 'de');
  aiProvider = 'chrome';
  
  localStorage.setItem('gym_ai_provider', aiProvider);
  
  // Sync settings panel
  const pSel = document.getElementById('aiProviderSelect');
  if (pSel) pSel.value = aiProvider;
  
  onAiProviderChange();
  checkShowOnboarding();
  
  showToast(isDe ? 'Chrome Lokale KI aktiviert!' : 'Chrome Local AI activated!');
}

async function renderOnboardChromeStatus() {
  const box = document.getElementById('aiOnboardChromeStatusBox');
  if (!box) return;
  
  const isDe = (lang === 'de');
  
  if (typeof window.ai === 'undefined' || typeof window.ai.languageModel === 'undefined') {
    box.innerHTML = `
      <div style="color:var(--accent2); font-size:12px; line-height:1.4; margin-bottom:8px;">
        ${isDe 
          ? '⚠️ Nicht verfügbar in diesem Browser. Bitte aktiviere die "Prompt API" in <code>chrome://flags</code>.' 
          : '⚠️ Not available in this browser. Please enable "Prompt API" in <code>chrome://flags</code>.'}
      </div>
    `;
    return;
  }
  
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    const available = capabilities.available;
    
    let statusText = '';
    let statusColor = 'var(--text)';
    let showButton = true;
    let buttonText = isDe ? 'Chrome KI nutzen' : 'Use Chrome AI';
    
    if (available === 'readily') {
      statusText = isDe ? '✅ Bereit zur Nutzung!' : '✅ Ready for use!';
      statusColor = 'var(--accent)';
    } else if (available === 'after-download') {
      statusText = isDe 
        ? '📥 Download erforderlich (wird automatisch geladen).' 
        : '📥 Download required (will load automatically).';
      statusColor = 'orange';
      buttonText = isDe ? 'Download starten & nutzen' : 'Start download & use';
    } else {
      statusText = isDe ? '⚠️ Nicht bereit oder unsupported.' : '⚠️ Not ready or unsupported.';
      statusColor = 'var(--accent2)';
      buttonText = isDe ? 'Dennoch versuchen' : 'Try anyway';
    }
    
    box.innerHTML = `
      <div style="font-size:12px; margin-bottom:8px; line-height:1.4;">
        <strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span>
      </div>
      ${showButton ? `<button class="btn btn-secondary btn-sm" onclick="enableOnboardChromeAi()" style="width:100%; padding:6px 12px; font-size:12px;">${buttonText}</button>` : ''}
    `;
  } catch (e) {
    box.innerHTML = `
      <div style="color:var(--accent2); font-size:12px; margin-bottom:8px; line-height:1.4;">
        ${isDe ? '⚠️ Fehler beim Abfragen der Kompatibilität.' : '⚠️ Error checking compatibility.'}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="enableOnboardChromeAi()" style="width:100%; padding:6px 12px; font-size:12px;">
        ${isDe ? 'Dennoch aktivieren' : 'Activate anyway'}
      </button>
    `;
  }
}

/* Multi-Chat History & Aborting Queries */
function loadAiChats() {
  const isDe = (lang === 'de');
  
  const savedChats = localStorage.getItem('gym_ai_chats');
  if (savedChats) {
    try {
      const parsed = JSON.parse(savedChats);
      if (Array.isArray(parsed)) {
        aiChats = {};
        parsed.forEach(chat => {
          if (chat && chat.id) {
            aiChats[chat.id] = chat;
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        aiChats = parsed;
      } else {
        aiChats = {};
      }
    } catch(e) {
      aiChats = {};
    }
  } else {
    aiChats = {};
  }
  
  aiActiveChatId = localStorage.getItem('gym_ai_active_chat_id') || '';
  
  // Migration of old single chat history
  const oldHistoryStr = localStorage.getItem('gym_ai_chat_history');
  if (oldHistoryStr && Object.keys(aiChats).length === 0) {
    try {
      const oldHistory = JSON.parse(oldHistoryStr);
      if (oldHistory && oldHistory.length > 0) {
        const migId = 'chat_mig_' + Date.now();
        aiChats[migId] = {
          id: migId,
          title: isDe ? 'Bisheriger Chat' : 'Previous Chat',
          history: oldHistory,
          created: Date.now()
        };
        aiActiveChatId = migId;
        localStorage.setItem('gym_ai_chats', JSON.stringify(aiChats));
        localStorage.setItem('gym_ai_active_chat_id', aiActiveChatId);
        localStorage.removeItem('gym_ai_chat_history');
      }
    } catch(e) {
      console.warn("Could not migrate old chat history:", e);
    }
  }
  
  if (Object.keys(aiChats).length === 0) {
    const defaultId = 'chat_' + Date.now();
    const welcome = isDe
      ? 'Hallo! Ich bin dein persönlicher KI-Coach. Ich unterstütze dich bei deinem Training, deiner Ernährung und deinen Supplements. Wie kann ich dir heute helfen?'
      : 'Hello! I am your personal AI Coach. I can help you optimize your training, nutrition, and supplements. How can I assist you today?';
    
    aiChats[defaultId] = {
      id: defaultId,
      title: isDe ? 'Neuer Chat' : 'New Chat',
      history: [{ role: 'coach', text: welcome, time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }],
      created: Date.now()
    };
    aiActiveChatId = defaultId;
    localStorage.setItem('gym_ai_chats', JSON.stringify(aiChats));
    localStorage.setItem('gym_ai_active_chat_id', aiActiveChatId);
  }
  
  if (aiChats[aiActiveChatId]) {
    aiChatHistory = aiChats[aiActiveChatId].history;
  } else {
    const keys = Object.keys(aiChats);
    if (keys.length > 0) {
      aiActiveChatId = keys[0];
      aiChatHistory = aiChats[aiActiveChatId].history;
      localStorage.setItem('gym_ai_active_chat_id', aiActiveChatId);
    }
  }
}

function saveCurrentChat() {
  if (aiChats[aiActiveChatId]) {
    aiChats[aiActiveChatId].history = aiChatHistory;
    localStorage.setItem('gym_ai_chats', JSON.stringify(aiChats));
  }
}

function toggleAiHistory() {
  const panel = document.getElementById('aiHistoryPanel');
  if (!panel) return;
  aiHistoryVisible = !aiHistoryVisible;
  if (aiHistoryVisible) {
    panel.classList.add('open');
    renderHistoryList();
    
    aiSettingsVisible = false;
    const settPanel = document.getElementById('aiSettingsPanel');
    if (settPanel) settPanel.classList.remove('open');
  } else {
    panel.classList.remove('open');
    checkShowOnboarding();
  }
}

function renderHistoryList() {
  const listContainer = document.getElementById('aiHistoryList');
  if (!listContainer) return;
  
  const isDe = (lang === 'de');
  const sortedKeys = Object.keys(aiChats).sort((a, b) => {
    const timeA = aiChats[a].created || 0;
    const timeB = aiChats[b].created || 0;
    return timeB - timeA;
  });
  
  if (sortedKeys.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; color:var(--muted); font-size:13px; padding:12px;">${isDe ? 'Keine vergangenen Chats' : 'No past chats'}</div>`;
    return;
  }
  
  listContainer.innerHTML = sortedKeys.map(key => {
    const chat = aiChats[key];
    const activeClass = chat.id === aiActiveChatId ? 'active' : '';
    
    return `
      <div class="ai-history-item ${activeClass}" onclick="selectChat('${chat.id}')">
        <div class="ai-history-item-title">${chat.title}</div>
        <button class="ai-history-item-delete" onclick="deleteChat('${chat.id}', event)" title="${isDe ? 'Chat löschen' : 'Delete chat'}">🗑</button>
      </div>
    `;
  }).join('');
}

function startNewChat() {
  saveCurrentChat(); // Save the current chat before switching
  
  const isDe = (lang === 'de');
  const newId = 'chat_' + Date.now();
  const welcome = isDe
    ? 'Hallo! Ich bin dein persönlicher KI-Coach. Ich unterstütze dich bei deinem Training, deiner Ernährung und deinen Supplements. Wie kann ich dir heute helfen?'
    : 'Hello! I am your personal AI Coach. I can help you optimize your training, nutrition, and supplements. How can I assist you today?';
  
  aiChats[newId] = {
    id: newId,
    title: isDe ? 'Neuer Chat' : 'New Chat',
    history: [{ role: 'coach', text: welcome, time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }],
    created: Date.now()
  };
  
  aiActiveChatId = newId;
  aiChatHistory = aiChats[newId].history;
  
  localStorage.setItem('gym_ai_chats', JSON.stringify(aiChats));
  localStorage.setItem('gym_ai_active_chat_id', aiActiveChatId);
  
  aiHistoryVisible = false;
  const panel = document.getElementById('aiHistoryPanel');
  if (panel) panel.classList.remove('open');
  
  renderChatFeed();
  checkShowOnboarding();
  updateSendButtonState();
  updateActiveModelBadge();
  showToast(isDe ? 'Neuer Chat gestartet' : 'New chat started');
}

function selectChat(chatId) {
  if (!aiChats[chatId]) return;
  
  saveCurrentChat(); // Save the current chat before switching
  
  aiActiveChatId = chatId;
  aiChatHistory = aiChats[chatId].history;
  
  localStorage.setItem('gym_ai_active_chat_id', aiActiveChatId);
  
  aiHistoryVisible = false;
  const panel = document.getElementById('aiHistoryPanel');
  if (panel) panel.classList.remove('open');
  
  renderChatFeed();
  checkShowOnboarding();
  updateSendButtonState();
}

function deleteChat(chatId, event) {
  if (event) event.stopPropagation();
  
  const isDe = (lang === 'de');
  if (!confirm(isDe ? 'Diesen Chat wirklich löschen?' : 'Really delete this chat?')) return;
  
  delete aiChats[chatId];
  localStorage.setItem('gym_ai_chats', JSON.stringify(aiChats));
  
  if (aiActiveChatId === chatId) {
    aiActiveChatId = '';
    loadAiChats();
  }
  
  renderHistoryList();
  renderChatFeed();
  checkShowOnboarding();
  updateSendButtonState();
  showToast(isDe ? 'Chat gelöscht' : 'Chat deleted');
}

function abortAiRequest() {
  if (aiAbortController) {
    aiAbortController.abort();
    aiAbortController = null;
  }
  aiIsLoading = false;
  
  renderChatFeed();
  updateSendButtonState();
  
  const isDe = (lang === 'de');
  showToast(isDe ? 'Anfrage abgebrochen' : 'Request aborted');
}

function updateSendButtonState() {
  const btn = document.getElementById('aiSendBtn');
  if (!btn) return;
  if (aiIsLoading) {
    btn.innerHTML = '■';
    btn.style.background = 'var(--accent2)';
    btn.style.color = '#fff';
  } else {
    btn.innerHTML = '▶';
    btn.style.background = 'var(--accent)';
    btn.style.color = '#0a0a0a';
  }
}

function updateActiveModelBadge() {
  const badge = document.getElementById('lblAiActiveModelBadge');
  if (!badge) return;
  
  if (aiProvider === 'chrome') {
    badge.textContent = 'Chrome Nano';
  } else {
    if (aiModel === 'gemini-3.5-flash') {
      badge.textContent = 'Gemini 3.5 Flash';
    } else if (aiModel === 'gemini-3-pro') {
      badge.textContent = 'Gemini 3 Pro';
    } else {
      badge.textContent = aiCustomModel || aiModel;
    }
  }
}

