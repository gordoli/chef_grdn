'use client';
import type { ReactNode } from 'react';
import { Check, ImagePlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { PhotoManager } from '@/components/PhotoManager';
import { recipeTypes, recipeTypeLabel } from '@/lib/recipeCollection';
import { safeUrl } from '@/lib/utils';
import type { Recipe } from '@/lib/types';
import type { RecipeEditorStep } from '@/lib/recipeEditor';
import type { useRecipeEditor } from '@/hooks/useRecipeEditor';

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
export function RecipeFormFields({
  editor,
  recipes,
  existing,
  step,
  all = false,
}: {
  editor: ReturnType<typeof useRecipeEditor>;
  recipes: Recipe[];
  existing?: Recipe;
  step: RecipeEditorStep;
  all?: boolean;
}) {
  const {
    form,
    update,
    files,
    setFiles,
    fileRef,
    sourceImages,
    selectedSourceImage,
    setSelectedSourceImage,
    imageFailed,
    setImageFailed,
  } = editor;
  return (
    <>
      {(all || step === 'main') && (
        <section className="recipe-form-section">
          <div className="form-grid">
            <Field label="Recipe name" wide>
              <Input
                required
                maxLength={180}
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Recipe name"
              />
            </Field>
            <Field label="Type">
              <Input
                list="recipe-types"
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
              />
              <datalist id="recipe-types">
                {[...new Set([...recipeTypes, ...recipes.map((r) => recipeTypeLabel(r.type))])].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
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
                placeholder="Serves 4"
              />
            </Field>
            <Field label="Description" wide>
              <Textarea
                value={form.intro}
                onChange={(e) => update('intro', e.target.value)}
                placeholder="Optional description"
              />
            </Field>
          </div>
        </section>
      )}
      {(all || step === 'method') && (
        <section className="recipe-form-section">
          <div className="form-grid">
            <Field label="Ingredients" hint="One per line. Use ## for a section heading." wide>
              <Textarea
                required
                rows={6}
                value={form.ingredients_text}
                onChange={(e) => update('ingredients_text', e.target.value)}
                placeholder={'## For the sauce\n3 tbsp white miso\n1–2 tbsp water, to loosen'}
              />
            </Field>
            <Field label="Method" hint="One step per line. Use ## for a section heading." wide>
              <Textarea
                required
                rows={6}
                value={form.steps_text}
                onChange={(e) => update('steps_text', e.target.value)}
                placeholder="Start with the first step…"
              />
            </Field>
            <Field label="Notes" hint="Tips, swaps, and things to remember. One per line." wide>
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Next time, try…"
              />
            </Field>
          </div>
        </section>
      )}
      {(all || step === 'photos') && (
        <section className="recipe-form-section">
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
                        onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                !sourceImages.length && <p className="photo-empty">No photos added.</p>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
