/* =============================================
   GYMTRACK / DSCPLN — Synchronization Layer
   ============================================= */

// Mapping definition: local camelCase -> Supabase snake_case
const SYNC_MAPPINGS = {
  exercises: {
    toDb: item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      notes: item.notes || null,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      name: dbItem.name,
      category: dbItem.category,
      notes: dbItem.notes,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  },
  workouts: {
    toDb: item => ({
      id: item.id,
      start_time: Number(item.startTime),
      end_time: item.endTime ? Number(item.endTime) : null,
      date: Number(item.date),
      exercises: item.exercises,
      // Persist the template link so "Freies Training" isn't shown after a
      // cloud round-trip for workouts that were started from a template.
      template_id: item.templateId != null ? String(item.templateId) : null,
      notes: item.notes || null,
      updated_at: Number(item.updated_at || item.date || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      startTime: Number(dbItem.start_time),
      endTime: dbItem.end_time ? Number(dbItem.end_time) : null,
      date: Number(dbItem.date),
      exercises: dbItem.exercises,
      templateId: dbItem.template_id != null ? String(dbItem.template_id) : null,
      notes: dbItem.notes,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || item.date || Date.now())
  },
  templates: {
    toDb: item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      exercise_ids: item.exerciseIds,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      name: dbItem.name,
      type: dbItem.type,
      exerciseIds: dbItem.exercise_ids,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  },
  programs: {
    toDb: item => ({
      id: item.id,
      name: item.name,
      schedule: item.schedule,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      name: dbItem.name,
      schedule: dbItem.schedule,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  },
  measurements: {
    toDb: item => ({
      id: item.id,
      date: Number(item.date),
      weight: Number(item.weight),
      bf: item.bf ? Number(item.bf) : null,
      note: item.note || null,
      updated_at: Number(item.updated_at || item.date || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      date: Number(dbItem.date),
      weight: Number(dbItem.weight),
      bf: dbItem.bf ? Number(dbItem.bf) : null,
      note: dbItem.note,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || item.date || Date.now())
  },
  progress_pics: {
    toDb: item => ({
      id: item.id,
      date: Number(item.date),
      data_url: item.dataUrl,
      note: item.note || null,
      updated_at: Number(item.updated_at || item.date || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      date: Number(dbItem.date),
      dataUrl: dbItem.data_url,
      note: dbItem.note,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || item.date || Date.now())
  },
  supplements: {
    toDb: item => ({
      id: item.id,
      name: item.name,
      form: item.form || null,
      time: item.timeOfDay || item.time || null,
      dosage: item.dosage || null,
      unit: item.dosageUnit || item.unit || null,
      frequency: item.frequency || null,
      weekdays: {
        days: item.frequencyDays || null,
        lastRefillTakenCount: item.lastRefillTakenCount || 0,
        createdAt: item.createdAt || Date.now(),
        frequencyValue: item.frequencyValue || null,
        color: item.color || null,
        notes: item.notes || null,
        scoopSize: item.scoopSize || null
      },
      supply: item.supplySize ? Number(item.supplySize) : null,
      active: item.active !== false,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => {
      const weekdaysObj = dbItem.weekdays && typeof dbItem.weekdays === 'object' && !Array.isArray(dbItem.weekdays) ? dbItem.weekdays : null;
      return {
        id: dbItem.id,
        name: dbItem.name,
        form: dbItem.form,
        timeOfDay: dbItem.time || null,
        dosage: dbItem.dosage,
        dosageUnit: dbItem.unit || null,
        frequency: dbItem.frequency,
        frequencyValue: weekdaysObj ? (weekdaysObj.frequencyValue || null) : null,
        frequencyDays: weekdaysObj ? (weekdaysObj.days || []) : (dbItem.weekdays || []),
        lastRefillTakenCount: weekdaysObj ? (weekdaysObj.lastRefillTakenCount || 0) : 0,
        createdAt: weekdaysObj && weekdaysObj.createdAt ? Number(weekdaysObj.createdAt) : Number(dbItem.updated_at),
        supplySize: dbItem.supply ? Number(dbItem.supply) : null,
        active: dbItem.active,
        color: weekdaysObj ? (weekdaysObj.color || null) : null,
        notes: weekdaysObj ? (weekdaysObj.notes || null) : null,
        scoopSize: weekdaysObj ? (weekdaysObj.scoopSize || null) : null,
        updated_at: Number(dbItem.updated_at)
      };
    },
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  },
  supplement_log: {
    toDb: item => ({
      id: item.id,
      supp_id: item.supId,
      date: item.date,
      taken: item.taken !== false,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      supId: dbItem.supp_id,
      date: dbItem.date,
      taken: dbItem.taken,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  },
  achievements: {
    toDb: item => ({
      id: item.id,
      unlocked_at: Number(item.unlockedAt),
      updated_at: Number(item.updated_at || item.unlockedAt || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      unlockedAt: Number(dbItem.unlocked_at),
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || item.unlockedAt || Date.now())
  },
  ai_chats: {
    toDb: item => ({
      id: item.id,
      title: item.title,
      history: item.history,
      created: Number(item.created || Date.now()),
      updated_at: Number(item.updated_at || item.created || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      title: dbItem.title,
      history: dbItem.history,
      created: Number(dbItem.created),
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || item.created || Date.now())
  },
  nutrition_logs: {
    toDb: item => ({
      id: item.id,
      date: item.date,
      time_of_day: item.timeOfDay,
      name: item.name,
      calories: Number(item.calories),
      protein: Number(item.protein),
      carbs: Number(item.carbs),
      fat: Number(item.fat),
      grams: Number(item.grams),
      logged_amount: item.loggedAmount != null ? Number(item.loggedAmount) : null,
      logged_unit: item.loggedUnit || 'g',
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      date: dbItem.date,
      timeOfDay: dbItem.time_of_day,
      name: dbItem.name,
      calories: Number(dbItem.calories),
      protein: Number(dbItem.protein),
      carbs: Number(dbItem.carbs),
      fat: Number(dbItem.fat),
      grams: Number(dbItem.grams),
      loggedAmount: dbItem.logged_amount != null ? Number(dbItem.logged_amount) : null,
      loggedUnit: dbItem.logged_unit || 'g',
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  },
  food_library: {
    toDb: item => ({
      id: item.id,
      name: item.name,
      calories: Number(item.calories),
      protein: Number(item.protein),
      carbs: Number(item.carbs),
      fat: Number(item.fat),
      serving_size: Number(item.servingSize || 100),
      is_custom: item.isCustom !== false,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      name: dbItem.name,
      calories: Number(dbItem.calories),
      protein: Number(dbItem.protein),
      carbs: Number(dbItem.carbs),
      fat: Number(dbItem.fat),
      servingSize: Number(dbItem.serving_size),
      isCustom: dbItem.is_custom,
      updated_at: Number(dbItem.updated_at)
    }),
    getLocalId: item => item.id,
    getDbId: dbItem => dbItem.id,
    getTimestamp: item => Number(item.updated_at || Date.now())
  }
};

// Map Table Names to Local db.js structures
const LOCAL_DB_KEYS = {
  exercises: 'exercises',
  workouts: 'workouts',
  templates: 'templates',
  programs: 'programs',
  measurements: 'measurements',
  progress_pics: 'progressPics',
  supplements: 'supplements',
  supplement_log: 'supplementLog',
  achievements: 'achievements',
  nutrition_logs: 'nutritionLog',
  food_library: 'foodLibrary'
};

async function syncAll() {
  if (!window.supabaseClient || !window.currentSession) return;
  const user = window.currentSession.user;
  console.log('[Sync] Starting full sync cycle for user:', user.email);

  // 1. Sync User Profile (Active Program + Week Status)
  await syncUserProfile(user.id);
  await syncNutritionGoals(user.id);

  // 2. Sync regular DB tables
  for (const table in SYNC_MAPPINGS) {
    try {
      if (table === 'ai_chats') {
        await syncAiChats(user.id);
      } else {
        await syncTable(table, user.id);
      }
    } catch (e) {
      console.error(`[Sync] Error syncing table ${table}:`, e);
    }
  }

  // Reload current page/UI elements if function exists
  if (typeof initUI === 'function') {
    initUI();
  }
}

async function syncUserProfile(userId) {
  try {
    let localUpdatedAt = Number(localStorage.getItem('gym_profile_updated_at') || 0);

    const { data: remoteProfile, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    let localNeedsPush = false;
    let remoteNeedsPull = false;

    if (remoteProfile) {
      const remoteUpdatedAt = Number(remoteProfile.updated_at);
      if (remoteUpdatedAt > localUpdatedAt) {
        remoteNeedsPull = true;
      } else if (localUpdatedAt > remoteUpdatedAt) {
        localNeedsPush = true;
      }
    } else {
      localNeedsPush = true;
    }

    if (remoteNeedsPull && remoteProfile) {
      console.log('[Sync] Pulling profile updates from remote');
      db.activeProgram = remoteProfile.active_program_id ? { id: remoteProfile.active_program_id } : null;
      db.weekStatus = remoteProfile.week_status;
      // Local-only maps now live on the profile. Only apply when the remote
      // actually has a value (!= null) so a legacy row whose column was never
      // written can't wipe locally created categories/flags/settings. Once every
      // client runs this code, pushes always send these fields (even as {}), so
      // deletions still propagate.
      if (remoteProfile.custom_categories != null) db.customCategories = remoteProfile.custom_categories;
      if (remoteProfile.exercise_flags != null) db.exerciseFlags = remoteProfile.exercise_flags;
      // Merge settings so keys the remote doesn't carry keep their local
      // defaults (barWeight, plates, …) instead of becoming undefined.
      if (remoteProfile.settings != null) db.settings = Object.assign({}, db.settings, remoteProfile.settings);
      localStorage.setItem('gym_profile_updated_at', String(remoteProfile.updated_at));
      save(); // local save
    } else if (localNeedsPush) {
      console.log('[Sync] Pushing profile updates to remote');
      const now = Date.now();
      const { error: upsertError } = await window.supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          active_program_id: db.activeProgram?.id || null,
          week_status: db.weekStatus || {"weekKey": 0, "mode": "normal"},
          custom_categories: db.customCategories || {},
          exercise_flags: db.exerciseFlags || {},
          settings: db.settings || {},
          updated_at: now
        });
      if (upsertError) throw upsertError;
      localStorage.setItem('gym_profile_updated_at', String(now));
    }
  } catch (e) {
    console.error('[Sync] Failed to sync user profile:', e);
  }
}

async function syncNutritionGoals(userId) {
  try {
    let localUpdatedAt = Number(localStorage.getItem('gym_nutrition_goals_updated_at') || 0);

    const { data: remoteGoals, error } = await window.supabaseClient
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    let localNeedsPush = false;
    let remoteNeedsPull = false;

    if (remoteGoals) {
      const remoteUpdatedAt = Number(remoteGoals.updated_at);
      if (remoteUpdatedAt > localUpdatedAt) {
        remoteNeedsPull = true;
      } else if (localUpdatedAt > remoteUpdatedAt) {
        localNeedsPush = true;
      }
    } else {
      localNeedsPush = true;
    }

    if (remoteNeedsPull && remoteGoals) {
      console.log('[Sync] Pulling nutrition goals from remote');
      db.nutritionGoals = {
        calories: Number(remoteGoals.calories),
        protein: Number(remoteGoals.protein),
        carbs: Number(remoteGoals.carbs),
        fat: Number(remoteGoals.fat)
      };
      localStorage.setItem('gym_nutrition_goals_updated_at', String(remoteGoals.updated_at));
      save(); // local save
    } else if (localNeedsPush) {
      console.log('[Sync] Pushing nutrition goals to remote');
      const now = Date.now();
      const { error: upsertError } = await window.supabaseClient
        .from('nutrition_goals')
        .upsert({
          user_id: userId,
          calories: db.nutritionGoals.calories,
          protein: db.nutritionGoals.protein,
          carbs: db.nutritionGoals.carbs,
          fat: db.nutritionGoals.fat,
          updated_at: now
        });
      if (upsertError) throw upsertError;
      localStorage.setItem('gym_nutrition_goals_updated_at', String(now));
    }
  } catch (e) {
    console.error('[Sync] Failed to sync nutrition goals:', e);
  }
}

async function syncNutritionGoalsUpdate() {
  if (!window.supabaseClient || !window.currentSession) return;
  const userId = window.currentSession.user.id;
  const now = Date.now();

  console.log(`[Sync Background] Upserting nutrition goals`);
  
  window.supabaseClient
    .from('nutrition_goals')
    .upsert({
      user_id: userId,
      calories: db.nutritionGoals.calories,
      protein: db.nutritionGoals.protein,
      carbs: db.nutritionGoals.carbs,
      fat: db.nutritionGoals.fat,
      updated_at: now
    })
    .then(({ error }) => {
      if (error) {
        console.error('[Sync Background Error] Nutrition goals update failed:', error);
      } else {
        localStorage.setItem('gym_nutrition_goals_updated_at', String(now));
      }
    });
}

async function syncTable(table, userId) {
  const mapping = SYNC_MAPPINGS[table];
  const localKey = LOCAL_DB_KEYS[table];
  if (!mapping || !localKey) return;

  console.log(`[Sync] Syncing table: ${table}`);

  // Fetch remote records
  const { data: remoteData, error } = await window.supabaseClient
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const localArray = db[localKey] || [];
  const remoteMap = new Map(remoteData.map(item => [mapping.getDbId(item), item]));
  const localMap = new Map(localArray.map(item => [mapping.getLocalId(item), item]));

  const upsertQueue = [];
  const mergedArray = [];

  // Match items by ID
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  for (const id of allIds) {
    const localItem = localMap.get(id);
    const remoteItem = remoteMap.get(id);

    if (localItem && remoteItem) {
      const localTs = mapping.getTimestamp(localItem);
      const remoteTs = mapping.getTimestamp(remoteItem);

      if (remoteTs > localTs) {
        // Remote is newer
        mergedArray.push(mapping.toLocal(remoteItem));
      } else {
        // Local is newer or equal
        mergedArray.push(localItem);
        if (localTs > remoteTs) {
          upsertQueue.push(mapping.toDb(localItem));
        }
      }
    } else if (localItem) {
      // Exists only locally
      mergedArray.push(localItem);
      upsertQueue.push(mapping.toDb(localItem));
    } else if (remoteItem) {
      // Exists only remotely
      mergedArray.push(mapping.toLocal(remoteItem));
    }
  }

  // Update local DB memory
  db[localKey] = mergedArray;
  // Route through the quota-safe persister so pulled photos migrate to IndexedDB
  if (typeof _persistDb === 'function') _persistDb();
  else localStorage.setItem('gymdb', JSON.stringify(db));

  // Push updates to remote in background
  if (upsertQueue.length > 0) {
    console.log(`[Sync] Pushing ${upsertQueue.length} records to ${table}`);
    const rows = upsertQueue.map(row => ({ ...row, user_id: userId }));
    const { error: upsertError } = await window.supabaseClient
      .from(table)
      .upsert(rows);
    
    if (upsertError) throw upsertError;
  }
}

async function syncAiChats(userId) {
  const mapping = SYNC_MAPPINGS.ai_chats;
  console.log('[Sync] Syncing AI chats');

  const { data: remoteData, error } = await window.supabaseClient
    .from('ai_chats')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  // Retrieve local chats
  let localChats = {};
  const savedChats = localStorage.getItem('gym_ai_chats');
  if (savedChats) {
    try {
      localChats = JSON.parse(savedChats) || {};
    } catch(e) {
      localChats = {};
    }
  }

  const remoteMap = new Map(remoteData.map(item => [item.id, item]));
  const upsertQueue = [];
  const allIds = new Set([...Object.keys(localChats), ...remoteMap.keys()]);

  for (const id of allIds) {
    const localItem = localChats[id];
    const remoteItem = remoteMap.get(id);

    if (localItem && remoteItem) {
      const localTs = mapping.getTimestamp(localItem);
      const remoteTs = mapping.getTimestamp(remoteItem);

      if (remoteTs > localTs) {
        localChats[id] = mapping.toLocal(remoteItem);
      } else {
        if (localTs > remoteTs) {
          upsertQueue.push(mapping.toDb(localItem));
        }
      }
    } else if (localItem) {
      upsertQueue.push(mapping.toDb(localItem));
    } else if (remoteItem) {
      localChats[id] = mapping.toLocal(remoteItem);
    }
  }

  // Update local storage
  localStorage.setItem('gym_ai_chats', JSON.stringify(localChats));
  if (typeof loadAiChats === 'function') {
    loadAiChats();
  }

  // Push updates to remote
  if (upsertQueue.length > 0) {
    console.log(`[Sync] Pushing ${upsertQueue.length} AI chats`);
    const rows = upsertQueue.map(row => ({ ...row, user_id: userId }));
    const { error: upsertError } = await window.supabaseClient
      .from('ai_chats')
      .upsert(rows);

    if (upsertError) throw upsertError;
  }
}

// Background Sync Trigger for individual saves
async function syncTableItem(tableName, item) {
  if (!window.supabaseClient || !window.currentSession) return;
  const mapping = SYNC_MAPPINGS[tableName];
  if (!mapping) return;

  const dbItem = mapping.toDb(item);
  dbItem.user_id = window.currentSession.user.id;

  console.log(`[Sync Background] Upserting item into ${tableName}:`, dbItem.id);
  
  // Asynchronous background call
  window.supabaseClient
    .from(tableName)
    .upsert(dbItem)
    .then(({ error }) => {
      if (error) console.error(`[Sync Background Error] Table ${tableName}:`, error);
    });
}

// Background Sync Trigger for user profile updates
async function syncProfileUpdate() {
  if (!window.supabaseClient || !window.currentSession) return;
  const userId = window.currentSession.user.id;
  const now = Date.now();

  console.log(`[Sync Background] Upserting profile data`);
  
  window.supabaseClient
    .from('profiles')
    .upsert({
      id: userId,
      active_program_id: db.activeProgram?.id || null,
      week_status: db.weekStatus || {"weekKey": 0, "mode": "normal"},
      custom_categories: db.customCategories || {},
      exercise_flags: db.exerciseFlags || {},
      settings: db.settings || {},
      updated_at: now
    })
    .then(({ error }) => {
      if (error) {
        console.error('[Sync Background Error] Profile update failed:', error);
      } else {
        localStorage.setItem('gym_profile_updated_at', String(now));
      }
    });
}

// Background Sync Trigger for user deletions
async function syncDeleteTableItem(tableName, id) {
  if (!window.supabaseClient || !window.currentSession) return;
  console.log(`[Sync Background] Deleting item from ${tableName}:`, id);

  window.supabaseClient
    .from(tableName)
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) {
        console.error(`[Sync Background Error] Delete from ${tableName} failed:`, error);
      }
    });
}

// =============================================
// AUTOMATIC CHANGE DETECTION & RE-SYNC
// =============================================

window._lastSyncedDb = null;
window._lastSyncedAiChats = null;

function initChangeDetection() {
  window._lastSyncedDb = JSON.parse(JSON.stringify(db || null));
  
  let localChats = {};
  const savedChats = localStorage.getItem('gym_ai_chats');
  if (savedChats) {
    try {
      localChats = JSON.parse(savedChats) || {};
    } catch (e) {
      localChats = {};
    }
  }
  window._lastSyncedAiChats = JSON.parse(JSON.stringify(localChats));
  console.log('[Sync] Change detection initialized.');
}

function detectAndSyncChanges() {
  if (!window.supabaseClient || !window.currentSession) return;
  if (!window._lastSyncedDb) {
    initChangeDetection();
    return;
  }

  // 1. Sync regular tables
  for (const table in SYNC_MAPPINGS) {
    if (table === 'ai_chats') continue;

    const localKey = LOCAL_DB_KEYS[table];
    const currentArray = db[localKey] || [];
    const lastArray = window._lastSyncedDb[localKey] || [];

    const currentMap = new Map(currentArray.map(item => [item.id, item]));
    const lastMap = new Map(lastArray.map(item => [item.id, item]));

    // Check for deletes
    for (const lastItem of lastArray) {
      if (!currentMap.has(lastItem.id)) {
        syncDeleteTableItem(table, lastItem.id);
      }
    }

    // Check for adds/mods
    for (const currentItem of currentArray) {
      const lastItem = lastMap.get(currentItem.id);
      if (!lastItem) {
        // Added
        currentItem.updated_at = Date.now();
        syncTableItem(table, currentItem);
      } else {
        // Modified - compare excluding updated_at
        const currentCompare = { ...currentItem };
        const lastCompare = { ...lastItem };
        delete currentCompare.updated_at;
        delete lastCompare.updated_at;

        if (JSON.stringify(currentCompare) !== JSON.stringify(lastCompare)) {
          currentItem.updated_at = Date.now();
          syncTableItem(table, currentItem);
        }
      }
    }
  }

  // 2. Sync AI Chats
  let currentChats = {};
  const savedChats = localStorage.getItem('gym_ai_chats');
  if (savedChats) {
    try {
      currentChats = JSON.parse(savedChats) || {};
    } catch (e) {
      currentChats = {};
    }
  }

  if (window._lastSyncedAiChats) {
    // Check deletes
    for (const id in window._lastSyncedAiChats) {
      if (!currentChats[id]) {
        syncDeleteTableItem('ai_chats', id);
      }
    }

    // Check adds/mods
    let chatsChanged = false;
    for (const id in currentChats) {
      const currentChat = currentChats[id];
      const lastChat = window._lastSyncedAiChats[id];
      if (!lastChat) {
        currentChat.updated_at = Date.now();
        syncTableItem('ai_chats', currentChat);
        chatsChanged = true;
      } else {
        const currentCompare = { ...currentChat };
        const lastCompare = { ...lastChat };
        delete currentCompare.updated_at;
        delete lastCompare.updated_at;

        if (JSON.stringify(currentCompare) !== JSON.stringify(lastCompare)) {
          currentChat.updated_at = Date.now();
          syncTableItem('ai_chats', currentChat);
          chatsChanged = true;
        }
      }
    }
    
    // Save updated chats with timestamps if changes occurred
    if (chatsChanged) {
      localStorage.setItem('gym_ai_chats', JSON.stringify(currentChats));
    }
  }

  // Update snapshot copies
  window._lastSyncedDb = JSON.parse(JSON.stringify(db));
  window._lastSyncedAiChats = JSON.parse(JSON.stringify(currentChats));
}

// Register initialization on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initChangeDetection, 200);
});
