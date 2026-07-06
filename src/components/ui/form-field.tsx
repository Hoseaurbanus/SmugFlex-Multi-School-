import * as React from "react";
import { cn } from '../../lib/utils';

interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

function FormField({ label, error, helperText, required, children, className }: FormFieldProps) {
  const id = React.useId();

  const childProps = {
    id,
    'aria-invalid': error ? "true" : undefined,
    'aria-describedby': error ? `${id}-error` : helperText ? `${id}-helper` : undefined,
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-foreground mb-1.5 block font-heading"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {React.isValidElement(children)
        ? React.cloneElement(children, childProps as Record<string, unknown>)
        : children}
      {error && (
        <p id={`${id}-error`} className="text-destructive text-xs mt-1 font-medium">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-muted-foreground text-xs mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

export { FormField };
