// ---------------------
// Mock server
// ---------------------
const mockServer = (() => {
  let serverQuotes = [
    { id: 1, text: "Server: Knowledge is power.", category: "Education", updatedAt: Date.now() - 100000 },
    { id: 2, text: "Server: The journey of a thousand miles begins with one step.", category: "Motivation", updatedAt: Date.now() - 100000 }
  ];
  let nextId = 3;

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  return {
    fetchQuotes: async () => {
      await delay(200);
      return JSON.parse(JSON.stringify(serverQuotes));
    },
    postQuotes: async (quotesToPost) => {
      await delay(200);
      const posted = [];
      quotesToPost.forEach(q => {
        if (q.id && q.id > 0) {
          // update existing
          const idx = serverQuotes.findIndex(s => s.id === q.id);
          if (idx >= 0) {
            serverQuotes[idx] = { ...q, updatedAt: Date.now() };
            posted.push(serverQuotes[idx]);
          }
        } else {
          // new quote
          const newQuote = { ...q, id: nextId++, updatedAt: Date.now() };
          serverQuotes.push(newQuote);
          posted.push(newQuote);
        }
      });
      return JSON.parse(JSON.stringify(posted));
    }
  };
})();

// ---------------------
// Local Storage
// ---------------------
const LS_KEY = 'quotes';
let quotes = loadLocalQuotes();

function loadLocalQuotes() {
  const stored = localStorage.getItem(LS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalQuotes() {
  localStorage.setItem(LS_KEY, JSON.stringify(quotes));
}

// ---------------------
// DOM
// ---------------------
const quoteDisplay = document.getElementById('quoteDisplay');
const notificationsEl = document.getElementById('notifications');

function showRandomQuote() {
  if (!quotes.length) {
    quoteDisplay.textContent = "No quotes available.";
    return;
  }
  const idx = Math.floor(Math.random() * quotes.length);
  quoteDisplay.textContent = `"${quotes[idx].text}" (${quotes[idx].category})`;
}

// ---------------------
// Add Quote
// ---------------------
document.getElementById('addQuoteBtn').addEventListener('click', () => {
  const text = document.getElementById('newQuoteText').value.trim();
  const category = document.getElementById('newQuoteCategory').value.trim();
  if (!text || !category) return alert('Enter both quote and category.');

  // temp negative id for unsynced quote
  const tempId = (Math.min(0, ...quotes.map(q => q.id || 0))) - 1;
  quotes.push({ id: tempId, text, category, updatedAt: Date.now() });
  saveLocalQuotes();
  notify('Quote added locally.');
  document.getElementById('newQuoteText').value = '';
  document.getElementById('newQuoteCategory').value = '';
  showRandomQuote();
});

// ---------------------
// Notifications
// ---------------------
function notify(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  notificationsEl.appendChild(p);
  setTimeout(() => p.remove(), 5000);
}

// ---------------------
// Server Interaction
// ---------------------
async function fetchQuotesFromServer() {
  return await mockServer.fetchQuotes();
}

async function postQuotesToServer(quotesToPost) {
  return await mockServer.postQuotes(quotesToPost);
}

// ---------------------
// Sync function
// ---------------------
async function syncQuotes() {
  notify('Syncing with server...');
  const serverData = await fetchQuotesFromServer();

  // 1. Upload local unsynced quotes (negative IDs)
  const localUnsynced = quotes.filter(q => q.id <= 0);
  if (localUnsynced.length) {
    const posted = await postQuotesToServer(localUnsynced);
    posted.forEach((p, i) => {
      const idx = quotes.findIndex(q => q.id === localUnsynced[i].id);
      if (idx >= 0) quotes[idx] = p; // replace temp id with server-assigned id
    });
    notify(`Uploaded ${posted.length} local quote(s) to server.`);
  }

  // 2. Merge server quotes
  let conflicts = 0;
  serverData.forEach(s => {
    const local = quotes.find(q => q.id === s.id);
    if (!local) {
      quotes.push(s); // new from server
    } else if (local.text !== s.text || local.category !== s.category) {
      // conflict: server wins
      quotes[quotes.indexOf(local)] = s;
      conflicts++;
    }
  });

  saveLocalQuotes();
  showRandomQuote();
  if (conflicts > 0) notify(`${conflicts} conflict(s) resolved using server version.`);
  notify('Sync completed.');
}

// ---------------------
// Event listeners
// ---------------------
document.getElementById('newQuote').addEventListener('click', showRandomQuote);
document.getElementById('syncNow').addEventListener('click', syncQuotes);

// ---------------------
// Periodic sync every 10 seconds
// ---------------------
setInterval(syncQuotes, 10000);

// ---------------------
// Init
// ---------------------
window.onload = () => {
  showRandomQuote();
};
