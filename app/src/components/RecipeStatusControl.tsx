import { CircleCheck, CookingPot, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRecipes } from '@/hooks/useRecipes';
import { recipeCookingStatus } from '@/lib/recipeCollection';
import type { Recipe } from '@/lib/types';
import { errorMessage } from '@/lib/utils';

/** The shared book status is visible to everyone and editable by the owner. */
export function RecipeStatusControl({ recipe }: { recipe: Recipe }) {
  const { canEdit, setCookingStatus, cookingStatusPending } = useRecipes();
  const made = recipeCookingStatus(recipe) === 'made';
  const pending = cookingStatusPending.includes(recipe.id);
  const Icon = pending ? LoaderCircle : made ? CircleCheck : CookingPot;
  const label = made ? 'Made' : 'To try';
  const className = `recipe-status-control ${made ? 'is-made' : ''}`;
  if (!canEdit)
    return (
      <span className={className} role="img" aria-label={`${label}: ${recipe.title}`} title={label}>
        <Icon size={18} aria-hidden="true" />
      </span>
    );
  const action = `Mark ${recipe.title} as ${made ? 'to try' : 'made'}`;
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={action}
      aria-pressed={made}
      disabled={pending}
      title={`${label} · ${made ? 'Move to recipes to try' : 'Mark as made'}`}
      onClick={() =>
        void setCookingStatus(recipe.id, made ? 'to_try' : 'made')
          .then(() => toast.success(made ? 'Moved to recipes to try' : 'Marked as made'))
          .catch((failure) => toast.error(errorMessage(failure)))
      }
    >
      <Icon size={18} aria-hidden="true" className={pending ? 'animate-spin' : undefined} />
    </Button>
  );
}
