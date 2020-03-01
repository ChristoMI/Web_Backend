export function getMoodType(compound: Number) {
  if (compound >= 0.05) {
    return 'positive';
  }

  if (compound <= -0.05) {
    return 'negative';
  }

  return 'neutral';
}