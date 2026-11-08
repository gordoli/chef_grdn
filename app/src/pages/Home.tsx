import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowDown,
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
const typeOrder = [
  'Breakfast',
  'Starters',
  'Mains',
  'Sides',
  'Soups',
  'Salads',
  'Sauces',
  'Desserts',
  'Drinks',
];
export function Home() {
  const { recipes, reviews, favorites, loading, error, refresh, isDemo, canEdit } = useRecipes();
  const location = useLocation();
  const favoritesOnly = location.pathname.endsWith('/favorites');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [view, setView] = useState(() => localStorage.getItem('grdn.view') ?? 'grid');
  const [sort, setSort] = useState('collection');
  const prefix = isDemo ? '/demo' : '';
  const base = useMemo(
    () => (favoritesOnly ? recipes.filter((r) => favorites.includes(r.id)) : recipes),
    [favoritesOnly, recipes, favorites],
  );
  const types = [...new Set(base.map((r) => r.type))].sort((a, b) => {
    const ai = typeOrder.indexOf(a),
      bi = typeOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
  const filtered = useMemo(
    () =>
      base
        .filter(
          (r) =>
            (type === 'All' || r.type === type) &&
            [
              r.title,
              r.type,
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
  return (
    <div className="home-page page-width">
      <section className={`collection-hero ${favoritesOnly ? 'favorites-hero' : ''}`}>
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-line" />
            {favoritesOnly ? 'THE ONES I COME BACK TO' : 'GORDON’S PERSONAL RECIPE BOOK'}
          </span>
          <h1>
            {favoritesOnly ? (
              <>
                A few
                <br />
                favorites<span>.</span>
              </>
            ) : (
              <>
                Good food.
                <br />
                Worth keeping<span>.</span>
              </>
            )}
          </h1>
          <p>
            {favoritesOnly
              ? 'Tried, loved, and ready to make again.'
              : 'A little inspiration, a few happy accidents, and recipes to make again and again.'}
          </p>
          <div className="hero-bottom">
            <span>
              {String(base.length).padStart(2, '0')}{' '}
              <span>{favoritesOnly ? 'saved favorites' : 'recipes & counting'}</span>
            </span>
            <a href="#collection" aria-label="Jump to recipe collection">
              <ArrowDown size={18} />
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 440 350" fill="none">
            <ellipse cx="247" cy="204" rx="128" ry="115" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="247" cy="204" rx="100" ry="89" stroke="currentColor" strokeWidth="1" />
            <path
              d="M230 208c30-23 60-24 83-7-12 32-38 37-63 17m-14-3c-35 6-54-4-65-25 31-15 57-7 66 20m3-4c-9-37 1-61 29-71 20 30 7 55-22 74m-5 13c-4 18 4 34 19 47"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M99 131 62 275m44-142L70 277M89 127l17 5m-16-7 10-40m-1 42 10-40m-1 42 10-40M390 151l-28 119c-2 8-10 6-9-2l15-62c-15-5-21-12-16-32l13-41c8-23 30-18 25 18Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M122 58c13 22 35 19 48 5-21-14-37-16-48-5Zm27 17c15 20 31 14 44 1-20-13-35-13-44-1Zm-37-23c16 26 35 41 65 53"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="333" cy="73" r="17" stroke="currentColor" />
            <path d="M328 58c4 8 7 8 11 1m-12 10 12 9m-16-1 18-9" stroke="currentColor" />
            <circle cx="157" cy="304" r="3" fill="currentColor" />
            <circle cx="170" cy="310" r="2" fill="currentColor" />
          </svg>
          <span className="hero-art-note">made with a little love</span>
          <span className="hero-stamp">
            FROM MY KITCHEN
            <br />
            <span>TO YOURS</span>
          </span>
        </div>
      </section>
      <section id="collection" className="collection-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE COLLECTION</span>
            <h2>
              {favoritesOnly ? 'Your favorites' : 'All recipes'} <span>{base.length}</span>
            </h2>
          </div>
          {canEdit && (
            <Button asChild variant="outline" className="add-recipe-button">
              <Link to={`${prefix}/new`}>
                <Plus />
                Add recipe
              </Link>
            </Button>
          )}
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
                <option value="collection">Collection order</option>
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
        <div className="category-chips" aria-label="Filter by recipe type">
          {['All', ...types].map((label) => (
            <button key={label} onClick={() => setType(label)} aria-pressed={type === label}>
              {label === 'All' ? 'Everything' : label}
              <span>
                {label === 'All' ? base.length : base.filter((r) => r.type === label).length}
              </span>
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
            <div className={view === 'list' ? 'recipe-list' : 'recipe-grid'}>
              {filtered.map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} index={index} list={view === 'list'} />
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
                <Link to={`${prefix}/`}>
                  <Heart />
                  Browse recipes
                </Link>
              </Button>
            ) : (
              canEdit && (
                <Button asChild>
                  <Link to={`${prefix}/new`}>
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
