'use client';
import {
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
import { AddSheet, AddSourceOptions, AddSheetProgress } from '@/components/ui/add-sheet';
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
import { restaurantYelpSearchUrl } from '@/lib/restaurantTikTok';

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
  const yelpSearch = restaurantYelpSearchUrl(
    draft.name,
    draft.locations[0]?.address || tikTokPreview?.location || draft.neighborhood,
  );
  const clipboard = useClipboardPaste(open && (step === 'yelp' || step === 'tiktok'));
  return (
    <AddSheet
      open={open}
      onOpenChange={onOpenChange}
      title={restaurant ? 'Edit restaurant' : 'Add restaurant'}
      busy={busy || importing}
      form={step === 'details'}
      focusKey={`${step}-${wizardStep}`}
      onBack={step !== 'source' || restaurant || draft.name ? goBack : undefined}
      className="restaurant-editor"
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
        <AddSourceOptions
          options={[
            { label: 'Website', icon: Globe, onSelect: () => navigate('website') },
            { label: 'Yelp', icon: Search, onSelect: () => navigate('yelp') },
            { label: 'TikTok', icon: Video, onSelect: () => navigate('tiktok') },
          ]}
        />
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
          {step === 'yelp' && yelpSearch && (
            <Button type="button" variant="ghost" asChild>
              <a href={yelpSearch} target="_blank" rel="noreferrer">
                <Search /> Search Yelp
              </a>
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
            disabled={!(step === 'yelp' ? yelpLink : tikTokLink) || !session || isDemo || importing}
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
          <AddSheetProgress
            titles={formSteps.map((item) => restaurantEditorTitles[item])}
            index={formIndex}
          />
          <form
            onSubmit={(event) => void submit(event)}
            className={`restaurant-form add-sheet-form ${styles.wizardForm}`}
            noValidate
          >
            {wizardStep === 'main' && tikTokPreview && (
              <Button type="button" variant="outline" onClick={() => openImport('yelp')}>
                <Search /> Find on Yelp
              </Button>
            )}
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
            <div className="add-sheet-footer">
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
    </AddSheet>
  );
}
