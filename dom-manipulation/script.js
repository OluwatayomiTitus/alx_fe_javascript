// Step 2.1 — Manage an array of quote objects
let quotes = [
  { text: "The journey of a thousand miles begins with one step.", category: "Motivation" },
  { text: "Simplicity is the ultimate sophistication.", category: "Design" },
  { text: "Knowledge is power.", category: "Education" }
];

// Step 2.2 — Function to display a random quote
function showRandomQuote() {
  // Get a random quote from the array
  let randomIndex = Math.floor(Math.random() * quotes.length);
  let randomQuote = quotes[randomIndex];

  // Get the quote display div
  let quoteDisplay = document.getElementById("quoteDisplay");

  // Update its content
  quoteDisplay.innerHTML = `
    <p>"${randomQuote.text}"</p>
    <small>Category: ${randomQuote.category}</small>
  `;
}

// Step 2.3 — Function to create the add-quote form dynamically
function createAddQuoteForm() {
  // Get container where form will be inserted
  let formContainer = document.getElementById("formContainer");

  // Create form elements
  let quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.placeholder = "Enter a new quote";

  let categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.placeholder = "Enter quote category";

  let addButton = document.createElement("button");
  addButton.textContent = "Add Quote";

  // When the button is clicked, call addQuote()
  addButton.addEventListener("click", addQuote);

  // Add all elements to the container
  formContainer.appendChild(quoteInput);
  formContainer.appendChild(categoryInput);
  formContainer.appendChild(addButton);
}

// Step 2.4 — Function to handle adding new quotes dynamically
function addQuote() {
  // Get values from inputs
  let text = document.getElementById("newQuoteText").value;
  let category = document.getElementById("newQuoteCategory").value;

  // Add to the array
  quotes.push({ text: text, category: category });

  // Update the DOM with confirmation
  let quoteDisplay = document.getElementById("quoteDisplay");
  quoteDisplay.innerHTML = `
    <p>New quote added successfully!</p>
  `;

  // Clear input fields
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
}

// Step 2.5 — Add event listeners for interactivity
document.getElementById("newQuote").addEventListener("click", showRandomQuote);

// Call this once to create the form when the page loads
createAddQuoteForm();
