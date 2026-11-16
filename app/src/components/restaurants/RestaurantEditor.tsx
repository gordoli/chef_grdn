'use client';
import { useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Globe,
  LoaderCircle,
  PenLine,
  Search,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useClipboardPaste } from '@/hooks/useClipboardPaste';
import {
  RestaurantMainDetails,
  RestaurantPersonalDetails,
  RestaurantLinksDetails,
  RestaurantGalleryDetails,
} from './RestaurantFormSteps';
import { restaurantEditorTitles } from '@/lib/restaurantEditor';
import { useRestaurantEditor } from '@/hooks/useRestaurantEditor';
import styles from './RestaurantEditor.module.css';
import type { Restaurant } from '@/lib/restaurants';

export function RestaurantEditor({
  restaurant,
  open,
  onOpenChange,
}: {
  restaurant?: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
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
  } = useRestaurantEditor(restaurant, onOpenChange);
  const heading = useRef<HTMLHeadingElement>(null);
  const clipboard = useClipboardPaste(open && (step === 'yelp' || step === 'tiktok'));
  useEffect(() => {
    heading.current?.focus();
  }, [step, wizardStep]);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy && !importing) onOpenChange(value);
      }}
    >
      <DialogContent
        className={`restaurant-editor ${restaurant ? '' : styles.sheet} ${step === 'details' ? styles.wizard : ''}`}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          heading.current?.focus();
        }}
      >
        {(step !== 'source' || restaurant || draft.name) && (
          <Button
            variant="ghost"
            size="icon"
            className={`glass-control ${styles.back}`}
            aria-label={step === 'details' && formIndex > 0 ? 'Previous step' : 'Back'}
            onClick={goBack}
            disabled={busy || importing}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <DialogTitle ref={heading} tabIndex={-1} className={styles.title}>
          {step === 'details'
            ? restaurantEditorTitles[wizardStep]
            : step === 'website'
              ? 'Import from website'
              : step === 'yelp'
                ? 'Import from Yelp'
                : step === 'tiktok'
                  ? 'Import from TikTok'
                  : restaurant
                    ? 'Import details'
                    : 'Add restaurant'}
        </DialogTitle>
        <DialogDescription
          className={
            step === 'yelp' || step === 'tiktok' || step === 'details'
              ? 'sr-only'
              : styles.description
          }
        >
          {step === 'source'
            ? 'How would you like to add a place?'
            : step === 'website'
              ? 'Paste the restaurant’s website, then review its details before saving.'
              : step === 'yelp'
                ? 'Import restaurant details from Yelp.'
                : step === 'tiktok'
                  ? 'Import a restaurant video from TikTok.'
                  : 'Review the details and make this place yours.'}
        </DialogDescription>
        {step === 'source' && (
          <div className={styles.options}>
            <Button variant="outline" className={styles.option} onClick={() => navigate('website')}>
              <span className={styles.icon}>
                <Globe aria-hidden="true" />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Website</span>
                <span className={styles.optionDescription}>Import from a restaurant’s website</span>
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button variant="outline" className={styles.option} onClick={() => navigate('yelp')}>
              <span className={styles.icon}>
                <Search aria-hidden="true" />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Import from Yelp</span>
                <span className={styles.optionDescription}>
                  Restaurant details and review photos
                </span>
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button variant="outline" className={styles.option} onClick={() => navigate('tiktok')}>
              <span className={styles.icon}>
                <Video aria-hidden="true" />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Import from TikTok</span>
                <span className={styles.optionDescription}>Add a place from a video</span>
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button variant="ghost" onClick={() => navigate('details')}>
              <PenLine aria-hidden="true" /> Enter details manually
            </Button>
          </div>
        )}
        {(step === 'yelp' || step === 'tiktok') && (
          <form
            className={styles.yelp}
            onSubmit={(event) => {
              event.preventDefault();
              void (step === 'yelp' ? importYelp() : importTikTok());
            }}
          >
            <div className={styles.field}>
              <Input
                aria-label={step === 'yelp' ? 'Yelp link' : 'TikTok link'}
                type="url"
                required
                maxLength={2048}
                placeholder={
                  step === 'yelp'
                    ? 'https://www.yelp.com/biz/restaurant-name'
                    : 'https://www.tiktok.com/@creator/video/…'
                }
                value={step === 'yelp' ? yelpLink : tikTokLink}
                onChange={(event) =>
                  step === 'yelp'
                    ? setYelpLink(event.target.value)
                    : setTikTokLink(event.target.value)
                }
                disabled={importing}
              />
            </div>
            {clipboard.available && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.paste}
                disabled={importing}
                onClick={async () => {
                  try {
                    const pasted = await clipboard.paste();
                    if (step === 'yelp') setYelpLink(pasted);
                    else setTikTokLink(pasted);
                    setError('');
                  } catch (failure) {
                    setError(failure instanceof Error ? failure.message : 'Could not paste.');
                  }
                }}
              >
                <Clipboard aria-hidden="true" /> Paste from clipboard
              </Button>
            )}
            {step === 'yelp' && restaurant && draft.locations.length > 1 && (
              <label className={styles.field}>
                Location to update
                <select
                  value={locationIndex}
                  onChange={(event) => setLocationIndex(Number(event.target.value))}
                  disabled={importing}
                >
                  {draft.locations.map((location, index) => (
                    <option key={index} value={index}>
                      {location.neighborhood || location.address || `Location ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              type="submit"
              disabled={
                !(step === 'yelp' ? yelpLink : tikTokLink) || !session || isDemo || importing
              }
            >
              {importing ? <LoaderCircle className="animate-spin" /> : <Download />}{' '}
              {step === 'yelp' ? 'Import details & photos' : 'Import video'}
            </Button>
            {socialImport.progress && (
              <p role="status">{socialImport.progress} This can take a few minutes.</p>
            )}
            {importing && (
              <Button type="button" variant="secondary" onClick={socialImport.cancel}>
                Cancel import
              </Button>
            )}
          </form>
        )}
        {step === 'website' && (
          <form
            className="restaurant-import"
            onSubmit={(event) => {
              event.preventDefault();
              void importLink();
            }}
          >
            <Input
              type="url"
              required
              maxLength={2048}
              aria-label="Restaurant website to import"
              placeholder="https://restaurant.com"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              disabled={importing || busy}
            />
            <Button
              variant="secondary"
              type="submit"
              disabled={!link || !session || isDemo || busy || importing}
            >
              {importing ? <LoaderCircle className="animate-spin" /> : <Download />} Import
            </Button>
          </form>
        )}
        {step === 'website' && (isDemo || !session) && (
          <p className="muted">
            Website import is available in the live collection after signing in.
          </p>
        )}
        {error && step !== 'details' && (
          <p role="alert" className="restaurant-error">
            {error}
          </p>
        )}
        {step === 'details' && (
          <>
            <div className={styles.progress}>
              <span>
                Step {formIndex + 1} of {formSteps.length}
              </span>
              <ol aria-label="Restaurant setup">
                {formSteps.map((item, index) => (
                  <li
                    key={item}
                    aria-current={item === wizardStep ? 'step' : undefined}
                    data-complete={index <= formIndex}
                    aria-label={restaurantEditorTitles[item]}
                  />
                ))}
              </ol>
            </div>
            <form
              onSubmit={(event) => void submit(event)}
              className={`restaurant-form ${styles.wizardForm}`}
              noValidate
            >
              {wizardStep === 'main' && tikTokPreview && (
                <details className={styles.importNotes}>
                  <summary>TikTok caption</summary>
                  <p className={styles.caption}>{tikTokPreview.caption}</p>
                  <a href={tikTokPreview.video_url} target="_blank" rel="noreferrer">
                    {tikTokPreview.author ? `@${tikTokPreview.author}` : 'View on TikTok'} ↗
                  </a>
                </details>
              )}
              {wizardStep === 'main' && importWarnings.length > 0 && (
                <details className={styles.importNotes}>
                  <summary>Import notes</summary>
                  {importWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </details>
              )}
              <fieldset key={wizardStep} className={styles.stepPanel} disabled={busy || importing}>
                {wizardStep === 'main' && (
                  <RestaurantMainDetails
                    draft={draft}
                    onChange={(patch) => setDraft((previous) => ({ ...previous, ...patch }))}
                    onImport={restaurant ? () => openImport('source') : undefined}
                  />
                )}
                {wizardStep === 'gallery' && (
                  <RestaurantGalleryDetails
                    draft={draft}
                    photos={photos}
                    onPhotos={setPhotos}
                    excludedPhotos={excludedPhotos}
                    onExcludedPhotos={setExcludedPhotos}
                    onThumbnail={(value) => set('thumbnail_url', value)}
                  />
                )}
                {wizardStep === 'personal' && (
                  <RestaurantPersonalDetails
                    draft={draft}
                    onChange={(patch) => setDraft((previous) => ({ ...previous, ...patch }))}
                    companions={companions}
                    onCompanions={setCompanions}
                  />
                )}
                {wizardStep === 'links' && (
                  <RestaurantLinksDetails
                    videos={videos}
                    onVideos={setVideos}
                    onImportTikTok={() => openImport('tiktok')}
                  />
                )}
              </fieldset>
              {error && (
                <p role="alert" className="restaurant-error">
                  {error}
                </p>
              )}
              <div className={styles.footer}>
                {wizardStep === 'personal' && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setError('');
                      setWizardStep('links');
                    }}
                  >
                    Skip for now
                  </Button>
                )}
                <Button type="submit" disabled={busy || importing}>
                  {busy && <LoaderCircle className="animate-spin" />}
                  {wizardStep === 'links' ? 'Save restaurant' : 'Continue'}
                  {wizardStep !== 'links' && <ChevronRight aria-hidden="true" />}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
