/**
 * Vercel Serverless Function: /api/search
 * Performs web scraping for product reviews via DuckDuckGo/Bing.
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

    let reviews = await searchDuckDuckGo(query, productName);

    if (reviews.length === 0) {
      reviews = await searchBing(query, productName);
    }

    res.status(200).json({
      reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error('[Search Error]', error.message);
    res.status(500).json({ error: '検索中にエラーが発生しました', details: error.message });
  }
}

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

  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const reviews = [];
  let id = 1;

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

  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const reviews = [];
  let id = 1;

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
