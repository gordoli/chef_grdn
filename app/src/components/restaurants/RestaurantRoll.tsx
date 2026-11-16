'use client';
import Link from 'next/link';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ArrowUpRight, Check, Dices } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRoll } from '@/hooks/useRoll';
import { restaurantPhotoUrls } from '@/lib/restaurantYelp';
import { errorMessage } from '@/lib/utils';
import { RestaurantPhoto } from './RestaurantPhoto';

const diceFaces = [
  { side: 'front', pips: [0, 2, 4, 6, 8] },
  { side: 'back', pips: [2, 6] },
  { side: 'right', pips: [0, 2, 3, 5, 6, 8] },
  { side: 'left', pips: [4] },
  { side: 'top', pips: [0, 4, 8] },
  { side: 'bottom', pips: [0, 2, 6, 8] },
];
const statusOptions = [
  { value: 'visited', label: 'Been to' },
  { value: 'want_to_go', label: 'Want to try' },
  { value: 'both', label: 'Both' },
] as const;

function RollSheet() {
  const {
    restaurants,
    cuisines,
    selectedCuisines,
    status,
    chooseStatus,
    toggleCuisine,
    clearCuisines,
    changeCuisines,
    matches,
    picks,
    phase,
    roll,
    isDemo,
    error,
    refresh,
  } = useRoll();
  const rolling = phase === 'rolling';
  const prefix = isDemo ? '/demo' : '';
  const statusLabel = statusOptions.find((option) => option.value === status)?.label;
  return (
    <div className="roll-sheet-frame" data-phase={phase}>
      <span className="roll-sheet-handle" aria-hidden="true" />
      <header className="roll-sheet-heading">
        <div className="roll-dice-stage" aria-hidden="true">
          <div className="roll-dice-aura" />
          <div className="roll-dice-lift">
            <div className="roll-dice-cube">
              {diceFaces.map(({ side, pips }) => (
                <div key={side} className={`roll-dice-face roll-dice-${side}`}>
                  {Array.from({ length: 9 }, (_, index) => (
                    <span key={index} data-pip={pips.includes(index)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <span className="roll-dice-shadow" />
        </div>
        <DialogTitle>What are we feeling?</DialogTitle>
        <DialogDescription className="sr-only">
          Choose places you’ve been, want to try, or both, then pick cuisines and roll.
        </DialogDescription>
      </header>
      <div className="roll-sheet-body">
        {phase === 'choosing' ? (
          <>
            <SegmentedControl
              className="cooking-status-toggle roll-sheet-status"
              value={status}
              label="Places to roll"
            >
              {statusOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  variant="ghost"
                  aria-pressed={status === value}
                  onClick={() => chooseStatus(value)}
                >
                  {label}
                </Button>
              ))}
            </SegmentedControl>
            <div className="roll-sheet-cuisines" role="group" aria-label="Choose cuisines">
              <Button
                variant="outline"
                aria-pressed={!selectedCuisines.length}
                onClick={clearCuisines}
              >
                <Check aria-hidden="true" /> Anything
              </Button>
              {cuisines.map((cuisine) => (
                <Button
                  key={cuisine}
                  variant="outline"
                  aria-pressed={selectedCuisines.includes(cuisine)}
                  onClick={() => toggleCuisine(cuisine)}
                >
                  <Check aria-hidden="true" /> {cuisine}
                </Button>
              ))}
            </div>
            {!matches.length && (
              <p className="roll-sheet-empty">No matches. Try another cuisine or choose Both.</p>
            )}
          </>
        ) : rolling ? (
          <div className="roll-sheet-loading" role="status">
            <p>Rolling…</p>
            <div className="roll-loading-cards" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <div key={index}>
                  <span />
                  <div>
                    <i />
                    <i />
                  </div>
                </div>
              ))}
            </div>
            <div className="roll-loading-track" aria-hidden="true">
              <span />
            </div>
          </div>
        ) : (
          <section
            className="roll-sheet-results"
            aria-label="Your restaurant picks"
            aria-live="polite"
          >
            <h2>{picks.length === 1 ? 'Your pick' : 'Your picks'}</h2>
            {picks.length ? (
              picks.map((pick) => {
                const restaurant = restaurants.find((place) => place.id === pick.id);
                return (
                  <Link
                    key={pick.id}
                    href={`${prefix}/restaurants/${pick.slug}`}
                    prefetch
                    scroll={false}
                    className="roll-sheet-pick"
                  >
                    <RestaurantPhoto
                      src={restaurant ? restaurantPhotoUrls(restaurant)[0] : undefined}
                      name=""
                      variant="thumbnail"
                    />
                    <div>
                      <span className="roll-pick-status">
                        {pick.familiar ? 'Been to' : 'Want to go'}
                      </span>
                      <h3>{pick.title}</h3>
                      {pick.detail && <p>{pick.detail}</p>}
                    </div>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                );
              })
            ) : (
              <p>No matches left. Try another cuisine.</p>
            )}
          </section>
        )}
        {error && (
          <div role="alert" className="restaurant-error">
            {error}{' '}
            <Button
              variant="ghost"
              disabled={rolling}
              onClick={() => void refresh().catch((failure) => toast.error(errorMessage(failure)))}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
      <footer className="roll-sheet-footer">
        <span aria-live="polite">
          {rolling
            ? 'Finding your next spot'
            : phase === 'results'
              ? `${picks.length} ${picks.length === 1 ? 'pick' : 'picks'} · ${statusLabel} · ${selectedCuisines.join(' · ') || 'Any cuisine'}`
              : `${matches.length} ${matches.length === 1 ? 'restaurant' : 'restaurants'} in the mix`}
        </span>
        {phase === 'results' && (
          <Button variant="ghost" onClick={changeCuisines}>
            Change filters
          </Button>
        )}
        <Button size="lg" onClick={roll} disabled={rolling || !matches.length}>
          <Dices aria-hidden="true" />
          {rolling ? 'Rolling…' : phase === 'results' ? 'Roll again' : 'Roll'}
        </Button>
      </footer>
    </div>
  );
}

export function RestaurantRoll({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Roll for restaurants" title="Roll">
          <Dices />
        </Button>
      </DialogTrigger>
      <DialogContent className="restaurant-roll-sheet" overlayClassName="roll-sheet-overlay">
        <RollSheet />
      </DialogContent>
    </Dialog>
  );
}
