import * as React from "react";
import { cn } from "../../lib/utils";

export interface SimpleDropdownProps {
  children: React.ReactNode;
  className?: string;
}

export function SimpleDropdown({ children, className }: SimpleDropdownProps) {
  return (
    <div className={cn("relative inline-block text-left", className)}>
      {children}
    </div>
  );
}

export interface SimpleDropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SimpleDropdownTrigger({ children, className, ...props }: SimpleDropdownTriggerProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface SimpleDropdownContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SimpleDropdownContent({ children, className }: SimpleDropdownContentProps) {
  return (
    <div className={cn(
      "absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50",
      className
    )}>
      {children}
    </div>
  );
}

export interface SimpleDropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SimpleDropdownItem({ children, className, ...props }: SimpleDropdownItemProps) {
  return (
    <button
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface SimpleDropdownSeparatorProps {
  className?: string;
}

export function SimpleDropdownSeparator({ className }: SimpleDropdownSeparatorProps) {
  return (
    <div className={cn("my-1 h-px bg-border", className)} />
  );
}
