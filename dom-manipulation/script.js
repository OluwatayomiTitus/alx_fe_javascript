/* Dynamic Quote Generator — Filtering Extension
   Adds: populateCategories(), filterQuotes(), and remembers selected filter.
*/

const LS_KEY = 'dynamic_quotes_v1';
const LS_FILTER = 'last_selected_category';
const SS_LAST_INDEX = 'last_viewed_quote_index';

// Default data
const DEFAULT_QUOTES = [
  { text: "The journey of a thousand miles begins with one step.", category: "Motivation" },
  { text: "Simplicity is the ultimate sophistication.", category: "Design" },
  { text: "Knowledge is power.", category: "Education" },
  { text: "Perfection is not attainable, but if we chase perfection we can catch excellence.", category: "Motivation" }
];

// Data and DOM references
let quotes = loadQuotes();
const quoteDisplay = document.getElementById('quoteDisplay');
const quoteMeta = document.getElementById('quoteMeta');
const newQuoteBtn = document.getElementById('newQuote');
const openAddFormBtn = document.getElementById('openAddForm');
const formContainer = document.getElementById('formContainer');
const exportBtn = document.getElementById('exportJson');
const importFileInput = document.getElementById('importFile');
const categoryFilter = document.getElementById('categoryFilter');

// ----------------- Storage helpers -----------------
function saveQuotes() {
  localStorage.setItem(LS_KEY, JSON.stringify(quotes));
}

function loadQuotes() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return DEFAULT_QUOTES.slice();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_QUOTES.slice();
  } catch {
    return DEFAULT_QUOTES.slice();
  }
}

function saveFilter(category) {
  localStorage.setItem(LS_FILTER, category);
}
function loadFilter() {
  return localStorage.getItem(LS_FILTER) || 'all';
}

// ----------------- Category Filtering -----------------

// Step 1: Populate dropdown dynamically from unique categories
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category || 'Uncategorized'))];
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Restore last selected category from storage
  const lastFilter = loadFilter();
  categoryFilter.value = lastFilter;
}

// Step 2: Filter quotes by category
function filterQuotes() {
  const selected = categoryFilter.value;
  saveFilter(selected);

  let filtered = quotes;
  if (selected !== 'all') {
    filtered = quotes.filter(q => q.category === selected);
  }

  if (!filtered.length) {
    quoteDisplay.textContent = 'No quotes in this category.';
    quoteMeta.textContent = '';
    return;
  }

  // Display a random quote from the filtered list
  const random = Math.floor(Math.random() * filtered.length);
  const q = filtered[random];
  quoteDisplay.innerHTML = `<p>"${q.text}"</p>`;
  quoteMeta.textContent = `Category: ${q.category}`;
}

// ----------------- Quote Display -----------------
function showRandomQuote() {
  filterQuotes(); // respects the selected category
}

// ----------------- Add Quote -----------------
function createAddQuoteForm() {
  formContainer.innerHTML = '';

  const textInput = document.createElement('input');
  textInput.placeholder = 'Enter a new quote';
  textInput.id = 'newQuoteText';
  textInput.style.display = 'block';

  const categoryInput = document.createElement('input');
  categoryInput.placeholder = 'Enter category';
  categoryInput.id = 'newQuoteCategory';
  categoryInput.style.display = 'block';

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Quote';
  addBtn.type = 'button';
  addBtn.onclick = () => addQuote(textInput, categoryInput);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => formContainer.innerHTML = '';

  formContainer.append(textInput, categoryInput, addBtn, cancelBtn);
}

function addQuote(textEl, catEl) {
  const text = textEl.value.trim();
  const category = catEl.value.trim() || 'Uncategorized';
  if (!text) return alert('Please enter a quote.');

  quotes.push({ text, category });
  saveQuotes();
  populateCategories(); // refresh dropdown if a new category was added
  alert('Quote added successfully!');
  formContainer.innerHTML = '';
  filterQuotes(); // refresh display
}

// ----------------- JSON Export / Import -----------------
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quotes.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        quotes.push(...imported);
        saveQuotes();
        populateCategories();
        alert('Quotes imported!');
      }
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

// ----------------- Init -----------------
newQuoteBtn.addEventListener('click', showRandomQuote);
openAddFormBtn.addEventListener('click', createAddQuoteForm);
exportBtn.addEventListener('click', exportToJsonFile);
importFileInput.addEventListener('change', e => importFromJsonFile(e.target.files[0]));

(function init() {
  populateCategories();
  filterQuotes(); // show based on saved category
})();
