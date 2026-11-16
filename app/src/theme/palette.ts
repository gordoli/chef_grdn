/** Literal colors are required by browser metadata and image-export APIs, which cannot read CSS vars. */
export const surfacePalette = {
  light: { background: '#ffffff', foreground: '#171719', muted: '#6b6b73' },
  dark: { background: '#090909', foreground: '#f5f5f7', muted: '#97979e' },
} as const;
export const steakChartColors: Record<string, string> = {
  Rare: 'var(--steak-rare)',
  'Medium rare': 'var(--steak-medium-rare)',
  Medium: 'var(--steak-medium)',
  'Medium well': 'var(--steak-medium-well)',
  'Well done': 'var(--steak-well-done)',
};
