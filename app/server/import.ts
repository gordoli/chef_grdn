import { load } from 'cheerio';

export interface ImportedRecipe {
  title: string;
  type: string;
  tags: string[];
  servings: number | null;
  yield_label: string | null;
  time_label: string | null;
  intro: string | null;
  source_url: string;
  source_label: string;
  ingredients_text: string;
  steps_text: string;
  notes: string[];
  image_urls: string[];
}

const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = 4096;
const REQUEST_TIMEOUT_MS = 12_000;
const RECIPE_HOSTS = new Set([
  'allrecipes.com',
  'ambitiouskitchen.com',
  'bbcgoodfood.com',
  'bonappetit.com',
  'budgetbytes.com',
  'cookieandkate.com',
  'delish.com',
  'downshiftology.com',
  'eatingwell.com',
  'epicurious.com',
  'foodandwine.com',
  'foodnetwork.com',
  'gimmesomeoven.com',
  'halfbakedharvest.com',
  'justonecookbook.com',
  'loveandlemons.com',
  'maangchi.com',
  'maddysavenue.com',
  'minimalistbaker.com',
  'natashaskitchen.com',
  'onceuponachef.com',
  'pinchofyum.com',
  'rainbowplantlife.com',
  'recipetineats.com',
  'sallysbakingaddiction.com',
  'seriouseats.com',
  'simplyrecipes.com',
  'skinnytaste.com',
  'smittenkitchen.com',
  'spendwithpennies.com',
  'tastesbetterfromscratch.com',
  'thekitchn.com',
  'thewoksoflife.com',
  'wellplated.com',
]);

class ImportError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Exact trusted publisher hosts avoid turning the importer into an open proxy. */
export function isAllowedRecipeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === '443') &&
      RECIPE_HOSTS.has(host)
    );
  } catch {
    return false;
  }
}

function assertRecipeUrl(value: string): URL {
  if (!isAllowedRecipeUrl(value)) {
    throw new ImportError(
      'Use an HTTPS link from a supported recipe publisher, such as RecipeTin Eats, Serious Eats, Allrecipes, Just One Cookbook, or Tastes Better From Scratch. For other sites, paste the recipe manually.',
    );
  }
  return new URL(value);
}

