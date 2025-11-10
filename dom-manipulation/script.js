/* script.js — Sync Simulation + Conflict Resolution
   - mockServer: simulates network requests and server-side storage
   - periodic polling: fetchServerAndMerge() runs on interval
   - conflict resolution: server-wins automatically; conflicts recorded for manual resolution
   - UI: syncStatus, notifications, Resolve Conflicts button + resolver UI
*/

// ---- Existing storage keys (unchanged) ----
const LS_KEY = 'dynamic_quotes_v1';
const LS_FILTER = 'last_selected_category';
const SS_LAST_INDEX = 'last_viewed_quote_index';

// ---- DOM refs (ensure these IDs exist in your HTML) ----
const quoteDisplay = document.getElementById('quoteDisplay');
const quoteMeta = document.getElementById('quoteMeta');
const formContainer = document.getElementById('formContainer');
const newQuoteBtn = document.getElementById('newQuote');
const openAddFormBtn = document.getElementById('openAddForm');
const exportBtn = document.getElementById('exportJson');
const importFileInput = document.getElementById('importFile');
const categoryFilter = document.getElementById('categoryFilter');

const syncStatusEl = document.getElementById('syncStatus');
const notificationsEl = document.getElementById('notifications');
const resolveConflictsBtn = document.getElementById('resolveConflictsBtn');
const conflictContainer = document.getElementById('conflictContainer');

// ---- In-memory state ----
let quotes = loadQuotes();            // local array of quotes
let pendingLocalChanges = [];         // local changes not yet sent to server (simulate offline edits)
let conflictList = [];                // recorded conflicts for manual resolution

// ---- Mock server implementation (simulates remote API) ----
/* Behavior:
   - serverQuotes holds authoritative quotes on server
   - server assigns positive numeric IDs
   - client uses negative temp IDs for newly-created quotes until server assigns real IDs
*/
const mockServer = (() => {
  // initial server data (could differ from local to create conflicts)
  let serverQuotes = [
    { id: 1, text: "Server: The journey of a thousand miles begins with one step.", category: "Motivation", updatedAt: Date.now() - 100000 },
    { id: 2, text: "Server: Knowledge is power.", category: "Education", updatedAt: Date.now() - 100000 }
  ];
  let nextId = 3;

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  return {
    // fetch all quotes (simulate network delay)
    async fetchAll() {
      await delay(300 + Math.random() * 300);
      // return deep clone to simulate network transfer
      return JSON.parse(JSON.stringify(serverQuotes));
    },

    // accept posted local changes (array of objects). Server will:
    // - if object has id <= 0 (temp), assign new id
    // - if object.id exists on server, update server record and updatedAt
    async postChanges(changes) {
      await delay(200 + Math.random() * 200);
      const accepted = [];
      for (const c of changes) {
        if (!c.text) continue;
        if (c.id && c.id > 0) {
          // update existing server quote (server takes posted content)
          const idx = serverQuotes.findIndex(s => s.id === c.id);
          if (idx >= 0) {
            serverQuotes[idx].text = c.text;
            serverQuotes[idx].category = c.category || serverQuotes[idx].category;
            serverQuotes[idx].updatedAt = Date.now();
            accepted.push(serverQuotes[idx]);
          } else {
            // if server doesn't have it, treat as new
            const newObj = { id: nextId++, text: c.text, category: c.category || 'Uncategorized', updatedAt: Date.now() };
            serverQuotes.push(newObj);
            accepted.push(newObj);
          }
        } else {
          // new quote from client: assign id
          const newObj = { id: nextId++, text: c.text, category: c.category || 'Uncategorized', updatedAt: Date.now() };
          serverQuotes.push(newObj);
          accepted.push(newObj);
        }
      }
      // return accepted objects
      return JSON.parse(JSON.stringify(accepted));
    }
  };
})();

// ---- Storage helpers (same as before) ----
function saveQuotes() { localStorage.setItem(LS_KEY, JSON.stringify(quotes)); }
function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // create initial local dataset with client-assigned negative IDs to simulate unsynced local items
      const initial = [
        { id: -1, text: "Local: Simulated local-only quote", category: "Local", updatedAt: Date.now() - 200000 }
      ];
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function saveLocalState() { saveQuotes(); }

// ---- Utilities ----
function notify(msg, persistent=false) {
  const p = document.createElement('div');
  p.textContent = msg;
  notificationsEl.appendChild(p);
  if (!persistent) setTimeout(() => p.remove(), 5000);
}
function setSyncStatus(text) { syncStatusEl.textContent = `Sync: ${text}`; }

