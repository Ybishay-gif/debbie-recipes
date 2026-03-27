const fs = require('fs');
const posts = JSON.parse(fs.readFileSync('/Users/YossiBen_Y/debbie-recipes/scraped-posts.json', 'utf8'));

// Hebrew keywords for section detection
const INGREDIENT_MARKERS = ['מצרכים', 'חומרים', 'רכיבים', 'מרכיבים', 'נצטרך'];
const STEP_MARKERS = ['הכנה', 'אופן הכנה', 'שלבי הכנה', 'הוראות הכנה', 'דרך הכנה', 'אופן ההכנה', 'שלבי ההכנה'];
const QUANTITY_PATTERNS = /^\d|^½|^¼|^¾|^⅓|^⅔|^כוס|^כף|^כפית|^גרם|^ק"ג|^קילו|^ליטר|^מ"ל|^חבילה|^שקית|^יח'/;

// Category detection — check specific before general, check name first then full caption
const CATEGORY_RULES = [
  { cat: 'מרקים', keywords: ['מרק '] },
  { cat: 'מאפים', keywords: ['לחם', 'חלה', 'פיתה', 'בייגל', 'מאפה', 'בריוש', 'פוקצ\'ה', 'קרואסון', 'סינבון', 'מגולגלות', 'שמרים', 'סופגני', 'דונאט', 'לחמניות'] },
  { cat: 'קינוחים', keywords: ['עוגה', 'עוגת', 'שוקולד', 'קרם', 'מוס ', 'גלידה', 'טירמיסו', 'פנקוטה', 'סופלה', 'בראוני', 'קוקי', 'עוגיות', 'ביסקוטי', 'טארט', 'פאי', 'קאפקייק', 'מאפינ', 'פודינג', 'ממתק', 'טראפל', 'מרנג', 'קרמבל', 'חיתוכיות', 'כדורי שוקולד', 'קינוח', 'רולדה', 'פרלין', 'קורנפלקס'] },
  { cat: 'מנות עיקריות', keywords: ['עוף', 'בשר', 'דג', 'סלמון', 'פסטה', 'אורז', 'תבשיל', 'פרגיות', 'כרעיים', 'שניצל', 'המבורגר', 'סטייק', 'טונה', 'נודלס', 'ספגטי', 'לזניה', 'פיצה', 'קציצות', 'שוק טלה', 'כבד', 'טוסט', 'ירקות', 'סלט', 'טורטיה', 'בורקס', 'סיגר', 'פול', 'חומוס', 'שקשוקה', 'קוסקוס', 'גיוזה', 'ארנצ\'יני', 'כרוב', 'טאקו', 'ממולא', 'ריזוטו', 'שווארמה', 'קארי', 'חציל', 'אספרגוס', 'כרובית'] }
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
  'default': '🍽️'
};

function detectCategory(name, caption) {
  // First check recipe name (more specific)
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (name.includes(kw)) return rule.cat;
    }
  }
  // Then check full caption
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (caption.includes(kw)) return rule.cat;
    }
  }
  return 'מנות עיקריות';
}

function detectEmoji(name, caption) {
  // Check name first
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (keyword !== 'default' && name.includes(keyword)) return emoji;
  }
  // Then caption
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (keyword !== 'default' && caption.includes(keyword)) return emoji;
  }
  return EMOJI_MAP.default;
}

function extractName(lines, caption) {
  // Strategy: find the most "title-like" line in the first 5 lines
  // Title characteristics: short, starts with Hebrew, no hashtags, no @mentions, not a sentence

  // Clean English engagement text (e.g., "K likes, 341 comments - user on date: "...")
  let candidates = [];
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    let line = lines[i];

    // Skip lines with engagement metrics
    if (/^\d+\.?\d*[KMk]?\s*(likes|comments|views)/i.test(line)) continue;
    if (/^(K|M)\s+likes/i.test(line)) continue;

    // Skip @mentions and hashtag-only lines
    if (line.startsWith('@') || line.startsWith('#')) continue;

    // Skip very long lines (likely paragraphs, not titles)
    if (line.length > 100) continue;

    // Skip lines that are just emojis
    if (line.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\s]/gu, '').length < 3) continue;

    // Skip ingredient/step marker lines
    if (INGREDIENT_MARKERS.some(m => line.includes(m))) continue;
    if (STEP_MARKERS.some(m => line.includes(m))) continue;

    // Clean line
    line = line.replace(/#\S+/g, '').replace(/@\S+/g, '').trim();
    line = line.replace(/^[^\u0590-\u05FFa-zA-Z\d]+/, '').trim();

    if (line.length >= 3 && line.length <= 80) {
      candidates.push({ line, index: i });
    }
  }

  if (candidates.length === 0) return lines[0].substring(0, 60);

  // Prefer lines that look like recipe titles:
  // - Contains "מתכון" (recipe)
  // - Short and punchy
  // - Contains food words
  const titleLine = candidates.find(c => c.line.includes('מתכון')) || candidates[0];
  return titleLine.line;
}

