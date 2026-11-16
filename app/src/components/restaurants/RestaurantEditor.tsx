'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Download, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { RestaurantLocationsEditor } from './RestaurantLocationsEditor';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useSession } from '@/hooks/useSession';
import {
  emptyRestaurant,
  restaurantLocations,
  restaurantInput,
  restaurantSlug,
  type Restaurant,
  type RestaurantInput,
} from '@/lib/restaurants';

export function RestaurantEditor({
  restaurant,
  open,
  onOpenChange,
}: {
  restaurant?: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { save, isDemo } = useRestaurants();
  const { session } = useSession();
  const router = useRouter();
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
        signal: AbortSignal.timeout(25000),
      });
      const result: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          result && typeof result === 'object' && 'error' in result
            ? String(result.error)
            : 'Could not import this website.',
        );
      const imported = restaurantInput.parse(result);
      // Imports fill website details, preserving personal notes, visits, and video links.
      setDraft((previous) => ({
        ...previous,
        locations: [
          {
            ...previous.locations[0],
            neighborhood: previous.locations[0]?.neighborhood ?? '',
            address: imported.address || previous.locations[0]?.address || null,
            phone: imported.phone || previous.locations[0]?.phone || null,
            latitude:
              imported.latitude ??
              (imported.address && imported.address !== previous.locations[0]?.address
                ? null
                : (previous.locations[0]?.latitude ?? null)),
            longitude:
              imported.longitude ??
              (imported.address && imported.address !== previous.locations[0]?.address
                ? null
                : (previous.locations[0]?.longitude ?? null)),
          },
          ...previous.locations.slice(1),
        ],
        name: previous.name || imported.name,
        cuisine: imported.cuisine || previous.cuisine,
        website: imported.website,
        address: imported.address || previous.address,
        phone: imported.phone || previous.phone,
        price_range: imported.price_range || previous.price_range,
        latitude: imported.latitude ?? previous.latitude,
        longitude: imported.longitude ?? previous.longitude,
      }));
      setPhotos((previous) =>
        [...new Set([...previous.split('\n').filter(Boolean), ...imported.photo_urls])]
          .slice(0, 12)
          .join('\n'),
      );
      toast.success('Website details imported. Review them before saving.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not import this website.');
    } finally {
      setImporting(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const input = restaurantInput.safeParse({
        ...draft,
        neighborhood: draft.locations[0]?.neighborhood || null,
        address: draft.locations[0]?.address || null,
        phone: draft.locations[0]?.phone || null,
        latitude: draft.locations[0]?.latitude ?? null,
        longitude: draft.locations[0]?.longitude ?? null,
        slug: restaurant?.slug ?? restaurantSlug(draft.name),
        companions: companions
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        video_urls: videos
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
        photo_urls: photos
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      if (!input.success) throw new Error(input.error.issues[0].message);
      const saved = await save(input.data, restaurant?.id);
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
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy && !importing) onOpenChange(value);
      }}
    >
      <DialogContent className="restaurant-editor">
        <DialogTitle>{restaurant ? 'Edit restaurant' : 'Add restaurant'}</DialogTitle>
        <DialogDescription>Save a place, import its website, and make it yours.</DialogDescription>
        <div className="restaurant-import">
          <Input
            type="url"
            aria-label="Restaurant website to import"
            placeholder="https://restaurant.com"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={importing || busy}
          />
          <Button
            variant="secondary"
            onClick={() => void importLink()}
            disabled={!link || !session || isDemo || busy || importing}
          >
            {importing ? <LoaderCircle className="animate-spin" /> : <Download />} Import
          </Button>
        </div>
        {isDemo && (
          <p className="muted">
            Website import is available in the live collection after signing in.
          </p>
        )}
        <form onSubmit={(event) => void submit(event)} className="restaurant-form">
          <fieldset disabled={busy || importing}>
            <label>
              Name
              <Input
                value={draft.name}
                required
                maxLength={200}
                onChange={(event) => set('name', event.target.value)}
              />
            </label>
            <label>
              Cuisine
              <Input
                value={draft.cuisine}
                maxLength={100}
                onChange={(event) => set('cuisine', event.target.value)}
              />
            </label>
            <div className="restaurant-form-pair">
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      status: event.target.value as RestaurantInput['status'],
                      ...(event.target.value === 'want_to_go'
                        ? { visited_on: null, rating: null }
                        : {}),
                    }))
                  }
                >
                  <option value="want_to_go">Want to go</option>
                  <option value="visited">Visited</option>
                </select>
              </label>
              <label>
                Price per person
                <Input
                  placeholder="$20–30"
                  value={draft.price_range ?? ''}
                  onChange={(event) => set('price_range', event.target.value || null)}
                />
              </label>
            </div>
            {draft.status === 'visited' && (
              <>
                <div className="restaurant-form-pair">
                  <label>
                    My rating
                    <select
                      value={draft.rating ?? ''}
                      onChange={(event) =>
                        set('rating', event.target.value === '' ? null : Number(event.target.value))
                      }
                    >
                      <option value="">Not rated</option>
                      {Array.from({ length: 11 }, (_, index) => index / 2).map((value) => (
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
                      onChange={(event) => set('visited_on', event.target.value || null)}
                    />
                  </label>
                </div>
                <label>
                  Ate with
                  <Input
                    placeholder="Names, separated by commas"
                    value={companions}
                    onChange={(event) => setCompanions(event.target.value)}
                  />
                </label>
              </>
            )}
            <label className="restaurant-checkbox">
              <input
                type="checkbox"
                checked={draft.is_favorite}
                onChange={(event) => set('is_favorite', event.target.checked)}
              />{' '}
              Favorite
            </label>
            <label>
              My notes
              <Textarea
                value={draft.notes}
                maxLength={10000}
                onChange={(event) => set('notes', event.target.value)}
                placeholder="What to order, what to remember…"
              />
            </label>
            <label>
              Website
              <Input
                type="url"
                value={draft.website ?? ''}
                onChange={(event) => set('website', event.target.value || null)}
              />
            </label>
            <RestaurantLocationsEditor
              locations={draft.locations}
              onChange={(value) => set('locations', value)}
            />
            <details>
              <summary>Photos & videos</summary>
              <div className="restaurant-extra-fields">
                <label>
                  Photo links
                  <Textarea
                    value={photos}
                    onChange={(event) => setPhotos(event.target.value)}
                    placeholder="One HTTPS image link per line. The first is the thumbnail."
                  />
                </label>
                <label>
                  Instagram & TikTok links
                  <Textarea
                    value={videos}
                    onChange={(event) => setVideos(event.target.value)}
                    placeholder="One full post or video link per line"
                  />
                </label>
              </div>
            </details>
          </fieldset>
          {error && (
            <p role="alert" className="restaurant-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || importing}>
            {busy && <LoaderCircle className="animate-spin" />} Save restaurant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
