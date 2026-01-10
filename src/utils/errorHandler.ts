/**
 * Error Handler Utility
 * Graceland Royal Academy School Management System
 */

export interface ErrorMapping {
  [key: string]: {
    userMessage: string;
    technicalMessage?: string;
    action?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Error message mappings for user-friendly display
export const errorMappings: ErrorMapping = {
  // Network errors
  'Failed to fetch': {
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    technicalMessage: 'Network request failed',
    action: 'Check internet connection and try again',
    severity: 'high'
  },
  'NetworkError': {
    userMessage: 'Network connection lost. Please check your internet connection.',
    technicalMessage: 'Network error occurred',
    action: 'Check network connectivity',
    severity: 'high'
  },
  'AbortError': {
    userMessage: 'Request timed out. The server is taking too long to respond.',
    technicalMessage: 'Request was aborted due to timeout',
    action: 'Try again or check connection speed',
    severity: 'medium'
  },
  
  // Authentication errors
  'Unauthorized': {
    userMessage: 'Your session has expired. Please log in again.',
    technicalMessage: 'Authentication failed',
    action: 'Log in with your credentials',
    severity: 'high'
  },
  'Access denied': {
    userMessage: 'You don\'t have permission to perform this action.',
    technicalMessage: 'Access denied',
    action: 'Contact administrator if you need access',
    severity: 'medium'
  },
  'Session expired': {
    userMessage: 'Your session has expired. Please log in again.',
    technicalMessage: 'Authentication token expired',
    action: 'Log in again',
    severity: 'high'
  },
  
  // Validation errors
  'Validation failed': {
    userMessage: 'Please check your input and try again.',
    technicalMessage: 'Input validation failed',
    action: 'Correct the highlighted fields',
    severity: 'medium'
  },
  'Required field': {
    userMessage: 'This field is required.',
    technicalMessage: 'Missing required field',
    action: 'Fill in this field',
    severity: 'medium'
  },
  'Invalid email': {
    userMessage: 'Please enter a valid email address.',
    technicalMessage: 'Email format validation failed',
    action: 'Enter a valid email format',
    severity: 'medium'
  },
  
  // Server errors
  'Internal server error': {
    userMessage: 'Something went wrong on our end. Please try again.',
    technicalMessage: 'Server encountered an unexpected error',
    action: 'Try again in a few minutes',
    severity: 'high'
  },
  'Database error': {
    userMessage: 'Unable to save your changes. Please try again.',
    technicalMessage: 'Database operation failed',
    action: 'Try again or contact support',
    severity: 'high'
  },
  
  // Business logic errors
  'Duplicate entry': {
    userMessage: 'This record already exists.',
    technicalMessage: 'Duplicate database entry',
    action: 'Use a different value',
    severity: 'medium'
  },
  'Resource not found': {
    userMessage: 'The requested information could not be found.',
    technicalMessage: 'Resource does not exist',
    action: 'Check your input or contact support',
    severity: 'medium'
  },
  'Rate limit exceeded': {
    userMessage: 'Too many requests. Please wait before trying again.',
    technicalMessage: 'Rate limit exceeded',
    action: 'Wait before making more requests',
    severity: 'medium'
  },
  
  // File upload errors
  'File too large': {
    userMessage: 'The file is too large. Maximum size is 10MB.',
    technicalMessage: 'File size exceeds limit',
    action: 'Choose a smaller file',
    severity: 'medium'
  },
  'Invalid file type': {
    userMessage: 'This file type is not allowed.',
    technicalMessage: 'Unsupported file format',
    action: 'Choose a supported file format',
    severity: 'medium'
  },
  
  // Score/Grade specific errors
  'Invalid score': {
    userMessage: 'Please enter a valid score between 0 and 100.',
    technicalMessage: 'Score validation failed',
    action: 'Enter a score within valid range',
    severity: 'medium'
  },
  'Score already submitted': {
    userMessage: 'Scores for this subject have already been submitted.',
    technicalMessage: 'Duplicate score submission',
    action: 'Contact administrator if this is an error',
    severity: 'medium'
  },
  
  // Assignment specific errors
  'Assignment not found': {
    userMessage: 'This assignment could not be found.',
    technicalMessage: 'Assignment does not exist',
    action: 'Check assignment details or contact administrator',
    severity: 'medium'
  },
  'Assignment deadline passed': {
    userMessage: 'The deadline for this assignment has passed.',
    technicalMessage: 'Assignment submission period expired',
    action: 'Contact teacher for extension',
    severity: 'low'
  }
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error | string): {
  userMessage: string;
  technicalMessage?: string;
  action?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Try to find exact match
  if (errorMappings[errorMessage]) {
    return errorMappings[errorMessage];
  }
  
  // Try to find partial match
  for (const [key, mapping] of Object.entries(errorMappings)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return mapping;
    }
  }
  
  // Default error handling
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return errorMappings['Unauthorized'];
  }
  
  if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
    return errorMappings['Access denied'];
  }
  
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return errorMappings['Resource not found'];
  }
  
  if (errorMessage.includes('422') || errorMessage.includes('validation')) {
    return errorMappings['Validation failed'];
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return errorMappings['Internal server error'];
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return errorMappings['Failed to fetch'];
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
    return errorMappings['AbortError'];
  }
  
  // Generic fallback
  return {
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: errorMessage,
    action: 'Try again or contact support if the problem persists',
    severity: 'medium'
  };
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: Error | string): 'low' | 'medium' | 'high' | 'critical' {
  const friendlyError = getUserFriendlyError(error);
  return friendlyError.severity;
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: Error | string): {
  title: string;
  userMessage: string;
  action?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  showRetry?: boolean;
} {
  const friendlyError = getUserFriendlyError(error);
  
  return {
    title: getErrorTitle(friendlyError.severity),
    userMessage: friendlyError.userMessage,
    action: friendlyError.action,
    severity: friendlyError.severity,
    showRetry: ['low', 'medium'].includes(friendlyError.severity)
  };
}

/**
 * Get error title based on severity
 */
function getErrorTitle(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'Critical Error';
    case 'high':
      return 'Error';
    case 'medium':
      return 'Warning';
    case 'low':
      return 'Notice';
    default:
      return 'Information';
  }
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error | string): boolean {
  const severity = getErrorSeverity(error);
  return ['low', 'medium'].includes(severity);
}

/**
 * Get suggested retry delay in milliseconds
 */
export function getRetryDelay(error: Error | string, attempt: number = 1): number {
  const severity = getErrorSeverity(error);
  const baseDelay = {
    'low': 500,
    'medium': 1000,
    'high': 2000,
    'critical': 5000
  };
  
  return baseDelay[severity] * Math.min(attempt, 5);
}

/**
 * Create error log entry
 */
export function createErrorLogEntry(error: Error | string, context?: any): {
  timestamp: string;
  userMessage: string;
  severity: string;
  context?: any;
  userAgent?: string;
  url?: string;
} {
  return {
    timestamp: new Date().toISOString(),
    userMessage: typeof error === 'string' ? error : error.message,
    severity: getErrorSeverity(error),
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  };
}
