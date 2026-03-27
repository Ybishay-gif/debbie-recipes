// Netlify V1 Function: fetch-recipe
// Proxies a URL fetch and extracts Recipe structured data (JSON-LD / Schema.org)

// ── Category & Emoji detection (mirrors parse-recipes.js) ────────────────

const CATEGORY_RULES = [
  { cat: 'מרקים', keywords: ['מרק '] },
  { cat: 'מאפים', keywords: ['לחם', 'חלה', 'פיתה', 'בייגל', 'מאפה', 'בריוש', "פוקצ'ה", 'קרואסון', 'סינבון', 'מגולגלות', 'שמרים', 'סופגני', 'דונאט', 'לחמניות'] },
  { cat: 'קינוחים', keywords: ['עוגה', 'עוגת', 'שוקולד', 'קרם', 'מוס ', 'גלידה', 'טירמיסו', 'פנקוטה', 'סופלה', 'בראוני', 'קוקי', 'עוגיות', 'ביסקוטי', 'טארט', 'פאי', 'קאפקייק', 'מאפינ', 'פודינג', 'ממתק', 'טראפל', 'מרנג', 'קרמבל', 'חיתוכיות', 'כדורי שוקולד', 'קינוח', 'רולדה', 'פרלין', 'קורנפלקס'] },
  { cat: 'מנות עיקריות', keywords: ['עוף', 'בשר', 'דג', 'סלמון', 'פסטה', 'אורז', 'תבשיל', 'פרגיות', 'כרעיים', 'שניצל', 'המבורגר', 'סטייק', 'טונה', 'נודלס', 'ספגטי', 'לזניה', 'פיצה', 'קציצות', 'שוק טלה', 'כבד', 'טוסט', 'ירקות', 'סלט', 'טורטיה', 'בורקס', 'סיגר', 'פול', 'חומוס', 'שקשוקה', 'קוסקוס', 'גיוזה', "ארנצ'יני", 'כרוב', 'טאקו', 'ממולא', 'ריזוטו', 'שווארמה', 'קארי', 'חציל', 'אספרגוס', 'כרובית'] }
];

const EMOJI_MAP = {
  'עוף': '🍗', 'פרגיות': '🍗', 'בשר': '🥩', 'טלה': '🥩', 'כבד': '🫕',
  'דג': '🐟', 'סלמון': '🐟', 'טונה': '🐟',
  'פסטה': '🍝', 'ספגטי': '🍝', 'נודלס': '🍜', 'לזניה': '🍝',
  'אורז': '🍚', 'ריזוטו': '🍚',
  'פיצה': '🍕', 'טוסט': '🥪', 'המבורגר': '🍔',
  'מרק': '🍲', 'תבשיל': '🍲', 'קוסקוס': '🍲',
  'עוגה': '🍰', 'עוגת': '🍰', 'שוקולד': '🍫', 'בראוני': '🍫',
  'עוגיות': '🍪', 'קוקי': '🍪', 'מגולגלות': '🍪', 'חיתוכיות': '🍪',
  'גלידה': '🍦', 'לחם': '🍞', 'חלה': '🍞', 'פיתה': '🫓',
  'בורקס': '🥧', 'סיגר': '🌯', 'טאקו': '🌮',
  'סלט': '🥗', 'ירקות': '🥬', 'כרוב': '🥬', 'חציל': '🍆',
  'גיוזה': '🥟', 'שקשוקה': '🍳', 'ביצים': '🍳',
  'קארי': '🍛', 'שווארמה': '🌯', 'כרובית': '🥦',
  // English keywords for imported recipes
  'chicken': '🍗', 'beef': '🥩', 'steak': '🥩', 'lamb': '🥩',
  'fish': '🐟', 'salmon': '🐟', 'tuna': '🐟', 'shrimp': '🍤',
  'pasta': '🍝', 'spaghetti': '🍝', 'noodle': '🍜', 'lasagna': '🍝',
  'rice': '🍚', 'risotto': '🍚',
  'pizza': '🍕', 'sandwich': '🥪', 'burger': '🍔',
  'soup': '🍲', 'stew': '🍲',
  'cake': '🍰', 'chocolate': '🍫', 'brownie': '🍫',
  'cookie': '🍪', 'ice cream': '🍦',
  'bread': '🍞', 'salad': '🥗', 'taco': '🌮',
  'curry': '🍛', 'pie': '🥧',
};

