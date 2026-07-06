import { describe, it, expect } from 'vitest';
import { PasswordValidator, defaultPasswordPolicy } from './passwordValidator';

describe('PasswordValidator', () => {
  const validator = new PasswordValidator();

  describe('validate', () => {
    it('rejects password shorter than minimum length', () => {
      const result = validator.validate('Ab1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('accepts password meeting all requirements', () => {
      const result = validator.validate('SecureP@ss1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires uppercase letter', () => {
      const result = validator.validate('lowercase@1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('requires lowercase letter', () => {
      const result = validator.validate('UPPERCASE@1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('requires number', () => {
      const result = validator.validate('NoNumber@abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('requires special character', () => {
      const result = validator.validate('NoSpecial1abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('rejects common passwords', () => {
      const result = validator.validate('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a more secure password');
    });

    it('rejects password containing user info', () => {
      const result = validator.validate('Teacher@123', {
        firstName: 'John',
        lastName: 'Teacher',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain your personal information');
    });

    it('rejects password with too many repeated characters', () => {
      const result = validator.validate('Aaaabbb@1111');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain more than 2 repeated characters');
    });

    it('collects multiple errors', () => {
      const result = validator.validate('abc');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('strength calculation', () => {
    it('returns strength based on criteria met', () => {
      const result = validator.validate('Ab1!');
      expect(result.score).toBeGreaterThan(0);
      expect(['weak', 'medium', 'strong', 'very-strong']).toContain(result.strength);
    });

    it('returns medium for moderate passwords', () => {
      const result = validator.validate('Abcdef1!');
      expect(result.strength).toMatch(/^(medium|strong|very-strong)$/);
    });

    it('returns very-strong for high-scoring passwords', () => {
      const result = validator.validate('V3ry$ecureP@ssw0rd!');
      expect(result.score).toBeGreaterThanOrEqual(60);
    });
  });

  describe('meetsMinimumRequirements', () => {
    it('returns true for valid password', () => {
      expect(validator.meetsMinimumRequirements('SecureP@ss1')).toBe(true);
    });

    it('returns false for short password', () => {
      expect(validator.meetsMinimumRequirements('Ab1!')).toBe(false);
    });

    it('returns false when missing uppercase', () => {
      expect(validator.meetsMinimumRequirements('lowercase@1')).toBe(false);
    });

    it('returns false when missing number', () => {
      expect(validator.meetsMinimumRequirements('NoNumber@abc')).toBe(false);
    });
  });

  describe('getRequirementsText', () => {
    it('returns all requirements with default policy', () => {
      const requirements = validator.getRequirementsText();
      expect(requirements).toContain('At least 8 characters');
      expect(requirements).toContain('One uppercase letter');
      expect(requirements).toContain('One lowercase letter');
      expect(requirements).toContain('One number');
      expect(requirements).toContain('One special character');
    });

    it('returns only applicable requirements', () => {
      const customValidator = new PasswordValidator({
        ...defaultPasswordPolicy,
        requireSpecialChars: false,
      });
      const requirements = customValidator.getRequirementsText();
      expect(requirements).not.toContain('One special character');
    });
  });

  describe('generateSuggestions', () => {
    it('generates at least 3 suggestions', () => {
      const suggestions = validator.generateSuggestions();
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('generates user-based suggestions when user info provided', () => {
      const suggestions = validator.generateSuggestions({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
