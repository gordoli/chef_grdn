import { describe, expect, it } from 'vitest';
import { restoreRestaurantImports } from './restaurantImportJobs';
const owner = '00000000-0000-4000-8000-000000000001';
const base = {
  id: '00000000-0000-4000-8000-000000000002',
  owner,
  url: 'https://yelp.to/example',
  ticket: 'signed-owner-bound-ticket',
  expires: 2000,
  status: 'running',
  stage: 'details',
  source: 'yelp',
  result: null,
  preview: null,
};
describe('saved background imports', () => {
  it('restores an unfinished import after closing the page without starting a new provider job', () => {
    expect(restoreRestaurantImports(JSON.stringify([base]), owner, 1000)).toMatchObject([
      { id: base.id, ticket: base.ticket, status: 'running' },
    ]);
  });
  it('never restores another owner’s jobs, expired jobs or malformed stored results', () => {
    expect(
      restoreRestaurantImports(
        JSON.stringify([base]),
        '00000000-0000-4000-8000-000000000003',
        1000,
      ),
    ).toEqual([]);
    expect(restoreRestaurantImports(JSON.stringify([base]), owner, 2001)).toEqual([]);
    expect(
      restoreRestaurantImports(
        JSON.stringify([{ ...base, result: { business: { name: 'untrusted' } } }]),
        owner,
        1000,
      ),
    ).toEqual([]);
    expect(restoreRestaurantImports('{broken', owner, 1000)).toEqual([]);
  });
});
