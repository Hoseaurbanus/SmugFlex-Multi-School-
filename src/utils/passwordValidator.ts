/**
 * Password Validator Utility
 * SMugFlex 2.0 Multi-School Management Platform
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
  maxRepeatedChars: number;
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
  maxRepeatedChars: 2
};

// Common weak passwords to prevent
const commonPasswords = [
  'password', '123456', 'password123', 'admin', 'qwerty',
  'abc123', 'letmein', 'welcome', 'monkey', 'dragon',
  'master', 'sunshine', 'iloveyou', 'football', 'baseball',
  'teacher', 'student', 'parent', 'school', 'graceland', 'smugflex',
  'admin123', 'teacher123', 'parent123', 'student123'
];

// Special characters that can be used in passwords
const specialChars = '!@#$%^&*()_+-=[]{}|;:<>?,./';

export class PasswordValidator {
  private policy: PasswordPolicy;
  
  constructor(policy: PasswordPolicy = defaultPasswordPolicy) {
    this.policy = policy;
  }
  
  /**
   * Validate password against policy
   */
  validate(password: string, userInfo?: { firstName?: string; lastName?: string; email?: string }): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;
    
    // Check minimum length
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    } else {
      score += 10;
    }
    
    // Check for uppercase letters
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 10;
    }
    
    // Check for lowercase letters
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 10;
    }
    
    // Check for numbers
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 10;
    }
    
    // Check for special characters
    if (this.policy.requireSpecialChars && !new RegExp('[' + specialChars.split('').map(c => '\\' + c).join('') + ']').test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (new RegExp('[' + specialChars.split('').map(c => '\\' + c).join('') + ']').test(password)) {
      score += 15;
    }
    
    // Check for common passwords
    if (this.policy.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      const foundCommon = commonPasswords.some(common => 
        lowerPassword.includes(common) || common.includes(lowerPassword)
      );
      
      if (foundCommon) {
        errors.push('Password is too common. Please choose a more secure password');
      } else {
        score += 10;
      }
    }
    
    // Check for user information in password
    if (this.policy.preventUserInfo && userInfo) {
      const userInfoStrings = [
        userInfo.firstName?.toLowerCase(),
        userInfo.lastName?.toLowerCase(),
        userInfo.email?.toLowerCase().split('@')[0],
        'teacher', 'student', 'parent', 'admin'
      ].filter(Boolean);
      
      const lowerPassword = password.toLowerCase();
      const foundUserInfo = userInfoStrings.some(info => 
        info && lowerPassword.includes(info)
      );
      
      if (foundUserInfo) {
        errors.push('Password cannot contain your personal information');
      } else {
        score += 10;
      }
    }
    
    // Check for repeated characters
    if (this.policy.maxRepeatedChars > 0) {
      const charCounts: { [key: string]: number } = {};
      for (const char of password) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }
      
      const repeatedChars = Object.values(charCounts).filter(count => count > this.policy.maxRepeatedChars);
      if (repeatedChars.length > 0) {
        errors.push(`Password cannot contain more than ${this.policy.maxRepeatedChars} repeated characters`);
      } else {
        score += 5;
      }
    }
    
    // Check for sequential characters
    if (/(.)\1{2,}/.test(password.toLowerCase())) {
      errors.push('Password cannot contain sequential characters');
      score -= 10;
    }
    
    // Calculate strength
    const strength = this.calculateStrength(score, password.length);
    
    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, score)
    };
  }
  
  /**
   * Calculate password strength
   */
  private calculateStrength(score: number, length: number): 'weak' | 'medium' | 'strong' | 'very-strong' {
    if (score < 30) return 'weak';
    if (score < 45) return 'medium';
    if (score < 60) return 'strong';
    return 'very-strong';
  }
  
  /**
   * Generate password suggestions
   */
  generateSuggestions(userInfo?: { firstName?: string; lastName?: string }): string[] {
    const suggestions: string[] = [];
    
    if (userInfo) {
      // Generate suggestions based on user info but secure them
      const base = (userInfo.firstName?.slice(0, 3) || '') + 
                   (userInfo.lastName?.slice(0, 3) || '');
      
      if (base.length >= 4) {
        suggestions.push(
          base + '2024!',
          base.charAt(0).toUpperCase() + base.slice(1) + '@2024',
          base + '#' + Math.floor(Math.random() * 1000)
        );
      }
    }
    
    // Generate random secure suggestions
    const randomWords = ['Secure', 'Strong', 'Safe', 'Protected'];
    const randomNumbers = ['2024', '123', '789', '456'];
    const randomSymbols = ['!', '@', '#', '$'];
    
    for (let i = 0; i < 3; i++) {
      const word = randomWords[Math.floor(Math.random() * randomWords.length)];
      const number = randomNumbers[Math.floor(Math.random() * randomNumbers.length)];
      const symbol = randomSymbols[Math.floor(Math.random() * randomSymbols.length)];
      
      suggestions.push(word + number + symbol);
    }
    
    return suggestions.slice(0, 5);
  }
  
  /**
   * Get password requirements text
   */
  getRequirementsText(): string[] {
    const requirements: string[] = [];
    
    if (this.policy.minLength > 0) {
      requirements.push(`At least ${this.policy.minLength} characters`);
    }
    
    if (this.policy.requireUppercase) {
      requirements.push('One uppercase letter');
    }
    
    if (this.policy.requireLowercase) {
      requirements.push('One lowercase letter');
    }
    
    if (this.policy.requireNumbers) {
      requirements.push('One number');
    }
    
    if (this.policy.requireSpecialChars) {
      requirements.push('One special character');
    }
    
    return requirements;
  }
  
  /**
   * Check if password meets minimum requirements
   */
  meetsMinimumRequirements(password: string): boolean {
    return password.length >= this.policy.minLength &&
           (!this.policy.requireUppercase || /[A-Z]/.test(password)) &&
           (!this.policy.requireLowercase || /[a-z]/.test(password)) &&
           (!this.policy.requireNumbers || /\d/.test(password));
  }
}

export default PasswordValidator;