function parseRecipe(post) {
  const { url, author, caption } = post;
  if (!caption || caption.length < 100) return null;

  const lines = caption.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Find ingredient and step sections
  let ingredientStart = -1;
  let stepStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ingredientStart === -1) {
      for (const marker of INGREDIENT_MARKERS) {
        if (line.includes(marker) && line.length < 80) {
          ingredientStart = i + 1;
          break;
        }
      }
    }
    if (ingredientStart !== -1 && stepStart === -1) {
      for (const marker of STEP_MARKERS) {
        if (line.includes(marker) && line.length < 80) {
          stepStart = i + 1;
          break;
        }
      }
    }
  }

  // If no explicit markers, detect by content patterns
  if (ingredientStart === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (QUANTITY_PATTERNS.test(lines[i]) && lines[i].length < 100) {
        let count = 0;
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (QUANTITY_PATTERNS.test(lines[j]) || lines[j].length < 80) count++;
        }
        if (count >= 3) {
          ingredientStart = i;
          break;
        }
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
        if (i > 0 && STEP_MARKERS.some(m => lines[i-1].includes(m))) {
          endOfIngredients = i - 1;
        }
        break;
      }
    }
  }

  let ingredients = [];
  for (let i = ingredientStart; i < endOfIngredients; i++) {
    const line = lines[i];
    if (line.startsWith('#') || line.startsWith('@') || line.startsWith('📸') || line.startsWith('🔗')) continue;
    if (STEP_MARKERS.some(m => line.includes(m) && line.length < 50)) continue;
    if (line.length > 0 && line.length < 150) {
      const cleaned = line.replace(/^[-•*·⁃▪️●]\s*/, '').trim();
      if (cleaned.length > 0) ingredients.push(cleaned);
    }
  }

  let steps = [];
  if (stepStart !== -1) {
    for (let i = stepStart; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#') || line.startsWith('@') || line.length === 0) continue;
      if (line.length < 10) continue;
      const cleaned = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim();
      if (cleaned.length > 10) steps.push(cleaned);
    }
  }

  if (ingredients.length < 2) return null;

  const name = extractName(lines, caption);
  const category = detectCategory(name, caption);
  const emoji = detectEmoji(name, caption);

  return {
    name,
    author,
    url,
    category,
    emoji,
    ingredients: ingredients.slice(0, 30),
    steps: steps.slice(0, 20)
  };
}

// Parse all posts
const recipes = [];
const skipped = [];

for (const post of posts) {
  const recipe = parseRecipe(post);
  if (recipe && recipe.ingredients.length >= 2) {
    recipes.push(recipe);
  } else {
    skipped.push({ url: post.url, author: post.author, reason: recipe ? 'too few ingredients' : 'no recipe detected' });
  }
}

// Deduplicate against existing 14 recipes by URL
const existingUrls = [
  'DWUBtZxiIsy', 'DWB2x3CiHq_', 'DWEA35dDKzy', 'DVz1P13CHMF',
  'DVsIEPBC6aM', 'DVMCd5KCLlI', 'DWP_aBfiROa', 'DVzaIyWCPKO',
  'DVRK5LeCXOA', 'DV97q7Ti3LE', 'DV18KX0i1dO', 'DVM8EJPCqsG',
  'DRwmm-nCN9N', 'DSaQ20HDK_z'
];
const newRecipes = recipes.filter(r => !existingUrls.some(u => r.url.includes(u)));

// Write results
fs.writeFileSync('/Users/YossiBen_Y/debbie-recipes/ig-recipes.json', JSON.stringify(newRecipes, null, 2), 'utf8');
fs.writeFileSync('/Users/YossiBen_Y/debbie-recipes/skipped-posts.json', JSON.stringify(skipped, null, 2), 'utf8');

// Report
console.log(`Parsed ${recipes.length} recipes total, ${newRecipes.length} new (after dedup), skipped ${skipped.length} posts`);
const cats = {};
newRecipes.forEach(r => { cats[r.category] = (cats[r.category]||0)+1; });
console.log('Categories:', JSON.stringify(cats));

const good = newRecipes.filter(r => r.steps.length >= 3 && r.ingredients.length >= 3);
console.log(`Quality: ${good.length} recipes with 3+ ingredients AND 3+ steps`);

console.log('\n=== Sample recipes ===');
newRecipes.slice(0, 10).forEach((r, i) => {
  console.log(`${i+1}. ${r.emoji} ${r.name} (@${r.author}) - ${r.category} [${r.ingredients.length}i/${r.steps.length}s]`);
});
