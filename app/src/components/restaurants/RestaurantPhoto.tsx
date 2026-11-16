'use client';
import { useState } from 'react';
import { Utensils } from 'lucide-react';
export function RestaurantPhoto({
  src,
  name,
  className = '',
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  return (
    <div className={`restaurant-photo ${className}`}>
      {src && failedSource !== src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <Utensils aria-hidden="true" />
      )}
    </div>
  );
}
