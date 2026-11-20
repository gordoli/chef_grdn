import { Download, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestaurantImports } from '@/hooks/RestaurantImportProvider';
import { restaurantImportLabel, restaurantImportProgress } from '@/lib/restaurantImportJobs';
import styles from './RestaurantImports.module.css';

export function RestaurantImports({ onReview }: { onReview: (id: string) => void }) {
  const { jobs, dismiss, resume } = useRestaurantImports();
  if (!jobs.length) return null;
  return (
    <section className={styles.jobs} aria-label="Restaurant imports">
      {jobs.map((job) => (
        <div key={job.id} className={styles.job}>
          {job.status === 'running' ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          <div className={styles.text}>
            <strong>{restaurantImportLabel(job)}</strong>
            <p role="status">{restaurantImportProgress(job)}</p>
          </div>
          {job.status === 'paused' && (
            <Button variant="ghost" size="sm" onClick={() => resume(job.id)}>
              Resume
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onReview(job.id)}>
            {job.result || job.preview ? 'Review' : 'Open'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Dismiss ${restaurantImportLabel(job)}`}
            onClick={() => dismiss(job.id)}
          >
            <X />
          </Button>
        </div>
      ))}
    </section>
  );
}
