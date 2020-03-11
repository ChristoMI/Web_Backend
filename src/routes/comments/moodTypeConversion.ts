export function getMoodType(compound: number) {
  if (compound >= 0.05) {
    return 'positive';
  }

  if (compound <= -0.05) {
    return 'negative';
  }

  return 'neutral';
}