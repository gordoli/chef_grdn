import { useId, useState, type FormEvent } from 'react';
import { Camera, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { useRecipes } from '@/hooks/useRecipes';
import { useSession } from '@/hooks/useSession';
import { resizePhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/lib/types';
import { errorMessage } from '@/lib/utils';

function localDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={15}
          aria-hidden="true"
          fill={rating >= index + 0.5 ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

interface ReviewValues {
  recipeId: string;
  userId: string;
  previous?: Review;
  rating: number;
  body: string;
  madeOn: string;
  photo: File | null;
  removePhoto: boolean;
}

async function removeStoredPhoto(path: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.storage.from('review-photos').remove([path]);
  if (error) throw error;
}

async function saveReview(values: ReviewValues): Promise<string | null> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const id = values.previous?.id ?? crypto.randomUUID();
  let photoPath = values.removePhoto ? null : (values.previous?.photo_path ?? null);
  let uploadedPath: string | null = null;
  if (values.photo) {
    const blob = await resizePhoto(values.photo);
    // New object names avoid overwrite policies and stale image caches when replacing a photo.
    uploadedPath = `${values.userId}/${id}-${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from('review-photos')
      .upload(uploadedPath, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    photoPath = uploadedPath;
  }
  const { error } = await supabase.from('reviews').upsert(
    {
      id,
      recipe_id: values.recipeId,
      author_id: values.userId,
      rating: values.rating,
      body: values.body.trim() || null,
      made_on: values.madeOn || null,
      photo_path: photoPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'recipe_id,author_id' },
  );
  if (error) {
    if (uploadedPath) {
      try {
        await removeStoredPhoto(uploadedPath);
      } catch {
        throw new Error(
          `${error.message} The uploaded photo also needs cleanup; please contact Gordon.`,
        );
      }
    }
    throw error;
  }
  if (values.previous?.photo_path && values.previous.photo_path !== photoPath) {
    try {
      await removeStoredPhoto(values.previous.photo_path);
    } catch {
      return 'Your review was saved, but the previous photo could not be removed. Please let Gordon know.';
    }
  }
  return null;
}

function ReviewForm({
  recipeId,
  previous,
  onSaved,
  onCancel,
}: {
  recipeId: string;
  previous?: Review;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const { session, profile } = useSession();
  const formId = useId();
  const [rating, setRating] = useState(previous?.rating ?? 0);
  const [body, setBody] = useState(previous?.body ?? '');
  const [madeOn, setMadeOn] = useState(previous?.made_on ?? localDate());
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || profile?.role !== 'friend' || rating < 1 || rating > 5) return;
    setSaving(true);
    try {
      const cleanupWarning = await saveReview({
        recipeId,
        userId: session.user.id,
        previous,
        rating,
        body,
        madeOn,
        photo,
        removePhoto,
      });
      if (cleanupWarning) toast.warning(cleanupWarning);
      else
        toast.success(
          previous ? 'Your review is updated.' : 'Thanks for sharing your cooking notes.',
        );
      await onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="review-form"
      onSubmit={submit}
      aria-label={previous ? 'Edit your review' : 'Leave a review'}
    >
      <h3>{previous ? 'Your cooking notes' : 'How did it turn out?'}</h3>
      <fieldset className="star-picker" disabled={saving}>
        <legend>
          Your rating <span aria-hidden="true">*</span>
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <span key={value}>
              <input
                className="peer sr-only"
                type="radio"
                id={`${formId}-star-${value}`}
                name={`${formId}-rating`}
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                required
              />
              <label
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                htmlFor={`${formId}-star-${value}`}
              >
                <Star
                  size={25}
                  aria-hidden="true"
                  fill={value <= rating ? 'currentColor' : 'none'}
                />
                <span className="sr-only">
                  {value} {value === 1 ? 'star' : 'stars'}
                </span>
              </label>
            </span>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${formId}-body`}>A note from your kitchen</label>
      <Textarea
        id={`${formId}-body`}
        maxLength={3000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What worked, what you changed, what you’d make again…"
        disabled={saving}
      />
      <label htmlFor={`${formId}-date`}>Made on</label>
      <Input
        id={`${formId}-date`}
        type="date"
        max={localDate()}
        value={madeOn}
        onChange={(event) => setMadeOn(event.target.value)}
        disabled={saving}
      />
      <label htmlFor={`${formId}-photo`} className="review-upload-label">
        <Camera size={17} aria-hidden="true" /> Add a photo <span>(optional)</span>
      </label>
      <Input
        id={`${formId}-photo`}
        type="file"
        accept="image/*"
        disabled={saving}
        onChange={(event) => {
          setPhoto(event.target.files?.[0] ?? null);
        }}
        aria-describedby={`${formId}-photo-help`}
      />
      <p id={`${formId}-photo-help`} className="review-photo-help">
        Choose an image under 25 MB. It will be resized before uploading.
      </p>
      {previous?.photo_path && (
        <label className="review-remove-photo">
          <input
            type="checkbox"
            checked={removePhoto}
            onChange={(event) => setRemovePhoto(event.target.checked)}
            disabled={saving || photo !== null}
          />{' '}
          Remove my previous photo
        </label>
      )}
      <div className="review-form-actions flex flex-wrap gap-2">
        <Button disabled={saving || rating === 0} type="submit">
          {saving ? 'Saving…' : previous ? 'Save changes' : 'Share review'}
        </Button>
        <Button variant="ghost" type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function madeOnLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export function Reviews({ recipeId }: { recipeId: string }) {
  const { reviews, refresh, isDemo } = useRecipes();
  const { session, profile } = useSession();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Review | null>(null);
  const recipeReviews = reviews
    .filter((review) => review.recipe_id === recipeId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const ownReview = recipeReviews.find((review) => review.author_id === session?.user.id);
  const canReview = !isDemo && profile?.role === 'friend';
  const average = recipeReviews.length
    ? recipeReviews.reduce((sum, review) => sum + review.rating, 0) / recipeReviews.length
    : 0;
  const names = recipeReviews.map((review) => review.display_name ?? 'A friend');
  const madeBy =
    names.length > 2
      ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} ${names.length === 3 ? 'other' : 'others'}`
      : names.join(' and ');

  async function deleteReview(review: Review) {
    if (
      !supabase ||
      isDemo ||
      !session ||
      (profile?.role !== 'owner' && review.author_id !== session.user.id)
    )
      return;
    setDeleting(review.id);
    try {
      // Removing the file first keeps its path available for retry if Storage rejects cleanup.
      if (review.photo_path) await removeStoredPhoto(review.photo_path);
      const { error } = await supabase.from('reviews').delete().eq('id', review.id);
      if (error) throw error;
      setConfirmDelete(null);
      toast.success('Review deleted.');
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(null);
    }
  }

  if (!session && !isDemo) return null;
  return (
    <section className="reviews-section" aria-labelledby="reviews-heading">
      <div className="reviews-heading flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading">Around the table</h2>
        {canReview && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {ownReview ? 'Edit your review' : 'Leave a review'}
          </Button>
        )}
      </div>
      {recipeReviews.length > 0 ? (
        <div className="reviews-summary">
          <div className="flex items-center gap-2">
            <Stars rating={average} />
            <span>
              {average.toFixed(1)} · {recipeReviews.length}{' '}
              {recipeReviews.length === 1 ? 'review' : 'reviews'}
            </span>
          </div>
          <p>Made by {madeBy}</p>
        </div>
      ) : (
        <p className="reviews-empty">
          {isDemo
            ? 'A place for friends’ cooking notes and photos. Reviews are available in your connected recipe book.'
            : 'No reviews yet. Every good recipe has a story — share yours after cooking.'}
        </p>
      )}
      {canReview && editing && (
        <ReviewForm
          key={`${recipeId}-${ownReview?.id ?? 'new'}-${ownReview?.updated_at ?? ''}`}
          recipeId={recipeId}
          previous={ownReview}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            await refresh();
            setEditing(false);
          }}
        />
      )}
      <div className="reviews-list">
        {recipeReviews.map((review) => {
          const canDelete =
            !isDemo && (profile?.role === 'owner' || review.author_id === session?.user.id);
          const madeOn = madeOnLabel(review.made_on);
          return (
            <article className="review-card" key={review.id}>
              <div className="review-card-heading flex items-start justify-between gap-3">
                <div>
                  <h3>{review.display_name ?? 'A friend'}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    {madeOn && <span className="review-date">Made {madeOn}</span>}
                  </div>
                </div>
                {canDelete && confirmDelete !== review.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${review.display_name ?? 'friend'}’s review`}
                    onClick={() => setConfirmDelete(review.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
              {review.body && <p className="review-body whitespace-pre-wrap">{review.body}</p>}
              {review.photo_url && (
                <button
                  type="button"
                  className="review-photo"
                  onClick={() => setLightbox(review)}
                  aria-label={`View ${review.display_name ?? 'friend'}’s cooking photo`}
                >
                  <img
                    src={review.photo_url}
                    alt={`${review.display_name ?? 'A friend'}’s finished dish`}
                    loading="lazy"
                  />
                </button>
              )}
              {confirmDelete === review.id && (
                <div
                  className="review-delete-confirm flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Confirm review deletion"
                >
                  <span>Delete this review?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting !== null}
                    onClick={() => void deleteReview(review)}
                  >
                    {deleting === review.id ? 'Deleting…' : 'Delete'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting !== null}
                    onClick={() => setConfirmDelete(null)}
                  >
                    Keep
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      >
        <DialogContent className="review-lightbox">
          <DialogTitle className="sr-only">
            {lightbox?.display_name ?? 'A friend'}’s cooking photo
          </DialogTitle>
          <DialogDescription className="sr-only">
            A photo shared with this recipe’s review.
          </DialogDescription>
          {lightbox?.photo_url && (
            <img
              src={lightbox.photo_url}
              alt={`${lightbox.display_name ?? 'A friend'}’s finished dish`}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
