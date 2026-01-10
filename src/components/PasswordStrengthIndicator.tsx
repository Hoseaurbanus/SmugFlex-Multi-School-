import React from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { PasswordValidationResult } from '../utils/passwordValidator';

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidationResult;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ validation, showRequirements = false }: PasswordStrengthIndicatorProps) {
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-blue-500';
      case 'very-strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };
  
  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      case 'very-strong': return 'Very Strong';
      default: return 'Unknown';
    }
  };
  
  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'weak': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Shield className="w-4 h-4" />;
      case 'strong': return <Shield className="w-4 h-4" />;
      case 'very-strong': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };
  
  const getStrengthWidth = (score: number) => {
    return Math.min(100, (score / 65) * 100); // Max score is 65
  };
  
  return (
    <div className="space-y-2">
      {/* Password strength bar */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Password Strength:</span>
        <div className="flex items-center space-x-2">
          <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getStrengthColor(validation.strength)}`}
              style={{ width: `${getStrengthWidth(validation.score)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${getStrengthColor(validation.strength).replace('bg-', 'text-')}`}>
            {getStrengthText(validation.strength)}
          </span>
          {getStrengthIcon(validation.strength)}
        </div>
      </div>
      
      {/* Error messages */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Password Requirements:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Success indicator */}
      {validation.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="ml-3 text-sm font-medium text-green-800">
              Password meets all security requirements
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
