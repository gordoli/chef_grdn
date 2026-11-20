'use client';
import { socialImportPolicy } from '@/config/loading';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRestaurants } from './useRestaurants';
import { useSession } from './useSession';
import { useRestaurantSocialImport } from './useRestaurantSocialImport';
import { mergeYelpBusiness, mergeYelpReviewPhotos } from '@/lib/restaurantYelp';
import { mergeTikTokImport, type TikTokImportResult } from '@/lib/restaurantTikTok';
import {
  restaurantEditorFieldStep,
  restaurantEditorInput,
  mergeRestaurantWebsite,
  restaurantEditorSteps,
  type RestaurantEditorStep,
} from '@/lib/restaurantEditor';
import {
  emptyRestaurant,
  restaurantLocations,
  restaurantInput,
  type Restaurant,
  type RestaurantInput,
} from '@/lib/restaurants';

export function useRestaurantEditor(
  restaurant: Restaurant | undefined,
  onOpenChange: (open: boolean) => void,
  importJobId?: string,
) {
  const { save, isDemo } = useRestaurants();
  const { session } = useSession();
  const router = useRouter();
  const socialImport = useRestaurantSocialImport(importJobId);
  const [yelpLink, setYelpLink] = useState(
    restaurant?.yelp_url ??
      restaurant?.yelp_data[0]?.url ??
      (socialImport.job?.source === 'yelp' ? socialImport.job.url : ''),
  );
  const [tikTokLink, setTikTokLink] = useState(
    socialImport.job?.source === 'tiktok' ? socialImport.job.url : '',
  );
  const [tikTokPreview, setTikTokPreview] = useState<TikTokImportResult | null>(null);
  const [locationIndex, setLocationIndex] = useState(socialImport.job?.location_index ?? 0);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [excludedPhotos, setExcludedPhotos] = useState<string[]>([]);
  const [draft, setDraft] = useState<RestaurantInput>({
    ...(restaurant ?? emptyRestaurant),
    locations: restaurantLocations(restaurant ?? emptyRestaurant),
  });
  const [videos, setVideos] = useState(restaurant?.video_urls.join('\n') ?? '');
  const [photos, setPhotos] = useState(restaurant?.photo_urls.join('\n') ?? '');
  const [companions, setCompanions] = useState(restaurant?.companions.join(', ') ?? '');
  const [link, setLink] = useState(restaurant?.website ?? '');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'source' | 'import' | 'website' | 'yelp' | 'tiktok' | 'details'>(
    restaurant
      ? 'details'
      : socialImport.job?.source === 'yelp'
        ? 'yelp'
        : socialImport.job?.source === 'tiktok'
          ? 'tiktok'
          : 'source',
  );
  const [wizardStep, setWizardStep] = useState<RestaurantEditorStep>('main');
  const [importReturnStep, setImportReturnStep] = useState<RestaurantEditorStep>('main');
  const formSteps = restaurantEditorSteps(draft.status);
  const formIndex = formSteps.indexOf(wizardStep);
  const navigate = (next: typeof step) => {
    setError('');
    setStep(next);
    if (next === 'details') setWizardStep(importReturnStep);
  };
  const openImport = (next: 'source' | 'tiktok' | 'yelp') => {
    setImportReturnStep(wizardStep);
    navigate(next);
  };
  const goBack = () => {
    setError('');
    if (step === 'details') {
      if (formIndex > 0) setWizardStep(formSteps[formIndex - 1]);
      else if (restaurant) onOpenChange(false);
      else {
        setImportReturnStep('main');
        navigate('source');
      }
    } else if (step === 'source' || (step === 'yelp' && tikTokPreview)) navigate('details');
    else if (step === 'import') navigate('source');
    else navigate('import');
  };
  const set = <K extends keyof RestaurantInput>(key: K, value: RestaurantInput[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const importLink = async () => {
    if (!session || isDemo) return;
    setImporting(true);
    setError('');
    try {
      const response = await fetch('/api/import-restaurant', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: link }),
        signal: AbortSignal.timeout(socialImportPolicy.websiteTimeoutMs),
      });
      const result: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          result && typeof result === 'object' && 'error' in result
            ? String(result.error)
            : 'Could not import this website.',
        );
      const imported = restaurantInput.parse(result);
      setDraft((previous) => mergeRestaurantWebsite(previous, imported));
      setPhotos((previous) =>
        [...new Set([...previous.split('\n').filter(Boolean), ...imported.photo_urls])]
          .slice(0, 12)
          .join('\n'),
      );
      toast.success('Website details imported. Review them before saving.');
      setWizardStep('main');
      setStep('details');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not import this website.');
    } finally {
      setImporting(false);
    }
  };
  const appliedImport = useRef<{ id: string; complete: boolean } | null>(null);
  const job = socialImport.job;
  useEffect(() => {
    if (!job) return;
    if (job.source === 'yelp') {
      const result = job.result ?? job.preview;
      if (!result) return;
      if (appliedImport.current?.id !== job.id) {
        setDraft((previous) => mergeYelpBusiness(previous, result.business, locationIndex));
        setImportWarnings(result.warnings);
        setWizardStep('main');
        setStep('details');
        appliedImport.current = { id: job.id, complete: !!job.result };
      } else if (job.result && !appliedImport.current.complete) {
        setDraft((previous) => mergeYelpReviewPhotos(previous, job.result!.business));
        setImportWarnings(job.result.warnings);
        appliedImport.current.complete = true;
      }
    } else if (job.result && appliedImport.current?.id !== job.id) {
      const result = job.result;
      setDraft((previous) =>
        importReturnStep === 'links' ? previous : mergeTikTokImport(previous, result),
      );
      setVideos((previous) =>
        [...new Set([...previous.split('\n').filter(Boolean), result.video_url])].join('\n'),
      );
      setTikTokPreview(result);
      setWizardStep(importReturnStep);
      setStep('details');
      appliedImport.current = { id: job.id, complete: true };
    }
  }, [job, locationIndex, importReturnStep]);
  const importYelp = async () => {
    setImporting(true);
    setError('');
    try {
      await socialImport.startYelp(yelpLink, { restaurantId: restaurant?.id, locationIndex });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Yelp import failed.');
    } finally {
      setImporting(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (wizardStep === 'main' && !draft.name.trim()) {
      setError('Enter a restaurant name.');
      return;
    }
    try {
      const input = restaurantEditorInput(draft, {
        photos,
        videos,
        companions,
        excludedPhotos,
        slug: restaurant?.slug,
      });
      if (!input.success) {
        const relevant =
          wizardStep === 'links'
            ? input.error.issues
            : input.error.issues.filter(
                (issue) => restaurantEditorFieldStep(String(issue.path[0])) === wizardStep,
              );
        if (relevant.length) {
          setWizardStep(restaurantEditorFieldStep(String(relevant[0].path[0])));
          throw new Error(relevant[0].message);
        }
      }
      if (wizardStep !== 'links') {
        setWizardStep(formSteps[formIndex + 1]);
        return;
      }
      if (!input.success) throw new Error(input.error.issues[0].message);
      if (socialImport.job?.status === 'running')
        throw new Error(
          'Photos are still loading. Keep this import in the background or skip photos.',
        );
      setBusy(true);
      const saved = await save(input.data, restaurant?.id);
      socialImport.consume();
      onOpenChange(false);
      toast.success('Restaurant saved');
      router.push(`${isDemo ? '/demo' : ''}/restaurants/${saved.slug}`);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save this restaurant.');
    } finally {
      setBusy(false);
    }
  };
  const importTikTok = async () => {
    setImporting(true);
    setError('');
    try {
      await socialImport.startTikTok(tikTokLink, { restaurantId: restaurant?.id });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'TikTok import failed.');
    } finally {
      setImporting(false);
    }
  };
  return {
    isDemo,
    session,
    socialImport,
    yelpLink,
    setYelpLink,
    tikTokLink,
    setTikTokLink,
    tikTokPreview,
    locationIndex,
    setLocationIndex,
    importWarnings,
    excludedPhotos,
    setExcludedPhotos,
    draft,
    setDraft,
    videos,
    setVideos,
    photos,
    setPhotos,
    companions,
    setCompanions,
    link,
    setLink,
    busy,
    importing,
    error,
    setError,
    step,
    wizardStep,
    setWizardStep,
    formSteps,
    formIndex,
    navigate,
    openImport,
    goBack,
    set,
    importLink,
    importYelp,
    importTikTok,
    submit,
  };
}
