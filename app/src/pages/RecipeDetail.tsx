import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Clock,
  Heart,
  Link2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  Users,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Reviews } from '@/components/Reviews';
import { useRecipes } from '@/hooks/useRecipes';
import { formatItem, scaleItem } from '@/lib/quantity';
import { errorMessage, safeUrl } from '@/lib/utils';
export function RecipeDetail() {
  const { slug } = useParams();
  const {
    recipes,
    favorites,
    toggleFavorite,
    deleteRecipe,
    isDemo,
    canEdit,
    loading,
    favoritePending,
  } = useRecipes();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const prefix = isDemo ? '/demo' : '';
  const recipe = recipes.find((r) => r.slug === slug);
  const base = recipe?.servings ?? 1;
  const query = Number(params.get(recipe?.servings ? 'serves' : 'x') ?? base);
  const amount = Number.isFinite(query) && query > 0 ? Math.min(query, 1000) : base;
  const factor = amount / base;
  const isFavorite = recipe ? favorites.includes(recipe.id) : false;
  function portion(value: number) {
    const next = new URLSearchParams(params);
    if (value === base) next.delete(recipe?.servings ? 'serves' : 'x');
    else next.set(recipe?.servings ? 'serves' : 'x', String(value));
    setParams(next, { replace: true });
  }
  async function remove() {
    if (!recipe) return;
    setDeleting(true);
    try {
      await deleteRecipe(recipe);
      toast.success('Recipe removed from your collection.');
      navigate(`${prefix}/`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Recipe link copied.');
    } catch {
      toast.error('Could not copy the link. Copy it from your address bar.');
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) navigate(`${prefix}/`);
      }}
    >
      <DialogContent className="recipe-sheet" aria-describedby="recipe-description">
        {loading ? (
          <div className="page-loader">
            <DialogTitle>Opening recipe…</DialogTitle>
          </div>
        ) : !recipe ? (
          <div className="auth-state">
            <DialogTitle>Recipe not found</DialogTitle>
            <DialogDescription>This recipe may have moved.</DialogDescription>
            <Button asChild>
              <Link to={`${prefix}/`}>Back to collection</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="sheet-topbar">
              <span className="eyebrow">FROM THE COLLECTION</span>
              <div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy recipe link"
                  onClick={() => void share()}
                >
                  <Share2 />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-pressed={isFavorite}
                  disabled={favoritePending.includes(recipe.id)}
                  aria-label={isFavorite ? 'Unfavorite recipe' : 'Favorite recipe'}
                  onClick={() =>
                    void toggleFavorite(recipe.id).catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  <Heart fill={isFavorite ? 'currentColor' : 'none'} />
                </Button>
                {canEdit && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`${prefix}/r/${recipe.slug}/edit`}>
                      <Pencil />
                      Edit
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="sheet-scroll">
              {recipe.photos.length > 0 && (
                <div className="photo-strip">
                  {recipe.photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightbox(photo.url ?? null)}
                      aria-label={`Enlarge ${photo.caption ?? recipe.title}`}
                    >
                      <img src={photo.url} alt={photo.caption ?? recipe.title} />
                    </button>
                  ))}
                </div>
              )}
              <div className="recipe-detail-content">
                <div className="detail-topline">
                  <span className="recipe-category">{recipe.type}</span>
                  {recipe.source_url?.includes('tiktok.com') && (
                    <span className="source-badge">From TikTok</span>
                  )}
                </div>
                <DialogTitle className="detail-title">{recipe.title}</DialogTitle>
                <DialogDescription id="recipe-description" className="recipe-intro">
                  {recipe.intro ?? 'A recipe worth making again.'}
                </DialogDescription>
                <div className="detail-facts">
                  {recipe.time_label && (
                    <span>
                      <Clock />
                      {recipe.time_label}
                    </span>
                  )}
                  {recipe.yield_label ? (
                    <span>
                      <Users />
                      {recipe.yield_label}
                    </span>
                  ) : (
                    recipe.servings && (
                      <span>
                        <Users />
                        Serves {recipe.servings}
                      </span>
                    )
                  )}
                  <span>
                    <Utensils />
                    {recipe.ingredients.reduce((n, s) => n + s.items.length, 0)} ingredients ·{' '}
                    {recipe.steps.reduce((n, s) => n + s.steps.length, 0)} steps
                  </span>
                </div>
                <div className="detail-tags">
                  {recipe.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {safeUrl(recipe.source_url) && (
                  <a
                    className="source-card"
                    href={safeUrl(recipe.source_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="source-card-icon">
                      <Link2 size={20} />
                    </span>
                    <span>
                      <small>
                        {recipe.source_url?.includes('tiktok.com')
                          ? 'FROM TIKTOK'
                          : 'ORIGINAL SOURCE'}
                      </small>
                      <strong>
                        {recipe.source_label ||
                          new URL(recipe.source_url ?? 'https://example.com').hostname}
                      </strong>
                    </span>
                    <ArrowUpRight size={20} />
                  </a>
                )}
                {safeUrl(recipe.notion_url) && (
                  <a
                    className="notion-link"
                    href={safeUrl(recipe.notion_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open original in Notion
                    <ArrowUpRight size={13} />
                  </a>
                )}
                <nav className="recipe-jump-nav" aria-label="Recipe sections">
                  <a href="#ingredients">Ingredients</a>
                  <a href="#method">Method</a>
                  {recipe.notes.length > 0 && <a href="#notes">Notes</a>}
                </nav>
                <div className="recipe-columns">
                  <section id="ingredients" className="ingredients-section">
                    <div className="detail-section-heading">
                      <h2>Ingredients</h2>
                      <span>{recipe.ingredients.reduce((n, s) => n + s.items.length, 0)}</span>
                    </div>
                    <div className="servings-control">
                      {recipe.servings ? (
                        <>
                          <button
                            aria-label="Decrease servings"
                            disabled={amount <= 1}
                            onClick={() => portion(Math.max(1, amount - 1))}
                          >
                            <Minus size={15} />
                          </button>
                          <span>Serves {amount}</span>
                          <button
                            aria-label="Increase servings"
                            disabled={amount >= 1000}
                            onClick={() => portion(amount + 1)}
                          >
                            <Plus size={15} />
                          </button>
                        </>
                      ) : (
                        <div className="multiplier-control">
                          {[0.5, 1, 2, 3].map((value) => (
                            <button
                              key={value}
                              aria-pressed={amount === value}
                              onClick={() => portion(value)}
                            >
                              {value === 0.5 ? '½' : value}×
                            </button>
                          ))}
                        </div>
                      )}
                      {factor !== 1 && (
                        <button aria-label="Reset servings" onClick={() => portion(base)}>
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                    {recipe.ingredients.map((section, si) => (
                      <div className="ingredient-group" key={si}>
                        {section.section && <h3>{section.section}</h3>}
                        {section.items.map((item, index) => {
                          const id = `${si}-${index}`;
                          return (
                            <label
                              className={`ingredient ${checked.has(id) ? 'is-checked' : ''} ${factor !== 1 ? 'scaled' : ''}`}
                              key={id}
                            >
                              <input
                                type="checkbox"
                                checked={checked.has(id)}
                                onChange={() =>
                                  setChecked((current) => {
                                    const next = new Set(current);
                                    if (next.has(id)) next.delete(id);
                                    else next.add(id);
                                    return next;
                                  })
                                }
                              />
                              <span className="ingredient-check">
                                <Check size={12} />
                              </span>
                              <span>
                                {factor === 1 ? item.raw : formatItem(scaleItem(item, factor))}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </section>
                  <section id="method" className="method-section">
                    <div className="detail-section-heading">
                      <h2>Method</h2>
                      <span>LET’S COOK</span>
                    </div>
                    {recipe.steps.map((section, si) => (
                      <div key={si} className="method-group">
                        {section.section && <h3>{section.section}</h3>}
                        <ol
                          start={
                            recipe.steps.slice(0, si).reduce((n, s) => n + s.steps.length, 0) + 1
                          }
                        >
                          {section.steps.map((step, index) => (
                            <li key={index}>
                              <span>
                                {String(
                                  recipe.steps
                                    .slice(0, si)
                                    .reduce((n, s) => n + s.steps.length, 0) +
                                    index +
                                    1,
                                ).padStart(2, '0')}
                              </span>
                              <p>{step}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </section>
                </div>
                {recipe.notes.length > 0 && (
                  <section id="notes" className="kitchen-notes">
                    <span className="eyebrow">A NOTE FROM THE KITCHEN</span>
                    <h2>The little things.</h2>
                    <ul>
                      {recipe.notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </section>
                )}
                <Reviews recipeId={recipe.id} />
                {canEdit && (
                  <div className="delete-recipe">
                    {confirmDelete ? (
                      <div className="inline-confirm">
                        <span>Delete this recipe?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleting}
                          onClick={() => void remove()}
                        >
                          {deleting ? 'Deleting…' : 'Delete'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                        <Trash2 />
                        Delete recipe
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {lightbox && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) setLightbox(null);
            }}
          >
            <DialogContent className="image-lightbox">
              <DialogTitle className="sr-only">Recipe photo</DialogTitle>
              <DialogDescription className="sr-only">Full size recipe photograph</DialogDescription>
              <img src={lightbox} alt={recipe?.title ?? 'Recipe'} />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
