'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Grid2X2,
  List,
  Plus,
  Search,
  X,
  Heart,
  SlidersHorizontal,
} from 'lucide-react';
import { useRecipes } from '@/hooks/useRecipes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';
import { compareRecipeTypes, groupRecipesByType, recipeTypeLabel } from '@/lib/recipeCollection';
export function Home() {
  const { recipes, reviews, favorites, loading, error, refresh, isDemo, canEdit } = useRecipes();
  const pathname = usePathname();
  const favoritesPage = pathname.endsWith('/favorites');
  const [favoritesFilter, setFavoritesFilter] = useState(false);
  const favoritesOnly = favoritesPage || favoritesFilter;
  const CollectionHeading = favoritesPage ? 'h2' : 'h1';
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [view, setView] = useState('grid');
  useEffect(() => {
    setView(localStorage.getItem('grdn.view') ?? 'grid');
  }, []);
  const [sort, setSort] = useState('collection');
  const prefix = isDemo ? '/demo' : '';
  const base = useMemo(
    () => (favoritesOnly ? recipes.filter((r) => favorites.includes(r.id)) : recipes),
    [favoritesOnly, recipes, favorites],
  );
  const types = [...new Set(base.map((r) => recipeTypeLabel(r.type)))].sort(compareRecipeTypes);
  const filtered = useMemo(
    () =>
      base
        .filter(
          (r) =>
            (type === 'All' || recipeTypeLabel(r.type) === type) &&
            [
              r.title,
              r.type,
              recipeTypeLabel(r.type),
              ...r.tags,
              ...r.ingredients.flatMap((s) => s.items.map((i) => i.raw)),
              ...reviews
                .filter((review) => review.recipe_id === r.id)
                .map((review) => review.body ?? ''),
            ]
              .join(' ')
              .toLowerCase()
              .includes(search.toLowerCase().trim()),
        )
        .sort((a, b) =>
          sort === 'title'
            ? a.title.localeCompare(b.title)
            : sort === 'newest'
              ? b.created_at.localeCompare(a.created_at)
              : sort === 'rating'
                ? average(b.id, reviews) - average(a.id, reviews)
                : 0,
        ),
    [base, type, search, sort, reviews],
  );
  const groups =
    sort === 'collection' ? groupRecipesByType(filtered) : [{ type: null, recipes: filtered }];
  return (
    <div className="home-page page-width">
      {favoritesPage && (
        <section className="collection-hero">
          <span className="eyebrow">THE ONES I COME BACK TO</span>
          <h1>A few favorites.</h1>
          <p>Tried, loved, and ready to make again.</p>
        </section>
      )}
      <section id="collection" className="collection-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE COLLECTION</span>
            <CollectionHeading>
              {favoritesPage ? 'Your favorites' : 'All recipes'}{' '}
              <span>{favoritesPage ? base.length : recipes.length}</span>
            </CollectionHeading>
          </div>
        </div>
        <div className="collection-toolbar">
          <div className="search-field">
            <Search size={18} />
            <Input
              aria-label="Search recipes"
              placeholder="Find something delicious…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="toolbar-actions">
            <label className="sort-control">
              <SlidersHorizontal size={16} />
              <span className="sr-only">Sort recipes</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort recipes"
              >
                <option value="collection">Recipe type</option>
                <option value="title">Title A–Z</option>
                <option value="newest">Newest first</option>
                <option value="rating">Highest rated</option>
              </select>
            </label>
            <div className="view-toggle" aria-label="Recipe layout">
              {[
                { name: 'grid', icon: Grid2X2 },
                { name: 'list', icon: List },
              ].map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  aria-label={`${name === 'grid' ? 'Grid' : 'List'} view`}
                  aria-pressed={view === name}
                  onClick={() => {
                    setView(name);
                    localStorage.setItem('grdn.view', name);
                  }}
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="category-chips" aria-label="Recipe filters">
          <button
            onClick={() => {
              setType('All');
              setFavoritesFilter(false);
            }}
            aria-pressed={type === 'All' && !favoritesFilter}
          >
            Everything<span>{favoritesPage ? base.length : recipes.length}</span>
          </button>
          {!favoritesPage && (
            <button
              aria-pressed={favoritesFilter}
              onClick={() => {
                setFavoritesFilter(!favoritesFilter);
                setType('All');
              }}
            >
              <Heart
                size={13}
                aria-hidden="true"
                fill={favoritesFilter ? 'currentColor' : 'none'}
              />
              Favorites
              <span>{recipes.filter((recipe) => favorites.includes(recipe.id)).length}</span>
            </button>
          )}
          {types.map((label) => (
            <button key={label} onClick={() => setType(label)} aria-pressed={type === label}>
              {label}
              <span>{base.filter((recipe) => recipeTypeLabel(recipe.type) === label).length}</span>
            </button>
          ))}
        </div>
        {error ? (
          <EmptyState title="Couldn’t open the collection">
            <p>{error}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          </EmptyState>
        ) : loading ? (
          <div className="recipe-grid" aria-label="Loading recipes">
            {[1, 2, 3].map((n) => (
              <div className="recipe-skeleton" key={n} />
            ))}
          </div>
        ) : filtered.length ? (
          <>
            <div className="recipe-groups">
              {groups.map((group) => (
                <section
                  key={group.type ?? 'all'}
                  className="recipe-type-group"
                  aria-label={group.type ?? 'Recipes'}
                >
                  {group.type && (
                    <div className="recipe-type-heading">
                      <h2>{group.type}</h2>
                      <span>{group.recipes.length}</span>
                    </div>
                  )}
                  <div className={view === 'list' ? 'recipe-list' : 'recipe-grid'}>
                    {group.recipes.map((recipe, index) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        index={index}
                        list={view === 'list'}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="collection-end">
              <span />
              {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}, endless
              possibilities
              <span />
            </div>
          </>
        ) : (
          <EmptyState
            title={
              search || type !== 'All'
                ? 'No matches'
                : favoritesOnly
                  ? 'Save a little inspiration'
                  : 'No recipes yet'
            }
          >
            <p>
              {search || type !== 'All'
                ? `Nothing matches “${search || type}”. Try an ingredient like miso or rice.`
                : favoritesOnly
                  ? 'Tap the heart on any recipe to keep it here.'
                  : 'Every good collection starts with one recipe.'}
            </p>
            {favoritesOnly ? (
              <Button asChild variant="outline">
                <Link
                  href={`${prefix}/`}
                  onClick={() => {
                    setFavoritesFilter(false);
                    setType('All');
                    setSearch('');
                  }}
                >
                  <Heart />
                  Browse recipes
                </Link>
              </Button>
            ) : (
              canEdit && (
                <Button asChild>
                  <Link href={`${prefix}/new`}>
                    <Plus />
                    Add a recipe
                    <ArrowUpRight />
                  </Link>
                </Button>
              )
            )}
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function average(id: string, reviews: import('@/lib/types').Review[]) {
  const list = reviews.filter((r) => r.recipe_id === id);
  return list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
}
