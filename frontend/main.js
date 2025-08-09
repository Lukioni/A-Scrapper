const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const elKeyword = document.getElementById("keyword");
const elBtn = document.getElementById("searchBtn");
const elStatus = document.getElementById("status");
const elResults = document.getElementById("results");

function setStatus(msg, type = "info") {
  elStatus.textContent = msg;
  elStatus.className = `status ${type}`;
  if (!msg) {
    elStatus.classList.add("hidden");
  } else {
    elStatus.classList.remove("hidden");
  }
}

function cardTpl(item) {
  const reviews = item.reviewsCount != null ? `${item.reviewsCount.toLocaleString()} reviews` : "No reviews";
  const rating = item.rating != null ? `${item.rating} ★ / 5` : "—";
  const url = item.url ? `<a href="${item.url}" target="_blank" rel="noreferrer">Open</a>` : "";
  return `
    <article class="card">
      <img src="${item.image}" alt="${item.title}" loading="lazy"/>
      <div class="content">
        <h3 title="${item.title}">${item.title}</h3>
        <p class="meta"><span>${rating}</span> · <span>${reviews}</span></p>
        <div class="actions">${url}</div>
      </div>
    </article>
  `;
}

async function search() {
  const keyword = elKeyword.value.trim();
  if (!keyword) {
    setStatus("Please enter a keyword.", "warn");
    return;
  }

  setStatus("Searching…", "info");
  elResults.innerHTML = "";
  try {
    const res = await fetch(`${API_BASE}/api/scrape?keyword=${encodeURIComponent(keyword)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();

    if (!data.results?.length) {
      setStatus("No results found or blocked by Amazon.", "warn");
      return;
    }

    setStatus(`Found ${data.count} results for "${data.keyword}"`, "success");
    elResults.innerHTML = data.results.map(cardTpl).join("");
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`, "error");
  }
}

elBtn.addEventListener("click", search);
elKeyword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});