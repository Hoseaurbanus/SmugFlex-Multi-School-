export const formatPositionWithSuffix = (position: unknown): string => {
  const n = typeof position === 'number' ? position : Number(position);
  if (!Number.isFinite(n) || n <= 0) return '___';

  const int = Math.floor(n);
  const lastTwo = int % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${int}th`;

  const last = int % 10;
  if (last === 1) return `${int}st`;
  if (last === 2) return `${int}nd`;
  if (last === 3) return `${int}rd`;
  return `${int}th`;
};
