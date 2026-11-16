'use client';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emptyRestaurantLocation, type RestaurantLocation } from '@/lib/restaurants';
export function RestaurantLocationsEditor({
  locations,
  onChange,
}: {
  locations: RestaurantLocation[];
  onChange: (value: RestaurantLocation[]) => void;
}) {
  const update = (index: number, patch: Partial<RestaurantLocation>) =>
    onChange(
      locations.map((location, position) =>
        position === index ? { ...location, ...patch } : location,
      ),
    );
  return (
    <div className="restaurant-location-editor">
      <div className="restaurant-location-editor-heading">
        <span>Locations</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={locations.length >= 12}
          onClick={() => onChange([...locations, { ...emptyRestaurantLocation }])}
        >
          <Plus /> Add location
        </Button>
      </div>
      {locations.map((location, index) => (
        <fieldset key={index} className="restaurant-location-fields">
          <legend className="sr-only">Location {index + 1}</legend>
          <div className="restaurant-location-editor-heading">
            <span>Location {index + 1}</span>
            {locations.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove location ${index + 1}`}
                onClick={() => onChange(locations.filter((_, position) => position !== index))}
              >
                <X />
              </Button>
            )}
          </div>
          <label>
            Neighborhood
            <Input
              value={location.neighborhood}
              maxLength={150}
              onChange={(event) => update(index, { neighborhood: event.target.value })}
            />
          </label>
          <label>
            Address
            <Input
              value={location.address ?? ''}
              maxLength={500}
              onChange={(event) =>
                update(index, {
                  address: event.target.value || null,
                  latitude: null,
                  longitude: null,
                })
              }
            />
          </label>
          <label>
            Phone
            <Input
              type="tel"
              value={location.phone ?? ''}
              maxLength={80}
              onChange={(event) => update(index, { phone: event.target.value || null })}
            />
          </label>
          <details>
            <summary>Map coordinates</summary>
            <div className="restaurant-form-pair restaurant-extra-fields">
              <label>
                Latitude
                <Input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={location.latitude ?? ''}
                  onChange={(event) =>
                    update(index, {
                      latitude: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Longitude
                <Input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={location.longitude ?? ''}
                  onChange={(event) =>
                    update(index, {
                      longitude: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
          </details>
        </fieldset>
      ))}
    </div>
  );
}
