'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRestaurants } from './useRestaurants';
import {
  matchingRollOptions,
  restaurantRollOptions,
  rollOptions,
  type RollStatus,
} from '@/lib/roll';
import { motionDurationMs } from '@/theme/motion';

export function useRoll() {
  const { restaurants, isDemo, error, refresh } = useRestaurants();
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [status, setStatus] = useState<RollStatus>('both');
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<'choosing' | 'rolling' | 'results'>('choosing');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const options = useMemo(() => restaurantRollOptions(restaurants), [restaurants]);
  const cuisines = [...new Set(options.flatMap((option) => option.cuisines))].sort((a, b) =>
    a.localeCompare(b),
  );
  const matches = matchingRollOptions(options, selectedCuisines, status);
  const picks = pickedIds.flatMap((id) => matches.find((option) => option.id === id) ?? []);
  const toggleCuisine = (cuisine: string) => {
    if (timer.current !== null) return;
    setSelectedCuisines((previous) =>
      previous.includes(cuisine)
        ? previous.filter((value) => value !== cuisine)
        : [...previous, cuisine],
    );
    setPhase('choosing');
  };
  const clearCuisines = () => {
    if (timer.current !== null) return;
    setSelectedCuisines([]);
    setPhase('choosing');
  };
  const chooseStatus = (next: RollStatus) => {
    if (timer.current !== null) return;
    setStatus(next);
    setPhase('choosing');
  };
  const roll = () => {
    if (timer.current !== null || !matches.length) return;
    const next = rollOptions(matches, pickedIds).map((option) => option.id);
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : motionDurationMs(document.documentElement, '--motion-roll-duration');
    setPhase('rolling');
    timer.current = setTimeout(() => {
      timer.current = null;
      setPickedIds(next);
      setPhase('results');
    }, duration);
  };
  return {
    restaurants,
    cuisines,
    selectedCuisines,
    status,
    chooseStatus,
    toggleCuisine,
    clearCuisines,
    changeCuisines: () => setPhase('choosing'),
    matches,
    picks,
    phase,
    roll,
    isDemo,
    error,
    refresh,
  };
}
