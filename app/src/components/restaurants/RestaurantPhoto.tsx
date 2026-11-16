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
}: {
  src?: string;
  name: string;
  className?: string;
  variant?: keyof typeof restaurantMedia;
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
            loading="lazy"
            onError={() => setUnoptimizedSource(src)}
          />
        ) : (
          <img
            src={src}
            alt={name}
            loading="lazy"
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
