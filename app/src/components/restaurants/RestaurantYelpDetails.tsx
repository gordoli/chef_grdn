import { ArrowUpRight } from 'lucide-react';
import type { YelpBusiness } from '@/lib/restaurantYelp';
import styles from './RestaurantYelpDetails.module.css';
export function RestaurantYelpDetails({ businesses }: { businesses: YelpBusiness[] }) {
  if (!businesses.length) return null;
  return (
    <section className={styles.section} aria-label="Yelp information">
      <h2>On Yelp</h2>
      {businesses.map((business) => (
        <article key={business.url} className={styles.business}>
          <a className={styles.source} href={business.url} target="_blank" rel="noreferrer">
            {business.name} · {business.address || 'View on Yelp'} <ArrowUpRight size={13} />
          </a>
          <p className={styles.summary}>
            {[
              business.rating !== null ? `${business.rating} / 5 on Yelp` : null,
              business.review_count !== null ? `${business.review_count} reviews` : null,
              business.price_tier,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {Object.keys(business.hours).length > 0 && (
            <details>
              <summary>Opening hours</summary>
              <dl className={styles.hours}>
                {Object.entries(business.hours).map(([day, hours]) => (
                  <div key={day}>
                    <dt>{day}</dt>
                    <dd>{hours}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          {business.reviews.length > 0 && (
            <details>
              <summary>{business.reviews.length} reviews from Yelp</summary>
              <div className={styles.reviews}>
                {business.reviews.map((review, index) => (
                  <article key={review.id || index}>
                    <p>
                      <strong>{review.author}</strong> · {review.rating} / 5
                    </p>
                    <p className={styles.text}>{review.text}</p>
                    <a href={review.url} target="_blank" rel="noreferrer">
                      Read on Yelp ↗
                    </a>
                  </article>
                ))}
              </div>
            </details>
          )}
          <p className={styles.date}>
            Retrieved{' '}
            {new Date(business.fetched_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </article>
      ))}
    </section>
  );
}