// English category keywords
const EN_CATEGORY_RULES = [
  { cat: 'מרקים', keywords: ['soup', 'broth', 'chowder', 'bisque', 'stew'] },
  { cat: 'מאפים', keywords: ['bread', 'roll', 'baguette', 'croissant', 'biscuit', 'muffin', 'scone', 'pretzel', 'focaccia', 'brioche', 'bagel', 'doughnut', 'donut'] },
  { cat: 'קינוחים', keywords: ['cake', 'cookie', 'brownie', 'pie', 'tart', 'ice cream', 'pudding', 'mousse', 'cheesecake', 'cupcake', 'fudge', 'truffle', 'meringue', 'crumble', 'dessert', 'candy', 'chocolate'] },
  { cat: 'מנות עיקריות', keywords: ['chicken', 'beef', 'fish', 'salmon', 'pasta', 'rice', 'steak', 'burger', 'pizza', 'salad', 'taco', 'curry', 'shrimp', 'pork', 'lamb', 'tofu', 'noodle', 'casserole', 'stir fry', 'roast'] }
];

function detectCategory(name) {
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (name.includes(kw)) return rule.cat;
    }
  }
  for (const rule of EN_CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.cat;
    }
  }
  return 'מנות עיקריות';
}

function detectEmoji(name) {
  const lower = name.toLowerCase();
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.includes(keyword) || lower.includes(keyword.toLowerCase())) return emoji;
  }
  return '🍽️';
}

// ── JSON-LD extraction ───────────────────────────────────────────────────

function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch { /* skip malformed JSON */ }
  }
  return blocks;
}

function findRecipeInJsonLd(blocks) {
  for (const block of blocks) {
    // Direct Recipe object
    if (block['@type'] === 'Recipe') return block;
    // Array of types (some sites use ["Recipe", "HowTo"])
    if (Array.isArray(block['@type']) && block['@type'].includes('Recipe')) return block;
    // Inside @graph
    if (block['@graph'] && Array.isArray(block['@graph'])) {
      for (const item of block['@graph']) {
        if (item['@type'] === 'Recipe') return item;
        if (Array.isArray(item['@type']) && item['@type'].includes('Recipe')) return item;
      }
    }
    // Array at root level
    if (Array.isArray(block)) {
      for (const item of block) {
        if (item['@type'] === 'Recipe') return item;
        if (Array.isArray(item['@type']) && item['@type'].includes('Recipe')) return item;
      }
    }
  }
  return null;
}

// ── Schema.org → App recipe mapping ──────────────────────────────────────

function parseInstructions(instructions) {
  if (!instructions) return [];
  if (typeof instructions === 'string') {
    return instructions.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
  }
  if (Array.isArray(instructions)) {
    const steps = [];
    for (const item of instructions) {
      if (typeof item === 'string') {
        steps.push(item.trim());
      } else if (item['@type'] === 'HowToStep') {
        steps.push((item.text || item.name || '').trim());
      } else if (item['@type'] === 'HowToSection') {
        // Sections contain nested steps
        if (Array.isArray(item.itemListElement)) {
          for (const sub of item.itemListElement) {
            if (typeof sub === 'string') steps.push(sub.trim());
            else if (sub.text) steps.push(sub.text.trim());
            else if (sub.name) steps.push(sub.name.trim());
          }
        }
      }
    }
    return steps.filter(s => s.length > 0);
  }
  return [];
}

