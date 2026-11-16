'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useSession } from '@/hooks/useSession';
import { restaurantDate } from '@/lib/restaurants';
export function RestaurantReviews({ restaurantId }: { restaurantId: string }) {
  const { reviews, saveReview, removeReview, isDemo, canEdit } = useRestaurants();
  const { session } = useSession();
  const list = reviews.filter((review) => review.restaurant_id === restaurantId);
  const own = list.find((review) => review.author_id === session?.user.id);
  const [rating, setRating] = useState(own?.rating ?? 5);
  const [body, setBody] = useState(own?.body ?? '');
  const [date, setDate] = useState(own?.visited_on ?? '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveReview(restaurantId, rating, body, date || null);
      setEditing(false);
      toast.success('Review saved');
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Could not save your review.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="restaurant-reviews">
      <h2>Reviews</h2>
      {!session || isDemo ? (
        <p className="muted">
          <Link href="/sign-in">Sign in</Link> to read and leave reviews.
        </p>
      ) : (
        <>
          {list.length === 0 && <p className="muted">No reviews yet.</p>}
          {list.map((review) => (
            <article key={review.id} className="restaurant-review">
              <div>
                <strong>{review.display_name}</strong>
                <span>
                  <Star size={14} /> {review.rating} / 5
                </span>
              </div>
              {review.body && <p>{review.body}</p>}
              {review.visited_on && <small>Visited {restaurantDate(review.visited_on)}</small>}
              {(canEdit || review.author_id === session.user.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await removeReview(review.id);
                      toast.success('Review removed');
                    } catch {
                      toast.error('Could not remove this review.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Remove review
                </Button>
              )}
            </article>
          ))}
          {!editing ? (
            <Button
              variant="secondary"
              onClick={() => {
                setRating(own?.rating ?? 5);
                setBody(own?.body ?? '');
                setDate(own?.visited_on ?? '');
                setEditing(true);
              }}
            >
              {own ? 'Edit my review' : 'Leave a review'}
            </Button>
          ) : (
            <form className="restaurant-form" onSubmit={(event) => void submit(event)}>
              <fieldset disabled={busy}>
                <div className="restaurant-form-pair">
                  <label>
                    Rating
                    <select
                      value={rating}
                      onChange={(event) => setRating(Number(event.target.value))}
                    >
                      {Array.from({ length: 11 }, (_, index) => index / 2).map((value) => (
                        <option key={value} value={value}>
                          {value} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Visit date
                    <Input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Your review
                  <Textarea
                    value={body}
                    maxLength={5000}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </label>
              </fieldset>
              <div className="restaurant-actions">
                <Button disabled={busy} type="submit">
                  Save review
                </Button>
                <Button
                  disabled={busy}
                  variant="ghost"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
