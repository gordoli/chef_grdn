'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleCheck, Heart, List, Map, MapPin, Search, Star, Utensils, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import { useCollectionSearchDisclosure } from '@/hooks/useCollectionSearchDisclosure';
import { useRestaurants } from '@/hooks/useRestaurants';
import {
  restaurantInTab,
  restaurantNeighborhoods,
  restaurantCuisineRegions,
  type RestaurantTab,
} from '@/lib/restaurants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { RestaurantEditor } from '@/components/restaurants/RestaurantEditor';
import { RestaurantMap } from '@/components/restaurants/RestaurantMap';
import { RestaurantRoll } from '@/components/restaurants/RestaurantRoll';
import styles from './Restaurants.module.css';
import { RestaurantSocialPills } from '@/components/restaurants/RestaurantSocialPills';
import { RestaurantPhoto } from '@/components/restaurants/RestaurantPhoto';
import { restaurantPhotoUrls } from '@/lib/restaurantYelp';
export function Restaurants() {
  const { restaurants, error, refresh, canEdit, isDemo, setFavorite } = useRestaurants();
  const [tab, setTab] = useState<RestaurantTab>('visited');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { search, setSearch, searchOpen, setSearchOpen, searchToggle, searchRegion, searchInput } =
    useCollectionSearchDisclosure();
  const [cuisine, setCuisine] = useState('all');
  const [view, setView] = useState('list');
  const [adding, setAdding] = useState(false);
  const [rollOpen, setRollOpen] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const prefix = isDemo ? '/demo' : '';
  const { loading: sessionLoading } = useSession();
  useEffect(() => {
    if (params.get('roll') !== '1') return;
    setRollOpen(true);
    const query = new URLSearchParams(params.toString());
    query.delete('roll');
    router.replace(`${prefix}/restaurants${query.size ? `?${query}` : ''}`, { scroll: false });
  }, [params, prefix, router]);
  useEffect(() => {
    if (params.get('add') !== '1' || !canEdit) return;
    setAdding(true);
    const query = new URLSearchParams(params.toString());
    query.delete('add');
    router.replace(`${prefix}/restaurants${query.size ? `?${query}` : ''}`, { scroll: false });
  }, [params, canEdit, prefix, router]);
  const tabRestaurants = useMemo(
    () => restaurants.filter((r) => restaurantInTab(r, tab)),
    [restaurants, tab],
  );
  const base = useMemo(
    () => restaurants.filter((r) => restaurantInTab(r, tab, favoritesOnly)),
    [restaurants, tab, favoritesOnly],
  );
  const cuisines = [...new Set(base.flatMap((r) => restaurantCuisineRegions(r.cuisine)))].sort(
    (a, b) => a.localeCompare(b),
  );
  const filtered = useMemo(
    () =>
      base.filter(
        (r) =>
          (cuisine === 'all' || restaurantCuisineRegions(r.cuisine).includes(cuisine)) &&
          [
            r.name,
            r.cuisine,
            ...restaurantCuisineRegions(r.cuisine),
            restaurantNeighborhoods(r),
            r.address,
            r.notes,
            ...r.locations.map((location) => location.address),
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
      ),
    [base, cuisine, search],
  );
  const favorite = async (id: string, value: boolean) => {
    setPendingFavorite(id);
    try {
      await setFavorite(id, value);
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Could not change this favorite.');
    } finally {
      setPendingFavorite(null);
    }
  };
  return (
    <div className={`page-width ${styles.page}`}>
      <div className="section-heading">
        <h1>
          Restaurants <span>{restaurants.length}</span>
        </h1>
        <div
          className="glass-control restaurant-view-toggle"
          role="group"
          aria-label="Restaurant views and suggestions"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <List />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Map view"
            aria-pressed={view === 'map'}
            onClick={() => setView('map')}
          >
            <Map />
          </Button>
          <RestaurantRoll open={rollOpen} onOpenChange={setRollOpen} />
        </div>
      </div>
      <div className="collection-control-row">
        <SegmentedControl
          className={`cooking-status-toggle ${styles.tabs}`}
          value={tab}
          label="Restaurant collection"
        >
          {(
            [
              { value: 'visited', label: 'Been to', icon: CircleCheck },
              { value: 'want_to_go', label: 'Want to go', icon: MapPin },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              aria-pressed={tab === value}
              onClick={() => {
                setTab(value);
                setCuisine('all');
              }}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
              <span>{restaurants.filter((r) => restaurantInTab(r, value)).length}</span>
            </Button>
          ))}
        </SegmentedControl>
      </div>
      <div className="category-chips" role="group" aria-label="Restaurant filters">
        <button
          aria-pressed={cuisine === 'all' && !favoritesOnly}
          onClick={() => {
            setCuisine('all');
            setFavoritesOnly(false);
          }}
        >
          All <span>{tabRestaurants.length}</span>
        </button>
        <button
          aria-pressed={favoritesOnly}
          onClick={() => {
            setFavoritesOnly(!favoritesOnly);
            setCuisine('all');
          }}
        >
          <Heart size={13} aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />{' '}
          Favorites
          <span>{tabRestaurants.filter((r) => r.is_favorite).length}</span>
        </button>
        {cuisines.map((value) => (
          <button key={value} aria-pressed={cuisine === value} onClick={() => setCuisine(value)}>
            {value}
            <span>
              {base.filter((r) => restaurantCuisineRegions(r.cuisine).includes(value)).length}
            </span>
          </button>
        ))}
      </div>
      <div
        ref={searchRegion}
        id="restaurant-search"
        className="recipe-search-reveal"
        data-open={searchOpen}
        aria-hidden={!searchOpen}
        inert={!searchOpen}
      >
        <div>
          <div className="search-field">
            <Search size={18} />
            <Input
              ref={searchInput}
              aria-label="Search restaurants"
              placeholder="Search restaurants, cuisines, neighborhoods…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setSearchOpen(false);
                  setSearch('');
                  searchToggle.current?.focus();
                }
              }}
            />
            {search && (
              <button aria-label="Clear restaurant search" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
      {params.get('add') === '1' && !canEdit && !sessionLoading && (
        <p className="restaurant-empty">
          <Link href="/sign-in">Sign in as the owner</Link> to add a restaurant.
        </p>
      )}
      {error && (
        <div role="alert" className="restaurant-error">
          {error}{' '}
          <Button variant="ghost" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      )}
      {!filtered.length ? (
        <div className="restaurant-empty">
          <p>
            {restaurants.length
              ? 'No restaurants match these filters.'
              : 'Your next good meal starts here.'}
          </p>
          {restaurants.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setCuisine('all');
                setFavoritesOnly(false);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : view === 'map' ? (
        <RestaurantMap restaurants={filtered} prefix={prefix} />
      ) : (
        <div className={styles.list}>
          {filtered.map((restaurant) => (
            <article key={restaurant.id} className={styles.item}>
              <Link
                href={`${prefix}/restaurants/${restaurant.slug}`}
                className={styles.card}
                prefetch
                scroll={false}
                data-detail-link
              >
                <RestaurantPhoto
                  src={restaurantPhotoUrls(restaurant)[0]}
                  name=""
                  variant="thumbnail"
                  className={styles.thumbnail}
                />
                <div className={styles.content}>
                  <h2>{restaurant.name}</h2>
                  {restaurantNeighborhoods(restaurant) && (
                    <p className={styles.neighborhood}>{restaurantNeighborhoods(restaurant)}</p>
                  )}
                  <div className={styles.metadata}>
                    {restaurant.cuisine && (
                      <span className={`${styles.pill} ${styles.cuisine}`}>
                        <Utensils size={11} aria-hidden="true" />
                        {restaurantCuisineRegions(restaurant.cuisine).join(' / ')}
                      </span>
                    )}
                    {(restaurant.price_range || restaurant.yelp_data[0]?.price_tier) && (
                      <span className={`${styles.pill} ${styles.price}`}>
                        <span className="sr-only">
                          {restaurant.price_range ? 'Price per person: ' : 'Yelp price level: '}
                        </span>
                        {restaurant.price_range || restaurant.yelp_data[0]?.price_tier}
                      </span>
                    )}
                    <RestaurantSocialPills urls={restaurant.video_urls} />
                  </div>
                  {restaurant.rating !== null && (
                    <span
                      className={styles.rating}
                      role="img"
                      aria-label={`My rating: ${restaurant.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <span key={index} className={styles.star} aria-hidden="true">
                          <Star className={styles.emptyStar} />
                          <Star
                            fill="currentColor"
                            className={styles.filledStar}
                            style={{
                              clipPath: `inset(0 ${100 - Math.min(1, Math.max(0, (restaurant.rating ?? 0) - index)) * 100}% 0 0)`,
                            }}
                          />
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </Link>
              <Button
                className={styles.favorite}
                variant="ghost"
                size="icon"
                aria-label={`${restaurant.is_favorite ? 'Unfavorite' : 'Favorite'} ${restaurant.name}`}
                aria-pressed={restaurant.is_favorite}
                disabled={pendingFavorite !== null}
                title={!canEdit ? 'Sign in as the owner to change favorites' : undefined}
                onClick={() => void favorite(restaurant.id, !restaurant.is_favorite)}
              >
                <Heart fill={restaurant.is_favorite ? 'currentColor' : 'none'} />
              </Button>
            </article>
          ))}
        </div>
      )}
      {adding && <RestaurantEditor open={adding} onOpenChange={setAdding} />}
    </div>
  );
}
