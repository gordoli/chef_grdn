import { restaurantInput, restaurantSlug, type RestaurantInput } from './restaurants';
import { canonicalYelpUrl } from './restaurantYelp';

export type RestaurantEditorStep = 'main' | 'gallery' | 'personal' | 'links';
export const restaurantEditorTitles: Record<RestaurantEditorStep, string> = {
  main: 'Main details',
  gallery: 'Gallery',
  personal: 'Your experience',
  links: 'Social links',
};
export function restaurantEditorSteps(status: RestaurantInput['status']): RestaurantEditorStep[] {
  return status === 'visited'
    ? ['main', 'gallery', 'personal', 'links']
    : ['main', 'gallery', 'links'];
}
export function restaurantEditorFieldStep(field: string): RestaurantEditorStep {
  if (['locations', 'address', 'neighborhood', 'phone', 'latitude', 'longitude'].includes(field))
    return 'main';
  if (['rating', 'visited_on', 'notes', 'companions'].includes(field)) return 'personal';
  if (['photo_urls', 'thumbnail_url', 'yelp_data'].includes(field)) return 'gallery';
  if (field === 'video_urls') return 'links';
  return 'main';
}

/** Build a save candidate without destroying the unsaved personal details when toggling status. */
export function restaurantEditorInput(
  draft: RestaurantInput,
  fields: {
    photos: string;
    videos: string;
    companions: string;
    excludedPhotos: string[];
    slug?: string;
  },
) {
  const lines = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  const first = draft.locations[0];
  return restaurantInput.safeParse({
    ...draft,
    ...(draft.status === 'want_to_go' ? { rating: null, visited_on: null } : {}),
    yelp_url: draft.yelp_url ? (canonicalYelpUrl(draft.yelp_url) ?? draft.yelp_url) : null,
    neighborhood: first?.neighborhood || null,
    address: first?.address || null,
    phone: first?.phone || null,
    latitude: first?.latitude ?? null,
    longitude: first?.longitude ?? null,
    slug: fields.slug ?? restaurantSlug(draft.name),
    yelp_data: draft.yelp_data.map((business) => ({
      ...business,
      reviews: business.reviews.map((review) => ({
        ...review,
        photos: review.photos.filter((url) => !fields.excludedPhotos.includes(url)),
      })),
    })),
    companions: fields.companions
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    video_urls: lines(fields.videos),
    photo_urls: lines(fields.photos).filter((url) => !fields.excludedPhotos.includes(url)),
    thumbnail_url: fields.excludedPhotos.includes(draft.thumbnail_url ?? '')
      ? null
      : draft.thumbnail_url,
  });
}
/** Website imports enrich the primary branch and preserve personal fields and all other branches. */
export function mergeRestaurantWebsite(
  previous: RestaurantInput,
  imported: RestaurantInput,
): RestaurantInput {
  const first = previous.locations[0];
  const moved = !!imported.address && imported.address !== first?.address;
  const location = {
    neighborhood: first?.neighborhood ?? '',
    address: imported.address || first?.address || null,
    phone: imported.phone || first?.phone || null,
    latitude: imported.latitude ?? (moved ? null : (first?.latitude ?? null)),
    longitude: imported.longitude ?? (moved ? null : (first?.longitude ?? null)),
  };
  return {
    ...previous,
    name: previous.name || imported.name,
    cuisine: imported.cuisine || previous.cuisine,
    website: imported.website || previous.website,
    price_range: imported.price_range || previous.price_range,
    locations: [location, ...previous.locations.slice(1)],
    neighborhood: location.neighborhood || null,
    address: location.address,
    phone: location.phone,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}
