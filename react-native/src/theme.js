/**
 * Bingo Night — Theme
 * Dark navy + gold/yellow — classic bingo hall energy
 */
export const colors = {
  bg:           '#0A0A1A',
  surface:      '#0F1028',
  card:         '#161830',
  cardBorder:   '#2A2D5A',

  primary:      '#F5C518',   // bingo gold
  primaryDark:  '#C4991A',
  accent:       '#FF6B6B',   // called number red
  accentPurple: '#8B5CF6',
  green:        '#10B981',

  // Dauber colors (players choose their dauber)
  daubers: ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#8B5CF6','#EC4899','#F5C518'],

  text:         '#F0EAD6',
  textSub:      '#9CA3AF',
  textMuted:    '#6B7280',
  white:        '#FFFFFF',
  black:        '#000000',
};

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 };
export const radius  = { sm:6, md:10, lg:16, xl:24, round:999 };

export const typography = {
  hero:    { fontSize: 48, fontWeight: '900' },
  title:   { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 22, fontWeight: '700' },
  subhead: { fontSize: 17, fontWeight: '600' },
  body:    { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12 },
};