function parseIngredients(ingredients) {
  if (!ingredients) return [];

  // Flatten nested arrays (some sites emit [[...]] instead of [...])
  // For strings, split by newlines first (preserves original behavior)
  const flat = Array.isArray(ingredients) ? ingredients.flat(Infinity) : String(ingredients).split(/\n+/);

  const FRACTION_CHARS = '½¼¾⅓⅔⅛⅜⅝⅞';
  // Split a string where ingredients are concatenated without separators:
  // e.g. "2 חלבונים⅓ כוס סוכר" → ["2 חלבונים", "⅓ כוס סוכר"]
  function splitConcatenated(str) {
    // Split where a word char or closing paren is immediately followed by a digit or fraction
    return str.split(new RegExp(`(?<=[\\p{L}\\p{M}))])(?=[\\d${FRACTION_CHARS}])`, 'u'));
  }

  const result = [];
  for (const item of flat) {
    let s = String(item)
      .replace(/&nbsp;/gi, ' ')     // literal &nbsp; entity
      .replace(/\u00A0/g, ' ')      // unicode non-breaking space
      .replace(/\s+/g, ' ')         // collapse whitespace
      .trim();
    if (!s || s === '&nbsp;') continue;

    // Try splitting concatenated ingredients
    const parts = splitConcatenated(s);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned.length > 0) result.push(cleaned);
    }
  }
  return result;
}

function parseServings(recipeYield) {
  if (!recipeYield) return '';
  if (Array.isArray(recipeYield)) return String(recipeYield[0]);
  return String(recipeYield);
}

function parseAuthor(author) {
  if (!author) return '';
  if (typeof author === 'string') return author;
  if (Array.isArray(author)) return author.map(a => typeof a === 'string' ? a : a.name || '').join(', ');
  return author.name || '';
}

function mapSchemaToRecipe(schema, url) {
  const name = schema.name || 'מתכון ללא שם';
  return {
    name,
    nameEn: '',
    author: parseAuthor(schema.author),
    url,
    category: detectCategory(name),
    servings: parseServings(schema.recipeYield),
    kosherForPesach: false,
    emoji: detectEmoji(name),
    ingredients: parseIngredients(schema.recipeIngredient),
    steps: parseInstructions(schema.recipeInstructions),
    isImported: true
  };
}

// ── Fallback: OpenGraph meta extraction ──────────────────────────────────

function extractOgMeta(html) {
  const get = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, 'i'));
    return m ? m[1] : '';
  };
  return { title: get('title'), description: get('description') };
}

// ── Instagram caption parsing (Hebrew recipe detection) ──────────────────

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/\u200e/g, '') // Remove LTR marks
    .replace(/\u200f/g, ''); // Remove RTL marks
}

const IG_INGREDIENT_MARKERS = ['מצרכים', 'חומרים', 'רכיבים', 'מרכיבים', 'נצטרך', 'למילוי', 'לרוטב', 'לציפוי', 'לבצק', 'לקרם'];
const IG_STEP_MARKERS = ['הכנה', 'אופן הכנה', 'שלבי הכנה', 'הוראות הכנה', 'דרך הכנה', 'אופן ההכנה', 'שלבי ההכנה'];
const IG_QUANTITY_PATTERNS = /^\d|^½|^¼|^¾|^⅓|^⅔|^כוס|^כף|^כפית|^גרם|^ק"ג|^קילו|^ליטר|^מ"ל|^חבילה|^שקית|^יח'/;

