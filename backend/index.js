// Backend server using Express on Bun
// Endpoint: GET /api/scrape?keyword=...
// Scrapes the first page of Amazon search results and returns JSON

import express from "express";
import cors from "cors";
import axios from "axios";
import { JSDOM } from "jsdom";

const app = express();
app.use(cors());

// Helpers
const AMZ_DOMAIN = process.env.AMZ_DOMAIN || "www.amazon.com"; // change to www.amazon.com.br if needed
const BASE_URL = `https://${AMZ_DOMAIN}/s`;

function buildSearchUrl(keyword) {
  const params = new URLSearchParams({ k: keyword });
  return `${BASE_URL}?${params.toString()}`;
}

function parseResults(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Each product card lives under a result item
  const items = [...doc.querySelectorAll("div.s-result-item[data-asin]")];

  const data = items.map((el) => {
    // Title
    const titleEl = el.querySelector("h2 a span");
    const title = titleEl?.textContent?.trim() || null;

    // Rating text like "4.6 out of 5 stars"
    const ratingText = el.querySelector("span.a-icon-alt")?.textContent || null;
    let rating = null;
    if (ratingText) {
      const m = ratingText.match(/([0-9]+(?:\.[0-9]+)?)\s+out of 5/);
      rating = m ? parseFloat(m[1]) : null;
    }

    // Number of reviews (ratings count). Amazon uses a few variants; try common ones.
    const reviewsText =
      el.querySelector("span[aria-label$='ratings']")?.getAttribute("aria-label") ||
      el.querySelector("span[aria-label$='rating']")?.getAttribute("aria-label") ||
      el.querySelector("span.a-size-base.s-underline-text")?.textContent ||
      null;
    let reviewsCount = null;
    if (reviewsText) {
      // Remove commas/periods depending on locale
      const numeric = reviewsText.replace(/[^0-9]/g, "");
      reviewsCount = numeric ? parseInt(numeric, 10) : null;
    }

    // Image URL
    const img = el.querySelector("img.s-image");
    const image = img?.getAttribute("src") || img?.getAttribute("data-src") || null;

    // Product URL (optional, useful for debugging)
    const link = el.querySelector("h2 a")?.getAttribute("href") || null;
    const url = link ? `https://${AMZ_DOMAIN}${link}` : null;

    return { title, rating, reviewsCount, image, url };
  })
  // Filter out entries that are clearly not products (ads or empty)
  .filter((p) => p.title && p.image);

  return data;
}

app.get("/api/scrape", async (req, res) => {
  try {
    const keyword = (req.query.keyword || "").toString().trim();
    if (!keyword) {
      return res.status(400).json({ error: "Missing 'keyword' query parameter" });
    }

    const url = buildSearchUrl(keyword);

    const response = await axios.get(url, {
      // Amazon is picky; send browser-like headers to reduce blocks
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // Timeout & validate status
      timeout: 20000,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const results = parseResults(response.data);
    return res.json({ keyword, count: results.length, results });
  } catch (err) {
    console.error("/api/scrape error:", err?.message);
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: "Failed to scrape Amazon.",
      detail: err?.message || "Unknown error",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✔ Server running on http://localhost:${PORT}  (domain: ${AMZ_DOMAIN})`);
});