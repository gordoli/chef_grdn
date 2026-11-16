import { useState } from 'react';
import { BookmarkPlus, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { type RestaurantInput } from '@/lib/restaurants';
import { restaurantGalleryUrls } from '@/lib/restaurantYelp';
import { RestaurantPhoto } from './RestaurantPhoto';
import { RestaurantLocationsEditor } from './RestaurantLocationsEditor';
import { publicWebsite } from '@/lib/urls';
import styles from './RestaurantEditor.module.css';
import { SegmentedControl } from '@/components/ui/segmented-control';

type DetailsProps = { draft: RestaurantInput; onChange: (patch: Partial<RestaurantInput>) => void };
export function RestaurantMainDetails({
  draft,
  onChange,
  onImport,
}: DetailsProps & { onImport?: () => void }) {
  const [locationsOpen, setLocationsOpen] = useState(
    !draft.locations.some((location) => location.address),
  );
  return (
    <>
      <SegmentedControl
        className={`cooking-status-toggle ${styles.visitToggle}`}
        value={draft.status}
        label="Visit status"
      >
        <Button
          type="button"
          variant="ghost"
          aria-pressed={draft.status === 'visited'}
          className={draft.status === 'visited' ? 'active' : ''}
          onClick={() => onChange({ status: 'visited' })}
        >
          <Check aria-hidden="true" />
          I’ve been here
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-pressed={draft.status === 'want_to_go'}
          className={draft.status === 'want_to_go' ? 'active' : ''}
          onClick={() => onChange({ status: 'want_to_go' })}
        >
          <BookmarkPlus aria-hidden="true" />I want to go
        </Button>
      </SegmentedControl>
      <label>
        Name
        <Input
          value={draft.name}
          required
          maxLength={200}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>
      <div className="restaurant-form-pair">
        <label>
          Cuisine
          <Input
            value={draft.cuisine}
            maxLength={100}
            onChange={(e) => onChange({ cuisine: e.target.value })}
          />
        </label>
        <label>
          Price per person
          <Input
            placeholder="$20–30"
            value={draft.price_range ?? ''}
            onChange={(e) => onChange({ price_range: e.target.value || null })}
          />
          {draft.yelp_data[0]?.price_tier && (
            <span className={styles.hint}>{draft.yelp_data[0].price_tier} on Yelp</span>
          )}
        </label>
      </div>
      <label>
        Restaurant website
        <Input
          type="url"
          placeholder="https://restaurant.com"
          maxLength={2048}
          value={draft.website ?? ''}
          onChange={(e) => onChange({ website: e.target.value || null })}
        />
      </label>
      <label>
        Yelp listing
        <Input
          type="url"
          placeholder="https://www.yelp.com/biz/…"
          maxLength={2048}
          value={draft.yelp_url ?? ''}
          onChange={(e) => onChange({ yelp_url: e.target.value || null })}
        />
      </label>
      <details
        className={styles.locationsSection}
        open={locationsOpen}
        onToggle={(event) => setLocationsOpen(event.currentTarget.open)}
      >
        <summary>
          <strong>Addresses & neighborhoods</strong>
          <span>
            {draft.locations
              .map((location) => location.neighborhood || location.address)
              .filter(Boolean)
              .join(' · ') || 'Add a location'}
          </span>
        </summary>
        <RestaurantLocationsEditor
          locations={draft.locations}
          onChange={(locations) => onChange({ locations })}
        />
      </details>
      <label className="restaurant-checkbox">
        <input
          type="checkbox"
          checked={draft.is_favorite}
          onChange={(e) => onChange({ is_favorite: e.target.checked })}
        />{' '}
        Favorite
      </label>
      {onImport && (
        <Button type="button" variant="ghost" className={styles.paste} onClick={onImport}>
          <Download aria-hidden="true" />
          Import from a link
        </Button>
      )}
    </>
  );
}
export function RestaurantPersonalDetails({
  draft,
  onChange,
  companions,
  onCompanions,
}: DetailsProps & { companions: string; onCompanions: (value: string) => void }) {
  return (
    <>
      <div className="restaurant-form-pair">
        <label>
          My rating
          <select
            value={draft.rating ?? ''}
            onChange={(e) =>
              onChange({ rating: e.target.value === '' ? null : Number(e.target.value) })
            }
          >
            <option value="">Add a rating</option>
            {Array.from({ length: 11 }, (_, i) => i / 2).map((value) => (
              <option key={value} value={value}>
                {value} / 5
              </option>
            ))}
          </select>
        </label>
        <label>
          Visited on
          <Input
            type="date"
            value={draft.visited_on ?? ''}
            onChange={(e) => onChange({ visited_on: e.target.value || null })}
          />
        </label>
      </div>
      <label>
        My review
        <Textarea
          rows={4}
          maxLength={10000}
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="What to order, what to remember…"
        />
      </label>
      <label>
        People I’ve been with
        <Input
          value={companions}
          onChange={(e) => onCompanions(e.target.value)}
          placeholder="Names, separated by commas"
        />
      </label>
    </>
  );
}
export function RestaurantLinksDetails({
  videos,
  onVideos,
  onImportTikTok,
}: {
  videos: string;
  onVideos: (value: string) => void;
  onImportTikTok: () => void;
}) {
  return (
    <>
      <label>
        Instagram & TikTok posts
        <Textarea
          rows={3}
          value={videos}
          onChange={(event) => onVideos(event.target.value)}
          placeholder="One full post or video link per line"
        />
      </label>
      <Button type="button" variant="ghost" className={styles.paste} onClick={onImportTikTok}>
        <Download aria-hidden="true" />
        Import a TikTok video
      </Button>
    </>
  );
}
export function RestaurantGalleryDetails({
  draft,
  photos,
  onPhotos,
  excludedPhotos,
  onExcludedPhotos,
  onThumbnail,
}: {
  draft: RestaurantInput;
  photos: string;
  onPhotos: (value: string) => void;
  excludedPhotos: string[];
  onExcludedPhotos: (value: string[]) => void;
  onThumbnail: (value: string | null) => void;
}) {
  const gallery = restaurantGalleryUrls({
    ...draft,
    photo_urls: photos
      .split('\n')
      .map((url) => url.trim())
      .filter(publicWebsite),
  });
  const included = gallery.filter((url) => !excludedPhotos.includes(url));
  const selected =
    draft.thumbnail_url && included.includes(draft.thumbnail_url)
      ? draft.thumbnail_url
      : included[0];
  return (
    <>
      <div className={styles.galleryHeading}>
        <p>Choose the photo shown on the board.</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={!draft.thumbnail_url}
          onClick={() => onThumbnail(null)}
        >
          Use first photo
        </Button>
      </div>
      {gallery.length ? (
        <div className={styles.galleryGrid} role="radiogroup" aria-label="Restaurant thumbnail">
          {gallery.map((url, index) => (
            <div key={url} className={styles.galleryPhoto} data-selected={selected === url}>
              <label className={styles.coverChoice}>
                <RestaurantPhoto
                  src={url}
                  name={`Restaurant photo ${index + 1}`}
                  variant="preview"
                />
                <span>
                  <input
                    type="radio"
                    name="restaurant-thumbnail"
                    checked={selected === url}
                    onChange={() => {
                      onExcludedPhotos(excludedPhotos.filter((value) => value !== url));
                      onThumbnail(url);
                    }}
                  />
                  {selected === url ? 'Thumbnail' : `Use photo ${index + 1}`}
                </span>
              </label>
              <label className={styles.keepPhoto}>
                <input
                  type="checkbox"
                  checked={!excludedPhotos.includes(url)}
                  onChange={(event) => {
                    onExcludedPhotos(
                      event.target.checked
                        ? excludedPhotos.filter((value) => value !== url)
                        : [...excludedPhotos, url],
                    );
                    if (!event.target.checked && draft.thumbnail_url === url) onThumbnail(null);
                  }}
                />
                Keep photo
              </label>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.hint}>Add photo links below, or keep going and add photos later.</p>
      )}
      <details>
        <summary>Add photo links</summary>
        <label className={styles.field}>
          Photo links
          <Textarea
            rows={3}
            value={photos}
            onChange={(event) => onPhotos(event.target.value)}
            placeholder="One HTTPS image link per line"
          />
        </label>
      </details>
    </>
  );
}
