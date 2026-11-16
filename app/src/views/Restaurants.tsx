'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, List, Map, Plus, Search, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import { useCollectionSearch } from '@/hooks/useCollectionSearch';
import { useRestaurants } from '@/hooks/useRestaurants';
import { restaurantInTab, restaurantNeighborhoods, type RestaurantTab } from '@/lib/restaurants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RestaurantEditor } from '@/components/restaurants/RestaurantEditor';
import { RestaurantMap } from '@/components/restaurants/RestaurantMap';
import { RestaurantPhoto } from '@/components/restaurants/RestaurantPhoto';
export function Restaurants() {
  const { restaurants, error, refresh, canEdit, isDemo, setFavorite } = useRestaurants();
  const [tab, setTab] = useState<RestaurantTab>('visited');
  const { search, setSearch, searchOpen, setSearchOpen, searchToggle } = useCollectionSearch();
  const searchRegion = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [cuisine, setCuisine] = useState('all');
  const [view, setView] = useState('list');
  const [adding, setAdding] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const params = useSearchParams();
  const { loading: sessionLoading } = useSession();
  useEffect(() => {
    if (params.get('add') === '1' && canEdit) setAdding(true);
  }, [params, canEdit]);
  useEffect(() => {
    if (!searchOpen) return;
    searchInput.current?.focus({ preventScroll: true });
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchRegion.current?.contains(target) && !searchToggle.current?.contains(target)) {
        setSearchOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, [searchOpen, searchToggle, setSearch, setSearchOpen]);
  const prefix = isDemo ? '/demo' : '';
  const filtered = useMemo(
    () =>
      restaurants.filter(
        (r) =>
          restaurantInTab(r, tab) &&
          (cuisine === 'all' || r.cuisine === cuisine) &&
          [
            r.name,
            r.cuisine,
            restaurantNeighborhoods(r),
            r.address,
            r.notes,
            ...r.locations.map((location) => location.address),
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
      ),
    [restaurants, tab, cuisine, search],
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
    <div className="page-width restaurants-page">
      <div className="restaurant-heading">
        <h1>
          Restaurants <span>{restaurants.length}</span>
        </h1>
        {canEdit && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add restaurant
          </Button>
        )}
      </div>
      <div className="restaurant-filter-row">
        <div
          className="glass-control restaurant-status"
          role="group"
          aria-label="Restaurant collection"
        >
          {(
            [
              ['visited', 'Been to'],
              ['want_to_go', 'Want to go'],
              ['favorites', 'Favorites'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant="ghost"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
              <span>{restaurants.filter((r) => restaurantInTab(r, value)).length}</span>
            </Button>
          ))}
        </div>
        <div className="restaurant-toolbar">
          <Select value={cuisine} onValueChange={setCuisine}>
            <SelectTrigger className="restaurant-cuisine-select" aria-label="Filter by cuisine">
              <SelectValue placeholder="All cuisines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cuisines</SelectItem>
              {[...new Set(restaurants.map((r) => r.cuisine).filter(Boolean))]
                .sort()
                .map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div
            className="glass-control restaurant-view-toggle"
            role="group"
            aria-label="Restaurant view"
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
          </div>
        </div>
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
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : view === 'map' ? (
        <RestaurantMap restaurants={filtered} prefix={prefix} />
      ) : (
        <div className="restaurant-list">
          <div className="restaurant-list-labels" aria-hidden="true">
            <span>Restaurant</span>
            <span>Cuisine</span>
            <span>My rating</span>
            <span>Price / person</span>
          </div>
          {filtered.map((restaurant) => (
            <article key={restaurant.id} className="restaurant-list-item">
              <Link
                href={`${prefix}/restaurants/${restaurant.slug}`}
                className="restaurant-list-card"
              >
                <div className="restaurant-list-name">
                  <RestaurantPhoto src={restaurant.photo_urls[0]} name={restaurant.name} />
                  <div>
                    <strong>{restaurant.name}</strong>
                    <span className="restaurant-list-status">
                      {restaurantNeighborhoods(restaurant)}
                    </span>
                  </div>
                </div>
                <span className="restaurant-card-cuisine">{restaurant.cuisine || '—'}</span>
                <span className="restaurant-card-rating">
                  <Star size={14} fill={restaurant.rating !== null ? 'currentColor' : 'none'} />{' '}
                  {restaurant.rating !== null ? `${restaurant.rating.toFixed(1)} / 5` : 'Not rated'}
                </span>
                <span className="restaurant-card-price">
                  {restaurant.price_range || 'Price not added'}
                </span>
              </Link>
              <Button
                className="glass-control restaurant-thumbnail-heart"
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