// ---- Sync logic ----

/*
 Strategy:
 1. Periodically fetch server data via mockServer.fetchAll()
 2. Compare server list to local `quotes`:
    - If server has an id matching local id:
       - If texts differ and server.updatedAt > local.updatedAt -> conflict; by default accept server (server-wins)
       - If local was newer, we will push local change via postChanges() (but server-wins policy will accept server)
    - If server has items not present locally -> merge into local
    - If local has items with negative id (temp local-only) -> post them to server to get real IDs
 3. If differences were resolved automatically, notify user and record conflicts in conflictList for manual review.
 4. Expose a Resolve Conflicts button that opens a small UI listing conflicts and allowing user to pick local or server for each.
*/

async function syncWithServer() {
  try {
    setSyncStatus('checking');
    const serverData = await mockServer.fetchAll();

    // Convert server array to map by id
    const serverMap = new Map(serverData.map(s => [s.id, s]));

    // Convert local to map for easy lookup
    const localMap = new Map(quotes.map(q => [q.id, q]));

    // 1. Handle local-only items (negative ids) -> send to server to get assigned ids
    const localTemps = quotes.filter(q => q.id <= 0);
    if (localTemps.length) {
      setSyncStatus('uploading local changes');
      const accepted = await mockServer.postChanges(localTemps);
      // server returns created items with real IDs; replace local temp IDs
      for (let i = 0; i < localTemps.length; i++) {
        const temp = localTemps[i];
        const created = accepted[i];
        // replace in local quotes: find index and replace id and updatedAt
        const idx = quotes.findIndex(q => q.id === temp.id);
        if (idx >= 0 && created) {
          quotes[idx].id = created.id;
          quotes[idx].updatedAt = created.updatedAt || Date.now();
        }
      }
      saveLocalState();
      notify(`Uploaded ${localTemps.length} new local quote(s) to server.`);
    }

    // 2. Compare server items against local; merge and detect conflicts
    let conflictsFound = [];

    for (const serverItem of serverData) {
      const localItem = quotes.find(q => q.id === serverItem.id);
      if (!localItem) {
        // server has quote that client doesn't — merge it
        quotes.push({ id: serverItem.id, text: serverItem.text, category: serverItem.category, updatedAt: serverItem.updatedAt });
      } else {
        // both present: check for differences
        if (localItem.text !== serverItem.text || localItem.category !== serverItem.category) {
          // conflict or divergence
          // Conflict resolution policy: server takes precedence automatically.
          // But we will record conflict for user's review.
          conflictsFound.push({ local: { ...localItem }, server: { ...serverItem } });
          // apply server version to local (server-wins)
          localItem.text = serverItem.text;
          localItem.category = serverItem.category;
          localItem.updatedAt = serverItem.updatedAt;
        }
      }
    }

    // 3. Save merged local copy
    if (conflictsFound.length) {
      conflictList = conflictList.concat(conflictsFound);
      saveLocalState();
      notify(`${conflictsFound.length} conflict(s) resolved automatically (server-won).`, true);
      resolveConflictsBtn.style.display = 'inline-block';
    } else {
      // small success note
      // notify('No conflicts this cycle.');
    }

    // 4. If server is missing something local (newly created locally with positive id because server deleted it),
    // we leave the local item and optionally push to server. For simplicity, push any local item that server lacks:
    const serverIds = new Set(serverData.map(s => s.id));
    const localsToPush = quotes.filter(q => q.id > 0 && !serverIds.has(q.id));
    if (localsToPush.length) {
      // send updates to server (if any)
      setSyncStatus('uploading orphaned local changes');
      await mockServer.postChanges(localsToPush);
      notify(`Pushed ${localsToPush.length} local change(s) to server.`);
    }

    // done
    saveLocalState();
    setSyncStatus('idle');
  } catch (err) {
    console.error('Sync failed', err);
    setSyncStatus('error');
    notify('Sync failed — see console.', true);
  }
}

