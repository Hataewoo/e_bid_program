import { describe, expect, it } from 'vitest';
import {
  clampFontScale,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
} from '@/shared/constants/font-scale';

describe('font-scale', () => {
  it('clamps scale within allowed range', () => {
    expect(clampFontScale(0.5)).toBe(FONT_SCALE_MIN);
    expect(clampFontScale(3)).toBe(FONT_SCALE_MAX);
    expect(clampFontScale(1)).toBe(FONT_SCALE_DEFAULT);
  });

  it('rounds to step', () => {
    expect(clampFontScale(1.07)).toBe(1.05);
    expect(clampFontScale(1.08)).toBe(1.1);
  });
});
