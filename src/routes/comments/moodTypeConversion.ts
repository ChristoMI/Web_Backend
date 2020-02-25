export function getMoodType(compound: Number) {
  let type = 'neutral';

  if (compound >= 0.05) {
    type = 'positive';
  }

  if (compound <= 0.05) {
    type = 'negative';
  }

  return type;
}