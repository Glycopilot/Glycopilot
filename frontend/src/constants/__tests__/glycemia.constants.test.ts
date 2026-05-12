import {
  GLYCEMIA_THRESHOLDS,
  GLYCEMIA_TARGET,
  GLYCEMIA_UNITS,
  GLYCEMIA_CONVERSION_FACTOR,
  getGlycemiaStatus,
  mgDlToMmolL,
  mmolLToMgDl,
} from '../../constants/glycemia.constants';

describe('Glycemia Constants', () => {
  describe('GLYCEMIA_THRESHOLDS', () => {
    it('has correct HYPO threshold', () => {
      expect(GLYCEMIA_THRESHOLDS.HYPO).toBe(70);
    });

    it('has correct HYPER threshold', () => {
      expect(GLYCEMIA_THRESHOLDS.HYPER).toBe(180);
    });
  });

  describe('GLYCEMIA_TARGET', () => {
    it('has correct MIN value', () => {
      expect(GLYCEMIA_TARGET.MIN).toBe(70);
    });

    it('has correct MAX value', () => {
      expect(GLYCEMIA_TARGET.MAX).toBe(180);
    });
  });

  describe('GLYCEMIA_UNITS', () => {
    it('has MG_DL unit', () => {
      expect(GLYCEMIA_UNITS.MG_DL).toBe('mg/dL');
    });

    it('has MMOL_L unit', () => {
      expect(GLYCEMIA_UNITS.MMOL_L).toBe('mmol/L');
    });
  });

  describe('getGlycemiaStatus', () => {
    it('returns hypo when value below 70', () => {
      expect(getGlycemiaStatus(50)).toBe('hypo');
      expect(getGlycemiaStatus(69)).toBe('hypo');
    });

    it('returns normal when value is in range', () => {
      expect(getGlycemiaStatus(70)).toBe('normal');
      expect(getGlycemiaStatus(120)).toBe('normal');
      expect(getGlycemiaStatus(180)).toBe('normal');
    });

    it('returns hyper when value above 180', () => {
      expect(getGlycemiaStatus(181)).toBe('hyper');
      expect(getGlycemiaStatus(300)).toBe('hyper');
    });

    it('handles boundary values correctly', () => {
      expect(getGlycemiaStatus(70)).toBe('normal');
      expect(getGlycemiaStatus(69)).toBe('hypo');
      expect(getGlycemiaStatus(180)).toBe('normal');
      expect(getGlycemiaStatus(181)).toBe('hyper');
    });
  });

  describe('mgDlToMmolL', () => {
    it('converts mg/dL to mmol/L correctly', () => {
      const result = mgDlToMmolL(180);
      expect(result).toBeCloseTo(10.0, 1);
    });

    it('converts 72 mg/dL to approximately 4.0 mmol/L', () => {
      const result = mgDlToMmolL(72);
      expect(result).toBeCloseTo(4.0, 1);
    });

    it('returns a number rounded to 1 decimal', () => {
      const result = mgDlToMmolL(100);
      const decimals = result.toString().split('.')[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(1);
    });
  });

  describe('mmolLToMgDl', () => {
    it('converts mmol/L to mg/dL correctly', () => {
      const result = mmolLToMgDl(10.0);
      expect(result).toBeCloseTo(180, 0);
    });

    it('converts 4.0 mmol/L to approximately 72 mg/dL', () => {
      const result = mmolLToMgDl(4.0);
      expect(result).toBeCloseTo(72, 0);
    });

    it('returns a rounded integer', () => {
      const result = mmolLToMgDl(5.5);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('GLYCEMIA_CONVERSION_FACTOR', () => {
    it('is the correct conversion factor', () => {
      expect(GLYCEMIA_CONVERSION_FACTOR).toBe(18.0182);
    });
  });
});
