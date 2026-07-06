import * as React from "react";
import { cn } from '../../lib/utils';

interface GradientCardProps extends React.ComponentProps<"div"> {
  gradient?: 'primary' | 'warm' | 'cool' | 'sunset' | 'ocean' | 'forest';
}

const gradients = {
  primary: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
  warm: 'bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500',
  cool: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500',
  sunset: 'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500',
  ocean: 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500',
  forest: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
};

function GradientCard({ className, gradient = 'primary', children, ...props }: GradientCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 text-white shadow-lg",
        gradients[gradient],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { GradientCard };
