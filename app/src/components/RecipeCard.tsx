import Link from 'next/link';
import { Clock, Heart, Star, Users } from 'lucide-react';
import { useRecipes } from '@/hooks/useRecipes';
import type { Recipe } from '@/lib/types';
import { recipeTypeLabel } from '@/lib/recipeCollection';
import { safeUrl, errorMessage } from '@/lib/utils';
import { toast } from 'sonner';
export function RecipeCard({
  recipe,
  index,
  list = false,
}: {
  recipe: Recipe;
  index: number;
  list?: boolean;
}) {
  const { favorites, toggleFavorite, isDemo, reviews, favoritePending } = useRecipes();
  const isFavorite = favorites.includes(recipe.id);
  const photo = recipe.photos.find((p) => p.id === recipe.cover_photo_id) ?? recipe.photos[0];
  const rating = reviews.filter((r) => r.recipe_id === recipe.id);
  const average = rating.reduce((sum, r) => sum + r.rating, 0) / rating.length;
  return (
    <article className={`recipe-card ${photo ? 'has-photo' : ''} ${list ? 'list-card' : ''}`}>
      <Link
        href={`${isDemo ? '/demo' : ''}/r/${recipe.slug}`}
        className="recipe-card-link"
        aria-label={`Open ${recipe.title}`}
      >
        <div className="recipe-card-content">
          <div className="card-topline">
            <span className="recipe-category">{recipeTypeLabel(recipe.type)}</span>
            <span className="recipe-index">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="recipe-card-title">
            <h3>{recipe.title}</h3>
            {photo?.url && (
              <div className="recipe-card-photo">
                <img
                  src={safeUrl(photo.url) ?? (isDemo ? photo.url : undefined)}
                  alt={photo.caption ?? recipe.title}
                  loading="lazy"
                />
              </div>
            )}
          </div>
          <div className="card-tags">
            {recipe.servings && (
              <span>
                <Users size={13} aria-hidden="true" />
                Serves {recipe.servings}
              </span>
            )}
            {recipe.time_label && (
              <span>
                <Clock size={13} aria-hidden="true" />
                {recipe.time_label}
              </span>
            )}
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            {!recipe.time_label && !recipe.servings && (
              <span>{recipe.ingredients.reduce((n, s) => n + s.items.length, 0)} ingredients</span>
            )}
            {rating.length > 0 && (
              <span>
                <Star size={13} aria-hidden="true" />
                {average.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
      <button
        className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`}
        aria-label={`${isFavorite ? 'Unfavorite' : 'Favorite'} ${recipe.title}`}
        aria-pressed={isFavorite}
        disabled={favoritePending.includes(recipe.id)}
        onClick={() =>
          void toggleFavorite(recipe.id).catch((error) => toast.error(errorMessage(error)))
        }
      >
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={1.6} />
      </button>
    </article>
  );
}
