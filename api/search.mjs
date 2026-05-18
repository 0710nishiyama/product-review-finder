/**
 * Vercel Serverless Function: /api/search
 * Performs web search for product reviews using DuckDuckGo Lite.
 * Uses regex-based HTML parsing (no external dependencies for Edge compatibility).
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders,
    });
  }

  try {
    const { productName, genre } = await req.json();

    if (!productName || productName.trim().length === 0) {
      return new Response(JSON.stringify({ error: '商品名が必要です' }), {
        status: 400, headers: corsHeaders,
      });
    }

    let query = `${productName} レビュー 評価`;
    if (genre) query += ` ${genre}`;

    let reviews = await searchDuckDuckGoLite(query);

    if (reviews.length === 0) {
      reviews = await searchDuckDuckGoHTML(query);
    }

    return new Response(JSON.stringify({ reviews, total: reviews.length }), {
      status: 200, headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '検索中にエラーが発生しました', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Search DuckDuckGo Lite and parse results with regex.
 */
async function searchDuckDuckGoLite(query) {
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return [];
    const html = await response.text();
    return parseDuckDuckGoLite(html);
  } catch {
    return [];
  }
}

/**
 * Search DuckDuckGo HTML version as fallback.
 */
async function searchDuckDuckGoHTML(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return [];
    const html = await response.text();
    return parseDuckDuckGoHTML(html);
  } catch {
    return [];
  }
}

/**
 * Parse DuckDuckGo Lite HTML results using regex.
 * Structure: <a class='result-link' href="...">Title</a> ... <td class='result-snippet'>Snippet</td>
 */
function parseDuckDuckGoLite(html) {
  const reviews = [];
  let id = 1;

  // Extract result links
  const linkRegex = /<a[^>]*class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

  const links = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push({ href: match[1], title: stripHtml(match[2]).trim() });
  }

  const snippets = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(stripHtml(match[1]).trim());
  }

  const count = Math.min(links.length, snippets.length, 50);
  for (let i = 0; i < count; i++) {
    const { href, title } = links[i];
    const snippet = snippets[i];

    if (!title || !snippet) continue;

    let url = extractUrl(href);

    reviews.push({
      id: `review-${id++}`,
      title: title.slice(0, 200),
      rating: extractRating(snippet + ' ' + title),
      summary: snippet.slice(0, 1000),
      url,
    });
  }

  return reviews;
}

/**
 * Parse DuckDuckGo HTML version results.
 */
function parseDuckDuckGoHTML(html) {
  const reviews = [];
  let id = 1;

  // Match result blocks: <a class="result__a" href="...">Title</a> ... <a class="result__snippet">Snippet</a>
  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = resultRegex.exec(html)) !== null && reviews.length < 50) {
    const href = match[1];
    const title = stripHtml(match[2]).trim();
    const snippet = stripHtml(match[3]).trim();

    if (!title || !snippet) continue;

    let url = extractUrl(href);

    reviews.push({
      id: `review-${id++}`,
      title: title.slice(0, 200),
      rating: extractRating(snippet + ' ' + title),
      summary: snippet.slice(0, 1000),
      url,
    });
  }

  return reviews;
}

/**
 * Extract actual URL from DuckDuckGo redirect link.
 */
function extractUrl(href) {
  let url = href;

  // Decode HTML entities
  url = url.replace(/&amp;/g, '&');

  if (url.includes('uddg=')) {
    try {
      const fullUrl = url.startsWith('//') ? `https:${url}` : url;
      const urlObj = new URL(fullUrl);
      url = urlObj.searchParams.get('uddg') || url;
    } catch {
      // Keep original
    }
  }

  if (!url.startsWith('http')) {
    url = 'https://example.com';
  }

  return decodeURIComponent(url);
}

/**
 * Strip HTML tags and decode entities.
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract rating from text.
 */
function extractRating(text) {
  const fiveScale = text.match(/(\d+\.?\d*)\s*[\/／]\s*5/);
  if (fiveScale) {
    const val = parseFloat(fiveScale[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
  }

  const star = text.match(/[★☆]\s*(\d+\.?\d*)/);
  if (star) {
    const val = parseFloat(star[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
  }

  const point = text.match(/(\d+\.?\d*)\s*点/);
  if (point) {
    const val = parseFloat(point[1]);
    if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
    if (val > 5 && val <= 100) return Math.round((val / 20) * 10) / 10;
  }

  return 3.5;
}
