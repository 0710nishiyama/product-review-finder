/**
 * Proxy Server for Product Review Finder
 * Provides a backend endpoint that performs web scraping for product reviews,
 * bypassing browser CORS restrictions.
 * 
 * Uses DuckDuckGo HTML search as the search backend.
 * 
 * Usage: node server.mjs
 * Runs on port 3001
 */

import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * Search for product reviews by scraping DuckDuckGo search results.
 * POST /api/search
 * Body: { productName: string, genre?: string, productUrl?: string }
 */
app.post('/api/search', async (req, res) => {
  try {
    const { productName, genre, productUrl } = req.body;

    if (!productName || productName.trim().length === 0) {
      return res.status(400).json({ error: '商品名が必要です' });
    }

    // Build search query
    let query = `${productName} レビュー 評価`;
    if (genre) {
      query += ` ${genre}`;
    }

    console.log(`[Search] Query: "${query}"`);

    // Try DuckDuckGo first, then fallback
    let reviews = await searchDuckDuckGo(query, productName);
    
    if (reviews.length === 0) {
      console.log('[Search] DuckDuckGo returned 0 results, trying Bing...');
      reviews = await searchBing(query, productName);
    }

    console.log(`[Search] Found ${reviews.length} reviews`);

    res.json({
      reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error('[Search Error]', error.message);
    res.status(500).json({ error: '検索中にエラーが発生しました', details: error.message });
  }
});

/**
 * Search DuckDuckGo HTML version and extract results.
 */
async function searchDuckDuckGo(query, productName) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    console.log(`[DuckDuckGo] HTTP ${response.status}`);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const reviews = [];
  let id = 1;

  // DuckDuckGo HTML results structure
  $('.result, .results_links').each((_, element) => {
    if (reviews.length >= 50) return false;

    const titleEl = $(element).find('.result__title a, .result__a').first();
    const snippetEl = $(element).find('.result__snippet').first();
    const urlEl = $(element).find('.result__url').first();

    const title = titleEl.text().trim();
    const link = titleEl.attr('href') || '';
    const snippet = snippetEl.text().trim();
    const displayUrl = urlEl.text().trim();

    if (title && snippet) {
      // Extract actual URL from DuckDuckGo redirect
      let actualUrl = link;
      if (link.includes('uddg=')) {
        try {
          const urlParam = new URL(link, 'https://duckduckgo.com');
          actualUrl = urlParam.searchParams.get('uddg') || link;
        } catch {
          actualUrl = link;
        }
      }
      if (!actualUrl.startsWith('http')) {
        actualUrl = `https://${displayUrl || 'example.com'}`;
      }

      // Try to extract rating from snippet
      const rating = extractRating(snippet + ' ' + title);

      reviews.push({
        id: `review-${id++}`,
        title: title.slice(0, 200),
        rating,
        summary: snippet.slice(0, 1000),
        url: actualUrl,
      });
    }
  });

  return reviews;
}

/**
 * Search Bing and extract results as fallback.
 */
async function searchBing(query, productName) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.bing.com/search?q=${encodedQuery}&count=20&setlang=ja`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    console.log(`[Bing] HTTP ${response.status}`);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const reviews = [];
  let id = 1;

  // Bing search results structure
  $('li.b_algo').each((_, element) => {
    if (reviews.length >= 50) return false;

    const titleEl = $(element).find('h2 a').first();
    const snippetEl = $(element).find('.b_caption p, .b_algoSlug').first();

    const title = titleEl.text().trim();
    const link = titleEl.attr('href') || '';
    const snippet = snippetEl.text().trim();

    if (title && link && snippet) {
      const rating = extractRating(snippet + ' ' + title);

      reviews.push({
        id: `review-${id++}`,
        title: title.slice(0, 200),
        rating,
        summary: snippet.slice(0, 1000),
        url: link,
      });
    }
  });

  return reviews;
}

/**
 * Extract a rating value from text content.
 * Looks for patterns like "4.5/5", "★4.5", "4.5点", "80点" etc.
 */
function extractRating(text) {
  // Pattern: X/5 or X／5
  const fiveScaleMatch = text.match(/(\d+\.?\d*)\s*[\/／]\s*5/);
  if (fiveScaleMatch) {
    const val = parseFloat(fiveScaleMatch[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
  }

  // Pattern: ★X.X or ☆X.X
  const starMatch = text.match(/[★☆]\s*(\d+\.?\d*)/);
  if (starMatch) {
    const val = parseFloat(starMatch[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
  }

  // Pattern: X.X点 (out of 5)
  const pointMatch = text.match(/(\d+\.?\d*)\s*点/);
  if (pointMatch) {
    const val = parseFloat(pointMatch[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
    if (val > 5 && val <= 100) return Math.round((val / 20) * 10) / 10;
  }

  // Pattern: X.X/10
  const tenScaleMatch = text.match(/(\d+\.?\d*)\s*[\/／]\s*10/);
  if (tenScaleMatch) {
    const val = parseFloat(tenScaleMatch[1]);
    if (val >= 0 && val <= 10) return Math.round((val / 2) * 10) / 10;
  }

  // Default rating
  return 3.5;
}

app.listen(PORT, () => {
  console.log(`\n🚀 Review Finder Proxy Server running at http://localhost:${PORT}`);
  console.log(`   POST /api/search - Search for product reviews\n`);
});
