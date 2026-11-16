/** Intrinsic dimensions and responsive hints; CSS controls the rendered frame. */
export const restaurantMedia = {
  thumbnail: { width: 128, height: 128, sizes: '64px' },
  preview: { width: 320, height: 320, sizes: '(max-width: 640px) 40vw, 240px' },
  gallery: { width: 960, height: 720, sizes: '(max-width: 640px) 100vw, 900px' },
} as const;
