import { useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRecipes } from '@/hooks/useRecipes';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { errorMessage } from '@/lib/utils';
import type { RecipePhoto } from '@/lib/types';
export function PhotoManager({ recipeId }: { recipeId: string }) {
  const { recipes, addPhotos, updatePhoto, removePhoto, setCover, reorderPhotos } = useRecipes();
  const recipe = recipes.find((r) => r.id === recipeId);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  if (!recipe) return null;
  async function act(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) await act(() => addPhotos(recipeId, files));
    event.target.value = '';
  }
  async function move(photo: RecipePhoto, target: number) {
    if (!recipe || target < 0 || target >= recipe.photos.length) return;
    const ordered = [...recipe.photos];
    const from = ordered.findIndex((p) => p.id === photo.id);
    ordered.splice(from, 1);
    ordered.splice(target, 0, photo);
    await act(() =>
      reorderPhotos(
        recipeId,
        ordered.map((item) => item.id),
      ),
    );
  }
  return (
    <div className="photo-manager">
      <div className="field-heading">
        <div>
          <h2>Photos</h2>
          <p>The first photo is your recipe’s cover.</p>
        </div>
        <label className={`upload-button ${busy ? 'disabled' : ''}`}>
          <ImagePlus size={17} />
          {busy ? 'Uploading…' : 'Add photos'}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(event) => void selectPhotos(event)}
            className="sr-only"
          />
        </label>
      </div>
      {recipe.photos.length ? (
        <div className="photo-manager-grid">
          {recipe.photos.map((photo, index) => (
            <div
              className="photo-manager-item"
              key={photo.id}
              draggable={!busy}
              onDragStart={() => setDragId(photo.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragged = recipe.photos.find((p) => p.id === dragId);
                if (dragged) void move(dragged, index);
                setDragId(null);
              }}
            >
              <img src={photo.url} alt={photo.caption ?? `Recipe photo ${index + 1}`} />
              <Input
                aria-label={`Caption for photo ${index + 1}`}
                placeholder="Add a caption"
                defaultValue={photo.caption ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== photo.caption)
                    void act(() => updatePhoto(photo, { caption: e.target.value }));
                }}
              />
              <div className="photo-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy || index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                  onClick={() => void move(photo, index - 1)}
                >
                  <ArrowLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy || index === recipe.photos.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                  onClick={() => void move(photo, index + 1)}
                >
                  <ArrowRight />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={recipe.cover_photo_id === photo.id ? 'secondary' : 'ghost'}
                  disabled={busy}
                  aria-label={`Set photo ${index + 1} as cover`}
                  onClick={() => void act(() => setCover(recipeId, photo.id))}
                >
                  <Star />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => setRemoving(photo.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              {removing === photo.id && (
                <div className="inline-confirm">
                  Remove photo?
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      void act(async () => {
                        await removePhoto(photo);
                        setRemoving(null);
                      })
                    }
                  >
                    Remove
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
                    Keep
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="photo-empty">Your kitchen, your photos. Upload a few when you’re ready.</p>
      )}
      {busy && (
        <span className="inline-loading" role="status">
          <Loader2 className="animate-spin" size={16} />
          Saving photos…
        </span>
      )}
    </div>
  );
}
