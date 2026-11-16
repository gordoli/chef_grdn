'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRecipes, type RecipeInput } from './useRecipes';
import { useSession } from './useSession';
import { parseIngredientsText, toText } from '@/lib/quantity';
import { parseStepsText, stepsToText } from '@/lib/recipeText';
import {
  applyRecipeImport,
  recipeEditorIssue,
  recipeEditorSteps,
  type RecipeEditorStep,
  type RecipeFormValues,
} from '@/lib/recipeEditor';
import { errorMessage } from '@/lib/utils';
import type { Recipe } from '@/lib/types';
import { socialImportPolicy } from '@/config/loading';

export function useRecipeEditor(existing?: Recipe, onSaved?: () => void) {
  const { saveRecipe, addPhotos, isDemo } = useRecipes();
  const { session } = useSession();
  const router = useRouter();
  const prefix = isDemo ? '/demo' : '';
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<RecipeFormValues>(() => ({
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
  const [step, setStep] = useState<'source' | 'import' | 'details'>(
    existing ? 'details' : 'source',
  );
  const [formStep, setFormStep] = useState<RecipeEditorStep>('main');
  const formIndex = recipeEditorSteps.indexOf(formStep);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function navigate(next: typeof step) {
    setError('');
    setStep(next);
  }
  function back() {
    setError('');
    if (step === 'details' && formIndex > 0) setFormStep(recipeEditorSteps[formIndex - 1]);
    else navigate('source');
  }
  function update(key: keyof RecipeFormValues, value: string) {
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
      if (!session) throw new Error('Sign in as the owner to import a recipe.');
      controller.current?.abort();
      const active = new AbortController();
      controller.current = active;
      const response = await fetch('/api/import', {
        signal: AbortSignal.any([
          active.signal,
          AbortSignal.timeout(socialImportPolicy.websiteTimeoutMs),
        ]),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ url }),
      });
      const result: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          result && typeof result === 'object' && 'error' in result
            ? String(result.error)
            : 'Could not import this recipe.',
        );
      const imported = applyRecipeImport(form, result);
      setForm(imported.form);
      setSourceImages(imported.images);
      setSelectedSourceImage(imported.images[0] ?? null);
      setImageFailed(false);
      setFormStep('main');
      setStep('details');
      toast.success('Recipe imported.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setImporting(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    const finalStep = existing || formStep === 'photos';
    const issue = recipeEditorIssue(form, finalStep ? undefined : formStep);
    if (issue) {
      setError(issue.message);
      setFormStep(issue.step);
      return;
    }
    if (!finalStep) {
      setFormStep(recipeEditorSteps[formIndex + 1]);
      return;
    }
    const servings = form.servings ? Number(form.servings) : null;
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
      toast.success(existing ? 'Recipe updated.' : 'Recipe saved.');
      if (photoWarning) toast.error(`${photoWarning} You can upload it in Edit.`);
      onSaved?.();
      router.push(`${prefix}/r/${recipe.slug}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }
  return {
    form,
    update,
    url,
    setUrl,
    importing,
    saving,
    error,
    setError,
    files,
    setFiles,
    fileRef,
    sourceImages,
    selectedSourceImage,
    setSelectedSourceImage,
    imageFailed,
    setImageFailed,
    step,
    navigate,
    formStep,
    formIndex,
    back,
    importRecipe,
    save,
  };
}
