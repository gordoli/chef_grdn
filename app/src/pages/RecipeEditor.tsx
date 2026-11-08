import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRecipes, type RecipeInput } from '@/hooks/useRecipes';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { PhotoManager } from '@/components/PhotoManager';
import { parseIngredientsText, toText } from '@/lib/quantity';
import { parseStepsText, stepsToText } from '@/lib/recipeText';
import { recipeFormSchema } from '@/lib/validation';
import { errorMessage, safeUrl } from '@/lib/utils';
import type { ImportedRecipe } from '../../server/import';
interface FormValues {
  title: string;
  type: string;
  tags: string;
  servings: string;
  yield_label: string;
  time_label: string;
  intro: string;
  source_url: string;
  source_label: string;
  notion_url: string;
  ingredients_text: string;
  steps_text: string;
  notes: string;
}
function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`form-field ${wide ? 'field-wide' : ''}`}>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      {children}
    </label>
  );
}
export function RecipeEditor() {
  const { slug } = useParams();
  const { recipes, saveRecipe, addPhotos, canEdit, isDemo, loading } = useRecipes();
  const { session } = useSession();
  const navigate = useNavigate();
  const prefix = isDemo ? '/demo' : '';
  const existing = recipes.find((r) => r.slug === slug);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormValues>(() => ({
    title: existing?.title ?? '',
    type: existing?.type ?? 'Mains',
    tags: existing?.tags.join(', ') ?? '',
    servings: existing?.servings?.toString() ?? '',
    yield_label: existing?.yield_label ?? '',
    time_label: existing?.time_label ?? '',
    intro: existing?.intro ?? '',
    source_url: existing?.source_url ?? '',
    source_label: existing?.source_label ?? '',
    notion_url: existing?.notion_url ?? '',
    ingredients_text: existing ? toText(existing.ingredients) : '',
    steps_text: existing ? stepsToText(existing.steps) : '',
    notes: existing?.notes.join('\n') ?? '',
  }));
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [selectedSourceImage, setSelectedSourceImage] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imported, setImported] = useState(false);
  const [tab, setTab] = useState<'link' | 'manual'>('link');
  function update(key: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function importRecipe() {
    setImporting(true);
    setError('');
    try {
      if (isDemo)
        throw new Error(
          'Sign in as the owner to import a website. You can add a recipe manually in preview.',
        );
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not import this recipe.');
      const recipe: ImportedRecipe = result;
      setForm((current) => ({
        ...current,
        ...recipe,
        tags: recipe.tags.join(', '),
        servings: recipe.servings?.toString() ?? '',
        yield_label: recipe.yield_label ?? '',
        time_label: recipe.time_label ?? '',
        intro: recipe.intro ?? '',
        notes: recipe.notes.join('\n'),
      }));
      setSourceImages(recipe.image_urls);
      setSelectedSourceImage(recipe.image_urls[0] ?? null);
      setImageFailed(false);
      setImported(true);
      setTab('manual');
      toast.success('Recipe imported. Give it a look before saving.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setImporting(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    const validation = recipeFormSchema.safeParse(form);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    const servings = form.servings ? Number(form.servings) : null;
    if (servings !== null && (!Number.isFinite(servings) || servings <= 0)) {
      setError('Base servings must be greater than zero.');
      return;
    }
    if (form.source_url && !safeUrl(form.source_url)) {
      setError('Use a complete http or https source URL.');
      return;
    }
    setSaving(true);
    try {
      const values: RecipeInput = {
        title: form.title.trim(),
        type: form.type.trim() || 'Mains',
        tags: form.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        servings,
        yield_label: form.yield_label || null,
        time_label: form.time_label || null,
        intro: form.intro || null,
        source_url: form.source_url || null,
        source_label: form.source_label || null,
        notion_url: form.notion_url || null,
        ingredients: parseIngredientsText(form.ingredients_text),
        steps: parseStepsText(form.steps_text),
        notes: form.notes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const recipe = await saveRecipe(values, existing?.id);
      const uploads = [...files];
      let photoWarning = '';
      if (selectedSourceImage && !isDemo) {
        try {
          const response = await fetch('/api/import-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
            },
            body: JSON.stringify({ url: selectedSourceImage }),
          });
          if (!response.ok) throw new Error('The source photo could not be imported.');
          const blob = await response.blob();
          uploads.unshift(new File([blob], 'Source photo.jpg', { type: blob.type }));
        } catch (failure) {
          photoWarning = errorMessage(failure);
        }
      }
      if (uploads.length) {
        try {
          await addPhotos(recipe.id, uploads);
        } catch (failure) {
          photoWarning = `Recipe saved. Photo upload failed: ${errorMessage(failure)}`;
        }
      }
      toast.success(existing ? 'Recipe updated.' : 'Added to your collection.');
      if (photoWarning) toast.error(`${photoWarning} You can upload it in Edit.`);
      navigate(`${prefix}/r/${recipe.slug}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <div className="page-loader">Opening recipe editor…</div>;
  if (!canEdit)
    return (
      <div className="auth-state">
        <h1>Gordon’s kitchen</h1>
        <p>Only the owner can add and edit recipes.</p>
        <Button asChild>
          <Link to={`${prefix}/`}>Back to recipes</Link>
        </Button>
      </div>
    );
  if (slug && !existing)
    return (
      <div className="auth-state">
        <h1>Recipe not found</h1>
        <Link to={`${prefix}/`}>Back to collection</Link>
      </div>
    );
  return (
    <div className="editor-page page-width">
      <Link to={existing ? `${prefix}/r/${existing.slug}` : `${prefix}/`} className="back-link">
        <ArrowLeft size={16} />
        Back to {existing ? 'recipe' : 'collection'}
      </Link>
      <div className="editor-heading">
        <span className="eyebrow">A PLACE IN THE COLLECTION</span>
        <h1>{existing ? 'A little refinement.' : 'Something worth saving.'}</h1>
        <p>
          {existing
            ? 'A good recipe gets better every time you make it.'
            : 'From a favorite website, or straight from your kitchen.'}
        </p>
      </div>
      {!existing && (
        <section className="import-section">
          <div className="editor-tabs">
            <button aria-pressed={tab === 'link'} onClick={() => setTab('link')}>
              <Link2 size={17} />
              Import a link
            </button>
            <button aria-pressed={tab === 'manual'} onClick={() => setTab('manual')}>
              <Plus size={17} />
              Write a recipe
            </button>
          </div>
          {tab === 'link' && (
            <div className="import-body">
              <span className="import-icon">
                <Sparkles strokeWidth={1.4} />
              </span>
              <h2>Found something delicious?</h2>
              <p>
                Paste a recipe link. We’ll gather the ingredients, method, and photos for you to
                review.
              </p>
              <div className="import-input">
                <Input
                  aria-label="Recipe website URL"
                  type="url"
                  placeholder="https://your-favorite-recipe.com/…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void importRecipe();
                    }
                  }}
                />
                <Button disabled={importing || !url.trim()} onClick={() => void importRecipe()}>
                  {importing ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
                  {importing ? 'Importing…' : 'Import recipe'}
                </Button>
              </div>
              <small>
                Works with recipe sites including Serious Eats, Allrecipes, RecipeTin Eats, and
                more. For social posts, write or paste the recipe below.
              </small>
            </div>
          )}
        </section>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {(existing || tab === 'manual') && (
        <form onSubmit={(event) => void save(event)} className="recipe-editor-form">
          {imported && (
            <div className="import-success">
              <Check size={17} />
              Imported from the original source. Review and make it your own.
            </div>
          )}
          <section className="editor-section">
            <div className="editor-section-heading">
              <span>01</span>
              <h2>The basics</h2>
            </div>
            <div className="form-grid">
              <Field label="Recipe name" wide>
                <Input
                  required
                  maxLength={180}
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="What are we making?"
                />
              </Field>
              <Field label="Type">
                <Input
                  list="recipe-types"
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                />
                <datalist id="recipe-types">
                  {[
                    ...new Set([
                      'Breakfast',
                      'Starters',
                      'Mains',
                      'Sides',
                      'Soups',
                      'Salads',
                      'Sauces',
                      'Desserts',
                      'Drinks',
                      ...recipes.map((r) => r.type),
                    ]),
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </datalist>
              </Field>
              <Field label="Tags" hint="Separate with commas">
                <Input
                  value={form.tags}
                  onChange={(e) => update('tags', e.target.value)}
                  placeholder="Miso, weeknight, comfort food"
                />
              </Field>
              <Field label="Base servings" hint="For scaling ingredients">
                <Input
                  type="number"
                  min="0.5"
                  max="1000"
                  step="0.5"
                  value={form.servings}
                  onChange={(e) => update('servings', e.target.value)}
                  placeholder="4"
                />
              </Field>
              <Field label="Time">
                <Input
                  value={form.time_label}
                  onChange={(e) => update('time_label', e.target.value)}
                  placeholder="30 min"
                />
              </Field>
              <Field label="Yield" wide>
                <Input
                  value={form.yield_label}
                  onChange={(e) => update('yield_label', e.target.value)}
                  placeholder="Serves 4, with a little left over"
                />
              </Field>
              <Field label="A little about it" wide>
                <Textarea
                  value={form.intro}
                  onChange={(e) => update('intro', e.target.value)}
                  placeholder="The story, the inspiration, or what makes this one special."
                />
              </Field>
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section-heading">
              <span>02</span>
              <h2>Into the kitchen</h2>
            </div>
            <div className="form-grid">
              <Field label="Ingredients" hint="One per line. Use ## for a section heading." wide>
                <Textarea
                  required
                  rows={9}
                  value={form.ingredients_text}
                  onChange={(e) => update('ingredients_text', e.target.value)}
                  placeholder={'## For the sauce\n3 tbsp white miso\n1–2 tbsp water, to loosen'}
                />
              </Field>
              <Field label="Method" hint="One step per line. Use ## for a section heading." wide>
                <Textarea
                  required
                  rows={9}
                  value={form.steps_text}
                  onChange={(e) => update('steps_text', e.target.value)}
                  placeholder="Start with the first step…"
                />
              </Field>
              <Field
                label="Kitchen notes"
                hint="Tips, swaps, and things to remember. One per line."
                wide
              >
                <Textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Next time, try…"
                />
              </Field>
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section-heading">
              <span>03</span>
              <h2>Make it yours</h2>
            </div>
            <div className="form-grid">
              <Field label="Original source URL">
                <Input
                  type="url"
                  value={form.source_url}
                  onChange={(e) => update('source_url', e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Source name">
                <Input
                  value={form.source_label}
                  onChange={(e) => update('source_label', e.target.value)}
                  placeholder="The cook, creator, or website"
                />
              </Field>
            </div>
            {existing ? (
              <PhotoManager recipeId={existing.id} />
            ) : (
              <div className="new-photos">
                <div className="field-heading">
                  <div>
                    <h3>Photos</h3>
                    <p>A little visual inspiration.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload />
                    Upload photos
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setFiles((current) => [...current, ...Array.from(e.target.files ?? [])])
                  }
                />
                {sourceImages.length > 0 && (
                  <div className="source-images">
                    {sourceImages.map((image) => (
                      <button
                        type="button"
                        key={image}
                        aria-label="Use imported source photo"
                        aria-pressed={selectedSourceImage === image}
                        onClick={() => {
                          setSelectedSourceImage(selectedSourceImage === image ? null : image);
                          setImageFailed(false);
                        }}
                      >
                        <img
                          src={safeUrl(image)}
                          alt="Photo from the recipe source"
                          onError={() => setImageFailed(true)}
                        />
                        {selectedSourceImage === image && (
                          <span>
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    ))}
                    <p>
                      The selected source photo will be saved with the recipe.
                      {imageFailed && ' Some source images are unavailable.'}
                    </p>
                  </div>
                )}
                {files.length ? (
                  <ul className="upload-file-list">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <ImagePlus size={16} />
                        {file.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFiles((current) => current.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !sourceImages.length && (
                    <p className="photo-empty">No photo yet? You can always add one later.</p>
                  )
                )}
              </div>
            )}
          </section>
          <div className="editor-save">
            <Button type="button" variant="ghost" asChild>
              <Link to={existing ? `${prefix}/r/${existing.slug}` : `${prefix}/`}>Cancel</Link>
            </Button>
            <Button size="lg" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Check />}
              {saving ? 'Saving recipe…' : existing ? 'Save changes' : 'Save recipe'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
