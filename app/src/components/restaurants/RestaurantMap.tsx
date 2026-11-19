'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { restaurantMapsUrl, restaurantLocations, type Restaurant } from '@/lib/restaurants';
export function RestaurantMap({
  restaurants,
  prefix,
  locationFilter,
}: {
  restaurants: Restaurant[];
  prefix: string;
  locationFilter?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const branches = useMemo(
    () =>
      restaurants.flatMap((restaurant) =>
        restaurantLocations(restaurant)
          .map((location, index) => ({ restaurant, location, index }))
          .filter(
            ({ location }) =>
              !locationFilter ||
              location.neighborhood.trim().replace(/\s+/g, ' ').toLowerCase() ===
                locationFilter.toLowerCase(),
          ),
      ),
    [restaurants, locationFilter],
  );
  const located = branches.filter(
    ({ location }) => location.latitude !== null && location.longitude !== null,
  );
  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    void import('leaflet')
      .then((L) => {
        if (cancelled || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false }).setView([37.76, -122.44], 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .on('tileerror', () => setFailed(true))
          .addTo(map);
        const points: [number, number][] = [];
        for (const { restaurant, location, index } of branches) {
          if (location.latitude === null || location.longitude === null) continue;
          const point: [number, number] = [location.latitude, location.longitude];
          points.push(point);
          const popup = document.createElement('div');
          const link = document.createElement('a');
          link.href = `${prefix}/restaurants/${restaurant.slug}#location-${index}`;
          link.textContent = [restaurant.name, location.neighborhood].filter(Boolean).join(' · ');
          const details = document.createElement('p');
          details.textContent = [
            restaurant.cuisine,
            restaurant.price_range,
            restaurant.rating !== null
              ? `${restaurant.rating}/5`
              : restaurant.status === 'want_to_go'
                ? 'Want to go'
                : 'Visited',
          ]
            .filter(Boolean)
            .join(' · ');
          popup.append(link, details);
          L.marker(point, {
            title: [restaurant.name, location.neighborhood].filter(Boolean).join(' · '),
            keyboard: true,
            icon: L.divIcon({
              className: 'restaurant-pin-wrapper',
              html: `<span class="restaurant-pin${restaurant.status === 'want_to_go' ? ' restaurant-pin-want' : ''}" aria-hidden="true"></span>`,
              iconSize: [24, 32],
              iconAnchor: [12, 32],
            }),
          })
            .bindPopup(popup)
            .addTo(map);
        }
        if (points.length)
          map.fitBounds(L.latLngBounds(points), { padding: [45, 45], maxZoom: 15 });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [branches, prefix]);
  return (
    <div className="restaurant-map-wrap">
      <div ref={container} className="restaurant-map" role="region" aria-label="Restaurant map" />
      {failed && (
        <p role="status">Map tiles could not load. Restaurant links are available below.</p>
      )}
      <p className="restaurant-map-caption">
        <span className="map-key-dot" /> Visited <span className="map-key-dot map-key-want" /> Want
        to go · {located.length} of {branches.length} locations on the map
      </p>
      {located.length < branches.length && (
        <div className="restaurant-unmapped">
          <p>These places need a confirmed location:</p>
          {branches
            .filter(({ location }) => location.latitude === null)
            .map(({ restaurant, location, index }) => (
              <a
                key={`${restaurant.id}-${index}`}
                href={restaurantMapsUrl({ name: restaurant.name, ...location })}
                target="_blank"
                rel="noreferrer"
              >
                {restaurant.name}
                {location.neighborhood ? ` · ${location.neighborhood}` : ''} ↗
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
