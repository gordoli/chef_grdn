import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { getPublicRecipes } from '@/lib/publicRecipes';
import { recipeCover } from '@/lib/recipeSharing';
import { recipeTypeLabel } from '@/lib/recipeCollection';
import { recipeSharePhoto } from '../../../../../../server/recipeSharePhoto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const font = readFile(join(process.cwd(), 'scripts/assets/Poppins-SemiBold.ttf'));
const mascot = readFile(join(process.cwd(), 'public/brand/chef-grdn-mascot.png'))
  .then((bytes) => sharp(bytes).resize(240, 240, { fit: 'inside' }).png().toBuffer())
  .then((bytes) => `data:image/png;base64,${bytes.toString('base64')}`);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 440,
          height: 440,
          flexShrink: 0,
          borderRadius: 32,
          background: '#f2f2f4',
          overflow: 'hidden',
        }}
      >
        <img
          src={photo ?? mascotSrc}
          alt=""
          width={photo ? 440 : 240}
          height={photo ? 440 : 240}
          style={{ objectFit: photo ? 'cover' : 'contain' }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: 584,
          marginLeft: 48,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            letterSpacing: 3,
            color: '#747477',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          {recipeTypeLabel(recipe.type)}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: recipe.title.length > 85 ? 40 : recipe.title.length > 55 ? 48 : 58,
            fontWeight: 600,
            lineHeight: 1.18,
            letterSpacing: -1.8,
            wordBreak: 'break-word',
          }}
        >
          {recipe.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 36, fontSize: 24 }}>
          <img
            src={mascotSrc}
            alt=""
            width={38}
            height={38}
            style={{ objectFit: 'contain', marginRight: 12 }}
          />
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
