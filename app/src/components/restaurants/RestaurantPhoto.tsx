'use client';
import { useState } from 'react';
import { Utensils } from 'lucide-react';
import Image from 'next/image';
import { yelpPhotoUrl } from '@/lib/restaurantYelp';
import { restaurantMedia } from '@/theme/media';
export function RestaurantPhoto({
  src,
  name,
  className = '',
  variant = 'gallery',
  eager = false,
}: {
  src?: string;
  name: string;
  className?: string;
  variant?: keyof typeof restaurantMedia;
  eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const [unoptimizedSource, setUnoptimizedSource] = useState<string>();
  return (
    <div className={`restaurant-photo ${className}`}>
      {src && failedSource !== src ? (
        yelpPhotoUrl(src) && unoptimizedSource !== src ? (
          <Image
            src={src}
            alt={name}
            {...restaurantMedia[variant]}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            onError={() => setUnoptimizedSource(src)}
          />
        ) : (
          <img
            src={src}
            alt={name}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedSource(src)}
          />
        )
      ) : (
        <Utensils aria-hidden="true" />
      )}
    </div>
  );
}
