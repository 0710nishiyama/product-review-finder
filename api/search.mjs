/**
 * Vercel Edge Function: /api/search
 * Searches for product reviews using multiple backends.
 * Returns debug info to help diagnose connectivity issues.
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

    const debug = [];

    // Try DuckDuckGo Lite
    let reviews = [];
    try {
      const ddgResult = await fetchWithDebug(
        `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html',
          },
        }
      );
      debug.push(`DDG Lite: status=${ddgResult.status}, length=${ddgResult.text.length}`);
      if (ddgResult.status === 200) {
        reviews = parseDuckDuckGoLite(ddgResult.text);
        debug.push(`DDG Lite parsed: ${reviews.length} results`);
      }
    } catch (e) {
      debug.push(`DDG Lite error: ${e.message}`);
    }

    // Try DuckDuckGo HTML if Lite failed
    if (reviews.length === 0) {
      try {
        const ddgHtml = await fetchWithDebug(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html',
            },
          }
        );
        debug.push(`DDG HTML: status=${ddgHtml.status}, length=${ddgHtml.text.length}`);
        if (ddgHtml.status === 200) {
          reviews = parseDuckDuckGoHTML(ddgHtml.text);
          debug.push(`DDG HTML parsed: ${reviews.length} results`);
        }
      } catch (e) {
        debug.push(`DDG HTML error: ${e.message}`);
      }
    }

    // Try Bing as last resort
    if (reviews.length === 0) {
      try {
        const bingResult = await fetchWithDebug(
          `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20&setlang=ja`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html',
              'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            },
          }
        );
        debug.push(`Bing: status=${bingResult.status}, length=${bingResult.text.length}`);
        const hasBalgo = bingResult.text.includes('b_algo');
        const hasOlMain = bingResult.text.includes('id="b_results"');
        debug.push(`Bing has b_algo: ${hasBalgo}, has b_results: ${hasOlMain}`);
        // Get a sample around b_algo if it exists
        const bAlgoIdx = bingResult.text.indexOf('b_algo');
        if (bAlgoIdx > -1) {
          debug.push(`Bing b_algo context: ${bingResult.text.substring(Math.max(0, bAlgoIdx - 20), bAlgoIdx + 300)}`);
        } else {
          // Show what's in the body
          const bodyIdx = bingResult.text.indexOf('<body');
          debug.push(`Bing body start: ${bingResult.text.substring(bodyIdx, bodyIdx + 500)}`);
        }
        if (bingResult.status === 200) {
          reviews = parseBing(bingResult.text);
          debug.push(`Bing parsed: ${reviews.length} results`);
        }
      } catch (e) {
        debug.push(`Bing error: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ reviews, total: reviews.length, debug }), {
      status: 200, headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '検索中にエラーが発生しました', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function fetchWithDebug(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  return { status: response.status, text };
}

function parseDuckDuckGoLite(html) {
  const reviews = [];
  let id = 1;

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

    reviews.push({
      id: `review-${id++}`,
      title: title.slice(0, 200),
      rating: extractRating(snippet + ' ' + title),
      summary: snippet.slice(0, 1000),
      url: extractUrl(href),
    });
  }

  return reviews;
}

function parseDuckDuckGoHTML(html) {
  const reviews = [];
  let id = 1;

  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = resultRegex.exec(html)) !== null && reviews.length < 50) {
    const href = match[1];
    const title = stripHtml(match[2]).trim();
    const snippet = stripHtml(match[3]).trim();
    if (!title || !snippet) continue;

    reviews.push({
      id: `review-${id++}`,
      title: title.slice(0, 200),
      rating: extractRating(snippet + ' ' + title),
      summary: snippet.slice(0, 1000),
      url: extractUrl(href),
    });
  }

  return reviews;
}

function parseBing(html) {
  const reviews = [];
  let id = 1;

  // Bing results: <li class="b_algo"><h2><a href="URL">Title</a></h2>...<p>Snippet</p>
  const resultRegex = /<li[^>]*class="b_algo"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;

  let match;
  while ((match = resultRegex.exec(html)) !== null && reviews.length < 50) {
    const url = match[1];
    const title = stripHtml(match[2]).trim();
    const snippet = stripHtml(match[3]).trim();
    if (!title || !snippet || !url.startsWith('http')) continue;

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

function extractUrl(href) {
  let url = href.replace(/&amp;/g, '&');
  if (url.includes('uddg=')) {
    try {
      const fullUrl = url.startsWith('//') ? `https:${url}` : url;
      const urlObj = new URL(fullUrl);
      url = urlObj.searchParams.get('uddg') || url;
    } catch { /* keep original */ }
  }
  if (!url.startsWith('http')) url = 'https://example.com';
  try { return decodeURIComponent(url); } catch { return url; }
}

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

function extractRating(text) {
  const m1 = text.match(/(\d+\.?\d*)\s*[\/／]\s*5/);
  if (m1) { const v = parseFloat(m1[1]); if (v >= 1 && v <= 5) return Math.round(v * 10) / 10; }
  const m2 = text.match(/[★☆]\s*(\d+\.?\d*)/);
  if (m2) { const v = parseFloat(m2[1]); if (v >= 1 && v <= 5) return Math.round(v * 10) / 10; }
  const m3 = text.match(/(\d+\.?\d*)\s*点/);
  if (m3) { const v = parseFloat(m3[1]); if (v >= 1 && v <= 5) return Math.round(v * 10) / 10; if (v > 5 && v <= 100) return Math.round((v / 20) * 10) / 10; }
  return 3.5;
}