// ---- Manual conflict resolution UI ----
function showConflictResolver() {
  if (!conflictList.length) {
    alert('No conflicts to resolve.');
    return;
  }
  conflictContainer.innerHTML = '';
  conflictContainer.style.display = 'block';

  conflictList.forEach((c, idx) => {
    const wrapper = document.createElement('div');
    wrapper.style.borderBottom = '1px dashed #ccc';
    wrapper.style.padding = '6px 0';

    const title = document.createElement('div');
    title.textContent = `Conflict #${idx + 1} (ID ${c.server.id})`;
    title.style.fontWeight = 'bold';
    wrapper.appendChild(title);

    const localP = document.createElement('p');
    localP.textContent = `Local: "${c.local.text}" (${c.local.category})`;
    wrapper.appendChild(localP);

    const serverP = document.createElement('p');
    serverP.textContent = `Server: "${c.server.text}" (${c.server.category})`;
    wrapper.appendChild(serverP);

    const keepLocalBtn = document.createElement('button');
    keepLocalBtn.textContent = 'Keep Local';
    keepLocalBtn.onclick = async () => {
      // push local to server (overwrites server)
      await mockServer.postChanges([c.local]);
      // also update server copy in our next sync (but for immediate feedback, we'll mark resolved)
      wrapper.remove();
      conflictList[idx] = null; // mark resolved
      notify(`Conflict #${idx+1} set to Local and pushed to server.`);
    };

    const keepServerBtn = document.createElement('button');
    keepServerBtn.textContent = 'Keep Server';
    keepServerBtn.style.marginLeft = '6px';
    keepServerBtn.onclick = () => {
      // already server applied; just remove this conflict from list
      wrapper.remove();
      conflictList[idx] = null;
      notify(`Conflict #${idx+1} kept Server version.`);
    };

    wrapper.appendChild(keepLocalBtn);
    wrapper.appendChild(keepServerBtn);

    conflictContainer.appendChild(wrapper);
  });

  // filter out resolved entries when user closes; provide "Done" button
  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'Done';
  doneBtn.onclick = () => {
    conflictList = conflictList.filter(Boolean);
    if (!conflictList.length) {
      resolveConflictsBtn.style.display = 'none';
      conflictContainer.style.display = 'none';
    }
  };
  conflictContainer.appendChild(doneBtn);
}

// ---- Wiring UI ----
resolveConflictsBtn.addEventListener('click', showConflictResolver);

// ---- Hook existing features: addQuote should mark local changes pending (no immediate server post) ----
function addQuoteLocal(textInputElem, catInputElem) {
  const text = (textInputElem.value || '').trim();
  const category = (catInputElem.value || '').trim() || 'Uncategorized';

  if (!text) {
    alert('Please enter quote text.');
    return;
  }

  // assign temporary negative ID (client-side-only until synced)
  const tempId = (Math.min(0, ...quotes.map(q => q.id))) - 1; // next negative number
  const newObj = { id: tempId, text, category, updatedAt: Date.now() };

  quotes.push(newObj);
  pendingLocalChanges.push(newObj); // mark unsynced
  saveLocalState();
  notify('Added locally (will be uploaded on next sync).');
  // clear form fields (if provided)
  if (typeof textInputElem.value !== 'undefined') textInputElem.value = '';
  if (typeof catInputElem.value !== 'undefined') catInputElem.value = '';

  // Optionally show the newly added local quote
  quoteDisplay.innerHTML = `<p>Added locally: "${newObj.text}"</p>`;
}

// ---- Initialize / Polling ----
newQuoteBtn.addEventListener('click', () => {
  // show a random local quote (whatever is in local copy)
  if (!quotes.length) { quoteDisplay.textContent = 'No quotes.'; return; }
  const idx = Math.floor(Math.random() * quotes.length);
  const q = quotes[idx];
  quoteDisplay.innerHTML = `<p>"${q.text}"</p>`;
  quoteMeta.textContent = `Category: ${q.category} ${q.id <= 0 ? '(local-only)' : ''}`;
  // save last viewed
  sessionStorage.setItem(SS_LAST_INDEX, String(idx));
});

// The createAddQuoteForm function should call addQuoteLocal for new quotes
function createAddQuoteForm() {
  formContainer.innerHTML = '';

  const textInput = document.createElement('input');
  textInput.id = 'newQuoteText';
  textInput.placeholder = 'Enter a new quote';
  textInput.style.display = 'block';

  const categoryInput = document.createElement('input');
  categoryInput.id = 'newQuoteCategory';
  categoryInput.placeholder = 'Enter quote category';
  categoryInput.style.display = 'block';

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Quote (local)';
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => addQuoteLocal(textInput, categoryInput));

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => formContainer.innerHTML = '');

  formContainer.appendChild(textInput);
  formContainer.appendChild(categoryInput);
  formContainer.appendChild(addBtn);
  formContainer.appendChild(cancelBtn);
}

// Start periodic polling (every N seconds)
const SYNC_INTERVAL_MS = 8000; // 8 seconds for demo
setInterval(syncWithServer, SYNC_INTERVAL_MS);

// initial run
syncWithServer();
