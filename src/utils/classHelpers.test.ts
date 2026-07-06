import { describe, it, expect } from 'vitest';
import { shouldShowPosition, getGrade, getGradeAndRemark } from './classHelpers';

describe('shouldShowPosition', () => {
  it('returns true for undefined className', () => {
    expect(shouldShowPosition(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(shouldShowPosition('')).toBe(true);
  });

  it('returns true for regular classes', () => {
    expect(shouldShowPosition('JSS 1')).toBe(true);
    expect(shouldShowPosition('SSS 2')).toBe(true);
    expect(shouldShowPosition('PRIMARY 6')).toBe(true);
  });

  it('returns false for early childhood classes', () => {
    expect(shouldShowPosition('CRECHE')).toBe(false);
    expect(shouldShowPosition('KG1')).toBe(false);
    expect(shouldShowPosition('KG2')).toBe(false);
  });

  it('returns false for kindergarten variations', () => {
    expect(shouldShowPosition('KINDERGARTEN 1')).toBe(false);
    expect(shouldShowPosition('KINDERGARTEN 2')).toBe(false);
    expect(shouldShowPosition('KG 1')).toBe(false);
    expect(shouldShowPosition('KG 2')).toBe(false);
  });

  it('returns false for named KG variants', () => {
    expect(shouldShowPosition('KG 1 (SARDIUS)')).toBe(false);
    expect(shouldShowPosition('KG 2 (SARDONYX)')).toBe(false);
    expect(shouldShowPosition('KG 2 (PEARL)')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(shouldShowPosition('creche')).toBe(false);
    expect(shouldShowPosition('kg1')).toBe(false);
  });
});

describe('getGrade', () => {
  it('returns A for score >= 90', () => {
    expect(getGrade(90)).toBe('A');
    expect(getGrade(100)).toBe('A');
    expect(getGrade(95)).toBe('A');
  });

  it('returns B for score 80-89', () => {
    expect(getGrade(80)).toBe('B');
    expect(getGrade(89)).toBe('B');
  });

  it('returns C for score 70-79', () => {
    expect(getGrade(70)).toBe('C');
    expect(getGrade(79)).toBe('C');
  });

  it('returns D for score 60-69', () => {
    expect(getGrade(60)).toBe('D');
    expect(getGrade(69)).toBe('D');
  });

  it('returns E for score 50-59', () => {
    expect(getGrade(50)).toBe('E');
    expect(getGrade(59)).toBe('E');
  });

  it('returns F for score < 50', () => {
    expect(getGrade(0)).toBe('F');
    expect(getGrade(49)).toBe('F');
    expect(getGrade(-5)).toBe('F');
  });
});

describe('getGradeAndRemark', () => {
  it('returns correct grade and remark for A', () => {
    expect(getGradeAndRemark(95)).toEqual({ grade: 'A', remark: 'Excellent' });
  });

  it('returns correct grade and remark for B', () => {
    expect(getGradeAndRemark(85)).toEqual({ grade: 'B', remark: 'Very Good' });
  });

  it('returns correct grade and remark for C', () => {
    expect(getGradeAndRemark(75)).toEqual({ grade: 'C', remark: 'Good' });
  });

  it('returns correct grade and remark for D', () => {
    expect(getGradeAndRemark(65)).toEqual({ grade: 'D', remark: 'Satisfactory' });
  });

  it('returns correct grade and remark for E', () => {
    expect(getGradeAndRemark(55)).toEqual({ grade: 'E', remark: 'Fair' });
  });

  it('returns correct grade and remark for F', () => {
    expect(getGradeAndRemark(30)).toEqual({ grade: 'F', remark: 'Fail' });
  });

  it('handles boundary values', () => {
    expect(getGradeAndRemark(90)).toEqual({ grade: 'A', remark: 'Excellent' });
    expect(getGradeAndRemark(80)).toEqual({ grade: 'B', remark: 'Very Good' });
    expect(getGradeAndRemark(70)).toEqual({ grade: 'C', remark: 'Good' });
    expect(getGradeAndRemark(60)).toEqual({ grade: 'D', remark: 'Satisfactory' });
    expect(getGradeAndRemark(50)).toEqual({ grade: 'E', remark: 'Fair' });
    expect(getGradeAndRemark(49)).toEqual({ grade: 'F', remark: 'Fail' });
  });
});
