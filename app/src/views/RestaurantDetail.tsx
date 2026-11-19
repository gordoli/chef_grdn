'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Share2,
  ShoppingBag,
  Star,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { RestaurantEditor } from '@/components/restaurants/RestaurantEditor';
import { RestaurantPhoto } from '@/components/restaurants/RestaurantPhoto';
import { RestaurantReviews } from '@/components/restaurants/RestaurantReviews';
import { RestaurantYelpDetails } from '@/components/restaurants/RestaurantYelpDetails';
import { restaurantPhotoUrls } from '@/lib/restaurantYelp';
import { useRestaurants } from '@/hooks/useRestaurants';
import {
  restaurantDate,
  restaurantMapsUrl,
  restaurantVideo,
  restaurantLocations,
  restaurantNeighborhoods,
} from '@/lib/restaurants';
import { restaurantShareUrl } from '@/lib/restaurantSharing';
export function RestaurantDetail({ slug, onBack }: { slug: string; onBack?: () => void }) {
  const { restaurants, canEdit, isDemo, save, remove, error, refresh } = useRestaurants();
  const restaurant = restaurants.find((r) => r.slug === slug);
  const [tab, setTab] = useState('details');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);
  const [videoLink, setVideoLink] = useState('');
  const [videoError, setVideoError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const prefix = isDemo ? '/demo' : '';
  if (!restaurant)
    return (
      <div className="page-width restaurants-page">
        <Link href={`${prefix}/restaurants`}>← Restaurants</Link>
        <h1>Restaurant not found</h1>
      </div>
    );
  const photoUrls = restaurantPhotoUrls(restaurant);
  const photoCredit = restaurant.yelp_data
    .flatMap((business) =>
      business.reviews.map((review) => ({ ...review, business_url: business.url })),
    )
    .find((review) => photo !== null && review.photos.includes(photoUrls[photo]));
  const change = async (patch: Partial<typeof restaurant>) => {
    setBusy(true);
    try {
      await save({ ...restaurant, ...patch }, restaurant.id);
      router.refresh();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const url = restaurantShareUrl(restaurant, window.location.href);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Restaurant link copied');
    } catch {
      setShareLink(url);
    }
  };
  const addVideo = async () => {
    const video = restaurantVideo(videoLink);
    if (!video) {
      setVideoError(
        'Paste a full Instagram post/reel or TikTok video link. Open shortened links first.',
      );
      return;
    }
    if (restaurant.video_urls.some((value) => restaurantVideo(value)?.url === video.url)) {
      setVideoError('This video is already saved.');
      return;
    }
    setBusy(true);
    setVideoError('');
    try {
      await save(
        { ...restaurant, video_urls: [...restaurant.video_urls, video.url] },
        restaurant.id,
      );
      setVideoLink('');
      toast.success('Video saved');
    } catch (failure) {
      setVideoError(failure instanceof Error ? failure.message : 'Could not save this video.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-width restaurant-detail-page" data-standalone={!onBack}>
      <div className="restaurant-detail-topbar">
        {onBack ? (
          <Button type="button" variant="ghost" className="restaurant-back" onClick={onBack}>
            <ArrowLeft size={17} /> Restaurants
          </Button>
        ) : (
          <Link href={`${prefix}/restaurants`} className="restaurant-back">
            <ArrowLeft size={17} /> Restaurants
          </Link>
        )}
        <div className="restaurant-actions">
          <Button
            className="glass-control"
            variant="ghost"
            size="icon"
            aria-label="Copy restaurant share link"
            onClick={() => void share()}
          >
            <Share2 />
          </Button>
          {canEdit && (
            <>
              <Button
                className="glass-control"
                variant="ghost"
                size="icon"
                aria-label={restaurant.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                disabled={busy}
                onClick={() => void change({ is_favorite: !restaurant.is_favorite })}
              >
                <Heart fill={restaurant.is_favorite ? 'currentColor' : 'none'} />
              </Button>
              <Button className="glass-control" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="restaurant-error">
          {error}{' '}
          <Button variant="ghost" onClick={() => void refresh()}>
            Try again
          </Button>
        </p>
      )}
      {shareLink && (
        <label className="restaurant-copy-link">
          Copy this share link
          <Input readOnly value={shareLink} onFocus={(event) => event.target.select()} />
        </label>
      )}
      {photoUrls.length > 0 && (
        <div className="restaurant-hero-gallery">
          {photoUrls.slice(0, 3).map((src, index) => (
            <button
              key={src}
              className={index === 0 ? 'restaurant-hero-main' : ''}
              onClick={() => setPhoto(index)}
              aria-label={`Open photo ${index + 1} of ${photoUrls.length}`}
            >
              <RestaurantPhoto
                src={src}
                name={`${restaurant.name} photo ${index + 1}`}
                eager={index === 0}
              />
            </button>
          ))}
          {photoUrls.length > 3 && (
            <Button
              variant="secondary"
              className="restaurant-all-photos"
              onClick={() => setTab('photos')}
            >
              All {photoUrls.length} photos
            </Button>
          )}
        </div>
      )}
      <div className="restaurant-detail-heading">
        <div>
          <h1>{restaurant.name}</h1>
          <p>
            {[restaurant.cuisine, restaurantNeighborhoods(restaurant), restaurant.price_range]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="restaurant-personal-rating">
          <Star fill={restaurant.rating !== null ? 'currentColor' : 'none'} />
          <strong>{restaurant.rating !== null ? restaurant.rating.toFixed(1) : '—'}</strong>
          <span>
            / 5 <small>My rating</small>
          </span>
        </div>
      </div>
      <div className="restaurant-actions restaurant-place-actions">
        {canEdit ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void change(
                restaurant.status === 'want_to_go'
                  ? { status: 'visited' }
                  : { status: 'want_to_go', rating: null, visited_on: null },
              )
            }
          >
            {restaurant.status === 'visited' ? <Check /> : <Plus />}
            {restaurant.status === 'visited' ? 'Been to' : 'Want to go'}
          </Button>
        ) : (
          <span className="restaurant-status-label">
            {restaurant.status === 'visited' ? 'Been to' : 'Want to go'}
          </span>
        )}
        {restaurant.is_takeout && (
          <span className="restaurant-status-label">
            <ShoppingBag size={16} aria-hidden="true" /> Takeout
          </span>
        )}
        {restaurant.website && (
          <Button asChild variant="outline">
            <a href={restaurant.website} target="_blank" rel="noreferrer">
              Website <ArrowUpRight />
            </a>
          </Button>
        )}
        {restaurant.yelp_url && (
          <Button asChild variant="outline">
            <a href={restaurant.yelp_url} target="_blank" rel="noreferrer">
              Yelp <ArrowUpRight />
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <a href={restaurantMapsUrl(restaurant)} target="_blank" rel="noreferrer">
            <MapPin /> Directions
          </a>
        </Button>
        {restaurant.phone && (
          <Button asChild variant="outline">
            <a href={`tel:${restaurant.phone.replace(/[^+\d]/g, '')}`}>
              <Phone /> Call
            </a>
          </Button>
        )}
      </div>
      <div className="restaurant-tabs" role="tablist" aria-label="Restaurant details">
        {[
          ['details', 'Details'],
          ['photos', `Photos (${photoUrls.length})`],
          ['videos', `Videos (${restaurant.video_urls.length})`],
        ].map(([value, label]) => (
          <Button
            key={value}
            id={`restaurant-tab-${value}`}
            role="tab"
            aria-selected={tab === value}
            aria-controls="restaurant-panel"
            variant="ghost"
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              const tabs = ['details', 'photos', 'videos'];
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                const next =
                  tabs[(tabs.indexOf(value) + (event.key === 'ArrowRight' ? 1 : 2)) % tabs.length];
                setTab(next);
                document.getElementById(`restaurant-tab-${next}`)?.focus();
              }
            }}
            tabIndex={tab === value ? 0 : -1}
          >
            {label}
          </Button>
        ))}
      </div>
      <div role="tabpanel" id="restaurant-panel" aria-labelledby={`restaurant-tab-${tab}`}>
        {tab === 'details' && (
          <div className="restaurant-detail-columns">
            <div>
              <section className="restaurant-notes">
                <h2>My notes</h2>
                <p>{restaurant.notes || 'No notes yet.'}</p>
                {canEdit && !restaurant.notes && (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Add notes
                  </Button>
                )}
              </section>
              <RestaurantReviews restaurantId={restaurant.id} />
              <RestaurantYelpDetails businesses={restaurant.yelp_data} />
            </div>
            <aside className="restaurant-facts">
              {restaurantLocations(restaurant).map((location, index) => (
                <div key={index} id={`location-${index}`} className="restaurant-location-fact">
                  <MapPin />
                  <div>
                    <span>
                      {location.neighborhood ||
                        (restaurant.locations.length > 1 ? `Location ${index + 1}` : 'Address')}
                    </span>
                    <a
                      href={restaurantMapsUrl({ name: restaurant.name, ...location })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {location.address || 'Find on map'}
                    </a>
                    {location.phone && (
                      <a
                        className="restaurant-location-phone"
                        href={`tel:${location.phone.replace(/[^+\d]/g, '')}`}
                      >
                        <Phone size={12} />
                        {location.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {restaurant.status === 'visited' && (
                <>
                  <div>
                    <CalendarDays />
                    <div>
                      <span>Visited</span>
                      <p>{restaurantDate(restaurant.visited_on)}</p>
                    </div>
                  </div>
                  <div>
                    <Users />
                    <div>
                      <span>Ate with</span>
                      <p>{restaurant.companions.join(', ') || 'No names added yet.'}</p>
                      {canEdit && (
                        <button className="restaurant-text-button" onClick={() => setEditing(true)}>
                          {restaurant.companions.length ? 'Edit names' : 'Add names'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
              {restaurant.price_range && (
                <p className="muted">{restaurant.price_range} per person</p>
              )}
            </aside>
          </div>
        )}
        {tab === 'photos' && (
          <>
            {photoUrls.length ? (
              <div className="restaurant-photo-grid">
                {photoUrls.map((src, index) => (
                  <button
                    key={src}
                    onClick={() => setPhoto(index)}
                    aria-label={`Open photo ${index + 1}`}
                  >
                    <RestaurantPhoto src={src} name={`${restaurant.name} photo ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="restaurant-empty">
                No photos yet.
                {canEdit && (
                  <Button variant="ghost" onClick={() => setEditing(true)}>
                    Import website photos
                  </Button>
                )}
              </p>
            )}
            {restaurant.yelp_data.length > 0 && (
              <p className="restaurant-photo-credit">
                Review photos from{' '}
                {restaurant.yelp_data.map((business, index) => (
                  <span key={business.url}>
                    {index > 0 ? ' · ' : ''}
                    <a href={business.url} target="_blank" rel="noreferrer">
                      Yelp · {business.address || business.name} ↗
                    </a>
                  </span>
                ))}
              </p>
            )}
            {restaurant.website && (
              <p className="restaurant-photo-credit">
                Photos from saved links and restaurant websites ·{' '}
                <a href={restaurant.website} target="_blank" rel="noreferrer">
                  {new URL(restaurant.website).hostname.replace(/^www\./, '')} ↗
                </a>
              </p>
            )}
          </>
        )}
        {tab === 'videos' && (
          <>
            {canEdit && (
              <form
                className="restaurant-video-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addVideo();
                }}
              >
                <Input
                  type="url"
                  aria-label="Instagram or TikTok video link"
                  placeholder="Paste an Instagram or TikTok video link"
                  value={videoLink}
                  onChange={(event) => setVideoLink(event.target.value)}
                  required
                  disabled={busy}
                />
                <Button disabled={busy}>Save video</Button>
              </form>
            )}
            {videoError && (
              <p role="alert" className="restaurant-error">
                {videoError}
              </p>
            )}
            {restaurant.video_urls.length ? (
              <div className="restaurant-video-grid">
                {restaurant.video_urls.map((url) => {
                  const video = restaurantVideo(url);
                  return (
                    video && (
                      <article key={url}>
                        <iframe
                          title={`${restaurant.name} on ${video.provider}`}
                          src={video.embed}
                          loading="lazy"
                          allow="fullscreen; encrypted-media; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
                          allowFullScreen
                        />
                        <div>
                          <a href={video.url} target="_blank" rel="noreferrer">
                            Watch on {video.provider} ↗
                          </a>
                          {canEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={busy}
                              aria-label="Remove saved video"
                              onClick={() =>
                                void change({
                                  video_urls: restaurant.video_urls.filter(
                                    (value) => value !== url,
                                  ),
                                })
                              }
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                      </article>
                    )
                  );
                })}
              </div>
            ) : (
              <p className="restaurant-empty">Save the videos that made you want to go.</p>
            )}
            <p className="muted">If a video can’t play here, open it on Instagram or TikTok.</p>
          </>
        )}
      </div>
      {canEdit && (
        <Button className="restaurant-delete" variant="ghost" onClick={() => setDeleting(true)}>
          Remove restaurant
        </Button>
      )}
      {editing && (
        <RestaurantEditor
          key={restaurant.updated_at}
          restaurant={restaurant}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogTitle>Remove {restaurant.name}?</DialogTitle>
          <DialogDescription>
            This removes the restaurant, saved videos, notes, and reviews.
          </DialogDescription>
          <div className="restaurant-actions">
            <Button variant="secondary" onClick={() => setDeleting(false)} disabled={busy}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await remove(restaurant.id);
                  router.push(`${prefix}/restaurants`);
                  router.refresh();
                  toast.success('Restaurant removed');
                } catch {
                  toast.error('Could not remove this restaurant.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove restaurant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={photo !== null}
        onOpenChange={(open) => {
          if (!open) setPhoto(null);
        }}
      >
        <DialogContent className="restaurant-lightbox">
          <DialogTitle className="sr-only">{restaurant.name} photos</DialogTitle>
          <DialogDescription className="sr-only">
            Restaurant photo gallery with saved links and credited Yelp review photos
          </DialogDescription>
          {photo !== null && (
            <>
              <RestaurantPhoto
                key={photoUrls[photo]}
                src={photoUrls[photo]}
                name={`${restaurant.name} photo ${photo + 1}`}
              />
              {photoCredit && (
                <p className="restaurant-photo-credit">
                  Photo by {photoCredit.author} ·{' '}
                  <a href={photoCredit.url} target="_blank" rel="noreferrer">
                    View review on Yelp ↗
                  </a>
                </p>
              )}
              <div className="restaurant-actions">
                <Button
                  variant="secondary"
                  disabled={photo === 0}
                  onClick={() => setPhoto(photo - 1)}
                >
                  Previous
                </Button>
                <span>
                  {photo + 1} / {photoUrls.length}
                </span>
                <Button
                  variant="secondary"
                  disabled={photo === photoUrls.length - 1}
                  onClick={() => setPhoto(photo + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
