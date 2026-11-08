import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleImport, importRecipeUrl, isAllowedRecipeUrl, parseRecipeHtml } from './import';

const sourceUrl = 'https://www.recipetineats.com/test-recipe/';
function recipeHtml(extra: Record<string, unknown> = {}): string {
  return `<html><head><meta property="og:site_name" content="RecipeTin Eats"><script type="application/ld+json">${JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Unrelated page' },
        {
          '@type': ['Recipe'],
          name: 'Miso &amp; salmon',
          description: '<b>A bright dinner.</b>',
          recipeYield: '4 servings',
          totalTime: 'PT1H15M',
          recipeIngredient: ['4 salmon fillets', '3 tbsp white miso'],
          keywords: 'Miso, Weeknight',
          recipeInstructions: [
            {
              '@type': 'HowToSection',
              name: 'Glaze',
              itemListElement: [{ '@type': 'HowToStep', text: 'Mix the glaze.' }],
            },
            { '@type': 'HowToStep', text: 'Roast the fish.' },
          ],
          image: [{ '@type': 'ImageObject', url: '/salmon.jpg' }, 'javascript:alert(1)'],
          ...extra,
        },
      ],
    },
  )}</script></head></html>`;
}
function htmlResponse(html = recipeHtml()): Response {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
function post(body: unknown, identity = crypto.randomUUID()): Request {
  return new Request('https://chef-grdn.example/api/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-identity': identity },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.useRealTimers());

describe('recipe URL boundary', () => {
  it('permits exact trusted publisher hosts with their www variant', () => {
    expect(isAllowedRecipeUrl(sourceUrl)).toBe(true);
    expect(isAllowedRecipeUrl('https://tastesbetterfromscratch.com/lasagna-soup/')).toBe(true);
  });
  it.each([
    'http://recipetineats.com/recipe',
    'https://127.0.0.1/recipe',
    'https://[::1]/recipe',
    'https://10.0.0.1/recipe',
    'https://169.254.169.254/latest/meta-data',
    'https://recipetineats.com.evil.example/recipe',
    'https://evil.recipetineats.com/recipe',
    'https://recipetineats.com@evil.example/recipe',
    'https://user:pass@recipetineats.com/recipe',
    'https://recipetineats.com:8080/recipe',
    'https://recipetineats.com/recipe#fragment',
    'not a URL',
  ])('rejects unsafe or unsupported URL %s', (url) => expect(isAllowedRecipeUrl(url)).toBe(false));
});

describe('structured recipe parsing', () => {
  it('finds recipes inside @graph and preserves method sections', () => {
    const recipe = parseRecipeHtml(recipeHtml(), sourceUrl);
    expect(recipe).toMatchObject({
      title: 'Miso & salmon',
      servings: 4,
      yield_label: '4 servings',
      time_label: '1 hr 15 min',
      intro: 'A bright dinner.',
      source_label: 'RecipeTin Eats',
      ingredients_text: '4 salmon fillets\n3 tbsp white miso',
      steps_text: '## Glaze\nMix the glaze.\nRoast the fish.',
      tags: ['Miso', 'Weeknight'],
      image_urls: ['https://www.recipetineats.com/salmon.jpg'],
      notes: [],
    });
  });
  it('handles root arrays, full schema type URLs, strings, image objects, and optional fields', () => {
    const html = `<script type="application/ld+json">${JSON.stringify([{ '@type': 'https://schema.org/Recipe', name: 'Soup', recipeInstructions: 'Simmer.\nServe.', recipeIngredient: ['Water'], image: { contentUrl: 'https://images.example/soup.jpg' } }])}</script>`;
    expect(parseRecipeHtml(html, sourceUrl)).toMatchObject({
      title: 'Soup',
      servings: null,
      steps_text: 'Simmer.\nServe.',
      image_urls: ['https://images.example/soup.jpg'],
    });
  });
  it('skips malformed JSON-LD and explains metadata-only imports', () => {
    const html =
      '<title>Plain recipe</title><script type="application/ld+json">{invalid}</script><meta property="og:description" content="Some lunch">';
    const result = parseRecipeHtml(html, sourceUrl);
    expect(result).toMatchObject({
      title: 'Plain recipe',
      intro: 'Some lunch',
      ingredients_text: '',
      steps_text: '',
    });
    expect(result.notes[0]).toContain('did not expose a complete structured recipe');
  });
  it('extracts publisher notes alongside structured recipe details', () => {
    const html =
      recipeHtml() +
      '<div class="wprm-recipe-notes"><p>Keep the skin dry.</p><p>Refrigerate leftovers.</p></div>';
    expect(parseRecipeHtml(html, sourceUrl).notes).toEqual([
      'Keep the skin dry.',
      'Refrigerate leftovers.',
    ]);
  });
  it('rejects pages without a usable title', () => {
    expect(() => parseRecipeHtml('<html></html>', sourceUrl)).toThrow('No recipe title');
  });
});

describe('bounded upstream fetching', () => {
  it('uses manual redirects and never fetches a redirect to a private address', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/private' } }),
      );
    await expect(importRecipeUrl(sourceUrl, fetcher)).rejects.toThrow('supported recipe publisher');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('manual');
  });
  it('follows a valid relative redirect and records the final source', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: '/new-recipe/' } }),
      )
      .mockResolvedValueOnce(htmlResponse());
    expect((await importRecipeUrl(sourceUrl, fetcher)).source_url).toBe(
      'https://www.recipetineats.com/new-recipe/',
    );
  });
  it('caps redirect chains', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(null, { status: 302, headers: { location: '/loop/' } }),
      );
    await expect(importRecipeUrl(sourceUrl, fetcher)).rejects.toThrow('redirected too many times');
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('rejects oversized declared and streamed responses', async () => {
    const declared = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('', { headers: { 'content-type': 'text/html', 'content-length': '3000000' } }),
      );
    await expect(importRecipeUrl(sourceUrl, declared)).rejects.toThrow('too large');
    const streamed = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array(2 * 1024 * 1024 + 1), {
        headers: { 'content-type': 'text/html' },
      }),
    );
    await expect(importRecipeUrl(sourceUrl, streamed)).rejects.toThrow('too large');
  });
  it('times out an unresponsive upstream within the total request budget', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>(() => {}));
    const result = expect(importRecipeUrl(sourceUrl, fetcher)).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(12_000);
    await result;
  });
  it('rejects unsupported response types and blocked upstreams', async () => {
    await expect(
      importRecipeUrl(
        sourceUrl,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response('{}', { headers: { 'content-type': 'application/json' } }),
          ),
      ),
    ).rejects.toThrow('does not point to a recipe');
    await expect(
      importRecipeUrl(
        sourceUrl,
        vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 })),
      ),
    ).rejects.toThrow('did not allow');
  });
});

describe('import HTTP handler', () => {
  it('returns a recipe for valid requests', async () => {
    const response = await handleImport(
      post({ url: sourceUrl }),
      vi.fn<typeof fetch>().mockResolvedValue(htmlResponse()),
      crypto.randomUUID(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ title: 'Miso & salmon' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects invalid bodies without making an upstream request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const body of [{}, { url: 12 }, { url: 'https://localhost/' }]) {
      const response = await handleImport(post(body), fetcher, crypto.randomUUID());
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('limits repeated requests per verified user', async () => {
    const identity = crypto.randomUUID();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => htmlResponse());
    for (let count = 0; count < 12; count++) {
      expect((await handleImport(post({ url: sourceUrl }), fetcher, identity)).status).toBe(200);
    }
    expect((await handleImport(post({ url: sourceUrl }), fetcher, identity)).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(12);
  });
  it('returns actionable network failures without leaking upstream details', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('sensitive network detail'));
    const response = await handleImport(post({ url: sourceUrl }), fetcher, crypto.randomUUID());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('sensitive');
  });
});