async function readBoundedBody(response: Response | Request, limit: number): Promise<string> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > limit) {
    await response.body?.cancel();
    throw new ImportError('The page is too large to import. Paste the recipe manually.', 413);
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new ImportError('The page is too large to import. Paste the recipe manually.', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function plainText(value: unknown): string {
  const text = textValue(value);
  if (!text) return '';
  return load(`<body>${text}</body>`)('body').text().replace(/\s+/g, ' ').trim().slice(0, 10_000);
}

function findRecipe(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    for (const child of value.slice(0, 1000)) {
      const result = findRecipe(child, depth + 1);
      if (result) return result;
    }
  } else if (isRecord(value)) {
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.some((type) => typeof type === 'string' && /(?:^|[/#])Recipe$/.test(type)))
      return value;
    for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement']) {
      const result = findRecipe(value[key], depth + 1);
      if (result) return result;
    }
  }
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.slice(0, 300).map(plainText).filter(Boolean);
  const text = plainText(value);
  return text ? [text] : [];
}

function instructionLines(value: unknown, depth = 0): string[] {
  if (depth > 8) return [];
  if (Array.isArray(value))
    return value.slice(0, 300).flatMap((child) => instructionLines(child, depth + 1));
  if (typeof value === 'string') return value.split(/\r?\n/).map(plainText).filter(Boolean);
  if (!isRecord(value)) return [];
  const children = value.itemListElement ?? value.steps;
  if (children) {
    const name = plainText(value.name);
    return [...(name ? [`## ${name}`] : []), ...instructionLines(children, depth + 1)];
  }
  const text = plainText(value.text ?? value.name);
  return text ? [text] : [];
}

function durationLabel(value: unknown): string | null {
  const text = textValue(value);
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(text);
  if (!match) return text ? plainText(text) : null;
  const minutes =
    Number(match[1] ?? 0) * 1440 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0) +
    Math.ceil(Number(match[4] ?? 0) / 60);
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`;
}

function imageUrls(value: unknown, base: string): string[] {
  const images = Array.isArray(value) ? value : [value];
  const result: string[] = [];
  for (const image of images.slice(0, 12)) {
    const raw = isRecord(image) ? textValue(image.url ?? image.contentUrl) : textValue(image);
    if (!raw) continue;
    try {
      const url = new URL(raw, base);
      if (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname)
      ) {
        result.push(url.href);
      }
    } catch {
      /* A malformed optional image should not discard a usable recipe. */
    }
  }
  return [...new Set(result)];
}

export function parseRecipeHtml(html: string, sourceUrl: string): ImportedRecipe {
  const $ = load(html);
  const meta = (property: string) => $(`meta[property="${property}"]`).attr('content') ?? '';
  let recipe: Record<string, unknown> | undefined;
  for (const element of $('script[type="application/ld+json"]').toArray().slice(0, 100)) {
    const raw = $(element).text().trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      recipe = findRecipe(parsed);
      if (recipe) break;
    } catch {
      /* Publishers sometimes include unrelated, malformed JSON-LD blocks. */
    }
  }
  const title = plainText(recipe?.name ?? meta('og:title')) || plainText($('title').text());
  if (!title)
    throw new ImportError('No recipe title was found on this page. Paste the recipe manually.');
  const yieldText = stringList(recipe?.recipeYield).join(' · ') || null;
  const servingMatch = yieldText ? /^\s*(\d+(?:\.\d+)?)\b/.exec(yieldText) : null;
  const servings = servingMatch ? Number(servingMatch[1]) : null;
  const ingredients = stringList(recipe?.recipeIngredient);
  const instructions = instructionLines(recipe?.recipeInstructions);
  const keywords = Array.isArray(recipe?.keywords)
    ? stringList(recipe.keywords)
    : textValue(recipe?.keywords)
        .split(',')
        .map((tag) => plainText(tag))
        .filter(Boolean);
  const categories = stringList(recipe?.recipeCategory);
  const notes = stringList(recipe?.recipeNotes);
  const recipeNotes = $(
    '.wprm-recipe-notes, .tasty-recipes-notes-body, [itemprop="recipeNotes"]',
  ).first();
  const noteBlocks = recipeNotes.find('li, p').toArray();
  const pageNotes = noteBlocks.length
    ? noteBlocks.map((element) => plainText($(element).html()))
    : [plainText(recipeNotes.html())];
  notes.push(...pageNotes.filter((note) => note && !notes.includes(note)).slice(0, 30));
  if (!recipe || !ingredients.length || !instructions.length) {
    notes.unshift(
      'This page did not expose a complete structured recipe. Review the imported details and paste any missing ingredients and method before saving.',
    );
  }
  return {
    title: title.slice(0, 200),
    type: categories[0]?.slice(0, 60) || 'Mains',
    tags: [...new Set(keywords)].slice(0, 20),
    servings: servings && servings <= 1000 ? servings : null,
    yield_label: yieldText,
    time_label: durationLabel(recipe?.totalTime ?? recipe?.cookTime),
    intro:
      plainText(
        recipe?.description ||
          meta('og:description') ||
          $('meta[name="description"]').attr('content'),
      ) || null,
    source_url: sourceUrl,
    source_label:
      plainText(meta('og:site_name')) || new URL(sourceUrl).hostname.replace(/^www\./, ''),
    ingredients_text: ingredients.join('\n'),
    steps_text: instructions.join('\n'),
    notes,
    image_urls: imageUrls(recipe?.image ?? meta('og:image'), sourceUrl),
  };
}

async function fetchRecipePage(
  initialUrl: string,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<ImportedRecipe> {
  let url = assertRecipeUrl(initialUrl);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetcher(url.href, {
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'ChefGRDN-RecipeImporter/1.0',
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 3)
        throw new ImportError('This page redirected too many times. Paste the recipe manually.');
      url = assertRecipeUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ImportError(
        'This website did not allow recipe importing. Open the source and paste the recipe manually.',
      );
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      await response.body?.cancel();
      throw new ImportError('This link does not point to a recipe web page.');
    }
    const html = await readBoundedBody(response, MAX_PAGE_BYTES);
    return parseRecipeHtml(html, url.href);
  }
  throw new ImportError('Unable to follow this recipe link.');
}

export async function importRecipeUrl(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<ImportedRecipe> {
  assertRecipeUrl(url);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new ImportError(
          'The website took too long to respond. Try again or paste the recipe manually.',
          504,
        ),
      );
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fetchRecipePage(url, fetcher, controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// A bounded per-isolate limiter supplements the private Site's authenticated boundary.
const importWindows = new Map<string, { starts: number; count: number }>();
function consumeImportQuota(identity: string): boolean {
  const now = Date.now();
  for (const [key, window] of importWindows) {
    if (now - window.starts >= 60_000) importWindows.delete(key);
  }
  const window = importWindows.get(identity);
  if (window && window.count >= 12) return false;
  if (window) window.count++;
  else {
    if (importWindows.size >= 500) return false;
    importWindows.set(identity, { starts: now, count: 1 });
  }
  return true;
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

/** The server adapter verifies owner access and supplies the quota identity. */
export async function handleImport(
  request: Request,
  fetcher: typeof fetch = fetch,
  identity = 'local-development',
): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Use POST to import a recipe.' }, 405);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return json({ error: 'Send a JSON recipe link.' }, 415);
  if (!consumeImportQuota(identity))
    return json(
      { error: 'You have imported several recipes. Please try again in one minute.' },
      429,
    );
  try {
    const raw = await readBoundedBody(request, MAX_REQUEST_BYTES);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: 'Send a valid JSON recipe link.' }, 400);
    }
    if (!isRecord(body) || typeof body.url !== 'string' || body.url.length > 2048) {
      return json({ error: 'Enter a valid recipe website link.' }, 400);
    }
    return json(await importRecipeUrl(body.url, fetcher));
  } catch (error) {
    if (error instanceof ImportError) return json({ error: error.message }, error.status);
    return json(
      { error: 'The website could not be reached. Try again or paste the recipe manually.' },
      502,
    );
  }
}
