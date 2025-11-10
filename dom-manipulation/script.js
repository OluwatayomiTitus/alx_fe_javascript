// Array of quotes
let quotes = [
  { text: "The journey of a thousand miles begins with one step.", category: "Motivation" },
  { text: "Simplicity is the ultimate sophistication.", category: "Design" },
  { text: "Knowledge is power.", category: "Education" },
  { text: "Perfection is not attainable, but if we chase perfection we can catch excellence.", category: "Motivation" }
];

// Display quote
function showRandomQuote() {
  const filteredQuotes = getFilteredQuotes();
  if (filteredQuotes.length === 0) {
    document.getElementById("quoteDisplay").innerText = "No quotes available for this category.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  document.getElementById("quoteDisplay").innerText = filteredQuotes[randomIndex].text;
}

// Add quote dynamically
function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();

  if (text === "" || category === "") {
    alert("Please enter both a quote and a category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories(); // update dropdown if new category added
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  alert("Quote added successfully!");
}

// ---------------------
// Category Filtering
// ---------------------

// Populate dropdown dynamically from unique categories
function populateCategories() {
  const select = document.getElementById("categoryFilter");

  // extract unique categories
  const categories = [...new Set(quotes.map(q => q.category))];

  // clear existing options
  select.innerHTML = '<option value="all">All Categories</option>';

  // add each category as option
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });

  // restore last selected category
  const savedCategory = localStorage.getItem("selectedCategory");
  if (savedCategory) {
    select.value = savedCategory;
  }
}

// Get quotes filtered by category
function getFilteredQuotes() {
  const selectedCategory = document.getElementById("categoryFilter").value;
  if (selectedCategory === "all") return quotes;
  return quotes.filter(q => q.category === selectedCategory);
}

// Filter quotes and update display
function filterQuotes() {
  const selectedCategory = document.getElementById("categoryFilter").value;
  localStorage.setItem("selectedCategory", selectedCategory); // save selected category
  showRandomQuote();
}

// ---------------------
// Local Storage Handling
// ---------------------

function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  const storedQuotes = localStorage.getItem("quotes");
  if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
  }
}

// ---------------------
// Initialization
// ---------------------
document.getElementById("newQuote").addEventListener("click", showRandomQuote);

window.onload = function() {
  loadQuotes();
  populateCategories(); // must exist
  filterQuotes();       // shows initial quote for selected category
};
