import * as React from "react";
import { cn } from '../../lib/utils';

interface CardProps extends React.ComponentProps<"div"> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive' | 'glass' | 'gradient';
}

function Card({ className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default: "bg-card text-card-foreground rounded-xl border border-border shadow-sm",
    elevated: "bg-card text-card-foreground rounded-xl border border-border shadow-lg",
    outlined: "bg-card text-card-foreground rounded-xl border-2 border-border",
    interactive: "bg-card text-card-foreground rounded-xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer",
    glass: "glass text-card-foreground rounded-xl",
    gradient: "bg-gradient-primary text-white rounded-xl border-0 shadow-lg",
  };

  return (
    <div
      data-slot="card"
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
