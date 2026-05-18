/**
 * Vercel Edge Function: /api/search
 * Searches for product reviews using Google Custom Search API.
 * 
 * Required environment variables:
 * - GOOGLE_SEARCH_API_KEY: Google Cloud API key with Custom Search API enabled
 * - GOOGLE_SEARCH_ENGINE_ID: Programmable Search Engine ID (cx)
 * 
 * Free tier: 100 queries/day
 * Setup: https://developers.google.com/custom-search/v1/overview
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

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      return new Response(JSON.stringify({
        error: 'Google Custom Search APIが未設定です。Vercelの環境変数にGOOGLE_SEARCH_API_KEYとGOOGLE_SEARCH_ENGINE_IDを設定してください。',
      }), { status: 500, headers: corsHeaders });
    }

    let query = `${productName} レビュー 評価`;
    if (genre) query += ` ${genre}`;

    // Google Custom Search API - fetch up to 50 results (5 pages of 10)
    const allReviews = [];
    const maxPages = 5; // 10 results per page, up to 50 total

    for (let page = 0; page < maxPages; page++) {
      const startIndex = page * 10 + 1;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10&start=${startIndex}&lr=lang_ja&hl=ja`;

      const response = await fetch(url);

      if (!response.ok) {
        if (page === 0) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData?.error?.message || `API error: ${response.status}`;
          return new Response(JSON.stringify({ error: errorMsg }), {
            status: response.status === 403 ? 429 : 500,
            headers: corsHeaders,
          });
        }
        break; // Stop pagination on error for subsequent pages
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) break;

      for (const item of items) {
        allReviews.push({
          id: `review-${allReviews.length + 1}`,
          title: (item.title || '').slice(0, 200),
          rating: extractRating((item.snippet || '') + ' ' + (item.title || '')),
          summary: (item.snippet || '').slice(0, 1000),
          url: item.link || '',
        });
      }

      // Stop if fewer than 10 results returned (no more pages)
      if (items.length < 10) break;

      // Respect rate limits - small delay between pages
      if (page < maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return new Response(JSON.stringify({
      reviews: allReviews,
      total: allReviews.length,
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '検索中にエラーが発生しました', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Extract rating from text content.
 */
function extractRating(text) {
  const m1 = text.match(/(\d+\.?\d*)\s*[\/／]\s*5/);
  if (m1) { const v = parseFloat(m1[1]); if (v >= 1 && v <= 5) return Math.round(v * 10) / 10; }

  const m2 = text.match(/[★☆]\s*(\d+\.?\d*)/);
  if (m2) { const v = parseFloat(m2[1]); if (v >= 1 && v <= 5) return Math.round(v * 10) / 10; }

  const m3 = text.match(/(\d+\.?\d*)\s*点/);
  if (m3) {
    const v = parseFloat(m3[1]);
    if (v >= 1 && v <= 5) return Math.round(v * 10) / 10;
    if (v > 5 && v <= 100) return Math.round((v / 20) * 10) / 10;
  }

  return 3.5;
}
