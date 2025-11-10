/* script.js
  - stores quotes in localStorage
  - uses sessionStorage to remember last viewed quote index
  - supports JSON export and import
  - provides 3 core functions required: showRandomQuote, createAddQuoteForm, addQuote
*/

// STORAGE KEYS
const LS_KEY = 'dynamic_quotes_v1';
const SS_LAST_INDEX = 'last_viewed_quote_index';

// Default quotes (used only when nothing in localStorage)
const DEFAULT_QUOTES = [
  { text: "The journey of a thousand miles begins with one step.", category: "Motivation" },
  { text: "Simplicity is the ultimate sophistication.", category: "Design" },
  { text: "Knowledge is power.", category: "Education" }
];

// In-memory array
let quotes = loadQuotes();

// DOM refs
const quoteDisplay = document.getElementById('quoteDisplay');
const quoteMeta = document.getElementById('quoteMeta');
const newQuoteBtn = document.getElementById('newQuote');
const openAddFormBtn = document.getElementById('openAddForm');
const formContainer = document.getElementById('formContainer');
const exportBtn = document.getElementById('exportJson');
const importFileInput = document.getElementById('importFile');

// ----------------- Storage helpers -----------------
function saveQuotes() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error('Could not save to localStorage', e);
  }
}

function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_QUOTES.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_QUOTES.slice();
    return parsed;
  } catch (e) {
    console.warn('Load failed — using defaults', e);
    return DEFAULT_QUOTES.slice();
  }
}

// sessionStorage helpers (store index of last shown quote)
function saveLastViewedIndex(idx) {
  try {
    sessionStorage.setItem(SS_LAST_INDEX, String(idx));
  } catch (e) { /* ignore */ }
}
function getLastViewedIndex() {
  const v = sessionStorage.getItem(SS_LAST_INDEX);
  return v === null ? null : Number(v);
}

// ----------------- Core functions -----------------

// showRandomQuote — display a random quote; saves last index to sessionStorage
function showRandomQuote() {
  if (!quotes.length) {
    quoteDisplay.textContent = 'No quotes available.';
    quoteMeta.textContent = '';
    return;
  }
  const index = Math.floor(Math.random() * quotes.length);
  const q = quotes[index];

  // update DOM (simple)
  quoteDisplay.innerHTML = `<p>"${q.text}"</p>`;
  quoteMeta.textContent = `Category: ${q.category || 'Uncategorized'}`;

  // remember the index for this session
  saveLastViewedIndex(index);
}

// createAddQuoteForm — dynamically create the form in the formContainer
function createAddQuoteForm() {
  formContainer.innerHTML = ''; // clear any existing form

  const textInput = document.createElement('input');
  textInput.id = 'newQuoteText';
  textInput.placeholder = 'Enter a new quote';
  textInput.style.display = 'block';

  const categoryInput = document.createElement('input');
  categoryInput.id = 'newQuoteCategory';
  categoryInput.placeholder = 'Enter quote category';
  categoryInput.style.display = 'block';

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Quote';
  addBtn.type = 'button';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.type = 'button';

  // wire events
  addBtn.addEventListener('click', () => addQuote(textInput, categoryInput));
  cancelBtn.addEventListener('click', () => formContainer.innerHTML = '');

  // append
  formContainer.appendChild(textInput);
  formContainer.appendChild(categoryInput);
  formContainer.appendChild(addBtn);
  formContainer.appendChild(cancelBtn);
}

// addQuote — read inputs, update array & localStorage, update DOM
function addQuote(textInputElem, catInputElem) {
  const text = (textInputElem.value || '').trim();
  const category = (catInputElem.value || '').trim() || 'Uncategorized';

  if (!text) {
    alert('Please enter quote text.');
    textInputElem.focus();
    return;
  }

  // push to in-memory array
  const newObj = { text: text, category: category };
  quotes.push(newObj);

  // persist
  saveQuotes();

  // immediate feedback: show the added quote
  quoteDisplay.innerHTML = `<p>Added: "${newObj.text}"</p>`;
  quoteMeta.textContent = `Category: ${newObj.category}`;

  // clear inputs
  textInputElem.value = '';
  catInputElem.value = '';
}

// ----------------- JSON Export / Import -----------------

function exportToJsonFile() {
  try {
    const jsonStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // filename with date-time so it's unique
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `quotes-${now}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Export failed. See console for details.');
    console.error(e);
  }
}

function importFromJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!Array.isArray(parsed)) {
        alert('Imported JSON must be an array of quote objects.');
        return;
      }

      // Validate each entry has text (string) and category (string)
      const valid = [];
      for (const item of parsed) {
        if (item && typeof item.text === 'string') {
          valid.push({
            text: item.text,
            category: typeof item.category === 'string' ? item.category : 'Uncategorized'
          });
        }
      }

      if (!valid.length) {
        alert('No valid quotes found in file.');
        return;
      }

      // Merge: append imported quotes to existing array
      quotes.push(...valid);
      saveQuotes();
      alert(`Imported ${valid.length} quotes successfully.`);
    } catch (e) {
      alert('Failed to parse JSON file. Ensure it is valid JSON.');
      console.error(e);
    }
  };
  reader.onerror = function() {
    alert('Failed to read file.');
  };
  reader.readAsText(file);
}

// ----------------- Initialization & Event wiring -----------------

// Buttons
newQuoteBtn.addEventListener('click', showRandomQuote);
openAddFormBtn.addEventListener('click', () => {
  // toggle form visibility
  if (formContainer.childElementCount) formContainer.innerHTML = '';
  else createAddQuoteForm();
});
exportBtn.addEventListener('click', exportToJsonFile);

// File input change event -> import
importFileInput.addEventListener('change', (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  importFromJsonFile(f);
  // reset input so same file can be selected again if needed
  importFileInput.value = '';
});

// On load: if sessionStorage has last viewed, display it; otherwise show a random quote
(function init() {
  const lastIdx = getLastViewedIndex();
  if (lastIdx !== null && quotes[lastIdx]) {
    const q = quotes[lastIdx];
    quoteDisplay.innerHTML = `<p>"${q.text}"</p>`;
    quoteMeta.textContent = `Category: ${q.category || 'Uncategorized'} (restored from session)`;
  } else {
    // show a random one to begin
    showRandomQuote();
  }
})();
