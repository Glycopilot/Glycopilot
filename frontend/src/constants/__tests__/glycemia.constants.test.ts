import {
  getGlycemiaStatus,
  getGlycemiaStatusColor,
  getGlycemiaStatusLabel,
  GLYCEMIA_CONVERSION_FACTOR,
  GLYCEMIA_TARGET,
  GLYCEMIA_THRESHOLDS,
  GLYCEMIA_UNITS,
  mgDlToMmolL,
  mmolLToMgDl,
} from '../glycemia.constants';

describe('glycemia constants', () => {
  it('exposes aligned thresholds, target range, and units', () => {
    expect(GLYCEMIA_THRESHOLDS).toEqual({ HYPO: 70, HYPER: 180 });
    expect(GLYCEMIA_TARGET).toEqual({ MIN: 70, MAX: 180 });
    expect(GLYCEMIA_UNITS).toEqual({ MG_DL: 'mg/dL', MMOL_L: 'mmol/L' });
    expect(GLYCEMIA_CONVERSION_FACTOR).toBe(18.0182);
  });

  it.each([
    [54, 'hypo', 'Hypoglycémie', '#DC2626', '#FEE2E2'],
    [70, 'normal', 'Normal', '#10B981', '#D1FAE5'],
    [180, 'normal', 'Normal', '#10B981', '#D1FAE5'],
    [230, 'hyper', 'Hyperglycémie', '#F59E0B', '#FEF3C7'],
  ] as const)('classifies %i mg/dL', (value, status, label, color, bgColor) => {
    expect(getGlycemiaStatus(value)).toBe(status);
    expect(getGlycemiaStatusLabel(value)).toBe(label);
    expect(getGlycemiaStatusColor(value)).toEqual({ color, bgColor });
  });

  it('converts between mg/dL and mmol/L', () => {
    expect(mgDlToMmolL(180)).toBe(10);
    expect(mgDlToMmolL(99)).toBe(5.5);
    expect(mmolLToMgDl(5.5)).toBe(99);
  });
});
