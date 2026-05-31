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
      notes: item.notes || null,
      updated_at: Number(item.updated_at || item.date || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      startTime: Number(dbItem.start_time),
      endTime: dbItem.end_time ? Number(dbItem.end_time) : null,
      date: Number(dbItem.date),
      exercises: dbItem.exercises,
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
      time: item.time || null,
      dosage: item.dosage || null,
      unit: item.unit || null,
      frequency: item.frequency || null,
      weekdays: item.weekdays || null,
      supply: item.supply ? Number(item.supply) : null,
      active: item.active !== false,
      updated_at: Number(item.updated_at || Date.now())
    }),
    toLocal: dbItem => ({
      id: dbItem.id,
      name: dbItem.name,
      form: dbItem.form,
      time: dbItem.time,
      dosage: dbItem.dosage,
      unit: dbItem.unit,
      frequency: dbItem.frequency,
      weekdays: dbItem.weekdays,
      supply: dbItem.supply ? Number(dbItem.supply) : null,
      active: dbItem.active,
      updated_at: Number(dbItem.updated_at)
    }),
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
  achievements: 'achievements'
};

async function syncAll() {
  if (!window.supabaseClient || !window.currentSession) return;
  const user = window.currentSession.user;
  console.log('[Sync] Starting full sync cycle for user:', user.email);

  // 1. Sync User Profile (Active Program + Week Status)
  await syncUserProfile(user.id);

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
          updated_at: now
        });
      if (upsertError) throw upsertError;
      localStorage.setItem('gym_profile_updated_at', String(now));
    }
  } catch (e) {
    console.error('[Sync] Failed to sync user profile:', e);
  }
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
  localStorage.setItem('gymdb', JSON.stringify(db));

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
