'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Clipboard, Download, Loader2, PenLine } from 'lucide-react';
import { useRecipes } from '@/hooks/useRecipes';
import { useRecipeEditor } from '@/hooks/useRecipeEditor';
import { useClipboardPaste } from '@/hooks/useClipboardPaste';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddSheet, AddSheetProgress, AddSourceOptions } from '@/components/ui/add-sheet';
import { RecipeFormFields } from '@/components/recipes/RecipeFormFields';
import { recipeEditorSteps, recipeEditorTitles } from '@/lib/recipeEditor';
import { errorMessage } from '@/lib/utils';

export function RecipeEditor({
  open = true,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { slug } = useParams<{ slug?: string }>();
  const { recipes, canEdit, isDemo, loading } = useRecipes();
  const router = useRouter();
  const prefix = isDemo ? '/demo' : '';
  const existing = recipes.find((recipe) => recipe.slug === slug);
  const editor = useRecipeEditor(existing, () => onOpenChange?.(false));
  const { formStep, formIndex, step, navigate, back, importing, saving, error, setError } = editor;
  const clipboard = useClipboardPaste(open && step === 'import');
  const close = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else if (!next) router.push(existing ? `${prefix}/r/${existing.slug}` : `${prefix}/`);
  };
  if (loading) return <div className="page-loader">Opening recipe editor…</div>;
  if (!canEdit)
    return (
      <div className="auth-state">
        <h1>Sign in as the owner</h1>
        <p>Only the owner can add and edit recipes.</p>
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  if (slug && !existing)
    return (
      <div className="auth-state">
        <h1>Recipe not found</h1>
        <Link href={`${prefix}/`}>Back to recipes</Link>
      </div>
    );
  return (
    <AddSheet
      open={open}
      onOpenChange={close}
      title={existing ? 'Edit recipe' : 'Add recipe'}
      busy={saving || importing}
      form={step === 'details'}
      focusKey={`${step}-${formStep}`}
      onBack={!existing && step !== 'source' ? back : undefined}
    >
      {step === 'source' && (
        <AddSourceOptions
          options={[
            { label: 'Import', icon: Download, onSelect: () => navigate('import') },
            { label: 'Enter manually', icon: PenLine, onSelect: () => navigate('details') },
          ]}
        />
      )}
      {step === 'import' && (
        <form
          className="add-sheet-import"
          onSubmit={(event) => {
            event.preventDefault();
            void editor.importRecipe();
          }}
        >
          <Input
            type="url"
            required
            maxLength={2048}
            aria-label="Recipe website URL"
            placeholder="https://recipe-website.com/…"
            value={editor.url}
            disabled={importing}
            onChange={(event) => editor.setUrl(event.target.value)}
          />
          {clipboard.available && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                void clipboard
                  .paste()
                  .then((url) => {
                    editor.setUrl(url);
                    setError('');
                  })
                  .catch((failure) => setError(errorMessage(failure)))
              }
            >
              <Clipboard /> Paste from clipboard
            </Button>
          )}
          <Button disabled={importing || !editor.url.trim()}>
            {importing ? <Loader2 className="animate-spin" /> : <Download />}
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </form>
      )}
      {step === 'details' && (
        <>
          {!existing && (
            <AddSheetProgress
              titles={recipeEditorSteps.map((item) => recipeEditorTitles[item])}
              index={formIndex}
            />
          )}
          <form className="add-sheet-form" onSubmit={(event) => void editor.save(event)} noValidate>
            <div className="add-sheet-form-body" key={existing ? 'edit' : formStep}>
              <fieldset className="add-sheet-fields" disabled={saving || importing}>
                <RecipeFormFields
                  editor={editor}
                  recipes={recipes}
                  existing={existing}
                  step={formStep}
                  all={!!existing}
                />
              </fieldset>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="add-sheet-footer">
              <Button type="submit" disabled={saving || importing}>
                {saving && <Loader2 className="animate-spin" />}
                {saving
                  ? 'Saving…'
                  : existing
                    ? 'Save changes'
                    : formStep === 'photos'
                      ? 'Save recipe'
                      : 'Continue'}
                {!existing && formStep !== 'photos' && <ChevronRight aria-hidden="true" />}
              </Button>
            </div>
          </form>
        </>
      )}
      {error && step !== 'details' && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </AddSheet>
  );
}
