/**
 * Vercel Serverless Function: /api/search
 * Performs web search for product reviews using DuckDuckGo Lite.
 * DuckDuckGo Lite works reliably from server environments without bot blocking.
 */

import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productName, genre } = req.body;

    if (!productName || productName.trim().length === 0) {
      return res.status(400).json({ error: '商品名が必要です' });
    }

    let query = `${productName} レビュー 評価`;
    if (genre) {
      query += ` ${genre}`;
    }

    const reviews = await searchDuckDuckGoLite(query, productName);

    res.status(200).json({
      reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error('[Search Error]', error.message);
    res.status(500).json({ error: '検索中にエラーが発生しました', details: error.message });
  }
}

/**
 * Search using DuckDuckGo Lite (works from server environments).
 * Parses the table-based HTML structure of lite.duckduckgo.com.
 */
async function searchDuckDuckGoLite(query, productName) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error(`[DuckDuckGo Lite] HTTP ${response.status}`);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const reviews = [];
  let id = 1;

  // DuckDuckGo Lite uses table rows with specific classes
  const links = $('a.result-link');
  const snippets = $('td.result-snippet');

  const count = Math.min(links.length, snippets.length, 50);

  for (let i = 0; i < count; i++) {
    const linkEl = $(links[i]);
    const snippetEl = $(snippets[i]);

    const title = linkEl.text().trim();
    let link = linkEl.attr('href') || '';
    const snippet = snippetEl.text().trim();

    if (!title || !snippet) continue;

    // Extract actual URL from DuckDuckGo redirect
    if (link.includes('uddg=')) {
      try {
        const fullUrl = link.startsWith('//') ? `https:${link}` : link;
        const urlObj = new URL(fullUrl);
        link = urlObj.searchParams.get('uddg') || link;
      } catch {
        // Keep original link
      }
    }

    if (!link.startsWith('http')) {
      link = `https://example.com`;
    }

    reviews.push({
      id: `review-${id++}`,
      title: title.slice(0, 200),
      rating: extractRating(snippet + ' ' + title),
      summary: snippet.slice(0, 1000),
      url: link,
    });
  }

  return reviews;
}

/**
 * Extract a rating value from text content.
 */
function extractRating(text) {
  const fiveScaleMatch = text.match(/(\d+\.?\d*)\s*[\/／]\s*5/);
  if (fiveScaleMatch) {
    const val = parseFloat(fiveScaleMatch[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
  }

  const starMatch = text.match(/[★☆]\s*(\d+\.?\d*)/);
  if (starMatch) {
    const val = parseFloat(starMatch[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
  }

  const pointMatch = text.match(/(\d+\.?\d*)\s*点/);
  if (pointMatch) {
    const val = parseFloat(pointMatch[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
    if (val > 5 && val <= 100) return Math.round((val / 20) * 10) / 10;
  }

  const tenScaleMatch = text.match(/(\d+\.?\d*)\s*[\/／]\s*10/);
  if (tenScaleMatch) {
    const val = parseFloat(tenScaleMatch[1]);
    if (val >= 0 && val <= 10) return Math.round((val / 2) * 10) / 10;
  }

  return 3.5;
}