// Detects lines that look like standalone ingredients (even without leading quantities)
const COMMON_INGREDIENTS = /מלח|סוכר|שמן|קמח|ביצים|ביצה|חלב|שמנת|חמאה|בצל|שום|פלפל|כוסברה|פטרוזיליה|שמיר|נענע|כמון|פפריקה|כורכום|קינמון|אגוזי|שקדים|אגוזים|טחינה|סויה|חומץ|לימון|עגבני|גבינה|שוקולד|קקאו|וניל|סילאן|דבש|מים|יין|שמרים|ג'לטין/;
const QUANTITY_ANYWHERE = /\d+\s*(גרם|גר׳|ג׳|מ"ל|ק"ג|כוס|כוסות|כף|כפות|כפית|כפיות|ליטר|יח'|יח׳|חבילה|חבילות|שקית|שקיות|מ״ל|ק״ג)/;

function looksLikeIngredient(line) {
  const cleaned = line.replace(/^[-•*·⁃▪️●]\s*/, '').trim();
  if (cleaned.length > 60) return false; // Recipe names can be long; ingredients rarely are
  if (IG_QUANTITY_PATTERNS.test(cleaned)) return true;
  if (QUANTITY_ANYWHERE.test(cleaned)) return true;
  // Short line with a common ingredient word is likely an ingredient
  if (cleaned.length < 40 && COMMON_INGREDIENTS.test(cleaned)) return true;
  return false;
}

function parseInstagramCaption(caption, url, ogTitle = '') {
  if (!caption || caption.length < 50) return null;

  const lines = caption.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Extract author from URL
  let author = '';
  const authorMatch = caption.match(/@(\w[\w.]+)/);
  if (authorMatch) author = authorMatch[1];

  // Find ingredient and step sections
  let ingredientStart = -1;
  let stepStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ingredientStart === -1) {
      for (const marker of IG_INGREDIENT_MARKERS) {
        if (line.includes(marker) && line.length < 80) {
          ingredientStart = i + 1;
          break;
        }
      }
    }
    if (ingredientStart !== -1 && stepStart === -1) {
      for (const marker of IG_STEP_MARKERS) {
        if (line.includes(marker) && line.length < 80) {
          stepStart = i + 1;
          break;
        }
      }
    }
  }

  // Fallback: detect by quantity patterns
  if (ingredientStart === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (IG_QUANTITY_PATTERNS.test(lines[i]) && lines[i].length < 100) {
        let count = 0;
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (IG_QUANTITY_PATTERNS.test(lines[j]) || lines[j].length < 80) count++;
        }
        if (count >= 3) { ingredientStart = i; break; }
      }
    }
  }

  if (ingredientStart === -1) return null;

  let endOfIngredients = stepStart !== -1 ? stepStart - 1 : lines.length;

  if (stepStart === -1) {
    for (let i = ingredientStart; i < lines.length; i++) {
      const line = lines[i];
      if (/^\d+[\.\)]/.test(line) || (line.length > 100 && i > ingredientStart + 3)) {
        stepStart = i;
        endOfIngredients = i;
        if (i > 0 && IG_STEP_MARKERS.some(m => lines[i-1].includes(m))) {
          endOfIngredients = i - 1;
        }
        break;
      }
    }
  }

  // Extract ingredients
  let ingredients = [];
  for (let i = ingredientStart; i < endOfIngredients; i++) {
    const line = lines[i];
    if (line.startsWith('#') || line.startsWith('@') || line.startsWith('.')) continue;
    if (IG_STEP_MARKERS.some(m => line.includes(m) && line.length < 50)) continue;
    if (line.length > 0 && line.length < 150) {
      const cleaned = line.replace(/^[-•*·⁃▪️●]\s*/, '').trim();
      if (cleaned.length > 0) ingredients.push(cleaned);
    }
  }

  // Extract steps
  let steps = [];
  if (stepStart !== -1) {
    for (let i = stepStart; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#') || line.startsWith('@') || line.length === 0) continue;
      if (line === '.') continue;
      if (line.length < 5) continue;
      const cleaned = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim();
      if (cleaned.length > 5) steps.push(cleaned);
    }
  }

  if (ingredients.length < 2) return null;

  // Build a set of parsed ingredient texts for cross-checking
  const ingredientSet = new Set(ingredients.map(ing => ing.toLowerCase()));

  // Extract name from first meaningful line (before ingredient section)
  let name = '';
  const nameSearchEnd = Math.min(ingredientStart, 8); // Only look before ingredients
  for (let i = 0; i < nameSearchEnd; i++) {
    const line = lines[i];
    if (line.startsWith('#') || line.startsWith('@') || line.startsWith('.')) continue;
    if (/^\d+\.?\d*[KMk]?\s*(likes|comments)/i.test(line)) continue;
    if (IG_INGREDIENT_MARKERS.some(m => line.includes(m))) continue;
    if (IG_STEP_MARKERS.some(m => line.includes(m))) continue;
    if (looksLikeIngredient(line)) continue;
    // Skip if this line matches a parsed ingredient
    const cleanedForCheck = line.replace(/^[-•*·⁃▪️●]\s*/, '').trim().toLowerCase();
    if (ingredientSet.has(cleanedForCheck)) continue;
    let cleaned = line.replace(/#\S+/g, '').replace(/@\S+/g, '').trim();
    // For long lines, take the part before the first comma or period
    if (cleaned.length > 60) {
      const cut = cleaned.match(/^(.{10,60})[,،.!]/);
      if (cut) cleaned = cut[1].trim();
      else cleaned = cleaned.substring(0, 60);
    }
    if (cleaned.length >= 3) { name = cleaned; break; }
  }

  // Fallback: use og:title (common for Instagram — contains post caption title)
  if (!name && ogTitle) {
    let cleaned = ogTitle
      .replace(/@\S+/g, '').replace(/#\S+/g, '')
      .replace(/on Instagram:?\s*/i, '').replace(/["״"]/g, '').trim();
    if (cleaned.length > 60) cleaned = cleaned.substring(0, 60);
    if (cleaned.length >= 3 && !looksLikeIngredient(cleaned)) name = cleaned;
  }

  if (!name) name = lines[0].substring(0, 60);

  return {
    name,
    nameEn: '',
    author,
    url,
    category: detectCategory(name),
    servings: '',
    kosherForPesach: false,
    emoji: detectEmoji(name),
    ingredients: ingredients.slice(0, 30),
    steps: steps.slice(0, 20),
    isImported: true
  };
}

// ── Handler ──────────────────────────────────────────────────────────────

export default async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { url } = body;
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: 'Invalid URL — must start with http:// or https://' }), { status: 400, headers });
  }

  // Fetch the page
  let html;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const parsedUrl = new URL(url);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
        'Accept-Encoding': 'identity',
        'Referer': parsedUrl.origin + '/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `שגיאה בגישה לכתובת (HTTP ${res.status})` }), { status: 502, headers });
    }
    html = await res.text();
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'הזמן הקצוב לבקשה חלף' : err.message;
    return new Response(JSON.stringify({ error: 'שגיאה בגישה לכתובת — ' + msg }), { status: 502, headers });
  }

  // Try JSON-LD extraction
  const jsonLdBlocks = extractJsonLd(html);
  const recipeSchema = findRecipeInJsonLd(jsonLdBlocks);

  if (recipeSchema) {
    const recipe = mapSchemaToRecipe(recipeSchema, url);
    if (recipe.ingredients.length === 0 && recipe.steps.length === 0) {
      return new Response(JSON.stringify({ error: 'נמצא מתכון אבל בלי מרכיבים או שלבים' }), { status: 404, headers });
    }
    return new Response(JSON.stringify(recipe), { status: 200, headers });
  }

  // Fallback: try Instagram caption parsing (og:description contains the full caption)
  const og = extractOgMeta(html);
  const isInstagram = /instagram\.com/.test(url);

  if (og.description) {
    const decodedCaption = decodeHtmlEntities(og.description)
      // Strip the "N likes, N comments - user on date: " prefix
      .replace(/^[\d,.]+[KMk]?\s*likes?,\s*[\d,.]+\s*comments?\s*-\s*\S+\s*on\s*[^:]+:\s*"?/i, '')
      .replace(/"?\s*$/, ''); // Strip trailing quote

    const igRecipe = parseInstagramCaption(decodedCaption, url, og.title);
    if (igRecipe && igRecipe.ingredients.length >= 2) {
      // Try to get author from URL for Instagram
      if (isInstagram && !igRecipe.author) {
        const authorFromOg = og.title.match(/@?(\w[\w.]+)/);
        if (authorFromOg) igRecipe.author = authorFromOg[1];
      }
      return new Response(JSON.stringify(igRecipe), { status: 200, headers });
    }
  }

  // Final fallback: no recipe found
  return new Response(JSON.stringify({
    error: 'לא נמצא מתכון מובנה בדף הזה',
    hint: og.title ? `נמצא: "${og.title}" — אפשר להוסיף ידנית` : 'אפשר להוסיף מתכון ידנית',
    ogTitle: og.title,
    ogDescription: og.description
  }), { status: 404, headers });
};

export const config = {
  path: "/.netlify/functions/fetch-recipe"
};
