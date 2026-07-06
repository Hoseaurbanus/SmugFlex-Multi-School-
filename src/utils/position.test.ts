import { describe, it, expect } from 'vitest';
import { formatPositionWithSuffix } from './position';

describe('formatPositionWithSuffix', () => {
  it('returns ___ for non-finite numbers', () => {
    expect(formatPositionWithSuffix(NaN)).toBe('___');
    expect(formatPositionWithSuffix(Infinity)).toBe('___');
  });

  it('returns ___ for zero and negative numbers', () => {
    expect(formatPositionWithSuffix(0)).toBe('___');
    expect(formatPositionWithSuffix(-1)).toBe('___');
    expect(formatPositionWithSuffix(-10)).toBe('___');
  });

  it('returns ___ for non-numeric strings', () => {
    expect(formatPositionWithSuffix('abc')).toBe('___');
    expect(formatPositionWithSuffix('')).toBe('___');
  });

  it('formats 1st correctly', () => {
    expect(formatPositionWithSuffix(1)).toBe('1st');
  });

  it('formats 2nd correctly', () => {
    expect(formatPositionWithSuffix(2)).toBe('2nd');
  });

  it('formats 3rd correctly', () => {
    expect(formatPositionWithSuffix(3)).toBe('3rd');
  });

  it('formats 4th-20th correctly (all th)', () => {
    expect(formatPositionWithSuffix(4)).toBe('4th');
    expect(formatPositionWithSuffix(5)).toBe('5th');
    expect(formatPositionWithSuffix(6)).toBe('6th');
    expect(formatPositionWithSuffix(7)).toBe('7th');
    expect(formatPositionWithSuffix(8)).toBe('8th');
    expect(formatPositionWithSuffix(9)).toBe('9th');
    expect(formatPositionWithSuffix(10)).toBe('10th');
    expect(formatPositionWithSuffix(11)).toBe('11th');
    expect(formatPositionWithSuffix(12)).toBe('12th');
    expect(formatPositionWithSuffix(13)).toBe('13th');
    expect(formatPositionWithSuffix(20)).toBe('20th');
  });

  it('formats 21st, 22nd, 23rd correctly', () => {
    expect(formatPositionWithSuffix(21)).toBe('21st');
    expect(formatPositionWithSuffix(22)).toBe('22nd');
    expect(formatPositionWithSuffix(23)).toBe('23rd');
  });

  it('formats 111th, 112th, 113th correctly (teens exception)', () => {
    expect(formatPositionWithSuffix(111)).toBe('111th');
    expect(formatPositionWithSuffix(112)).toBe('112th');
    expect(formatPositionWithSuffix(113)).toBe('113th');
  });

  it('formats large positions correctly', () => {
    expect(formatPositionWithSuffix(100)).toBe('100th');
    expect(formatPositionWithSuffix(101)).toBe('101st');
    expect(formatPositionWithSuffix(102)).toBe('102nd');
    expect(formatPositionWithSuffix(103)).toBe('103rd');
  });

  it('handles string numbers', () => {
    expect(formatPositionWithSuffix('1')).toBe('1st');
    expect(formatPositionWithSuffix('2')).toBe('2nd');
    expect(formatPositionWithSuffix('3')).toBe('3rd');
  });

  it('handles decimal numbers by flooring', () => {
    expect(formatPositionWithSuffix(1.9)).toBe('1st');
    expect(formatPositionWithSuffix(2.1)).toBe('2nd');
    expect(formatPositionWithSuffix(3.7)).toBe('3rd');
  });
});
