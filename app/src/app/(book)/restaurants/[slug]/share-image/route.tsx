import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { restaurantNeighborhoods, restaurantCanonicalSlug } from '@/lib/restaurants';
import { getPublicRestaurants } from '@/lib/publicRestaurants';
import { fetchRestaurantResource } from '../../../../../../server/restaurantFetch';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const font = readFile(join(process.cwd(), 'scripts/assets/Poppins-SemiBold.ttf'));
const mascot = readFile(join(process.cwd(), 'public/brand/chef-grdn-mascot.png'))
  .then((bytes) => sharp(bytes).resize(80, 80).png().toBuffer())
  .then((bytes) => `data:image/png;base64,${bytes.toString('base64')}`);
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = (await getPublicRestaurants()).find(
    (item) => item.slug === restaurantCanonicalSlug(slug),
  );
  if (!restaurant) return new Response('Restaurant not found', { status: 404 });
  const photo = restaurant.photo_urls[0]
    ? await fetchRestaurantResource(restaurant.photo_urls[0], 'image')
        .then(async ({ bytes }) => {
          const image = await sharp(bytes, { limitInputPixels: 40000000 })
            .rotate()
            .resize(600, 600, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer();
          return `data:image/jpeg;base64,${image.toString('base64')}`;
        })
        .catch(() => null)
    : null;
  const [fontData, mascotSrc] = await Promise.all([font, mascot]);
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: 64,
        background: '#ffffff',
        color: '#171719',
        fontFamily: 'Poppins',
      }}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          width={440}
          height={440}
          style={{ borderRadius: 32, objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginLeft: photo ? 48 : 0,
          width: photo ? 584 : 1072,
        }}
      >
        <div style={{ display: 'flex', fontSize: 20, color: '#77777d', marginBottom: 22 }}>
          {[restaurant.cuisine, restaurantNeighborhoods(restaurant)].filter(Boolean).join(' · ')}
        </div>
        <div
          style={{
            display: 'flex',
            fontWeight: 600,
            fontSize: restaurant.name.length > 45 ? 42 : 56,
            lineHeight: 1.2,
            letterSpacing: -1.5,
          }}
        >
          {restaurant.name}
        </div>
        <div style={{ display: 'flex', fontSize: 25, marginTop: 26, color: '#56565b' }}>
          {[
            restaurant.rating !== null
              ? `${restaurant.rating.toFixed(1)} / 5`
              : restaurant.status === 'want_to_go'
                ? 'Want to go'
                : 'Been to',
            restaurant.price_range,
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, marginTop: 38 }}>
          <img src={mascotSrc} alt="" width={38} height={38} style={{ marginRight: 12 }} />
          Chef GRDN
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Poppins', data: fontData, weight: 600, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
