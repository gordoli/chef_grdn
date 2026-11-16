import { shareCardTheme as theme, restaurantShareTitleSize } from '@/theme/shareCard';
import { shareFont as font, shareMascot as mascot } from '../../../../../../server/shareAssets';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { restaurantNeighborhoods, restaurantCanonicalSlug } from '@/lib/restaurants';
import { getPublicRestaurants } from '@/lib/publicRestaurants';
import { restaurantPhotoUrls } from '@/lib/restaurantYelp';
import { fetchRestaurantResource } from '../../../../../../server/restaurantFetch';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = (await getPublicRestaurants()).find(
    (item) => item.slug === restaurantCanonicalSlug(slug),
  );
  if (!restaurant) return new Response('Restaurant not found', { status: 404 });
  const cover = restaurantPhotoUrls(restaurant)[0];
  const photo = cover
    ? await fetchRestaurantResource(cover, 'image')
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
        ...theme.canvas,
      }}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          width={theme.coverSize}
          height={theme.coverSize}
          style={{ borderRadius: theme.coverRadius, objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginLeft: photo ? theme.contentGap : 0,
          width: photo ? theme.contentWithPhoto : theme.contentWithoutPhoto,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: theme.type.context,
            color: theme.muted,
            marginBottom: 22,
          }}
        >
          {[restaurant.cuisine, restaurantNeighborhoods(restaurant)].filter(Boolean).join(' · ')}
        </div>
        <div
          style={{
            display: 'flex',
            fontWeight: 600,
            fontSize: restaurantShareTitleSize(restaurant.name),
            lineHeight: 1.2,
            letterSpacing: -1.5,
          }}
        >
          {restaurant.name}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: theme.type.detail,
            marginTop: 26,
            color: theme.secondary,
          }}
        >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: theme.type.restaurantBrand,
            marginTop: 38,
          }}
        >
          <img
            src={mascotSrc}
            alt=""
            width={theme.brandIconSize}
            height={theme.brandIconSize}
            style={{ marginRight: 12 }}
          />
          Chef GRDN
        </div>
      </div>
    </div>,
    {
      width: theme.width,
      height: theme.height,
      fonts: [{ name: 'Poppins', data: fontData, weight: 600, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
