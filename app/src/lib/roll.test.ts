import { describe, expect, it } from 'vitest';
import { matchingRollOptions, restaurantRollOptions, rollOptions, type RollOption } from './roll';
import { demoRestaurants } from './restaurantSeeds';

function option(id: string, familiar: boolean, cuisines = ['Japanese']): RollOption {
  return { id, slug: id, title: id, familiar, cuisines, detail: '' };
}
const fixedRandom = () => 0.5;

describe('Roll shortlists', () => {
  it('selects three distinct matches with both statuses even when one status is rare', () => {
    for (const rareStatus of [true, false]) {
      const options = Array.from({ length: 15 }, (_, index) =>
        option(String(index), index === 0 ? rareStatus : !rareStatus),
      );
      for (const random of [() => 0, fixedRandom, () => 0.999]) {
        const picks = rollOptions(options, [], random);
        expect(picks).toHaveLength(3);
        expect(new Set(picks.map((pick) => pick.id)).size).toBe(3);
        expect(new Set(picks.map((pick) => pick.familiar)).size).toBe(2);
        expect(picks.every((pick) => options.includes(pick))).toBe(true);
      }
      expect(options[0].id).toBe('0');
    }
  });

  it('handles empty, tiny, and single-status collections without inventing suggestions', () => {
    expect(rollOptions([])).toEqual([]);
    const one = option('one', true);
    expect(rollOptions([one, one])).toEqual([one]);
    const two = [one, option('two', false)];
    expect(rollOptions(two)).toHaveLength(2);
    expect(
      rollOptions(Array.from({ length: 5 }, (_, index) => option(String(index), true))),
    ).toHaveLength(3);
  });

  it('rerolls to unseen entries while preserving the status mix', () => {
    const options = Array.from({ length: 8 }, (_, index) => option(String(index), index % 2 === 0));
    const first = rollOptions(options, [], fixedRandom);
    const second = rollOptions(
      options,
      first.map((pick) => pick.id),
      fixedRandom,
    );
    expect(second).toHaveLength(3);
    expect(second.every((pick) => !first.includes(pick))).toBe(true);
    expect(new Set(second.map((pick) => pick.familiar)).size).toBe(2);
  });

  it('keeps a scarce status on reroll even when that means repeating its only entry', () => {
    const rare = option('rare', false);
    const options = [rare, ...Array.from({ length: 6 }, (_, index) => option(String(index), true))];
    const first = rollOptions(options, [], fixedRandom);
    const next = rollOptions(
      options,
      first.map((pick) => pick.id),
      fixedRandom,
    );
    expect(next).toContain(rare);
    expect(next.filter((pick) => first.includes(pick))).toEqual([rare]);
  });

  it('matches any selected cuisine and never fills a shortlist with excluded entries', () => {
    const options = [
      option('j', true),
      option('i', false, ['Italian']),
      option('k', false, ['Korean']),
    ];
    expect(matchingRollOptions(options, [])).toEqual(options);
    const matches = matchingRollOptions(options, ['Japanese', 'Italian']);
    expect(matches.map((pick) => pick.id)).toEqual(['j', 'i']);
    expect(rollOptions(matches)).toHaveLength(2);
    expect(matchingRollOptions(options, ['French'])).toEqual([]);
  });

  it('combines visit status with cuisine choices without admitting the other status', () => {
    const options = [
      option('visited-japanese', true),
      option('new-japanese', false),
      option('visited-italian', true, ['Italian']),
      option('new-korean', false, ['Korean']),
    ];
    expect(matchingRollOptions(options, [], 'both')).toEqual(options);
    expect(matchingRollOptions(options, ['Japanese'], 'visited').map((pick) => pick.id)).toEqual([
      'visited-japanese',
    ]);
    const newPlaces = matchingRollOptions(options, ['Japanese', 'Korean'], 'want_to_go');
    expect(newPlaces.map((pick) => pick.id)).toEqual(['new-japanese', 'new-korean']);
    expect(rollOptions(newPlaces).every((pick) => !pick.familiar)).toBe(true);
    expect(matchingRollOptions(options, ['Italian'], 'want_to_go')).toEqual([]);
    expect(rollOptions(matchingRollOptions(options, ['Italian'], 'want_to_go'))).toEqual([]);
  });

  it('allows any cuisine within a single status and keeps Both as the default', () => {
    const options = [option('visited', true), option('new', false, ['Italian'])];
    expect(matchingRollOptions(options, [])).toEqual(options);
    expect(matchingRollOptions(options, [], 'visited')).toEqual([options[0]]);
    expect(matchingRollOptions(options, [], 'want_to_go')).toEqual([options[1]]);
  });
});

describe('Roll collection adapters', () => {
  it('uses actual restaurant statuses and normalized cuisines, independent of favorites', () => {
    const options = restaurantRollOptions(demoRestaurants);
    expect(options).toHaveLength(demoRestaurants.length);
    expect(options.filter((pick) => !pick.familiar)).toHaveLength(
      demoRestaurants.filter((restaurant) => restaurant.status === 'want_to_go').length,
    );
    const picks = rollOptions(options, [], fixedRandom);
    expect(picks.some((pick) => pick.familiar)).toBe(true);
    expect(picks.some((pick) => !pick.familiar)).toBe(true);
    expect(restaurantRollOptions([{ ...demoRestaurants[0], cuisine: '' }])[0].cuisines).toEqual([
      'Other',
    ]);
  });
});
