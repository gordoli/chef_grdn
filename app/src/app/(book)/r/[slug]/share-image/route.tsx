import { shareCardTheme as theme, recipeShareTitleSize } from '@/theme/shareCard';
import { shareFont as font, shareMascot as mascot } from '../../../../../../server/shareAssets';
import { ImageResponse } from 'next/og';
import { getPublicRecipes } from '@/lib/publicRecipes';
import { recipeCover } from '@/lib/recipeSharing';
import { recipeTypeLabel } from '@/lib/recipeCollection';
import { recipeSharePhoto } from '../../../../../../server/recipeSharePhoto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = (await getPublicRecipes()).find((item) => item.slug === slug);
  if (!recipe) return new Response('Recipe not found', { status: 404 });
  const [photo, fontData, mascotSrc] = await Promise.all([
    recipeSharePhoto(recipeCover(recipe)?.url, process.env.NEXT_PUBLIC_SUPABASE_URL),
    font,
    mascot,
  ]);
  return new ImageResponse(
    <div
      style={{
        ...theme.canvas,
      }}
    >
      {photo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: theme.coverSize,
            height: theme.coverSize,
            flexShrink: 0,
            borderRadius: theme.coverRadius,
            background: theme.imageBackground,
            overflow: 'hidden',
          }}
        >
          <img
            src={photo}
            alt=""
            width={theme.coverSize}
            height={theme.coverSize}
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: photo ? theme.contentWithPhoto : theme.contentWithoutPhoto,
          marginLeft: photo ? theme.contentGap : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: theme.type.category,
            letterSpacing: 3,
            color: theme.muted,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          {recipeTypeLabel(recipe.type)}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: recipeShareTitleSize(recipe.title),
            fontWeight: 600,
            lineHeight: 1.18,
            letterSpacing: -1.8,
            wordBreak: 'break-word',
          }}
        >
          {recipe.title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 36,
            fontSize: theme.type.brand,
          }}
        >
          <img
            src={mascotSrc}
            alt=""
            width={theme.brandIconSize}
            height={theme.brandIconSize}
            style={{ objectFit: 'contain', marginRight: 12 }}
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
