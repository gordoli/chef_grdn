/** Export cards use pixel geometry because their canvas is fixed, unlike responsive app screens. */
export const shareCardTheme = {
  width: 1200,
  height: 630,
  coverSize: 440,
  coverRadius: 32,
  contentWithPhoto: 584,
  contentWithoutPhoto: 1072,
  contentGap: 48,
  brandIconSize: 38,
  muted: surfacePalette.light.muted,
  secondary: '#56565b',
  imageBackground: '#f2f2f4',
  canvas: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: 64,
    background: surfacePalette.light.background,
    color: surfacePalette.light.foreground,
    fontFamily: 'Poppins',
  },
  type: { category: 18, context: 20, detail: 25, brand: 24, restaurantBrand: 22 },
} as const;
export function recipeShareTitleSize(title: string): number {
  return title.length > 85 ? 40 : title.length > 55 ? 48 : 58;
}
export function restaurantShareTitleSize(title: string): number {
  return title.length > 45 ? 42 : 56;
}
import { surfacePalette } from './palette';
