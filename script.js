// Add your catalog entries into this array following the template structure below
const catalog = [
  /*
  { 
    id: "EXAMPLE_ID.xml", 
    title: "", 
    author: "", 
    category: "", 
    access: "" 
  }
  */
];

let currentCategory = "All";
let activeRawXml = "";
let xmlDocCache = null;
const grid = document.getElementById('book-grid');

// Fetch external library.xml file on application initialization
async function loadXmlDatabase() {
  try {
    const response = await fetch('library.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    xmlDocCache = parser.parseFromString(xmlText, "text/xml");
  } catch (err) {
    console.error("Failed to load library.xml:", err);
  }
}

function renderCards(items) {
  grid.innerHTML = "";
  document.getElementById('record-count').textContent = `${items.length} Records Loaded`;

  if (items.length === 0) {
    grid.innerHTML = `<div class="no-results"><h3>No matching records found</h3><p>Try resetting your search query or selected category filter.</p></div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openDetailModal(item.id);

    card.innerHTML = `
      <div>
        <span class="card-category-badge">${item.category || 'Uncategorized'}</span>
        <h2 class="card-title">${item.title || 'Untitled'}</h2>
        <p class="card-author">${item.author || 'Unknown Author'}</p>
      </div>
      <div class="card-footer">
        <span>View Record</span>
        <span>&rarr;</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function setViewMode(mode) {
  document.getElementById('grid-view-btn').classList.toggle('active', mode === 'grid');
  document.getElementById('list-view-btn').classList.toggle('active', mode === 'list');
  grid.className = `catalog-layout ${mode}`;
}

function filterCategory(cat, element) {
  currentCategory = cat;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  element.classList.add('active');
  filterCatalog();
}

function filterCatalog() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();

  const filtered = catalog.filter(item => {
    const matchCategory = (currentCategory === "All") || 
                          (currentCategory === "Open Access" && item.access === "Open Access") ||
                          (currentCategory === "Restricted" && item.access === "Restricted") ||
                          (item.category === currentCategory);

    const textContent = `${item.title} ${item.author} ${item.id} ${item.category}`.toLowerCase();
    const matchSearch = evaluateBooleanSearch(query, textContent);

    return matchCategory && matchSearch;
  });

  renderCards(filtered);
}

function evaluateBooleanSearch(query, text) {
  if (!query) return true;
  const notParts = query.split(/\bNOT\b/i);
  const positiveQuery = notParts[0];
  const negativeQueries = notParts.slice(1);

  for (let neg of negativeQueries) {
    const term = neg.trim().toLowerCase();
    if (term && text.includes(term)) return false;
  }

  const orParts = positiveQuery.split(/\bOR\b/i);
  return orParts.some(orTerm => {
    const andTerms = orTerm.split(/\bAND\b/i);
    return andTerms.every(andTerm => {
      const cleanTerm = andTerm.trim().toLowerCase();
      return cleanTerm === "" || text.includes(cleanTerm);
    });
  });
}

function getRecordNode(filename) {
  if (!xmlDocCache) return null;
  const records = xmlDocCache.getElementsByTagName("record");
  for (let r of records) {
    if (r.getAttribute("id") === filename) return r;
  }
  return null;
}

function openDetailModal(filename) {
  const modal = document.getElementById('detail-modal');
  const modalTitle = document.getElementById('modal-title');
  const xmlBox = document.getElementById('modal-xml-text');
  const metaGrid = document.getElementById('modal-meta');
  const xmlContainer = document.getElementById('xml-container');
  const toggleBtn = document.getElementById('toggle-xml-btn');

  xmlContainer.classList.remove('active');
  toggleBtn.textContent = 'Show XML Code';

  const recordNode = getRecordNode(filename);
  activeRawXml = recordNode ? new XMLSerializer().serializeToString(recordNode) : '';
  xmlBox.textContent = activeRawXml;

  const getTag = (name) => {
    if (!recordNode) return '';
    let el = recordNode.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", name)[0] 
          || recordNode.getElementsByTagName("dc:" + name)[0] 
          || recordNode.getElementsByTagName(name)[0];
    return el ? el.textContent.trim() : '';
  };

  modalTitle.textContent = getTag("title") || filename;
  metaGrid.innerHTML = '';

  // Maps all requested Dublin Core metadata elements into the modal view
  const metaFields = [
    { label: "Title", value: getTag("title") },
    { label: "Creator", value: getTag("creator") },
    { label: "Subject", value: getTag("subject") },
    { label: "Description", value: getTag("description") },
    { label: "Publisher", value: getTag("publisher") },
    { label: "Contributor", value: getTag("contributor") },
    { label: "Date", value: getTag("date") },
    { label: "Type", value: getTag("type") },
    { label: "Format", value: getTag("format") },
    { label: "Identifier", value: getTag("identifier") },
    { label: "Relation", value: getTag("relation") },
    { label: "Rights", value: getTag("rights") }
  ];

  metaFields.forEach(field => {
    if (field.value) {
      const item = document.createElement('div');
      item.className = 'meta-item';
      item.innerHTML = `<label>${field.label}</label><span>${field.value}</span>`;
      metaGrid.appendChild(item);
    }
  });

  modal.classList.add('active');
}

function viewFullXmlArchive() {
  if (!xmlDocCache) return;
  const fullXml = new XMLSerializer().serializeToString(xmlDocCache);

  activeRawXml = fullXml;
  document.getElementById('modal-title').textContent = "Full Catalog XML Archive";
  document.getElementById('modal-meta').innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted);">Compiled Dublin Core XML database for Silliman University College of Computer Studies Information Resource Center.</p>`;
  document.getElementById('modal-xml-text').textContent = fullXml;
  document.getElementById('xml-container').classList.add('active');
  document.getElementById('toggle-xml-btn').textContent = 'Hide XML Code';
  document.getElementById('detail-modal').classList.add('active');
}

function toggleXmlView() {
  const xmlContainer = document.getElementById('xml-container');
  const toggleBtn = document.getElementById('toggle-xml-btn');
  
  if (xmlContainer.classList.contains('active')) {
    xmlContainer.classList.remove('active');
    toggleBtn.textContent = 'Show XML Code';
  } else {
    xmlContainer.classList.add('active');
    toggleBtn.textContent = 'Hide XML Code';
  }
}

function copyXmlCode() {
  if (!activeRawXml) return;
  navigator.clipboard.writeText(activeRawXml).then(() => {
    const toast = document.getElementById('toast');
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
  });
}

function closeModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

document.getElementById('detail-modal').addEventListener('click', (e) => {
  if (e.target.id === 'detail-modal') closeModal();
});

// Initialization
loadXmlDatabase().then(() => {
  renderCards(catalog);
});